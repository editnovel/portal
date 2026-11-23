import { Loader2, RotateCcw } from "lucide-solid";
import { type Component, createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  clearSavedProjectFromIndexedDB,
  getSavedProjectMeta,
  restoreProjectFromIndexedDB,
  saveProjectToIndexedDB,
} from "~/lib/project-storage";
import {
  activeOriginalFileType,
  activePdfBlobUrl,
  activeRawSection,
  projectVersion,
  registerAutoSaveCanceller,
  setReaderSettingsOpen,
  setSaveExportOpen,
  state,
} from "~/lib/store";
import { warmupWasmWorker } from "~/lib/wasm-bridge";
import { ChapterSidebar } from "./ChapterSidebar";
import { CorrectionPanel } from "./CorrectionPanel";
import { EReaderPreview } from "./EReaderPreview";
import { PdfViewer } from "./PdfViewer";
import { ReaderSettingsPanel } from "./ReaderSettingsPanel";
import { SaveExportPanel } from "./SaveExportPanel";
import { TipTapEditor } from "./TipTapEditor";
import { TopActionBar } from "./TopActionBar";

export const Workspace: Component = () => {
  const [editorScrollFraction, setEditorScrollFraction] = createSignal<number | undefined>(
    undefined
  );
  const [readerScrollFraction, setReaderScrollFraction] = createSignal<number | undefined>(
    undefined
  );
  const [activePane, setActivePane] = createSignal<"editor" | "original">("editor");
  const [openEditorSearchTrigger, setOpenEditorSearchTrigger] = createSignal(0);
  const [openOriginalSearchTrigger, setOpenOriginalSearchTrigger] = createSignal(0);
  const [savedMeta, setSavedMeta] = createSignal<{
    title: string;
    timestamp: number;
    fileCount: number;
  } | null>(null);
  const [dismissedRestore, setDismissedRestore] = createSignal(false);
  const [restoringSession, setRestoringSession] = createSignal(false);

  const formatRelativeTime = (ts: number): string => {
    const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diff < 60) return t("workspace.timeAges.justNow");
    if (diff < 3600) return t("workspace.timeAges.minutesAgo", { count: Math.floor(diff / 60) });
    if (diff < 86400) return t("workspace.timeAges.hoursAgo", { count: Math.floor(diff / 3600) });
    return t("workspace.timeAges.daysAgo", { count: Math.floor(diff / 86400) });
  };

  onMount(() => {
    void warmupWasmWorker();
    getSavedProjectMeta().then((meta) => {
      if (meta && state.files.length === 0) {
        setSavedMeta(meta);
      }
    });

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSaveTimer !== null) {
        window.clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
        void saveProjectToIndexedDB();
      }
      if (state.files.length > 0 || state.sectionGroups.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        e.stopPropagation();

        let target: "editor" | "original" = activePane();
        const activeEl = document.activeElement;
        if (activeEl) {
          const editorPane = document.getElementById("workspace-editor-pane");
          const originalPane = document.getElementById("workspace-original-pane");
          if (editorPane?.contains(activeEl)) {
            target = "editor";
          } else if (originalPane?.contains(activeEl)) {
            target = "original";
          }
        }

        if (target === "editor") {
          setActivePane("editor");
          setOpenEditorSearchTrigger((c) => c + 1);
        } else {
          setActivePane("original");
          setOpenOriginalSearchTrigger((c) => c + 1);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    onCleanup(() => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    });
  });

  let autoSaveTimer: number | null = null;
  registerAutoSaveCanceller(() => {
    if (autoSaveTimer !== null) {
      window.clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
  });
  createEffect(() => {
    if (!state.localSaveEnabled || state.isProcessing) return;
    if (state.files.length === 0 && state.sectionGroups.length === 0) return;
    if (savedMeta() && !dismissedRestore()) return;
    if (projectVersion() === 0 && state.files.length === 0 && !state.lastSavedTimestamp) return;

    projectVersion();
    state.sectionGroups.length;
    state.files.length;
    state.metadata.title;
    state.metadata.author;
    state.metadata.volume;
    state.metadata.series;
    state.metadata.coverUrl;
    state.editorialRules;
    state.regexRules;
    state.glossary;
    state.readerSettings;
    state.spellCorrections;
    state.spellIgnoredWords;
    state.spellLanguageMode;
    state.unifyBreaks;
    state.unifiedBreakSymbol;
    state.unifyDialogue;
    state.unifiedDialogueSymbol;
    state.unifyQuotes;
    state.unifiedQuoteSymbol;
    state.unifyEllipsis;
    state.unifiedEllipsisSymbol;

    if (autoSaveTimer !== null) {
      window.clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = window.setTimeout(async () => {
      autoSaveTimer = null;
      try {
        await saveProjectToIndexedDB();
      } catch (err) {
        console.error("AutoSave failed:", err);
      }
    }, 1500);
  });

  onCleanup(() => {
    if (autoSaveTimer !== null) {
      window.clearTimeout(autoSaveTimer);
    }
  });

  const handleRestoreSession = async () => {
    setRestoringSession(true);
    try {
      const ok = await restoreProjectFromIndexedDB();
      if (ok) {
        setSavedMeta(null);
      }
    } finally {
      setRestoringSession(false);
    }
  };

  const handleDismissRestore = async () => {
    setDismissedRestore(true);
    await clearSavedProjectFromIndexedDB();
    setSavedMeta(null);
  };

  let activeSource: "editor" | "reader" | null = null;
  let sourceTimer: number | null = null;

  const setSource = (src: "editor" | "reader") => {
    activeSource = src;
    if (sourceTimer !== null) {
      window.clearTimeout(sourceTimer);
    }
    sourceTimer = window.setTimeout(() => {
      activeSource = null;
    }, 120);
  };

  const handleEditorScroll = (fraction: number) => {
    if (activeSource === "reader") return;
    setSource("editor");
    setReaderScrollFraction(fraction);
  };

  const handleReaderScroll = (fraction: number) => {
    if (activeSource === "editor") return;
    setSource("reader");
    setEditorScrollFraction(fraction);
  };

  return (
    <div class="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground select-text">
      <TopActionBar />

      <Show when={savedMeta() && state.files.length === 0 && !dismissedRestore()}>
        <div class="h-10 border-b border-primary/20 bg-primary/10 px-4 flex items-center justify-between text-xs text-foreground z-20 shrink-0 animate-in fade-in duration-200">
          <div class="flex items-center gap-2 min-w-0">
            <RotateCcw class="w-4 h-4 text-primary shrink-0" />
            <span class="truncate">
              {t("workspace.savedSessionFound", {
                title: savedMeta()?.title || "",
                time: formatRelativeTime(savedMeta()?.timestamp || 0),
              })}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreSession}
              disabled={restoringSession()}
              class="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <Show when={restoringSession()}>
                <Loader2 class="w-3 h-3 animate-spin" />
              </Show>
              <span>
                {restoringSession()
                  ? t("workspace.restoringSession")
                  : t("workspace.restoreSession")}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDismissRestore}
              disabled={restoringSession()}
              class="px-2.5 py-1 rounded border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {t("workspace.dismiss")}
            </button>
          </div>
        </div>
      </Show>

      <main class="flex-1 flex overflow-hidden relative">
        <div
          class={`transition-all duration-300 ease-in-out shrink-0 flex ${
            state.readerSettingsOpen ? "w-0 opacity-0 overflow-hidden pointer-events-none" : ""
          }`}
        >
          <ChapterSidebar />
        </div>

        <div
          id="workspace-editor-pane"
          onPointerDown={() => setActivePane("editor")}
          onFocusIn={() => setActivePane("editor")}
          class={`transition-all duration-300 ease-in-out h-full flex flex-col ${
            state.readerSettingsOpen
              ? "w-[calc(100vw-20rem)] z-40 p-3 sm:p-5"
              : "flex-1 overflow-hidden"
          }`}
        >
          <div
            class={`w-full h-full transition-all duration-300 flex flex-col overflow-hidden ${
              state.readerSettingsOpen
                ? "max-w-4xl mx-auto rounded-xl border border-border shadow-2xl bg-card"
                : ""
            }`}
          >
            <TipTapEditor
              scrollFraction={editorScrollFraction()}
              onScrollFraction={handleEditorScroll}
              openSearchTrigger={openEditorSearchTrigger}
            />
          </div>
        </div>

        <div
          id="workspace-original-pane"
          onPointerDown={() => setActivePane("original")}
          onFocusIn={() => setActivePane("original")}
          class={`transition-all duration-300 ease-in-out h-full flex flex-col ${
            state.readerSettingsOpen
              ? "max-w-0 opacity-0 pointer-events-none border-l-0 overflow-hidden"
              : "flex-1 overflow-hidden border-l border-border"
          }`}
        >
          <Show
            when={state.rightPaneMode === "spell"}
            fallback={
              <Show
                when={activeOriginalFileType() === "epub"}
                fallback={
                  <PdfViewer
                    pdfUrl={activePdfBlobUrl()}
                    scrollFraction={readerScrollFraction()}
                    onScrollFraction={handleReaderScroll}
                    targetPage={activeRawSection()?.startPage}
                    openSearchTrigger={openOriginalSearchTrigger}
                  />
                }
              >
                <EReaderPreview
                  scrollFraction={readerScrollFraction()}
                  onScrollFraction={handleReaderScroll}
                  openSearchTrigger={openOriginalSearchTrigger}
                />
              </Show>
            }
          >
            <CorrectionPanel />
          </Show>
        </div>
      </main>

      <ReaderSettingsPanel
        isOpen={state.readerSettingsOpen}
        onClose={() => setReaderSettingsOpen(false)}
      />

      <SaveExportPanel isOpen={state.saveExportOpen} onClose={() => setSaveExportOpen(false)} />
    </div>
  );
};
