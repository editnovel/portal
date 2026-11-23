import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderPlus,
  ListTree,
  Loader2,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-solid";
import {
  type Component,
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "~/components/ui/ContextMenu";
import { t } from "~/lib/i18n";
import {
  addNewPart,
  addNewSection,
  deletePart,
  deleteSection,
  scrollEditorToTop,
  setActiveSectionId,
  setStepAndModalModeWithTransition,
  state,
  toggleSidebar,
  updatePartTitle,
  updateSectionTitle,
} from "~/lib/store";
import type { ChapterSection, FileSectionGroup } from "~/lib/types";

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  type: "section" | "part";
  section?: ChapterSection;
  groupId?: string;
  group?: FileSectionGroup;
}

interface InsertSlotProps {
  id: string;
  activeSlotId: () => string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  mode: "chapter-only" | "part-top-direct" | "part-and-chapter";
  position: "above" | "below";
  label?: string;
  onInsertChapter?: (type: "chapter" | "prologue" | "epilogue" | "afterword") => void;
  onInsertPart?: () => void;
}

const InsertSlot: Component<InsertSlotProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);
  let hoverTimer: number | null = null;
  let buttonRef: HTMLButtonElement | undefined;
  const [coords, setCoords] = createSignal<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isUpwards, setIsUpwards] = createSignal(false);
  const isOpen = () => props.activeSlotId() === props.id;

  const handleMouseEnter = () => {
    if (isOpen()) return;
    if (hoverTimer !== null) {
      window.clearTimeout(hoverTimer);
    }
    hoverTimer = window.setTimeout(() => {
      setIsHovered(true);
      hoverTimer = null;
    }, 450);
  };

  const handleMouseLeave = () => {
    if (hoverTimer !== null) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    if (!isOpen()) {
      setIsHovered(false);
    }
  };

  onCleanup(() => {
    if (hoverTimer !== null) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  });

  createEffect(() => {
    if (!isOpen() || !buttonRef) return;

    const updatePosition = () => {
      if (!buttonRef) return;
      const rect = buttonRef.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = props.mode === "part-and-chapter" ? 130 : 175;
      const gap = 6;
      const margin = 8;
      const topSafeZone = 56;

      const spaceAbove = rect.top - topSafeZone;
      const spaceBelow = window.innerHeight - rect.bottom - margin;

      let openAbove = props.position === "above";
      if (openAbove && spaceAbove < menuHeight && spaceBelow >= menuHeight) {
        openAbove = false;
      } else if (!openAbove && spaceBelow < menuHeight && spaceAbove >= menuHeight) {
        openAbove = true;
      }

      setIsUpwards(openAbove);

      let targetY = openAbove ? rect.top - menuHeight - gap : rect.bottom + gap;
      targetY = Math.max(topSafeZone, Math.min(targetY, window.innerHeight - menuHeight - margin));

      let targetX = rect.left + rect.width / 2 - menuWidth / 2;
      targetX = Math.max(margin, Math.min(targetX, window.innerWidth - menuWidth - margin));

      setCoords({ x: targetX, y: targetY });
    };

    updatePosition();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose();
        setIsHovered(false);
      }
    };

    window.addEventListener("scroll", props.onClose, true);
    window.addEventListener("resize", props.onClose);
    window.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      window.removeEventListener("scroll", props.onClose, true);
      window.removeEventListener("resize", props.onClose);
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  const handleButtonClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (hoverTimer !== null) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    if (props.mode === "part-top-direct") {
      props.onInsertPart?.();
      return;
    }
    if (isOpen()) {
      props.onClose();
    } else {
      props.onOpen(props.id);
    }
  };

  const handleInsertChapter = (type: "chapter" | "prologue" | "epilogue" | "afterword") => {
    props.onInsertChapter?.(type);
    props.onClose();
    setIsHovered(false);
  };

  const handleInsertPart = () => {
    props.onInsertPart?.();
    props.onClose();
    setIsHovered(false);
  };

  return (
    <div
      class="relative py-1.5 -my-1.5 z-20 group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        class={`flex items-center justify-center transition-all duration-200 ease-out overflow-visible relative ${
          isHovered() || isOpen()
            ? "h-7 my-1 opacity-100"
            : "h-0 my-0 opacity-0 pointer-events-none"
        }`}
      >
        <div
          class={`absolute inset-x-2 h-px bg-primary/40 dark:bg-primary/50 pointer-events-none origin-center transition-transform duration-250 ease-out ${
            isHovered() || isOpen() ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
          }`}
        />

        <button
          ref={buttonRef}
          type="button"
          onClick={handleButtonClick}
          class={`relative z-10 w-5 h-5 rounded-full border shadow-xs flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 ${
            isOpen()
              ? "bg-neutral-900 text-neutral-50 border-neutral-900 dark:bg-primary dark:text-primary-foreground dark:border-primary scale-110 shadow-sm"
              : "bg-background text-foreground/70 border-border/80 hover:bg-neutral-900 hover:text-neutral-50 hover:border-neutral-900 dark:hover:bg-primary dark:hover:text-primary-foreground dark:hover:border-primary hover:scale-115 hover:shadow-sm"
          }`}
          title={props.label || t("sidebar.newChapter")}
        >
          <Plus class="w-3 h-3 stroke-[2.5]" />
        </button>

        <Show when={isOpen()}>
          <Portal>
            <div
              class="fixed inset-0 z-40 bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                props.onClose();
                setIsHovered(false);
              }}
            />
            <div
              style={{
                left: `${coords().x}px`,
                top: `${coords().y}px`,
              }}
              class="fixed z-[100] w-44 bg-popover/95 text-popover-foreground border border-border rounded-xl shadow-2xl p-1 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <Show
                when={props.mode === "part-and-chapter"}
                fallback={
                  <>
                    <div class="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-0.5">
                      {isUpwards() ? t("sidebar.insertAbove") : t("sidebar.insertBelow")}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInsertChapter("chapter")}
                      class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span class="font-medium">{t("sidebar.chapter")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertChapter("prologue")}
                      class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{t("sidebar.prologue")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertChapter("epilogue")}
                      class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{t("sidebar.epilogue")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertChapter("afterword")}
                      class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span>{t("sidebar.afterword")}</span>
                    </button>
                  </>
                }
              >
                <button
                  type="button"
                  onClick={handleInsertPart}
                  class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors font-medium text-foreground"
                >
                  <FolderPlus class="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{t("sidebar.newPart")}</span>
                </button>

                <div class="h-px bg-border/60 my-1 mx-1" />

                <button
                  type="button"
                  onClick={() => handleInsertChapter("chapter")}
                  class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span class="font-medium">{t("sidebar.chapter")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertChapter("prologue")}
                  class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{t("sidebar.prologue")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertChapter("epilogue")}
                  class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{t("sidebar.epilogue")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertChapter("afterword")}
                  class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span>{t("sidebar.afterword")}</span>
                </button>
              </Show>
            </div>
          </Portal>
        </Show>
      </div>
    </div>
  );
};

interface SectionRowProps {
  section: ChapterSection;
  groupId: string;
  secIdx: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onFinishEdit: () => void;
  onContextMenu: (e: MouseEvent) => void;
}

const SectionRow: Component<SectionRowProps> = (props) => {
  const [editTitle, setEditTitle] = createSignal(props.section.title);
  let inputRef: HTMLInputElement | undefined;

  const isActive = () => state.activeSectionId === props.section.id;

  const commitEdit = () => {
    const val = editTitle().trim();
    if (val && val !== props.section.title) {
      updateSectionTitle(props.section.id, val);
    }
    props.onFinishEdit();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditTitle(props.section.title);
      props.onFinishEdit();
    }
  };

  return (
    <div class="relative group" onContextMenu={props.onContextMenu}>
      <button
        type="button"
        onClick={() => {
          if (!props.isEditing) {
            setActiveSectionId(props.section.id);
          }
        }}
        onDblClick={() => {
          if (!props.isEditing) {
            scrollEditorToTop(props.section.id);
          }
        }}
        class={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer select-none ${
          isActive()
            ? "bg-primary text-primary-foreground font-medium shadow-xs"
            : "text-foreground hover:bg-muted"
        }`}
      >
        <FileText class="w-3.5 h-3.5 shrink-0 opacity-70" />
        <span class="font-mono text-[11px] opacity-70 shrink-0">{props.secIdx + 1}.</span>

        <Show
          when={props.isEditing}
          fallback={<span class="truncate flex-1">{props.section.title}</span>}
        >
          <input
            ref={(el) => {
              inputRef = el;
              setTimeout(() => {
                el?.focus();
                el?.select();
              }, 10);
            }}
            type="text"
            value={editTitle()}
            onInput={(e) => setEditTitle(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            class="flex-1 bg-background text-foreground border border-primary px-1.5 py-0.5 rounded text-xs outline-none shadow-xs font-normal"
          />
        </Show>
      </button>
    </div>
  );
};

