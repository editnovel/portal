import { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  ALargeSmall,
  Bold,
  BookMarked,
  BookOpen,
  BookPlus,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  CheckSquare,
  ChevronDown,
  CircleX,
  ClipboardPaste,
  Copy,
  Italic,
  LetterText,
  Pencil,
  Quote,
  Redo2,
  RefreshCw,
  Scissors,
  Search,
  SeparatorHorizontal,
  Settings,
  SpellCheck2,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Trash2,
  Underline,
  Undo2,
  X,
} from "lucide-solid";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { SearchBar } from "~/components/ui/SearchBar";
import {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
} from "~/components/ui/ContextMenu";
import { UnifyBreakModal } from "~/features/editor/dialogs/UnifyBreakModal";
import Placeholder from "@tiptap/extension-placeholder";
import {
  CustomTextAlign,
  FindAndReplaceExtension,
  FootnoteBodyNode,
  FootnoteCardNode,
  FootnoteRefMark,
  FootnoteTagNode,
  getNextFootnoteNumber,
  LiteraryParagraphExtension,
  SceneBreakNode,
  SpellAppliedMark,
  SpellCheckExtension,
  spellPluginKey,
  SubscriptMark,
  SuperscriptMark,
  UnderlineMark,
} from "~/features/editor/extensions";
import { t } from "~/lib/i18n";
import { readerSettingsToCssVariables } from "~/lib/reader-settings";
import {
  activeRawSection,
  activeSection,
  addIgnoredWord,
  applySingleCorrection,
  correctionScrollTrigger,
  ignoreSingleCorrection,
  markImageDiscardedByUrl,
  mergeParagraphCorrections,
  setModalModeWithTransition,
  setSelectedCorrectionId,
  setStep,
  setUnifyBreaks,
  state,
  toggleReaderSettings,
  updateSectionHtml,
} from "~/lib/store";
import type { DynamicParagraphInput, SpellAuditOptions } from "~/lib/types";
import { auditDynamicParagraphsInEngine } from "~/lib/wasm-bridge";

const extractImageUrls = (html: string): string[] => {
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/g);
  const urls: string[] = [];
  for (const m of matches) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
};

interface TipTapEditorProps {
  onScrollFraction?: (fraction: number) => void;
  scrollFraction?: number;
  openSearchTrigger?: () => number;
}

