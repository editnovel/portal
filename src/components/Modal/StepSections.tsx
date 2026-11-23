import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Loader2,
  RotateCcw,
  Sliders,
} from "lucide-solid";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  resetSectionTitle,
  setAllGroupsCollapsed,
  setSectionGroups,
  state,
  toggleGroupCollapse,
  updateSectionTitle,
} from "~/lib/store";
import type { ChapterSection } from "~/lib/types";

export const StepSections: Component = () => {
  const allCollapsed = createMemo(
    () => state.sectionGroups.length > 0 && state.sectionGroups.every((g) => g.collapsed)
  );

  const [showAdvancedPatterns, setShowAdvancedPatterns] = createSignal(false);
  const [headingRegex, setHeadingRegex] = createSignal(
    "^(Prologue|Chapter|Interlude|Epilogue)\\s*(\\d+|[IVXLCDM]+)?:?.*$"
  );

  const [draggedSection, setDraggedSection] = createSignal<{
    groupIdx: number;
    secIdx: number;
  } | null>(null);
  const [dragOverSection, setDragOverSection] = createSignal<{
    groupIdx: number;
    secIdx: number;
  } | null>(null);

  const [draggedGroup, setDraggedGroup] = createSignal<number | null>(null);
  const [dragOverGroup, setDragOverGroup] = createSignal<number | null>(null);

  const moveGroup = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= state.sectionGroups.length) return;

    const newGroups = [...state.sectionGroups];
    const [moved] = newGroups.splice(index, 1);
    newGroups.splice(targetIndex, 0, moved);
    setSectionGroups(newGroups);
  };

  const moveSectionInGroup = (
    groupIndex: number,
    sectionIndex: number,
    direction: "up" | "down"
  ) => {
    const targetIndex = direction === "up" ? sectionIndex - 1 : sectionIndex + 1;
    const group = state.sectionGroups[groupIndex];
    if (targetIndex < 0 || targetIndex >= group.sections.length) return;

    const newSections = [...group.sections];
    const [moved] = newSections.splice(sectionIndex, 1);
    newSections.splice(targetIndex, 0, moved);

    const newGroups = [...state.sectionGroups];
    newGroups[groupIndex] = {
      ...group,
      sections: newSections,
    };
    setSectionGroups(newGroups);
  };

  const handleSectionDragStart = (e: DragEvent, groupIdx: number, secIdx: number) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/section", `${groupIdx}:${secIdx}`);
    }
    setDraggedSection({ groupIdx, secIdx });
  };

  const handleSectionDragOver = (e: DragEvent, groupIdx: number, secIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    setDragOverSection({ groupIdx, secIdx });
  };

  const handleSectionDrop = (e: DragEvent, targetGroupIdx: number, targetSecIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const source = draggedSection();
    if (!source) return;

    if (source.groupIdx === targetGroupIdx && source.secIdx === targetSecIdx) {
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    const newGroups = state.sectionGroups.map((g) => ({
      ...g,
      sections: [...g.sections],
    }));

    const [movedSection] = newGroups[source.groupIdx].sections.splice(source.secIdx, 1);
    newGroups[targetGroupIdx].sections.splice(targetSecIdx, 0, movedSection);

    setSectionGroups(newGroups);
    setDraggedSection(null);
    setDragOverSection(null);
  };

  const handleGroupDragStart = (e: DragEvent, groupIdx: number) => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/group", `${groupIdx}`);
    }
    setDraggedGroup(groupIdx);
  };

  const handleGroupDragOver = (e: DragEvent, groupIdx: number) => {
    if (draggedGroup() === null) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    setDragOverGroup(groupIdx);
  };

  const handleGroupDrop = (e: DragEvent, targetGroupIdx: number) => {
    e.preventDefault();
    const sourceIdx = draggedGroup();
    if (sourceIdx === null || sourceIdx === targetGroupIdx) {
      setDraggedGroup(null);
      setDragOverGroup(null);
      return;
    }

    const newGroups = [...state.sectionGroups];
    const [moved] = newGroups.splice(sourceIdx, 1);
    newGroups.splice(targetGroupIdx, 0, moved);
    setSectionGroups(newGroups);
    setDraggedGroup(null);
    setDragOverGroup(null);
  };

  return (
    <div class="flex flex-col gap-5 py-2">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-foreground">{t("stepSections.title")}</h3>
          <p class="text-xs text-muted-foreground mt-0.5">{t("stepSections.subtitle")}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvancedPatterns((prev) => !prev)}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-card-foreground transition-colors"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>{t("stepSections.advancedPatterns")}</span>
        </button>
      </div>

      <Show when={showAdvancedPatterns()}>
        <div class="p-4 border border-border rounded-xl bg-muted/40 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-foreground">
              {t("stepSections.headingPatternTitle")}
            </span>
            <span class="text-[10px] text-muted-foreground">{t("stepSections.pcreNotice")}</span>
          </div>
          <input
            type="text"
            value={headingRegex()}
            onInput={(e) => setHeadingRegex(e.currentTarget.value)}
            class="px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p class="text-[11px] text-muted-foreground leading-normal">
            {t("stepSections.headingPatternDesc")}
          </p>
        </div>
      </Show>

      <Show
        when={state.sectionGroups.length > 0}
        fallback={
          <div class="p-8 text-center text-xs text-muted-foreground border border-border rounded-lg bg-card">
            {t("stepSections.noSectionsYet")}
          </div>
        }
      >
        <div class="flex items-center justify-between px-1">
          <span class="text-xs text-muted-foreground">
            {t("stepSections.volumeGroups", { count: state.sectionGroups.length })}
          </span>
          <button
            type="button"
            onClick={() => setAllGroupsCollapsed(!allCollapsed())}
            class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg border border-border/60 transition-colors cursor-pointer"
          >
            <Show
              when={allCollapsed()}
              fallback={
                <>
                  <ChevronDown class="w-3.5 h-3.5" />
                  <span>{t("stepSections.collapseAll")}</span>
                </>
              }
            >
              <ChevronRight class="w-3.5 h-3.5" />
              <span>{t("stepSections.expandAll")}</span>
            </Show>
          </button>
        </div>

        <div class="flex flex-col gap-4">
          <Show when={state.sectionGroups.length === 0 && state.isProcessing}>
            <div class="flex flex-col gap-3 animate-pulse">
              <div class="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Loader2 class="w-4 h-4 animate-spin text-primary" />
                  <span class="text-xs font-medium text-foreground">
                    {t("stepFiles.parsingBackground")}
                  </span>
                </div>
              </div>
              <div class="space-y-2 pl-4">
                <div class="h-8 bg-muted/50 rounded-lg w-full" />
                <div class="h-8 bg-muted/50 rounded-lg w-full" />
                <div class="h-8 bg-muted/50 rounded-lg w-full" />
              </div>
            </div>
          </Show>

          <For each={state.sectionGroups}>
            {(group, groupIdx) => {
              const isGroupOver = () => dragOverGroup() === groupIdx();
              const isGroupDragging = () => draggedGroup() === groupIdx();

              return (
                <div
                  onDragOver={(e) => handleGroupDragOver(e, groupIdx())}
                  onDrop={(e) => handleGroupDrop(e, groupIdx())}
                  class={`border rounded-xl bg-card overflow-hidden shadow-xs transition-all ${
                    isGroupOver() ? "border-primary ring-2 ring-primary/20" : "border-border"
                  } ${isGroupDragging() ? "opacity-50" : "opacity-100"}`}
                >
                  <div
                    draggable={true}
                    onDragStart={(e) => handleGroupDragStart(e, groupIdx())}
                    class="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border cursor-grab active:cursor-grabbing select-none"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupCollapse(groupIdx());
                        }}
                        class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
                        title={
                          group.collapsed
                            ? t("stepSections.expandGroup")
                            : t("stepSections.collapseGroup")
                        }
                      >
                        <ChevronDown
                          class={`w-4 h-4 transition-transform duration-200 ${
                            group.collapsed ? "-rotate-90" : ""
                          }`}
                        />
                      </button>
                      <GripVertical class="w-4 h-4 text-muted-foreground/70 shrink-0" />
                      <span class="text-xs font-mono font-bold text-muted-foreground/80">
                        #{groupIdx() + 1}
                      </span>
                      <div class="flex flex-col min-w-0">
                        <span class="text-[11px] font-medium text-muted-foreground truncate">
                          {t("stepSections.fileSource", { file: group.fileName })}
                        </span>
                        <span class="text-xs font-semibold text-foreground">
                          {t("stepSections.volumeGroupTitle", { count: group.sections.length })}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={groupIdx() === 0}
                        onClick={() => moveGroup(groupIdx(), "up")}
                        class="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={t("stepSections.moveGroupUp")}
                      >
                        <ChevronUp class="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={groupIdx() === state.sectionGroups.length - 1}
                        onClick={() => moveGroup(groupIdx(), "down")}
                        class="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={t("stepSections.moveGroupDown")}
                      >
                        <ChevronDown class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Show when={!group.collapsed}>
                    <div class="divide-y divide-border/60">
                      <For each={group.sections}>
                        {(section: ChapterSection, secIdx) => {
                          const isRenamed = () => section.title !== section.originalTitle;
                          const isSectionDragging = () =>
                            draggedSection()?.groupIdx === groupIdx() &&
                            draggedSection()?.secIdx === secIdx();
                          const isSectionOver = () =>
                            dragOverSection()?.groupIdx === groupIdx() &&
                            dragOverSection()?.secIdx === secIdx();

                          return (
                            <div
                              draggable={true}
                              onDragStart={(e) => handleSectionDragStart(e, groupIdx(), secIdx())}
                              onDragOver={(e) => handleSectionDragOver(e, groupIdx(), secIdx())}
                              onDrop={(e) => handleSectionDrop(e, groupIdx(), secIdx())}
                              onDragEnd={() => {
                                setDraggedSection(null);
                                setDragOverSection(null);
                              }}
                              class={`flex items-center gap-3 px-4 py-2.5 text-xs transition-all ${
                                isSectionOver()
                                  ? "bg-accent/40 border-t-2 border-primary"
                                  : "hover:bg-muted/30"
                              } ${isSectionDragging() ? "opacity-40" : "opacity-100"}`}
                            >
                              <div class="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-secondary shrink-0">
                                <GripVertical class="w-4 h-4 text-muted-foreground/70" />
                              </div>
                              <span class="font-mono text-muted-foreground w-6 shrink-0">
                                {secIdx() + 1}.
                              </span>

                              <span class="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground shrink-0">
                                {section.type}
                              </span>

                              <div class="flex-1 flex items-center gap-2 min-w-0">
                                <input
                                  type="text"
                                  value={section.title}
                                  onInput={(e) =>
                                    updateSectionTitle(section.id, e.currentTarget.value)
                                  }
                                  class="w-full px-2 py-1 text-xs rounded border border-transparent hover:border-border focus:border-border bg-transparent focus:bg-background text-foreground transition-colors"
                                />

                                <Show when={isRenamed()}>
                                  <button
                                    type="button"
                                    onClick={() => resetSectionTitle(section.id)}
                                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground hover:bg-accent shrink-0 transition-colors cursor-pointer"
                                    title={t("stepSections.resetTitle", {
                                      original: section.originalTitle,
                                    })}
                                  >
                                    <RotateCcw class="w-3 h-3" />
                                    <span>{t("stepSections.resetButton")}</span>
                                  </button>
                                </Show>
                              </div>

                              <div class="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={secIdx() === 0}
                                  onClick={() => moveSectionInGroup(groupIdx(), secIdx(), "up")}
                                  class="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title={t("stepSections.moveSectionUp")}
                                >
                                  <ChevronUp class="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={secIdx() === group.sections.length - 1}
                                  onClick={() => moveSectionInGroup(groupIdx(), secIdx(), "down")}
                                  class="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title={t("stepSections.moveSectionDown")}
                                >
                                  <ChevronDown class="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>

          <Show when={state.sectionGroups.length > 0 && state.isProcessing}>
            <div class="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 flex items-center gap-2.5 text-xs text-muted-foreground animate-pulse">
              <Loader2 class="w-4 h-4 animate-spin text-primary" />
              <span>{t("stepFiles.parsingBackground")}</span>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