interface PartHeaderRowProps {
  group: FileSectionGroup;
  groupIdx: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onFinishEdit: () => void;
  onContextMenu: (e: MouseEvent) => void;
}

const PartHeaderRow: Component<PartHeaderRowProps> = (props) => {
  const [editTitle, setEditTitle] = createSignal(props.group.fileName);
  let inputRef: HTMLInputElement | undefined;

  const commitEdit = () => {
    const val = editTitle().trim();
    if (val && val !== props.group.fileName) {
      updatePartTitle(props.group.fileId, val);
    }
    props.onFinishEdit();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditTitle(props.group.fileName);
      props.onFinishEdit();
    }
  };

  return (
    <div class="relative group" onContextMenu={props.onContextMenu}>
      <div class="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between rounded hover:bg-muted/40 transition-colors">
        <Show
          when={props.isEditing}
          fallback={<span class="truncate">{props.group.fileName}</span>}
        >
          <input
            ref={(el) => {
              inputRef = el;
              setTimeout(() => {
                el?.focus();
                el?.select();
              }, 10);
            }}
            type="text"
            value={editTitle()}
            onInput={(e) => setEditTitle(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            class="flex-1 bg-background text-foreground border border-primary px-1.5 py-0.5 rounded text-[11px] outline-none shadow-xs font-normal uppercase"
          />
        </Show>
        <span class="font-mono text-[10px] shrink-0 ml-1">
          {t("sidebar.volumeNumber", { number: props.groupIdx + 1 })}
        </span>
      </div>
    </div>
  );
};

export const ChapterSidebar: Component = () => {
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [activeSlotId, setActiveSlotId] = createSignal<string | null>(null);

  const [contextMenu, setContextMenu] = createSignal<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    type: "section",
  });

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveSlotId(null);
        closeContextMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  const isFirstPart = () => {
    const g = contextMenu().group;
    return !!g && state.sectionGroups.length > 0 && state.sectionGroups[0].fileId === g.fileId;
  };

  const isLastSectionInGroup = () => {
    const s = contextMenu().section;
    const gId = contextMenu().groupId;
    if (!s || !gId) return false;
    const grp = state.sectionGroups.find((g) => g.fileId === gId);
    if (!grp || grp.sections.length === 0) return false;
    return grp.sections[grp.sections.length - 1].id === s.id;
  };

  const handleSectionContextMenu = (e: MouseEvent, section: ChapterSection, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSlotId(null);
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: "section",
      section,
      groupId,
    });
  };

  const handlePartContextMenu = (e: MouseEvent, group: FileSectionGroup) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSlotId(null);
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: "part",
      group,
      groupId: group.fileId,
    });
  };

  const handleInsertSectionFromMenu = (
    position: "above" | "below",
    type: "chapter" | "prologue" | "epilogue" | "afterword"
  ) => {
    const s = contextMenu().section;
    const gId = contextMenu().groupId;
    if (s && gId) {
      addNewSection(gId, s.id, position, type);
    }
  };

  const handleDeleteSectionFromMenu = () => {
    const s = contextMenu().section;
    if (s) {
      deleteSection(s.id);
    }
  };

  const handleDeletePartFromMenu = () => {
    const g = contextMenu().group;
    if (g) {
      deletePart(g.fileId);
    }
  };

  return (
    <aside
      class={`border-r border-border bg-card flex flex-col transition-all duration-200 z-20 ${
        state.sidebarOpen ? "w-72" : "w-12"
      }`}
    >
      <div class="h-12 border-b border-border flex items-center justify-between px-3 shrink-0">
        <Show when={state.sidebarOpen}>
          <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ListTree class="w-4 h-4 text-muted-foreground" />
            <span>{t("sidebar.tableOfContents")}</span>
          </div>
        </Show>

        <button
          type="button"
          onClick={() => toggleSidebar()}
          class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-auto cursor-pointer"
          title={state.sidebarOpen ? t("sidebar.collapseSidebar") : t("sidebar.expandSidebar")}
        >
          <Show when={state.sidebarOpen} fallback={<ChevronRight class="w-4 h-4" />}>
            <ChevronLeft class="w-4 h-4" />
          </Show>
        </button>
      </div>

      <Show
        when={state.sidebarOpen}
        fallback={
          <div
            class="flex-1 flex flex-col items-center py-2 gap-1.5 max-h-[400px] overflow-y-auto px-1.5"
            onContextMenu={(e) => e.preventDefault()}
          >
            <Show when={state.sectionGroups.length === 0 && state.isProcessing}>
              <div class="flex flex-col items-center gap-2 py-4 animate-pulse">
                <Loader2 class="w-4 h-4 animate-spin text-primary" />
                <div class="w-7 h-7 rounded-lg bg-muted/50" />
                <div class="w-7 h-7 rounded-lg bg-muted/50" />
              </div>
            </Show>
            <For each={state.sectionGroups.flatMap((g) => g.sections)}>
              {(section, idx) => {
                const isActive = () => state.activeSectionId === section.id;
                return (
                  <button
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    onDblClick={() => scrollEditorToTop(section.id)}
                    class={`w-8 h-8 rounded-lg flex flex-col items-center justify-center transition-colors shrink-0 cursor-pointer select-none ${
                      isActive()
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    title={`${idx() + 1}. ${section.title}`}
                  >
                    <FileText class="w-3.5 h-3.5" />
                    <span class="text-[9px] font-mono leading-none font-bold mt-0.5">
                      {idx() + 1}
                    </span>
                  </button>
                );
              }}
            </For>
          </div>
        }
      >
        <div
          class="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
          onContextMenu={(e) => e.preventDefault()}
        >
          <Show
            when={state.sectionGroups.length > 0}
            fallback={
              <Show
                when={state.isProcessing}
                fallback={
                  <div class="p-6 text-center text-xs text-muted-foreground">
                    {t("sidebar.noChapters")}
                  </div>
                }
              >
                <div class="flex flex-col gap-2.5 p-2 animate-pulse">
                  <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>{t("stepFiles.parsingBackground")}</span>
                  </div>
                  <div class="h-7 bg-muted/60 rounded-lg w-full" />
                  <div class="h-7 bg-muted/60 rounded-lg w-full" />
                  <div class="h-7 bg-muted/60 rounded-lg w-full" />
                </div>
              </Show>
            }
          >
            <Show when={state.sectionGroups.length > 0}>
              <InsertSlot
                id="slot-top-part-0"
                activeSlotId={activeSlotId}
                onOpen={setActiveSlotId}
                onClose={() => setActiveSlotId(null)}
                mode="part-top-direct"
                position="above"
                label={`${t("sidebar.newPart")} (${t("sidebar.insertAbove")})`}
                onInsertPart={() => addNewPart(state.sectionGroups[0].fileId, "above")}
              />
            </Show>

            <For each={state.sectionGroups}>
              {(group, groupIdx) => (
                <div class="flex flex-col">
                  <PartHeaderRow
                    group={group}
                    groupIdx={groupIdx()}
                    isEditing={editingId() === group.fileId}
                    onStartEdit={() => setEditingId(group.fileId)}
                    onFinishEdit={() => setEditingId(null)}
                    onContextMenu={(e) => handlePartContextMenu(e, group)}
                  />

                  <div class="flex flex-col">
                    <Show
                      when={group.sections.length > 0}
                      fallback={
                        <>
                          <div class="mx-2 my-1 px-3 py-2 rounded-lg border border-dashed border-border/70 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                            <span>{t("sidebar.noChaptersInPart")}</span>
                            <button
                              type="button"
                              onClick={() => addNewSection(group.fileId, null, "below", "chapter")}
                              class="text-primary hover:underline text-[11px] font-medium cursor-pointer"
                            >
                              + {t("sidebar.addFirstChapter")}
                            </button>
                          </div>
                          <InsertSlot
                            id={`slot-part-${group.fileId}-below`}
                            activeSlotId={activeSlotId}
                            onOpen={setActiveSlotId}
                            onClose={() => setActiveSlotId(null)}
                            mode="part-and-chapter"
                            position="below"
                            label={t("sidebar.insertBelow")}
                            onInsertPart={() => addNewPart(group.fileId, "below")}
                            onInsertChapter={(type) =>
                              addNewSection(group.fileId, null, "below", type)
                            }
                          />
                        </>
                      }
                    >
                      <InsertSlot
                        id={`slot-sec-${group.sections[0].id}-above`}
                        activeSlotId={activeSlotId}
                        onOpen={setActiveSlotId}
                        onClose={() => setActiveSlotId(null)}
                        mode="chapter-only"
                        position="above"
                        label={`${t("sidebar.newChapter")} (${t("sidebar.insertAbove")})`}
                        onInsertChapter={(type) =>
                          addNewSection(group.fileId, group.sections[0].id, "above", type)
                        }
                      />

                      <For each={group.sections}>
                        {(section, secIdx) => {
                          const isLastSection = () => secIdx() === group.sections.length - 1;
                          return (
                            <>
                              <SectionRow
                                section={section}
                                groupId={group.fileId}
                                secIdx={secIdx()}
                                isEditing={editingId() === section.id}
                                onStartEdit={() => setEditingId(section.id)}
                                onFinishEdit={() => setEditingId(null)}
                                onContextMenu={(e) =>
                                  handleSectionContextMenu(e, section, group.fileId)
                                }
                              />

                              <Show
                                when={isLastSection()}
                                fallback={
                                  <InsertSlot
                                    id={`slot-sec-${section.id}-below`}
                                    activeSlotId={activeSlotId}
                                    onOpen={setActiveSlotId}
                                    onClose={() => setActiveSlotId(null)}
                                    mode="chapter-only"
                                    position="below"
                                    label={`${t("sidebar.newChapter")} (${t("sidebar.insertBelow")})`}
                                    onInsertChapter={(type) =>
                                      addNewSection(group.fileId, section.id, "below", type)
                                    }
                                  />
                                }
                              >
                                <InsertSlot
                                  id={`slot-sec-${section.id}-below-last`}
                                  activeSlotId={activeSlotId}
                                  onOpen={setActiveSlotId}
                                  onClose={() => setActiveSlotId(null)}
                                  mode="part-and-chapter"
                                  position="below"
                                  label={t("sidebar.insertBelow")}
                                  onInsertPart={() => addNewPart(group.fileId, "below")}
                                  onInsertChapter={(type) =>
                                    addNewSection(group.fileId, section.id, "below", type)
                                  }
                                />
                              </Show>
                            </>
                          );
                        }}
                      </For>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>

      {/* Reusable Composition Context Menu */}
      <ContextMenu
        isOpen={contextMenu().isOpen}
        x={contextMenu().x}
        y={contextMenu().y}
        onClose={closeContextMenu}
      >
        <Show
          when={contextMenu().type === "section"}
          fallback={
            <>
              {/* Part Header Context Menu */}
              <ContextMenuGroup>
                <ContextMenuItem
                  onClick={() => setEditingId(contextMenu().group?.fileId || null)}
                  icon={<Pencil class="w-3.5 h-3.5" />}
                >
                  {t("sidebar.editName")}
                </ContextMenuItem>
              </ContextMenuGroup>

              <ContextMenuSeparator />

              <ContextMenuGroup>
                <Show
                  when={!isFirstPart()}
                  fallback={
                    <ContextMenuItem
                      onClick={() => {
                        const g = contextMenu().group;
                        if (g) addNewPart(g.fileId, "above");
                      }}
                      icon={<ArrowUpToLine class="w-3.5 h-3.5" />}
                    >
                      {`${t("sidebar.newPart")} (${t("sidebar.insertAbove")})`}
                    </ContextMenuItem>
                  }
                >
                  <ContextMenuSub>
                    <ContextMenuSubTrigger icon={<ArrowUpToLine class="w-3.5 h-3.5" />}>
                      {t("sidebar.insertAbove")}
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuItem
                        onClick={() => {
                          const g = contextMenu().group;
                          if (g) addNewPart(g.fileId, "above");
                        }}
                      >
                        <FolderPlus class="w-3.5 h-3.5 text-primary shrink-0" />
                        <span class="font-medium text-foreground">{t("sidebar.newPart")}</span>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => {
                          const g = contextMenu().group;
                          if (!g) return;
                          const idx = state.sectionGroups.findIndex((gr) => gr.fileId === g.fileId);
                          if (idx > 0) {
                            const prev = state.sectionGroups[idx - 1];
                            addNewSection(prev.fileId, null, "below", "chapter");
                          }
                        }}
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>{t("sidebar.chapter")}</span>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          const g = contextMenu().group;
                          if (!g) return;
                          const idx = state.sectionGroups.findIndex((gr) => gr.fileId === g.fileId);
                          if (idx > 0) {
                            const prev = state.sectionGroups[idx - 1];
                            addNewSection(prev.fileId, null, "below", "prologue");
                          }
                        }}
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span>{t("sidebar.prologue")}</span>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          const g = contextMenu().group;
                          if (!g) return;
                          const idx = state.sectionGroups.findIndex((gr) => gr.fileId === g.fileId);
                          if (idx > 0) {
                            const prev = state.sectionGroups[idx - 1];
                            addNewSection(prev.fileId, null, "below", "epilogue");
                          }
                        }}
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{t("sidebar.epilogue")}</span>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          const g = contextMenu().group;
                          if (!g) return;
                          const idx = state.sectionGroups.findIndex((gr) => gr.fileId === g.fileId);
                          if (idx > 0) {
                            const prev = state.sectionGroups[idx - 1];
                            addNewSection(prev.fileId, null, "below", "afterword");
                          }
                        }}
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                        <span>{t("sidebar.afterword")}</span>
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                </Show>

                <ContextMenuSub>
                  <ContextMenuSubTrigger icon={<ArrowDownToLine class="w-3.5 h-3.5" />}>
                    {t("sidebar.insertBelow")}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem
                      onClick={() => {
                        const g = contextMenu().group;
                        if (g) addNewPart(g.fileId, "below");
                      }}
                    >
                      <FolderPlus class="w-3.5 h-3.5 text-primary shrink-0" />
                      <span class="font-medium text-foreground">{t("sidebar.newPart")}</span>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => {
                        const g = contextMenu().group;
                        if (g)
                          addNewSection(g.fileId, g.sections[0]?.id || null, "above", "chapter");
                      }}
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span>{t("sidebar.chapter")}</span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        const g = contextMenu().group;
                        if (g)
                          addNewSection(g.fileId, g.sections[0]?.id || null, "above", "prologue");
                      }}
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{t("sidebar.prologue")}</span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        const g = contextMenu().group;
                        if (g)
                          addNewSection(g.fileId, g.sections[0]?.id || null, "above", "epilogue");
                      }}
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{t("sidebar.epilogue")}</span>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        const g = contextMenu().group;
                        if (g)
                          addNewSection(g.fileId, g.sections[0]?.id || null, "above", "afterword");
                      }}
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span>{t("sidebar.afterword")}</span>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </ContextMenuGroup>

              <ContextMenuSeparator />

              <ContextMenuGroup>
                <ContextMenuItem
                  onClick={() => setStepAndModalModeWithTransition(4, "expanded")}
                  icon={<SlidersHorizontal class="w-3.5 h-3.5" />}
                >
                  {t("sidebar.reorderStructure")}
                </ContextMenuItem>
              </ContextMenuGroup>

              <Show when={state.sectionGroups.length > 1}>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                  <ContextMenuItem
                    destructive={true}
                    onClick={handleDeletePartFromMenu}
                    icon={<Trash2 class="w-3.5 h-3.5" />}
                  >
                    {t("sidebar.deletePart")}
                  </ContextMenuItem>
                </ContextMenuGroup>
              </Show>
            </>
          }
        >
          {/* Section Row Context Menu */}
          <ContextMenuGroup>
            <ContextMenuItem
              onClick={() => setEditingId(contextMenu().section?.id || null)}
              icon={<Pencil class="w-3.5 h-3.5" />}
            >
              {t("sidebar.editName")}
            </ContextMenuItem>
          </ContextMenuGroup>

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ContextMenuSub>
              <ContextMenuSubTrigger icon={<ArrowUpToLine class="w-3.5 h-3.5" />}>
                {t("sidebar.insertAbove")}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onClick={() => handleInsertSectionFromMenu("above", "chapter")}>
                  <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{t("sidebar.chapter")}</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleInsertSectionFromMenu("above", "prologue")}>
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{t("sidebar.prologue")}</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleInsertSectionFromMenu("above", "epilogue")}>
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{t("sidebar.epilogue")}</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleInsertSectionFromMenu("above", "afterword")}>
                  <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span>{t("sidebar.afterword")}</span>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
              <ContextMenuSubTrigger icon={<ArrowDownToLine class="w-3.5 h-3.5" />}>
                {t("sidebar.insertBelow")}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onClick={() => handleInsertSectionFromMenu("below", "chapter")}>
                  <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{t("sidebar.chapter")}</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleInsertSectionFromMenu("below", "prologue")}>
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{t("sidebar.prologue")}</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleInsertSectionFromMenu("below", "epilogue")}>
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{t("sidebar.epilogue")}</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleInsertSectionFromMenu("below", "afterword")}>
                  <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span>{t("sidebar.afterword")}</span>
                </ContextMenuItem>

                <Show when={isLastSectionInGroup()}>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => {
                      const gId = contextMenu().groupId;
                      if (gId) addNewPart(gId, "below");
                    }}
                  >
                    <FolderPlus class="w-3.5 h-3.5 text-primary shrink-0" />
                    <span class="font-medium text-foreground">{t("sidebar.newPart")}</span>
                  </ContextMenuItem>
                </Show>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ContextMenuItem
              onClick={() => setStepAndModalModeWithTransition(4, "expanded")}
              icon={<SlidersHorizontal class="w-3.5 h-3.5" />}
            >
              {t("sidebar.reorderStructure")}
            </ContextMenuItem>
          </ContextMenuGroup>

          <ContextMenuSeparator />

          <ContextMenuGroup>
            <ContextMenuItem
              destructive={true}
              onClick={handleDeleteSectionFromMenu}
              icon={<Trash2 class="w-3.5 h-3.5" />}
            >
              {t("sidebar.deleteChapter")}
            </ContextMenuItem>
          </ContextMenuGroup>
        </Show>
      </ContextMenu>
    </aside>
  );
};