export const TipTapEditor: Component<TipTapEditorProps> = (props) => {
  let editorContainerRef: HTMLDivElement | undefined;
  let scrollContainerRef: HTMLDivElement | undefined;
  let toolbarContainerRef: HTMLDivElement | undefined;
  let editor: Editor | undefined;
  let isProgrammaticScroll = false;
  let lastReportedFraction = -1;
  let scrollCorrectionTimer: number | null = null;
  let scrollVerifyTimer: number | null = null;
  const [editorRevision, setEditorRevision] = createSignal(0);
  const [isCompactToolbar, setIsCompactToolbar] = createSignal(false);
  const [isSlimToolbar, setIsSlimToolbar] = createSignal(false);
  const [isSearchOpen, setIsSearchOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  let searchInputRef: HTMLInputElement | undefined;

  const searchResultsCount = createMemo(() => {
    editorRevision();
    return editor?.storage.findAndReplace?.results?.length ?? 0;
  });

  const currentSearchIndex = createMemo(() => {
    editorRevision();
    return editor?.storage.findAndReplace?.currentIndex ?? null;
  });

  const scrollToCurrentSearchResult = () => {
    requestAnimationFrame(() => {
      if (!scrollContainerRef || !editorContainerRef) return;
      const el = editorContainerRef.querySelector(".find-and-replace-result-current");
      if (el instanceof HTMLElement) {
        const markRect = el.getBoundingClientRect();
        const containerRect = scrollContainerRef.getBoundingClientRect();
        const deltaY = markRect.top + markRect.height / 2 - (containerRect.top + containerRect.height / 2);
        isProgrammaticScroll = true;
        scrollContainerRef.scrollTo({
          top: scrollContainerRef.scrollTop + deltaY,
          behavior: "smooth",
        });
        setTimeout(() => {
          isProgrammaticScroll = false;
        }, 300);
      }
    });
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to).trim();
        if (text && text.length < 100) {
          setSearchQuery(text);
          editor.commands.setSearchTerm(text);
          scrollToCurrentSearchResult();
        }
      } else if (searchQuery()) {
        editor.commands.setSearchTerm(searchQuery());
        scrollToCurrentSearchResult();
      }
    }
    requestAnimationFrame(() => {
      searchInputRef?.focus();
      searchInputRef?.select();
    });
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    editor?.commands.clearSearch();
    editor?.commands.focus();
  };

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    editor?.commands.setSearchTerm(val);
    setEditorRevision((r) => r + 1);
    if (val.trim()) {
      scrollToCurrentSearchResult();
    }
  };

  const toggleCaseSensitive = () => {
    const next = !caseSensitive();
    setCaseSensitive(next);
    editor?.commands.setCaseSensitive(next);
    setEditorRevision((r) => r + 1);
    if (searchQuery().trim()) {
      scrollToCurrentSearchResult();
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        editor?.commands.goToPreviousResult();
      } else {
        editor?.commands.goToNextResult();
      }
      setEditorRevision((r) => r + 1);
      scrollToCurrentSearchResult();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    }
  };

  createEffect(() => {
    const trigger = props.openSearchTrigger?.();
    if (trigger && trigger > 0) {
      openSearch();
    }
  });

  function fnv1a(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  let updateTimer: number | null = null;
  let spellDebounceTimer: number | null = null;
  let selectionRafScheduled = false;
  let isInternalDocUpdate = false;
  const auditedParagraphHashes = new Set<string>();
  let sectionTrackedImageUrls: string[] = [];

  const flushPendingUpdate = () => {
    if (updateTimer !== null) {
      window.clearTimeout(updateTimer);
      updateTimer = null;
      const currentId = state.activeSectionId;
      if (currentId && editor) {
        isInternalDocUpdate = true;
        updateSectionHtml(currentId, editor.getHTML());
      }
    }
  };

  onMount(() => {
    if (toolbarContainerRef && typeof ResizeObserver !== "undefined") {
      const toolbarObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          setIsCompactToolbar(width < 480);
          setIsSlimToolbar(width < 620);
        }
      });
      toolbarObserver.observe(toolbarContainerRef);
      onCleanup(() => toolbarObserver.disconnect());
    }

    if (!editorContainerRef) return;

    editor = new Editor({
      element: editorContainerRef,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          horizontalRule: false,
          undoRedo: {
            depth: 40,
            newGroupDelay: 600,
          },
        }),
        Image.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: "novel-editor-image max-w-full h-auto mx-auto block my-4 rounded-md shadow-md",
          },
        }),
        SceneBreakNode,
        LiteraryParagraphExtension,
        SubscriptMark,
        SuperscriptMark,
        UnderlineMark,
        CustomTextAlign,
        FootnoteCardNode,
        FootnoteTagNode,
        FootnoteBodyNode,
        FootnoteRefMark,
        SpellAppliedMark,
        SpellCheckExtension,
        FindAndReplaceExtension,
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === "footnoteBody") {
              return t("editor.footnotePlaceholder");
            }
            return "";
          },
          showOnlyWhenEditable: true,
        }),
      ],
      content:
        activeRawSection()?.htmlContent || "<p>Select or upload a chapter to begin editing.</p>",
      editorProps: {
        attributes: {
          class: "focus:outline-none min-h-[500px] novel-editor-content select-text",
          spellcheck: "false",
          autocorrect: "off",
          autocapitalize: "off",
        },
        handleKeyDown: (_view, event) => {
          if (event.altKey && (event.key === "n" || event.key === "N")) {
            event.preventDefault();
            const currentTitle = activeSection()?.title;
            const curCorrs = state.spellCorrections.filter(
              (c) => !c.applied && !c.ignored && c.enabled !== false && c.sectionTitle === currentTitle
            );
            if (curCorrs.length > 0) {
              const curIdx = curCorrs.findIndex((c) => c.id === state.selectedCorrectionId);
              const nextIdx = (curIdx + 1) % curCorrs.length;
              setSelectedCorrectionId(curCorrs[nextIdx].id);
            }
            return true;
          }
          if (event.altKey && (event.key === "p" || event.key === "P")) {
            event.preventDefault();
            const currentTitle = activeSection()?.title;
            const curCorrs = state.spellCorrections.filter(
              (c) => !c.applied && !c.ignored && c.enabled !== false && c.sectionTitle === currentTitle
            );
            if (curCorrs.length > 0) {
              const curIdx = curCorrs.findIndex((c) => c.id === state.selectedCorrectionId);
              const prevIdx = (curIdx - 1 + curCorrs.length) % curCorrs.length;
              setSelectedCorrectionId(curCorrs[prevIdx].id);
            }
            return true;
          }
          return false;
        },
        handleClick: (_view, _pos, event) => {
          const target = (event.target as HTMLElement).closest("[data-spell-corr-id]");
          if (target) {
            const corrId = target.getAttribute("data-spell-corr-id");
            if (corrId) {
              setSelectedCorrectionId(corrId);
              return true;
            }
          }
          return false;
        },
      },
      onSelectionUpdate: () => {
        if (!selectionRafScheduled) {
          selectionRafScheduled = true;
          requestAnimationFrame(() => {
            selectionRafScheduled = false;
            setEditorRevision((r) => r + 1);
          });
        }
      },
      onUpdate: ({ editor: ed }) => {
        setEditorRevision((r) => r + 1);
        const currentId = state.activeSectionId;
        if (!currentId) return;
        if (updateTimer !== null) {
          window.clearTimeout(updateTimer);
        }
        updateTimer = window.setTimeout(() => {
          updateTimer = null;
          const html = ed.getHTML();
          isInternalDocUpdate = true;
          updateSectionHtml(currentId, html);

          const currentImages = extractImageUrls(html);
          for (const imgUrl of sectionTrackedImageUrls) {
            if (!currentImages.includes(imgUrl)) {
              markImageDiscardedByUrl(imgUrl, true);
            }
          }
        }, 400);

        if (spellDebounceTimer !== null) {
          window.clearTimeout(spellDebounceTimer);
        }
        spellDebounceTimer = window.setTimeout(async () => {
          spellDebounceTimer = null;
          const currentSec = activeSection();
          if (!currentSec) return;

          const dirtyParagraphs: DynamicParagraphInput[] = [];
          ed.state.doc.forEach((node) => {
            if (node.isBlock) {
              const text = node.textContent;
              if (!text.trim()) return;
              const hash = fnv1a(text);
              if (!auditedParagraphHashes.has(hash)) {
                auditedParagraphHashes.add(hash);
                dirtyParagraphs.push({
                  id: `p-${hash}`,
                  text,
                  sectionId: currentSec.id,
                  sectionTitle: currentSec.title,
                  pageNum: currentSec.startPage || 1,
                });
              }
            }
          });

          if (dirtyParagraphs.length > 0) {
            const options: SpellAuditOptions = {
              languageMode: state.spellLanguageMode,
              ignoreJapanese: state.spellIgnoreJapanese,
              ignoreForeign: state.spellIgnoreForeign,
              ignoreProperNouns: state.spellIgnoreProperNouns,
              ignoredWords: [...state.spellIgnoredWords],
            };
            const newCorrs = await auditDynamicParagraphsInEngine({
              fileId: currentSec.fileId,
              paragraphs: dirtyParagraphs,
              options,
            });
            mergeParagraphCorrections(
              currentSec.title,
              dirtyParagraphs.map((p) => p.id),
              newCorrs
            );
            if (!ed.isDestroyed) {
              ed.view.dispatch(ed.state.tr.setMeta(spellPluginKey, true));
            }
          }
        }, 350);
      },
    });

    onCleanup(() => {
      flushPendingUpdate();
      if (spellDebounceTimer !== null) {
        window.clearTimeout(spellDebounceTimer);
        spellDebounceTimer = null;
      }
      if (scrollCorrectionTimer !== null) {
        window.clearTimeout(scrollCorrectionTimer);
        scrollCorrectionTimer = null;
      }
      if (scrollVerifyTimer !== null) {
        window.clearTimeout(scrollVerifyTimer);
        scrollVerifyTimer = null;
      }
      editor?.destroy();
    });
  });

  let lastLoadedSectionId = activeRawSection()?.id;
  createEffect(() => {
    const raw = activeRawSection();
    if (!editor || !raw) return;

    if (raw.id !== lastLoadedSectionId) {
      flushPendingUpdate();
      if (spellDebounceTimer !== null) {
        window.clearTimeout(spellDebounceTimer);
        spellDebounceTimer = null;
      }
      auditedParagraphHashes.clear();
      lastLoadedSectionId = raw.id;
      sectionTrackedImageUrls = extractImageUrls(raw.htmlContent);
      editor.commands.setContent(raw.htmlContent, { emitUpdate: false });
      return;
    }

    if (isInternalDocUpdate) {
      isInternalDocUpdate = false;
      return;
    }

    if (updateTimer === null) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== raw.htmlContent) {
        const prevScroll = scrollContainerRef?.scrollTop;
        sectionTrackedImageUrls = extractImageUrls(raw.htmlContent);
        editor.commands.setContent(raw.htmlContent, { emitUpdate: false });
        if (prevScroll !== undefined && scrollContainerRef) {
          scrollContainerRef.scrollTop = prevScroll;
        }
      }
    }
  });

  const [tooltip, setTooltip] = createSignal<{
    visible: boolean;
    x: number;
    y: number;
    showAbove: boolean;
    tag: string;
    body: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    showAbove: false,
    tag: "",
    body: "",
  });

  const handleEditorMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const noteref = target.closest(".noteref, [data-fn-id], a[href*='#fn-']");
    if (noteref && scrollContainerRef) {
      const fnId =
        noteref.getAttribute("data-fn-id") ||
        noteref.getAttribute("id")?.replace(/^fnref-/, "fn-") ||
        noteref.getAttribute("href")?.replace(/^#/, "") ||
        "";
      if (fnId) {
        const card = scrollContainerRef.querySelector(`#${CSS.escape(fnId)}`);
        if (card) {
          const tagEl = card.querySelector(".footnote-card-tag");
          const bodyEl = card.querySelector(".footnote-card-body") || card;
          const rect = noteref.getBoundingClientRect();
          const showAbove = rect.bottom + 120 > window.innerHeight;

          setTooltip({
            visible: true,
            x: rect.left + rect.width / 2,
            y: showAbove ? Math.max(10, rect.top - 8) : rect.bottom + 8,
            showAbove,
            tag: tagEl?.textContent?.trim() || "",
            body: bodyEl.textContent?.trim() || "",
          });
        }
      }
      return;
    }

    const card = target.closest("aside.footnote-card, aside.footnote");
    if (card?.id && scrollContainerRef) {
      const rawId = card.id.replace(/^fn-/, "");
      const matchingRef = scrollContainerRef.querySelector(
        `.noteref[data-fn-id="${CSS.escape(card.id)}"], #fnref-${CSS.escape(rawId)}, a[href="#${CSS.escape(card.id)}"]`
      );
      if (matchingRef) {
        matchingRef.classList.add("noteref-highlighted");
      }
    }
  };

  const handleEditorMouseOut = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const related = e.relatedTarget as HTMLElement | null;
    if (!target) return;

    const noteref = target.closest(".noteref, [data-fn-id], a[href*='#fn-']");
    if (noteref && (!related || !noteref.contains(related))) {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }

    const card = target.closest("aside.footnote-card, aside.footnote");
    if (card && (!related || !card.contains(related))) {
      scrollContainerRef?.querySelectorAll(".noteref-highlighted").forEach((el) => {
        el.classList.remove("noteref-highlighted");
      });
    }
  };

  const insertFootnote = () => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const nextNum = getNextFootnoteNumber(currentHtml);

    const prevScrollTop = scrollContainerRef?.scrollTop;

    const { state: pmState } = editor;
    const { selection } = pmState;
    const { $to, empty } = selection;

    const placeholderText = t("editor.footnotePlaceholder");
    const refHtml = `<span id="fnref-${nextNum}" class="noteref" data-fn-id="fn-${nextNum}" role="doc-noteref"><sup>[${nextNum}]</sup></span>`;
    const cardHtml = `<aside id="fn-${nextNum}" class="footnote-card" epub:type="footnote" role="doc-footnote"><div class="footnote-card-tag">Nota ${nextNum}</div><div class="footnote-card-body" data-placeholder="${placeholderText}"></div></aside>`;

    let blockDepth = $to.depth;
    while (blockDepth > 1 && $to.node(blockDepth).type.name !== "footnoteCard") {
      blockDepth--;
    }
    let targetPos = blockDepth > 0 ? $to.after(blockDepth) : $to.pos;
    while (targetPos < editor.state.doc.content.size) {
      const nextNode = editor.state.doc.nodeAt(targetPos);
      if (nextNode && nextNode.type.name === "footnoteCard") {
        targetPos += nextNode.nodeSize;
      } else {
        break;
      }
    }

    if (empty) {
      editor.chain().insertContent(refHtml).insertContentAt(targetPos, cardHtml).run();
    } else {
      editor.chain().setTextSelection($to.pos).insertContent(refHtml).insertContentAt(targetPos, cardHtml).run();
    }

    if (prevScrollTop !== undefined && scrollContainerRef) {
      scrollContainerRef.scrollTop = prevScrollTop;
      requestAnimationFrame(() => {
        if (scrollContainerRef && prevScrollTop !== undefined) {
          scrollContainerRef.scrollTop = prevScrollTop;
        }
      });
    }
  };

  const handleEditorClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const noteref = target.closest(".noteref, [data-fn-id], a[href*='#fn-']");
    if (noteref && scrollContainerRef) {
      e.preventDefault();
      e.stopPropagation();

      const fnId =
        noteref.getAttribute("data-fn-id") ||
        noteref.getAttribute("id")?.replace(/^fnref-/, "fn-") ||
        noteref.getAttribute("href")?.replace(/^#/, "") ||
        "";
      if (fnId) {
        const card = scrollContainerRef.querySelector(`#${CSS.escape(fnId)}`);
        if (card instanceof HTMLElement) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("ring-2", "ring-primary", "transition-all");
          setTimeout(() => {
            card.classList.remove("ring-2", "ring-primary");
          }, 1500);
        }
      }
      return;
    }

    const backlink = target.closest(
      "aside.footnote-card a, aside[epub\\:type='footnote'] a, aside.footnote-card .footnote-card-tag"
    );
    if (backlink && scrollContainerRef) {
      e.preventDefault();
      e.stopPropagation();
      const card = backlink.closest("aside");
      const refId = card?.id ? `fnref-${card.id.replace(/^fn-/, "")}` : "";
      if (refId) {
        const refEl = scrollContainerRef.querySelector(
          `#${CSS.escape(refId)}, .noteref[data-fn-id="${CSS.escape(card?.id || "")}"]`
        );
        if (refEl instanceof HTMLElement) {
          refEl.scrollIntoView({ behavior: "smooth", block: "center" });
          refEl.classList.add("noteref-highlighted");
          setTimeout(() => {
            refEl.classList.remove("noteref-highlighted");
          }, 1500);
        }
      }
    }
  };

  const [scrollProgress, setScrollProgress] = createSignal(0);

  const wordCount = createMemo(() => {
    const content = activeSection()?.htmlContent || "";
    const clean = content.replace(/<[^>]*>/g, " ").trim();
    if (!clean) return 0;
    return clean.split(/\s+/).length;
  });

  const handleScroll = () => {
    if (tooltip().visible) {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
    updatePopoverPosition();
    if (!scrollContainerRef) return;

    const total = scrollContainerRef.scrollHeight - scrollContainerRef.clientHeight;
    const fraction = total > 0 ? scrollContainerRef.scrollTop / total : 0;
    setScrollProgress(Math.min(100, Math.max(0, Math.round(fraction * 100))));

    if (!state.syncScroll || !props.onScrollFraction) return;
    if (isProgrammaticScroll) return;

    if (Math.abs(fraction - lastReportedFraction) < 0.002) return;

    lastReportedFraction = fraction;
    props.onScrollFraction(fraction);
  };

  createEffect(() => {
    const fraction = props.scrollFraction;
    if (typeof fraction === "number" && !Number.isNaN(fraction)) {
      setScrollProgress(Math.min(100, Math.max(0, Math.round(fraction * 100))));
    }
    if (typeof fraction === "number" && state.syncScroll && scrollContainerRef) {
      const total = scrollContainerRef.scrollHeight - scrollContainerRef.clientHeight;
      const targetY = total * fraction;
      if (Math.abs(scrollContainerRef.scrollTop - targetY) > 2) {
        isProgrammaticScroll = true;
        scrollContainerRef.scrollTop = targetY;
        requestAnimationFrame(() => {
          isProgrammaticScroll = false;
        });
      }
    }
  });

  const selectedCorrection = createMemo(() => {
    const id = state.selectedCorrectionId;
    if (!id) return null;
    return state.spellCorrections.find((c) => c.id === id) || null;
  });

  const [popoverPos, setPopoverPos] = createSignal<{
    visible: boolean;
    x: number;
    y: number;
    showAbove: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    showAbove: false,
  });

  let popoverElRef: HTMLDivElement | undefined;
  const [dragPos, setDragPos] = createSignal<{ x: number; y: number } | null>(null);

  const handleNavbarPointerDown = (e: PointerEvent) => {
    if (!editorContainerRef || !popoverElRef) return;
    e.preventDefault();
    e.stopPropagation();

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;

    const currentRect = popoverElRef.getBoundingClientRect();
    const initialCenterX = currentRect.left + currentRect.width / 2;
    const initialCenterY = currentRect.top + currentRect.height / 2;

    const onPointerMove = (ev: PointerEvent) => {
      if (!editorContainerRef || !popoverElRef) return;
      const editorRect = editorContainerRef.getBoundingClientRect();

      const deltaX = ev.clientX - startPointerX;
      const deltaY = ev.clientY - startPointerY;

      const candidateCenterX = initialCenterX + deltaX;
      const candidateCenterY = initialCenterY + deltaY;

      const clampedCenterX = Math.max(editorRect.left, Math.min(editorRect.right, candidateCenterX));
      const clampedCenterY = Math.max(editorRect.top, Math.min(editorRect.bottom, candidateCenterY));

      setDragPos({ x: clampedCenterX, y: clampedCenterY });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const updatePopoverPosition = () => {
    const corr = selectedCorrection();
    if (!corr || !editorContainerRef) {
      if (popoverPos().visible) {
        setPopoverPos((prev) => ({ ...prev, visible: false }));
      }
      return;
    }
    const el = editorContainerRef.querySelector(`[data-spell-corr-id="${corr.id}"]`);
    if (el instanceof HTMLElement) {
      const rect = el.getBoundingClientRect();
      const showAbove = rect.bottom + 160 > window.innerHeight;
      setPopoverPos({
        visible: true,
        x: rect.left + rect.width / 2,
        y: showAbove ? Math.max(10, rect.top - 8) : rect.bottom + 8,
        showAbove,
      });
    } else {
      setPopoverPos((prev) => ({ ...prev, visible: false }));
    }
  };

  createEffect(() => {
    const _sel = state.selectedCorrectionId;
    const _corrs = state.spellCorrections;
    const _secId = state.activeSectionId;
    if (editor && !editor.isDestroyed) {
      const { tr } = editor.state;
      editor.view.dispatch(tr.setMeta(spellPluginKey, true));
    }
  });

  const scrollToCorrection = (corrId: string) => {
    if (scrollCorrectionTimer !== null) {
      window.clearTimeout(scrollCorrectionTimer);
      scrollCorrectionTimer = null;
    }
    if (scrollVerifyTimer !== null) {
      window.clearTimeout(scrollVerifyTimer);
      scrollVerifyTimer = null;
    }

    let attempts = 0;
    const maxAttempts = 25;

    const attemptScroll = () => {
      if (!scrollContainerRef || !editorContainerRef) return;
      const el = editorContainerRef.querySelector(`[data-spell-corr-id="${corrId}"]`);

      let targetRect: DOMRect | null = null;
      if (el instanceof HTMLElement) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 || r.width > 0) {
          targetRect = r;
        }
      }

      if (!targetRect && editor && !editor.isDestroyed) {
        const corr = state.spellCorrections.find((c) => c.id === corrId);
        if (corr) {
          const doc = editor.state.doc;
          let foundPos = -1;
          let bestScore = -1;

          const esc = corr.originalToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const startsWord = /^[\p{L}\p{N}]/u.test(corr.originalToken);
          const endsWord = /[\p{L}\p{N}]$/u.test(corr.originalToken);
          const regex = new RegExp(
            `${startsWord ? "(?<![\\p{L}\\p{N}])" : ""}${esc}${endsWord ? "(?![\\p{L}\\p{N}])" : ""}`,
            "gu"
          );

          const snip = corr.contextSnippet
            ? corr.contextSnippet.replace(/^[.…\s]+|[.…\s]+$/g, "").trim()
            : "";
          const para = corr.paragraphBefore ? corr.paragraphBefore.trim() : "";

          doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;
            regex.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = regex.exec(node.text)) !== null) {
              const candidatePos = pos + match.index;
              let score = 1;
              try {
                const resolved = doc.resolve(candidatePos);
                const blockText = resolved.parent ? resolved.parent.textContent : "";
                if (snip && blockText.includes(snip)) {
                  score = 10;
                } else if (para && blockText.includes(para)) {
                  score = 8;
                }
              } catch {}

              if (score > bestScore) {
                bestScore = score;
                foundPos = candidatePos;
                if (score === 10) return false;
              }
            }
          });

          if (foundPos !== -1) {
            try {
              const coords = editor.view.coordsAtPos(foundPos);
              targetRect = new DOMRect(coords.left, coords.top, 20, coords.bottom - coords.top);
            } catch {}
          }
        }
      }

      if (!targetRect) {
        attempts++;
        if (attempts < maxAttempts) {
          scrollCorrectionTimer = window.setTimeout(attemptScroll, 35);
        }
        return;
      }

      const container = scrollContainerRef;
      const containerRect = container.getBoundingClientRect();
      const currentScrollTop = container.scrollTop;

      const targetCenterY = targetRect.top + targetRect.height / 2;
      const containerCenterY = containerRect.top + containerRect.height / 2;
      const deltaY = targetCenterY - containerCenterY;

      const maxScroll = container.scrollHeight - container.clientHeight;
      const desiredScrollTop = Math.max(0, Math.min(maxScroll, Math.round(currentScrollTop + deltaY)));

      isProgrammaticScroll = true;
      container.scrollTo({
        top: desiredScrollTop,
        behavior: "smooth",
      });

      scrollVerifyTimer = window.setTimeout(() => {
        if (!scrollContainerRef || !editorContainerRef) {
          isProgrammaticScroll = false;
          return;
        }
        const verifyEl = editorContainerRef.querySelector(`[data-spell-corr-id="${corrId}"]`);
        if (verifyEl instanceof HTMLElement) {
          const vr = verifyEl.getBoundingClientRect();
          const cr = scrollContainerRef.getBoundingClientRect();
          const vCenter = vr.top + vr.height / 2;
          const cCenter = cr.top + cr.height / 2;
          const vDelta = vCenter - cCenter;
          if (Math.abs(vDelta) > 4) {
            const vMax = scrollContainerRef.scrollHeight - scrollContainerRef.clientHeight;
            const finalScrollTop = Math.max(0, Math.min(vMax, Math.round(scrollContainerRef.scrollTop + vDelta)));
            scrollContainerRef.scrollTo({
              top: finalScrollTop,
              behavior: "auto",
            });
          }
        }
        updatePopoverPosition();
        window.setTimeout(() => {
          isProgrammaticScroll = false;
        }, 80);
      }, 300);
    };

    attemptScroll();
  };

  createEffect(() => {
    const trigger = correctionScrollTrigger();
    const corr = selectedCorrection();
    setDragPos(null);
    if (!corr || corr.applied || corr.ignored) {
      setPopoverPos((prev) => ({ ...prev, visible: false }));
      return;
    }

    const corrId = trigger?.id || corr.id;
    scrollToCorrection(corrId);
  });

  const insertDialogueDash = () => {
    editor?.chain().focus().insertContent("—").run();
  };

  const insertSceneBreak = () => {
    editor?.chain().focus().insertContent({ type: "sceneBreak" }).run();
  };

  const [breakDialog, setBreakDialog] = createSignal<{
    isOpen: boolean;
    isUnified: boolean;
    pos: number;
    currentSymbol: string;
    newSymbol: string;
  }>({
    isOpen: false,
    isUnified: false,
    pos: 0,
    currentSymbol: "◆ ◇ ◆ ◇ ◆",
    newSymbol: "◆ ◇ ◆ ◇ ◆",
  });

  createEffect(() => {
    const unified = state.unifyBreaks;
    const sym = state.unifiedBreakSymbol;
    if (!scrollContainerRef) return;
    const breaks = scrollContainerRef.querySelectorAll(".scene-break, [data-scene-break]");
    breaks.forEach((el) => {
      if (unified && sym) {
        el.textContent = sym;
      } else {
        const custom = el.getAttribute("data-symbol") || "◆ ◇ ◆ ◇ ◆";
        el.textContent = custom;
      }
    });
  });

  const handleEditorDblClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const breakEl = target.closest(".scene-break, [data-scene-break]") as HTMLElement | null;
    if (!breakEl || !editor) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      const pos = editor.view.posAtDOM(breakEl, 0);
      const node = editor.state.doc.nodeAt(pos);
      const symbol =
        breakEl.getAttribute("data-symbol") ||
        breakEl.textContent?.trim() ||
        (node?.attrs?.symbol as string | undefined) ||
        "◆ ◇ ◆ ◇ ◆";

      setBreakDialog({
        isOpen: true,
        isUnified: state.unifyBreaks,
        pos,
        currentSymbol: symbol,
        newSymbol: symbol,
      });
    } catch {
      // Fallback
    }
  };

  const handleSaveBreak = (symbol: string) => {
    const dialog = breakDialog();
    if (!editor || !dialog.isOpen) return;
    const trimmed = symbol.trim() || "◆ ◇ ◆ ◇ ◆";
    try {
      editor
        .chain()
        .focus()
        .setNodeSelection(dialog.pos)
        .deleteSelection()
        .insertContent({
          type: "sceneBreak",
          attrs: { symbol: trimmed },
        })
        .run();
    } catch {
      // Fallback
    }
    setBreakDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const handleDeleteBreak = () => {
    const dialog = breakDialog();
    if (!editor || !dialog.isOpen) return;
    try {
      editor.chain().focus().setNodeSelection(dialog.pos).deleteSelection().run();
    } catch {
      // Fallback
    }
    setBreakDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const isSepia = () => state.readerSettings.theme === "sepia";
  const readerCssVarsString = createMemo(() => {
    const vars = readerSettingsToCssVariables(state.readerSettings);
    return Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");
  });

  const discardedImageStyles = createMemo(() => {
    const discarded = state.images.filter((img) => img.isDiscarded);
    if (!discarded.length) return "";
    const selectors: string[] = [];
    for (const img of discarded) {
      if (img.url) {
        selectors.push(`.novel-editor-content img[src="${img.url.replace(/"/g, '\\"')}"]`);
      }
      if (img.name) {
        selectors.push(`.novel-editor-content img[src*="${img.name.replace(/"/g, '\\"')}"]`);
      }
    }
    if (!selectors.length) return "";
    return `${selectors.join(",\n")} { display: none !important; margin: 0 !important; height: 0 !important; max-height: 0 !important; padding: 0 !important; border: none !important; pointer-events: none !important; }`;
  });

  interface ParagraphTarget {
    pos: number;
    node: { attrs: Record<string, unknown> };
    hasDropCap: boolean;
  }

  const getSelectedParagraphs = (): ParagraphTarget[] => {
    editorRevision();
    if (!editor) return [];
    const { state: editorState } = editor.view;
    const { from, to } = editorState.selection;
    const paragraphs: ParagraphTarget[] = [];

    editorState.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === "paragraph") {
        const cls = (node.attrs.class as string) || "";
        const classList = cls.split(/\s+/).filter(Boolean);
        paragraphs.push({
          pos,
          node: node as unknown as { attrs: Record<string, unknown> },
          hasDropCap: classList.includes("drop-cap"),
        });
      }
    });

    if (paragraphs.length === 0 && editorState.selection.$from) {
      const $from = editorState.selection.$from;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === "paragraph") {
          const pos = $from.before(d);
          const cls = (node.attrs.class as string) || "";
          const classList = cls.split(/\s+/).filter(Boolean);
          paragraphs.push({
            pos,
            node: node as unknown as { attrs: Record<string, unknown> },
            hasDropCap: classList.includes("drop-cap"),
          });
          break;
        }
      }
    }

    return paragraphs;
  };

  const isDropCapActive = (): boolean => {
    const paragraphs = getSelectedParagraphs();
    return paragraphs.length > 0 && paragraphs.every((p) => p.hasDropCap);
  };

  const toggleDropCap = () => {
    if (!editor) return;
    const paragraphs = getSelectedParagraphs();
    if (paragraphs.length === 0) return;

    const anyWithoutDropCap = paragraphs.some((p) => !p.hasDropCap);
    const shouldAdd = anyWithoutDropCap;

    const { state: editorState, dispatch } = editor.view;
    const tr = editorState.tr;

    for (const { pos, node, hasDropCap } of paragraphs) {
      const cls = (node.attrs.class as string) || "";
      const classList = cls.split(/\s+/).filter(Boolean);

      if (shouldAdd && !hasDropCap) {
        classList.push("drop-cap");
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          class: classList.join(" "),
        });
      } else if (!shouldAdd && hasDropCap) {
        const filtered = classList.filter((c) => c !== "drop-cap");
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          class: filtered.length > 0 ? filtered.join(" ") : null,
        });
      }
    }

    if (tr.docChanged) {
      dispatch(tr);
      setEditorRevision((r) => r + 1);
      editor.commands.focus();
      const currentId = state.activeSectionId;
      if (currentId) {
        if (updateTimer !== null) {
          window.clearTimeout(updateTimer);
          updateTimer = null;
        }
        isInternalDocUpdate = true;
        updateSectionHtml(currentId, editor.getHTML());
      }
    }
  };

  const toggleCenterAlign = () => {
    if (!editor) return;

    if (editor.isActive("heading")) {
      const isExplicitLeft = editor.isActive("heading", { textAlign: "left" });
      const newAlign = isExplicitLeft ? "center" : "left";
      editor.chain().focus().updateAttributes("heading", { textAlign: newAlign }).run();
      return;
    }

    const isCentered = editor.isActive("paragraph", { textAlign: "center" });
    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", { textAlign: isCentered ? null : "center" })
      .run();
  };

  const canUndo = () => {
    editorRevision();
    return editor?.can().undo() ?? false;
  };

  const canRedo = () => {
    editorRevision();
    return editor?.can().redo() ?? false;
  };

  const [editorContextMenu, setEditorContextMenu] = createSignal<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  const [sceneBreakContextTarget, setSceneBreakContextTarget] = createSignal<{
    pos: number;
    symbol: string;
  } | null>(null);

  const [isContextMenuCaseOpen, setIsContextMenuCaseOpen] = createSignal(false);
  const [isCaseDropdownUpwards, setIsCaseDropdownUpwards] = createSignal(false);
  let contextMenuCaseRef: HTMLDivElement | undefined;

  const toggleContextMenuCase = (e: MouseEvent) => {
    e.stopPropagation();
    if (contextMenuCaseRef) {
      const rect = contextMenuCaseRef.getBoundingClientRect();
      setIsCaseDropdownUpwards(window.innerHeight - rect.bottom < 150);
    }
    setIsContextMenuCaseOpen((prev) => !prev);
  };

  const closeEditorContextMenu = () => {
    setEditorContextMenu((prev) => ({ ...prev, isOpen: false }));
    setIsContextMenuCaseOpen(false);
    setSceneBreakContextTarget(null);
  };

  const handleEditSceneBreakFromContextMenu = () => {
    const target = sceneBreakContextTarget();
    if (!target) return;
    closeEditorContextMenu();
    setBreakDialog({
      isOpen: true,
      isUnified: state.unifyBreaks,
      pos: target.pos,
      currentSymbol: target.symbol,
      newSymbol: target.symbol,
    });
  };

  const handleDeleteSceneBreakFromContextMenu = () => {
    const target = sceneBreakContextTarget();
    if (!target || !editor) return;
    closeEditorContextMenu();
    try {
      editor.chain().focus().setNodeSelection(target.pos).deleteSelection().run();
    } catch {}
  };

  const handleEditorContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (!editor) return;

    const target = e.target as HTMLElement | null;
    const breakEl = target?.closest(".scene-break, [data-scene-break]") as HTMLElement | null;

    let isBreak = false;
    let breakPos = 0;
    let breakSymbol = "◆ ◇ ◆ ◇ ◆";

    if (breakEl && editor) {
      try {
        breakPos = editor.view.posAtDOM(breakEl, 0);
        const node = editor.state.doc.nodeAt(breakPos);
        if (node?.type.name === "sceneBreak" || breakEl.classList.contains("scene-break")) {
          isBreak = true;
          breakSymbol =
            breakEl.getAttribute("data-symbol") ||
            breakEl.textContent?.trim() ||
            (node?.attrs?.symbol as string | undefined) ||
            "◆ ◇ ◆ ◇ ◆";
        }
      } catch {}
    }

    if (!isBreak && editor?.view) {
      const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (coords) {
        const node = editor.state.doc.nodeAt(coords.pos);
        if (node?.type.name === "sceneBreak") {
          isBreak = true;
          breakPos = coords.pos;
          breakSymbol = (node.attrs.symbol as string) || "◆ ◇ ◆ ◇ ◆";
        }
      }
    }

    if (isBreak) {
      editor?.chain().setNodeSelection(breakPos).focus().run();
      setSceneBreakContextTarget({ pos: breakPos, symbol: breakSymbol });
    } else {
      setSceneBreakContextTarget(null);
      const { from, to } = editor.state.selection;
      const hasSel = from !== to;

      if (editor.view) {
        const coords = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
        if (coords) {
          if (!hasSel || coords.pos < from || coords.pos > to) {
            editor.chain().setTextSelection(coords.pos).focus().run();
          }
        }
      }
    }

    setEditorRevision((r) => r + 1);

    setEditorContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const hasSelection = () => {
    editorRevision();
    if (!editor) return false;
    const { from, to } = editor.state.selection;
    return from !== to;
  };

  const handleCopy = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, "\n\n");
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        document.execCommand("copy");
      }
    }
    closeEditorContextMenu();
  };

  const handleCut = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, "\n\n");
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        document.execCommand("cut");
      }
      editor.chain().focus().deleteSelection().run();
    }
    closeEditorContextMenu();
  };

  const handlePastePlainText = async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.chain().focus().insertContent(text).run();
      }
    } catch (err) {
      console.warn("Unable to read clipboard:", err);
    }
    closeEditorContextMenu();
  };

  const handleDelete = () => {
    if (!editor) return;
    editor.chain().focus().deleteSelection().run();
    closeEditorContextMenu();
  };

  const handleSelectAll = () => {
    if (!editor) return;
    editor.chain().focus().selectAll().run();
    closeEditorContextMenu();
  };

  const [isCaseMenuOpen, setIsCaseMenuOpen] = createSignal(false);
  let caseMenuRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (!isCaseMenuOpen()) return;
    const handleDown = (e: MouseEvent) => {
      if (caseMenuRef && !caseMenuRef.contains(e.target as Node)) {
        setIsCaseMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCaseMenuOpen(false);
    };
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("keydown", handleKey);
    onCleanup(() => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("keydown", handleKey);
    });
  });

  const applyChangeCase = (type: "lower" | "upper" | "title" | "sentence") => {
    setIsCaseMenuOpen(false);
    closeEditorContextMenu();
    if (!editor) return;
    const { state, dispatch } = editor.view;
    const { from, to } = state.selection;
    if (from === to) return;

    const fullText = state.doc.textBetween(from, to, "\n");
    if (!fullText) return;

    let transformedFull = "";
    if (type === "lower") {
      transformedFull = fullText.toLocaleLowerCase("es");
    } else if (type === "upper") {
      transformedFull = fullText.toLocaleUpperCase("es");
    } else if (type === "title") {
      transformedFull = fullText
        .toLocaleLowerCase("es")
        .replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_, p1, p2) => p1 + p2.toLocaleUpperCase("es"));
    } else if (type === "sentence") {
      transformedFull = fullText
        .toLocaleLowerCase("es")
        .replace(
          /(^|[.!?\n]\s*|[¿¡]\s*)([«"“'—–-]*\s*)(\p{L})/gu,
          (_, p1, p2, p3) => `${p1}${p2}${p3.toLocaleUpperCase("es")}`
        );
    }

    const tr = state.tr;
    let textOffset = 0;

    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText && node.text) {
        const nodeStart = pos;
        const nodeEnd = pos + node.nodeSize;
        const intersectFrom = Math.max(from, nodeStart);
        const intersectTo = Math.min(to, nodeEnd);

        if (intersectFrom < intersectTo) {
          const sliceLen = intersectTo - intersectFrom;
          const transformedSlice = transformedFull.slice(textOffset, textOffset + sliceLen);
          textOffset += sliceLen;

          const mappedFrom = tr.mapping.map(intersectFrom);
          const mappedTo = tr.mapping.map(intersectTo);
          tr.replaceWith(mappedFrom, mappedTo, state.schema.text(transformedSlice, node.marks));
        }
      } else if (node.isBlock && pos > from && pos < to) {
        textOffset += 1;
      }
    });

    if (tr.docChanged) {
      tr.setSelection(state.selection);
      dispatch(tr.scrollIntoView());
      setEditorRevision((r) => r + 1);
    }
  };

  return (
    <div
      class={`flex-1 flex flex-col h-full border-r overflow-hidden relative transition-colors duration-200 ${
        isSepia()
          ? "bg-[#fbf0d9] border-[#ebd9b8] text-[#433422]"
          : "bg-background border-border text-foreground"
      }`}
    >
      <div
        ref={toolbarContainerRef}
        class={`border-b ${isSlimToolbar() ? "px-2" : "px-3"} flex items-center justify-between text-xs shrink-0 transition-all duration-200 ${
          isCompactToolbar() ? "py-1 min-h-[58px]" : "h-10"
        } ${
          isSepia() ? "bg-[#f4e5c8] border-[#ebd9b8] text-[#433422]" : "border-border bg-card/60"
        }`}
      >
        <div class={`flex items-center ${isSlimToolbar() ? "gap-0.5" : "gap-1"}`}>
          <div class={`flex ${isCompactToolbar() ? "flex-col gap-0.5" : "flex-row items-center gap-1"}`}>
            <div class="flex items-center gap-1">
              <button
                type="button"
                disabled={!canUndo()}
                onClick={() => editor?.chain().focus().undo().run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors cursor-pointer`}
                title={t("editor.undo")}
                aria-label={t("editor.undo")}
              >
                <Undo2 class="w-4 h-4" />
              </button>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                disabled={!canRedo()}
                onClick={() => editor?.chain().focus().redo().run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors cursor-pointer`}
                title={t("editor.redo")}
                aria-label={t("editor.redo")}
              >
                <Redo2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class={`${isCompactToolbar() ? "h-11" : "h-4"} w-px bg-border ${isSlimToolbar() ? "mx-0.5" : "mx-1"} self-center transition-all`} />

          <div class={`flex ${isCompactToolbar() ? "flex-col gap-0.5" : "flex-row items-center gap-1"}`}>
            <div class="flex items-center gap-1">
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded transition-colors cursor-pointer ${
                  editorRevision() >= 0 && editor?.isActive("bold")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title={t("editor.bold")}
              >
                <Bold class="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded transition-colors cursor-pointer ${
                  editorRevision() >= 0 && editor?.isActive("italic")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title={t("editor.italic")}
              >
                <Italic class="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleMark("underline").run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded transition-colors cursor-pointer ${
                  editorRevision() >= 0 && editor?.isActive("underline")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title={t("editor.underline")}
              >
                <Underline class="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded transition-colors cursor-pointer ${
                  editorRevision() >= 0 && editor?.isActive("strike")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title={t("editor.strike")}
              >
                <Strikethrough class="w-4 h-4" />
              </button>
            </div>
            <div class="flex items-center gap-1">
              <div class="relative" ref={caseMenuRef}>
                <button
                  type="button"
                  disabled={!hasSelection()}
                  onClick={() => setIsCaseMenuOpen((prev) => !prev)}
                  class={`${isCompactToolbar() ? "px-1 py-0.5" : "px-1.5 py-1"} rounded flex items-center gap-0.5 transition-colors cursor-pointer ${
                    isCaseMenuOpen()
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={t("editor.changeCase")}
                  aria-label={t("editor.changeCase")}
                >
                  <ALargeSmall class="w-4 h-4" />
                  <ChevronDown class="w-3 h-3 opacity-70" />
                </button>

                <Show when={isCaseMenuOpen()}>
                  <div
                    class="absolute top-full left-0 mt-1 z-50 w-52 rounded-xl border border-border bg-popover/95 text-popover-foreground p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div class="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => applyChangeCase("sentence")}
                        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
                      >
                        <span class="font-serif font-bold text-xs w-4 text-center">Aa</span>
                        <span>{t("editor.sentenceCase")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyChangeCase("lower")}
                        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
                      >
                        <CaseLower class="w-3.5 h-3.5 opacity-80" />
                        <span>{t("editor.lowercase")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyChangeCase("upper")}
                        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
                      >
                        <CaseUpper class="w-3.5 h-3.5 opacity-80" />
                        <span>{t("editor.uppercase")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyChangeCase("title")}
                        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
                      >
                        <CaseSensitive class="w-3.5 h-3.5 opacity-80" />
                        <span>{t("editor.titleCase")}</span>
                      </button>
                    </div>
                  </div>
                </Show>
              </div>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded transition-colors cursor-pointer ${
                  editorRevision() >= 0 && editor?.isActive("blockquote")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title={t("editor.blockquote")}
              >
                <Quote class="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleDropCap}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded transition-colors cursor-pointer ${
                  isDropCapActive()
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title={t("editor.dropCap")}
              >
                <LetterText class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class={`${isCompactToolbar() ? "h-11" : "h-4"} w-px bg-border ${isSlimToolbar() ? "mx-0.5" : "mx-1"} self-center transition-all`} />

          <div class={`flex ${isCompactToolbar() ? "flex-col gap-0.5" : "flex-row items-center gap-1"}`}>
            <div class="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleCenterAlign}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer`}
                title={t("editor.centerAlign")}
              >
                <AlignCenter class="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleMark("superscript").run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer`}
                title={t("editor.superscript")}
              >
                <SupIcon class="w-4 h-4" />
              </button>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleMark("subscript").run()}
                class={`${isCompactToolbar() ? "p-1" : "p-1.5"} rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer`}
                title={t("editor.subscript")}
              >
                <SubIcon class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class={`${isCompactToolbar() ? "h-11" : "h-4"} w-px bg-border ${isSlimToolbar() ? "mx-0.5" : "mx-1"} self-center transition-all`} />

          <div class={`flex ${isCompactToolbar() ? "flex-col gap-0.5" : "flex-row items-center gap-1"}`}>
            <div class="flex items-center gap-1">
              <button
                type="button"
                onClick={insertSceneBreak}
                class={`inline-flex items-center justify-center ${isCompactToolbar() ? "p-1" : "p-1.5"} rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer`}
                title={t("editor.insertSceneBreak")}
              >
                <SeparatorHorizontal class="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={insertDialogueDash}
                class={`inline-flex items-center gap-1 ${isCompactToolbar() ? "px-1.5 py-0.5" : "px-2 py-1"} rounded text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-mono font-bold cursor-pointer`}
                title={t("editor.insertDialogueDash")}
              >
                <span>{t("editor.dialogueDashLabel")}</span>
              </button>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                onClick={insertFootnote}
                class={`inline-flex items-center gap-1 ${isCompactToolbar() ? "px-1.5 py-0.5" : "px-2 py-1"} rounded text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer`}
                title={t("editor.insertFootnote")}
              >
                <BookMarked class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div class={`flex ${isCompactToolbar() ? "flex-col gap-0.5 items-end" : "flex-row items-center gap-1.5"}`}>
          <div class="flex items-center gap-1.5">
            <Show when={state.isProcessing}>
              <span
                class="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                title={t("editor.applyingRules")}
              >
                <RefreshCw class="w-3.5 h-3.5 text-primary animate-spin" />
                <span class={isSlimToolbar() || isCompactToolbar() ? "hidden" : "inline"}>
                  {t("editor.applyingRules")}
                </span>
              </span>
            </Show>

            <button
              type="button"
              onClick={() => (isSearchOpen() ? closeSearch() : openSearch())}
              class={`rounded-md transition-colors cursor-pointer ${isCompactToolbar() ? "p-1" : "p-1.5"} ${
                isSearchOpen()
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              title={t("editor.searchTitle")}
              aria-label={t("editor.searchAria")}
            >
              <Search class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleReaderSettings()}
              class={`rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer ${isCompactToolbar() ? "p-1" : "p-1.5"}`}
              title={t("reader.readerCustomizer")}
              aria-label={t("reader.openReaderSettings")}
            >
              <Settings class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div class="absolute top-12 right-6 z-40">
        <SearchBar
          isOpen={isSearchOpen()}
          query={searchQuery()}
          onQueryChange={handleSearchInput}
          onNext={() => {
            editor?.commands.goToNextResult();
            setEditorRevision((r) => r + 1);
            scrollToCurrentSearchResult();
          }}
          onPrev={() => {
            editor?.commands.goToPreviousResult();
            setEditorRevision((r) => r + 1);
            scrollToCurrentSearchResult();
          }}
          onClose={closeSearch}
          currentIndex={currentSearchIndex() ?? undefined}
          totalMatches={searchResultsCount()}
          caseSensitive={caseSensitive()}
          onToggleCaseSensitive={toggleCaseSensitive}
          placeholder={t("search.editorPlaceholder")}
        />
      </div>

      <div
        id="novel-editor-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseOver={handleEditorMouseOver}
        onMouseOut={handleEditorMouseOut}
        onClick={handleEditorClick}
        onDblClick={handleEditorDblClick}
        onContextMenu={handleEditorContextMenu}
        onFocus={() => {}}
        onBlur={() => {}}
        class={`flex-1 overflow-y-auto transition-colors duration-200 ${
          isSepia() ? "bg-[#fbf0d9] text-[#433422] theme-sepia" : "bg-background text-foreground"
        }`}
        style={readerCssVarsString()}
      >
        <Show when={discardedImageStyles().length > 0}>
          <style>{discardedImageStyles()}</style>
        </Show>

        <Show when={!activeSection() && state.isProcessing}>
          <div class="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-pulse">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <BookOpen class="w-6 h-6 animate-pulse" />
            </div>
            <h3 class="text-sm font-semibold text-foreground">
              {t("stepFiles.parsingBackground")}
            </h3>
            <p class="text-xs text-muted-foreground mt-1 max-w-sm">
              {t("editor.extractingChapters")}
            </p>
            <div class="mt-6 w-full max-w-md space-y-3">
              <div class="h-4 bg-muted rounded w-3/4 mx-auto" />
              <div class="h-3 bg-muted/60 rounded w-full" />
              <div class="h-3 bg-muted/60 rounded w-5/6 mx-auto" />
            </div>
          </div>
        </Show>

        <div
          ref={editorContainerRef}
          role="presentation"
          spellcheck={false}
          class={`novel-container mx-auto transition-all duration-200 cursor-text ${
            !activeSection() && state.isProcessing ? "hidden" : ""
          }`}
          style={{
            "box-sizing": "border-box",
            "max-width": "var(--reader-max-width, 44rem)",
            padding: "3rem var(--reader-padding-x, 2rem) 6rem",
          }}
          onClick={(e) => {
            if (e.target === editorContainerRef) {
              editor?.commands.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target === editorContainerRef) {
              editor?.commands.focus();
            }
          }}
        />
      </div>

      <div class="h-8 border-t border-border bg-card px-4 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <span class="truncate max-w-[280px]">{activeSection()?.title || state.metadata.title}</span>
        <div class="flex items-center gap-2 font-mono text-[11px]">
          <span>
            {wordCount()} {t("common.words")}
          </span>
          <span>•</span>
          <span>
            {scrollProgress()}% {t("common.read")}
          </span>
        </div>
        <div class="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            class="h-full bg-primary transition-all duration-150"
            style={{ width: `${scrollProgress()}%` }}
          />
        </div>
      </div>

      <Show when={tooltip().visible}>
        <div
          class={`fixed z-50 pointer-events-none -translate-x-1/2 ${
            tooltip().showAbove ? "-translate-y-full" : ""
          } rounded-lg p-2.5 max-w-xs text-xs shadow-xl border backdrop-blur-md transition-opacity duration-150`}
          style={{
            left: `${tooltip().x}px`,
            top: `${tooltip().y}px`,
            "background-color": "var(--reader-card-bg, #222)",
            color: "var(--reader-text, #fff)",
            "border-color": "var(--reader-border, #444)",
          }}
        >
          <Show when={tooltip().tag}>
            <div class="text-[11px] font-bold uppercase tracking-wider text-[var(--reader-muted)] mb-1">
              {tooltip().tag}
            </div>
          </Show>
          <div class="leading-relaxed whitespace-pre-wrap">{tooltip().body}</div>
        </div>
      </Show>
      <Show when={popoverPos().visible && selectedCorrection()}>
        {(corr) => (
          <div
            ref={popoverElRef}
            class={`fixed z-50 ${
              dragPos()
                ? ""
                : `-translate-x-1/2 ${popoverPos().showAbove ? "-translate-y-full" : ""}`
            } w-72 rounded-xl p-3 bg-popover text-popover-foreground border border-border shadow-2xl backdrop-blur-md flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 select-none`}
            style={
              dragPos()
                ? {
                    left: `${dragPos()!.x}px`,
                    top: `${dragPos()!.y}px`,
                    transform: "translate(-50%, -50%)",
                  }
                : {
                    left: `${popoverPos().x}px`,
                    top: `${popoverPos().y}px`,
                  }
            }
          >
            <div
              onPointerDown={handleNavbarPointerDown}
              class="flex items-center justify-between text-muted-foreground text-xs border-b border-border pb-2 cursor-grab active:cursor-grabbing select-none"
            >
              <div class="flex items-center gap-1.5 font-medium text-foreground">
                <SpellCheck2 class="w-3.5 h-3.5 text-primary" />
                <span>{t("correctionPanel.title")}</span>
              </div>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setSelectedCorrectionId(null)}
                class="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-semibold text-muted-foreground">
                {corr().category === "typo"
                  ? t("correctionPanel.typo")
                  : corr().category === "casing"
                  ? t("correctionPanel.casing")
                  : corr().category === "punctuation"
                  ? t("correctionPanel.punctuation")
                  : corr().category === "grammar"
                  ? t("correctionPanel.grammar")
                  : t("correctionPanel.style")}
              </span>
              <span class="text-xs text-foreground">
                {corr().contextSnippet
                  ? corr().contextSnippet
                  : `${corr().originalToken} → ${corr().replacementToken}`}
              </span>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap pt-1">
              <Show
                when={corr().suggestions && corr().suggestions!.length > 1}
                fallback={
                  <button
                    type="button"
                    onClick={() => applySingleCorrection(corr().id)}
                    class="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    {corr().replacementToken}
                  </button>
                }
              >
                <For each={corr().suggestions?.slice(0, 3)}>
                  {(sugg) => (
                    <button
                      type="button"
                      onClick={() => applySingleCorrection(corr().id, sugg)}
                      class="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      {sugg}
                    </button>
                  )}
                </For>
              </Show>
              <button
                type="button"
                onClick={() => addIgnoredWord(corr().originalToken)}
                class="p-1.5 rounded-full border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t("correctionPanel.addToDictionary")}
              >
                <BookPlus class="w-3.5 h-3.5 text-primary" />
              </button>
              <button
                type="button"
                onClick={() => ignoreSingleCorrection(corr().id)}
                class="p-1.5 rounded-full border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title={t("correctionPanel.discard")}
              >
                <CircleX class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </Show>

      <ContextMenu
        isOpen={editorContextMenu().isOpen}
        x={editorContextMenu().x}
        y={editorContextMenu().y}
        onClose={closeEditorContextMenu}
        floatingToolbar={
          !sceneBreakContextTarget() ? (
            <div class="flex items-center gap-0.5 overflow-x-auto select-none shrink-0 max-w-[calc(100vw-16px)]">
              <button
                type="button"
                disabled={!canUndo()}
                onClick={() => {
                  editor?.chain().focus().undo().run();
                  closeEditorContextMenu();
                }}
                class="p-1.5 rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground transition-colors cursor-pointer shrink-0"
                title={t("editor.undo")}
                aria-label={t("editor.undo")}
              >
                <Undo2 class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!canRedo()}
                onClick={() => {
                  editor?.chain().focus().redo().run();
                  closeEditorContextMenu();
                }}
                class="p-1.5 rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground transition-colors cursor-pointer shrink-0"
                title={t("editor.redo")}
                aria-label={t("editor.redo")}
              >
                <Redo2 class="w-3.5 h-3.5" />
              </button>

              <div class="h-4 w-px bg-border/80 mx-0.5 self-center shrink-0" />

              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().toggleBold().run();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  editorRevision() >= 0 && editor?.isActive("bold")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.bold")}
              >
                <Bold class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().toggleItalic().run();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  editorRevision() >= 0 && editor?.isActive("italic")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.italic")}
              >
                <Italic class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().toggleMark("underline").run();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  editorRevision() >= 0 && editor?.isActive("underline")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.underline")}
              >
                <Underline class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().toggleStrike().run();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  editorRevision() >= 0 && editor?.isActive("strike")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.strike")}
              >
                <Strikethrough class="w-3.5 h-3.5" />
              </button>

              <div class="relative" ref={contextMenuCaseRef}>
                <button
                  type="button"
                  disabled={!hasSelection()}
                  onClick={toggleContextMenuCase}
                  class={`p-1.5 rounded flex items-center gap-0.5 transition-colors cursor-pointer shrink-0 ${
                    isContextMenuCaseOpen()
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={t("editor.changeCase")}
                  aria-label={t("editor.changeCase")}
                >
                  <ALargeSmall class="w-3.5 h-3.5" />
                  <ChevronDown class="w-2.5 h-2.5 opacity-70" />
                </button>

                <Show when={isContextMenuCaseOpen()}>
                  <div
                    class={`absolute left-0 z-50 w-52 rounded-xl border border-border bg-popover/95 text-popover-foreground p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none text-xs ${
                      isCaseDropdownUpwards() ? "bottom-full mb-1" : "top-full mt-1"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div class="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          applyChangeCase("sentence");
                          closeEditorContextMenu();
                        }}
                        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
                      >
                        <span class="font-serif font-bold text-xs w-4 text-center">Aa</span>
                        <span>{t("editor.sentenceCase")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          applyChangeCase("lower");
                          closeEditorContextMenu();
                        }}
                        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
                      >
                        <CaseLower class="w-3.5 h-3.5 opacity-80" />
                        <span>{t("editor.lowercase")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          applyChangeCase("upper");
                          closeEditorContextMenu();
                        }}
                        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
                      >
                        <CaseUpper class="w-3.5 h-3.5 opacity-80" />
                        <span>{t("editor.uppercase")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          applyChangeCase("title");
                          closeEditorContextMenu();
                        }}
                        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
                      >
                        <CaseSensitive class="w-3.5 h-3.5 opacity-80" />
                        <span>{t("editor.titleCase")}</span>
                      </button>
                    </div>
                  </div>
                </Show>
              </div>

              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().toggleBlockquote().run();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  editorRevision() >= 0 && editor?.isActive("blockquote")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.blockquote")}
              >
                <Quote class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleDropCap();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  isDropCapActive()
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.dropCap")}
              >
                <LetterText class="w-3.5 h-3.5" />
              </button>

              <div class="h-4 w-px bg-border/80 mx-0.5 self-center shrink-0" />

              <button
                type="button"
                onClick={() => {
                  toggleCenterAlign();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  editorRevision() >= 0 &&
                  (editor?.isActive("paragraph", { textAlign: "center" }) ||
                    editor?.isActive("heading", { textAlign: "center" }))
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.centerAlign")}
              >
                <AlignCenter class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().toggleMark("superscript").run();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  editorRevision() >= 0 && editor?.isActive("superscript")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.superscript")}
              >
                <SupIcon class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().toggleMark("subscript").run();
                  closeEditorContextMenu();
                }}
                class={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                  editorRevision() >= 0 && editor?.isActive("subscript")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={t("editor.subscript")}
              >
                <SubIcon class="w-3.5 h-3.5" />
              </button>

              <div class="h-4 w-px bg-border/80 mx-0.5 self-center shrink-0" />

              <button
                type="button"
                onClick={() => {
                  insertSceneBreak();
                  closeEditorContextMenu();
                }}
                class="p-1.5 rounded hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer shrink-0"
                title={t("editor.insertSceneBreak")}
              >
                <SeparatorHorizontal class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  insertDialogueDash();
                  closeEditorContextMenu();
                }}
                class="px-1.5 py-1 rounded text-xs hover:bg-accent hover:text-accent-foreground text-muted-foreground font-mono font-bold transition-colors cursor-pointer leading-none shrink-0"
                title={t("editor.insertDialogueDash")}
              >
                <span>{t("editor.dialogueDashLabel")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  insertFootnote();
                  closeEditorContextMenu();
                }}
                class="p-1.5 rounded hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer shrink-0"
                title={t("editor.insertFootnote")}
              >
                <BookMarked class="w-3.5 h-3.5" />
              </button>
            </div>
          ) : undefined
        }
        class={sceneBreakContextTarget() ? "w-auto min-w-[150px] max-w-[200px]" : "w-auto min-w-[180px] max-w-[240px]"}
      >
        <Show
          when={sceneBreakContextTarget()}
          fallback={
            <>
              <ContextMenuGroup>
                <ContextMenuItem
                  icon={<Scissors class="w-3.5 h-3.5" />}
                  onClick={handleCut}
                  disabled={!hasSelection()}
                  shortcut="Ctrl+X"
                >
                  {t("common.cut")}
                </ContextMenuItem>
                <ContextMenuItem
                  icon={<Copy class="w-3.5 h-3.5" />}
                  onClick={handleCopy}
                  disabled={!hasSelection()}
                  shortcut="Ctrl+C"
                >
                  {t("common.copy")}
                </ContextMenuItem>
                <ContextMenuItem
                  icon={<ClipboardPaste class="w-3.5 h-3.5" />}
                  onClick={handlePastePlainText}
                  shortcut="Ctrl+V"
                >
                  {t("common.paste")}
                </ContextMenuItem>
                <ContextMenuItem
                  icon={<Trash2 class="w-3.5 h-3.5" />}
                  onClick={handleDelete}
                  disabled={!hasSelection()}
                  destructive
                  shortcut="Supr"
                >
                  {t("common.delete")}
                </ContextMenuItem>
              </ContextMenuGroup>

              <ContextMenuSeparator />

              <ContextMenuGroup>
                <ContextMenuItem
                  icon={<CheckSquare class="w-3.5 h-3.5" />}
                  onClick={handleSelectAll}
                  shortcut="Ctrl+A"
                >
                  {t("common.selectAll")}
                </ContextMenuItem>
              </ContextMenuGroup>
            </>
          }
        >
          <ContextMenuGroup>
            <ContextMenuItem
              icon={<Pencil class="w-3.5 h-3.5" />}
              onClick={handleEditSceneBreakFromContextMenu}
            >
              {t("common.edit")}
            </ContextMenuItem>
            <ContextMenuItem
              icon={<Trash2 class="w-3.5 h-3.5" />}
              onClick={handleDeleteSceneBreakFromContextMenu}
              destructive
            >
              {t("common.delete")}
            </ContextMenuItem>
          </ContextMenuGroup>
        </Show>
      </ContextMenu>

      <UnifyBreakModal
        isOpen={breakDialog().isOpen}
        onClose={() => setBreakDialog((prev) => ({ ...prev, isOpen: false }))}
        isUnified={breakDialog().isUnified}
        initialSymbol={breakDialog().newSymbol}
        onSave={handleSaveBreak}
        onDelete={handleDeleteBreak}
        onDisableUnify={() => {
          setUnifyBreaks(false);
          setBreakDialog((prev) => ({ ...prev, isUnified: false }));
        }}
        onGoToTypography={() => {
          setBreakDialog((prev) => ({ ...prev, isOpen: false }));
          setStep(8);
          setModalModeWithTransition("expanded");
        }}
      />
    </div>
  );
};
