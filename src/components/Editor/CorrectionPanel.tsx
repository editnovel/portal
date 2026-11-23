import { BookPlus, Check, CheckCheck, Loader2, SpellCheck2 } from "lucide-solid";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { ApplyAllModal } from "~/features/corrections/components/ApplyAllModal";
import { CorrectionCard } from "~/features/corrections/components/CorrectionCard";
import { CorrectionDictionaryInput } from "~/features/corrections/components/CorrectionDictionaryInput";
import { CorrectionFilterBar } from "~/features/corrections/components/CorrectionFilterBar";
import { t } from "~/lib/i18n";
import {
  addIgnoredWord,
  applySingleCorrection,
  ignoreSingleCorrection,
  navigateToCorrection,
  state,
} from "~/lib/store";
import type { SpellCorrectionItem } from "~/lib/types";
import { RightPaneSwitcher } from "./RightPaneSwitcher";

interface SectionCorrectionGroup {
  sectionId: string;
  sectionTitle: string;
  sectionIndex: number;
  isCurrent: boolean;
  proximityScore: number;
  corrections: SpellCorrectionItem[];
}

export const CorrectionPanel: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [categoryFilter, setCategoryFilter] = createSignal<string>("all");
  const [showApplyAllConfirm, setShowApplyAllConfirm] = createSignal(false);
  const [showAddWordInput, setShowAddWordInput] = createSignal(false);

  const pendingCorrections = createMemo(() => {
    return state.spellCorrections.filter((c) => !c.applied && !c.ignored && c.enabled !== false);
  });

  const appliedCount = createMemo(() => {
    return state.spellCorrections.filter((c) => Boolean(c.applied)).length;
  });

  const pendingSpellingCount = createMemo(() => {
    return pendingCorrections().filter((c) => c.category === "typo").length;
  });

  const pendingGrammarCount = createMemo(() => {
    return pendingCorrections().filter((c) => c.category === "grammar").length;
  });

  const dominantCategory = createMemo(() => {
    const list = pendingCorrections();
    if (list.length === 0) return null;
    const tally: Record<string, number> = {};
    for (const item of list) {
      tally[item.category] = (tally[item.category] || 0) + 1;
    }
    let topCat: string | null = null;
    let topCount = -1;
    for (const [cat, count] of Object.entries(tally)) {
      if (count > topCount) {
        topCount = count;
        topCat = cat;
      }
    }
    return topCat;
  });

  const allSections = createMemo(() => {
    return state.sectionGroups.flatMap((g) => g.sections);
  });

  const sectionIndexMap = createMemo(() => {
    const map = new Map<string, number>();
    const list = allSections();
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      map.set(s.id, i);
      map.set(s.title, i);
      map.set(s.originalTitle, i);
      const cleanTitle = s.title.replace(/^\d+[.\s\-:]+/, "").trim();
      if (cleanTitle) {
        map.set(cleanTitle, i);
      }
    }
    return map;
  });

  const activeSectionIndex = createMemo(() => {
    const list = allSections();
    const idx = list.findIndex((s) => s.id === state.activeSectionId);
    return idx >= 0 ? idx : 0;
  });

  const filteredCorrections = createMemo(() => {
    let list = pendingCorrections();

    const cat = categoryFilter();
    if (cat === "typo") {
      list = list.filter((c) => c.category === "typo");
    } else if (cat === "casing") {
      list = list.filter((c) => c.category === "casing");
    } else if (cat === "punctuation") {
      list = list.filter((c) => c.category === "punctuation");
    } else if (cat === "grammar") {
      list = list.filter((c) => c.category === "grammar");
    } else if (cat === "style") {
      list = list.filter(
        (c) => c.category === "smell" || c.category === "style" || c.category === "dictionary"
      );
    }

    const q = searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.originalToken.toLowerCase().includes(q) ||
          c.replacementToken.toLowerCase().includes(q) ||
          c.sectionTitle.toLowerCase().includes(q) ||
          c.contextSnippet.toLowerCase().includes(q)
      );
    }

    return list;
  });

  const chronologicalGroups = createMemo<SectionCorrectionGroup[]>(() => {
    const list = filteredCorrections();
    const actIdx = activeSectionIndex();
    const idxMap = sectionIndexMap();
    const secList = allSections();

    const groupsMap = new Map<number, SectionCorrectionGroup>();

    for (const c of list) {
      let secIdx = idxMap.get(c.sectionTitle);
      if (secIdx === undefined && c.sectionTitle) {
        const cleanC = c.sectionTitle.replace(/^\d+[.\s\-:]+/, "").trim();
        secIdx = idxMap.get(cleanC);
      }
      if (secIdx === undefined) {
        const foundIdx = secList.findIndex(
          (s) =>
            s.title.includes(c.sectionTitle) ||
            c.sectionTitle.includes(s.title) ||
            (s.fileId === c.fileId && s.htmlContent.includes(c.originalToken))
        );
        secIdx = foundIdx >= 0 ? foundIdx : 0;
      }

      let g = groupsMap.get(secIdx);
      if (!g) {
        const secObj = secList[secIdx];
        g = {
          sectionId: secObj?.id ?? `sec-${secIdx}`,
          sectionTitle: c.sectionTitle || secObj?.title || `Capítulo ${secIdx + 1}`,
          sectionIndex: secIdx,
          isCurrent: secIdx === actIdx,
          proximityScore: Math.abs(secIdx - actIdx),
          corrections: [],
        };
        groupsMap.set(secIdx, g);
      }
      g.corrections.push(c);
    }

    const sorted = Array.from(groupsMap.values()).sort((a, b) => a.sectionIndex - b.sectionIndex);
    for (const g of sorted) {
      g.corrections.sort((a, b) => a.pageNum - b.pageNum);
    }
    return sorted;
  });

  const INITIAL_PRELOAD_RADIUS = 3;
  const BATCH_GROUPS = 2;

  const [startWindowIdx, setStartWindowIdx] = createSignal(0);
  const [endWindowIdx, setEndWindowIdx] = createSignal(0);

  let scrollContainerRef: HTMLDivElement | undefined;
  let topSentinelRef: HTMLDivElement | undefined;
  let bottomSentinelRef: HTMLDivElement | undefined;
  let isLoading = false;

  const alignToActiveChapter = () => {
    if (!scrollContainerRef) return;
    const actIdx = activeSectionIndex();
    const groups = chronologicalGroups();
    if (groups.length === 0) return;

    let targetIdx = actIdx;
    const hasActiveGroup = groups.some((g) => g.sectionIndex === actIdx);
    if (!hasActiveGroup) {
      let minDiff = Infinity;
      for (const g of groups) {
        const diff = Math.abs(g.sectionIndex - actIdx);
        if (diff < minDiff) {
          minDiff = diff;
          targetIdx = g.sectionIndex;
        }
      }
    }

    const targetHeader = scrollContainerRef.querySelector(
      `[data-section-header-index="${targetIdx}"]`
    );
    if (targetHeader instanceof HTMLElement) {
      const offsetTop = targetHeader.offsetTop;
      scrollContainerRef.scrollTo({
        top: Math.max(0, offsetTop - 12),
        behavior: "smooth",
      });
    }
  };

  createEffect(() => {
    const groups = chronologicalGroups();
    const total = groups.length;
    if (total === 0) {
      setStartWindowIdx(0);
      setEndWindowIdx(0);
      return;
    }

    const actIdx = activeSectionIndex();
    let currentInGroupIndex = groups.findIndex((g) => g.sectionIndex === actIdx);

    if (currentInGroupIndex === -1) {
      let minDiff = Infinity;
      let closestIdx = 0;
      for (let i = 0; i < groups.length; i++) {
        const diff = Math.abs(groups[i].sectionIndex - actIdx);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      currentInGroupIndex = closestIdx;
    }

    const start = Math.max(0, currentInGroupIndex - INITIAL_PRELOAD_RADIUS);
    const end = Math.min(total - 1, currentInGroupIndex + INITIAL_PRELOAD_RADIUS);

    setStartWindowIdx(start);
    setEndWindowIdx(end);

    requestAnimationFrame(() => {
      alignToActiveChapter();
    });
  });

  const visibleGroups = createMemo(() => {
    const groups = chronologicalGroups();
    if (groups.length === 0) return [];
    const start = Math.max(0, Math.min(startWindowIdx(), groups.length - 1));
    const end = Math.max(start, Math.min(endWindowIdx(), groups.length - 1));
    return groups.slice(start, end + 1);
  });

  const canLoadPrevious = () => startWindowIdx() > 0;
  const canLoadNext = () => endWindowIdx() < chronologicalGroups().length - 1;

  const [activeStickySectionIndex, setActiveStickySectionIndex] = createSignal<number | null>(null);

  const isStickyActive = (sectionIndex: number) => {
    const active = activeStickySectionIndex();
    if (active === null) {
      return sectionIndex === activeSectionIndex();
    }
    return sectionIndex === active;
  };

  const updateActiveSticky = () => {
    if (!scrollContainerRef) return;
    const containerTop = scrollContainerRef.getBoundingClientRect().top;
    const headers = scrollContainerRef.querySelectorAll("[data-section-header-index]");

    let activeIdx: number | null = null;
    for (let i = headers.length - 1; i >= 0; i--) {
      const header = headers[i];
      const rect = header.getBoundingClientRect();
      if (rect.top <= containerTop + 24) {
        const idxStr = header.getAttribute("data-section-header-index");
        if (idxStr !== null) {
          activeIdx = parseInt(idxStr, 10);
        }
        break;
      }
    }

    if (activeIdx !== null && activeIdx !== activeStickySectionIndex()) {
      setActiveStickySectionIndex(activeIdx);
    }
  };

  createEffect(() => {
    visibleGroups();
    requestAnimationFrame(updateActiveSticky);
  });

  const loadPrevious = () => {
    if (isLoading || !canLoadPrevious()) return;
    isLoading = true;
    const container = scrollContainerRef;
    const prevScrollHeight = container ? container.scrollHeight : 0;
    const prevScrollTop = container ? container.scrollTop : 0;

    setStartWindowIdx((prev) => Math.max(0, prev - BATCH_GROUPS));

    requestAnimationFrame(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
      }
      updateActiveSticky();
      isLoading = false;
    });
  };

  const loadNext = () => {
    if (isLoading || !canLoadNext()) return;
    isLoading = true;
    setEndWindowIdx((prev) => Math.min(chronologicalGroups().length - 1, prev + BATCH_GROUPS));
    requestAnimationFrame(() => {
      updateActiveSticky();
      isLoading = false;
    });
  };

  createEffect(() => {
    if (!topSentinelRef && !bottomSentinelRef) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (entry.target === topSentinelRef && canLoadPrevious()) {
              loadPrevious();
            } else if (entry.target === bottomSentinelRef && canLoadNext()) {
              loadNext();
            }
          }
        }
      },
      { rootMargin: "800px 0px" }
    );
    if (topSentinelRef) observer.observe(topSentinelRef);
    if (bottomSentinelRef) observer.observe(bottomSentinelRef);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="flex-1 flex flex-col h-full bg-card/60 backdrop-blur-md overflow-hidden relative select-none">
      <div class="h-10 border-b border-border bg-card/90 px-4 flex items-center justify-between text-xs shrink-0 z-10 relative">
        <div class="flex items-center gap-2 font-medium text-foreground">
          <div class="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary">
            <SpellCheck2 class="w-3 h-3" />
          </div>
          <Show when={state.isProcessing}>
            <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
          </Show>
        </div>

        <div class="absolute left-1/2 -translate-x-1/2">
          <RightPaneSwitcher />
        </div>

        <div class="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowAddWordInput((prev) => !prev)}
            class={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              showAddWordInput()
                ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                : "border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            title={t("correctionPanel.addToDictionary")}
          >
            <BookPlus class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <CorrectionDictionaryInput
        isOpen={showAddWordInput()}
        onAdd={(word) => {
          addIgnoredWord(word);
          setShowAddWordInput(false);
        }}
      />

      <CorrectionFilterBar
        searchQuery={searchQuery()}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter()}
        onCategoryChange={setCategoryFilter}
        pendingCount={pendingCorrections().length}
        appliedCount={appliedCount()}
        dominantCategory={dominantCategory()}
      />

      <div
        ref={scrollContainerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          updateActiveSticky();
          if (el.scrollTop < 800 && canLoadPrevious()) {
            loadPrevious();
          } else if (el.scrollHeight - el.scrollTop - el.clientHeight < 800 && canLoadNext()) {
            loadNext();
          }
        }}
        class="flex-1 overflow-y-auto p-3 flex flex-col gap-3 select-text"
      >
        <Show when={canLoadPrevious()}>
          <div ref={topSentinelRef} class="h-1 shrink-0 pointer-events-none opacity-0" />
        </Show>

        <Show
          when={visibleGroups().length > 0}
          fallback={
            <Show
              when={state.isProcessing}
              fallback={
                <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground gap-2">
                  <Check class="w-8 h-8 text-emerald-500/80 stroke-1" />
                  <p class="font-medium text-foreground">{t("correctionPanel.noIssuesFound")}</p>
                </div>
              }
            >
              <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground gap-2 animate-pulse">
                <Loader2 class="w-8 h-8 text-primary animate-spin" />
                <p class="font-medium text-foreground">{t("stepFiles.parsingBackground")}</p>
                <p class="text-[11px] text-muted-foreground">
                  {t("correctionPanel.auditingNotice")}
                </p>
              </div>
            </Show>
          }
        >
          <For each={visibleGroups()}>
            {(group) => (
              <div class="flex flex-col gap-2">
                <div
                  data-section-header-index={group.sectionIndex}
                  class={`sticky top-0 z-10 px-2.5 py-1 text-[11px] rounded-md border truncate max-w-full backdrop-blur-md shadow-2xs select-none transition-colors ${
                    isStickyActive(group.sectionIndex)
                      ? "bg-primary/15 text-primary border-primary/30 font-semibold"
                      : "bg-card/95 text-muted-foreground border-border/80 font-medium"
                  }`}
                  title={group.sectionTitle}
                >
                  {group.sectionTitle}
                </div>

                <div class="flex flex-col gap-2">
                  <For each={group.corrections}>
                    {(corr) => (
                      <CorrectionCard
                        correction={corr}
                        isSelected={state.selectedCorrectionId === corr.id}
                        onSelect={() => navigateToCorrection(corr.id)}
                        onApply={(id, customReplacement) =>
                          applySingleCorrection(id, customReplacement)
                        }
                        onIgnore={(id) => ignoreSingleCorrection(id)}
                        onAddToDictionary={(word) => addIgnoredWord(word)}
                      />
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </Show>

        <Show when={canLoadNext()}>
          <div ref={bottomSentinelRef} class="h-1 shrink-0 pointer-events-none opacity-0" />
        </Show>
      </div>

      <div class="p-3 border-t border-border bg-card/90 flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          disabled={pendingCorrections().length === 0}
          onClick={() => setShowApplyAllConfirm(true)}
          class="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <CheckCheck class="w-4 h-4" />
          <span>{t("correctionPanel.correctAll")}</span>
        </button>
      </div>

      <ApplyAllModal
        isOpen={showApplyAllConfirm()}
        onClose={() => setShowApplyAllConfirm(false)}
        pendingCount={pendingCorrections().length}
        spellingCount={pendingSpellingCount()}
        grammarCount={pendingGrammarCount()}
      />
    </div>
  );
};
