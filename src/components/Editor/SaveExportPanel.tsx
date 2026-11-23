import {
  Download,
  FileBox,
  FileDown,
  FileUp,
  HardDrive,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-solid";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  clearSavedProjectFromIndexedDB,
  exportProjectFile,
  importProjectFile,
} from "~/lib/project-storage";
import {
  exportCurrentEpub,
  setLocalSaveEnabled,
  state,
} from "~/lib/store";

interface SaveExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatUnitSize(bytes: number): string {
  if (bytes <= 0) return "0.0 MiB";
  const mib = bytes / (1024 * 1024);
  if (mib >= 1000) {
    const gib = bytes / (1024 * 1024 * 1024);
    return `${gib.toFixed(1)} GiB`;
  }
  return `${mib.toFixed(1)} MiB`;
}

export const SaveExportPanel: Component<SaveExportPanelProps> = (props) => {
  const [exporting, setExporting] = createSignal(false);
  const [exportingProject, setExportingProject] = createSignal(false);
  const [importingProject, setImportingProject] = createSignal(false);
  const [importError, setImportError] = createSignal<string | null>(null);

  let fileInputRef: HTMLInputElement | undefined;

  const epubEstimatedSize = createMemo(() => {
    const activeFiles = state.files.filter((f) => f.active);
    let totalBytes = 0;
    for (const f of activeFiles) {
      const s = f.rawFile?.size || f.size || 0;
      totalBytes += f.extension === "pdf" ? Math.round(s * 0.65) : Math.round(s * 0.95);
    }
    if (totalBytes === 0) {
      const htmlLength = state.sectionGroups
        .flatMap((g) => g.sections)
        .reduce((acc, s) => acc + (s.htmlContent?.length || 0), 0);
      if (htmlLength > 0) {
        totalBytes = Math.round(htmlLength * 0.35) + 20 * 1024;
      }
    }
    return formatUnitSize(totalBytes);
  });

  const projectFileSize = createMemo(() => {
    const totalFiles = state.files.reduce((acc, f) => acc + (f.rawFile?.size || f.size || 0), 0);
    const htmlLength = state.sectionGroups
      .flatMap((g) => g.sections)
      .reduce((acc, s) => acc + (s.htmlContent?.length || 0), 0);
    const jsonOverhead = Math.round(htmlLength * 1.15) + state.spellCorrections.length * 150 + 20 * 1024;
    const totalBytes = totalFiles > 0 ? Math.ceil(totalFiles * 1.34) + jsonOverhead : (htmlLength > 0 ? jsonOverhead : 0);
    return formatUnitSize(totalBytes);
  });

  const localMemorySize = createMemo(() => {
    const totalFiles = state.files.reduce((acc, f) => acc + (f.rawFile?.size || f.size || 0), 0);
    const htmlLength = state.sectionGroups
      .flatMap((g) => g.sections)
      .reduce((acc, s) => acc + (s.htmlContent?.length || 0), 0);
    const jsonOverhead = Math.round(htmlLength * 1.15) + state.spellCorrections.length * 150 + 15 * 1024;
    const totalBytes = totalFiles > 0 ? totalFiles + jsonOverhead : (htmlLength > 0 ? jsonOverhead : 0);
    return formatUnitSize(totalBytes);
  });

  const handleExportEpub = async () => {
    setExporting(true);
    try {
      await exportCurrentEpub();
    } finally {
      setExporting(false);
    }
  };

  const handleClearLocal = async () => {
    if (confirm(t("saveExport.clearConfirm"))) {
      await clearSavedProjectFromIndexedDB();
    }
  };

  const handleExportProject = async () => {
    setExportingProject(true);
    try {
      await exportProjectFile();
    } finally {
      setExportingProject(false);
    }
  };

  const handleFileInputChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    setImportingProject(true);
    setImportError(null);
    try {
      const success = await importProjectFile(file);
      if (success) {
        props.onClose();
      } else {
        setImportError(t("saveExport.importErrorRestore"));
      }
    } catch {
      setImportError(t("saveExport.importErrorProcess"));
    } finally {
      setImportingProject(false);
      target.value = "";
    }
  };

  return (
    <Show when={props.isOpen}>
      <button
        type="button"
        aria-label={t("saveExport.closeAria")}
        class="fixed inset-0 z-40 bg-background/50 backdrop-blur-xs cursor-default border-0"
        onClick={props.onClose}
        tabIndex={-1}
      />

      <div class="fixed top-0 right-0 w-96 max-w-[95vw] h-full bg-card border-l border-border p-6 shadow-2xl flex flex-col gap-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-200">
        <div class="flex items-center justify-between pb-3 border-b border-border">
          <div class="flex items-center gap-2 text-foreground font-semibold text-sm">
            <Save class="w-4 h-4 text-primary" />
            <span>{t("saveExport.title")}</span>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-col gap-4">
          <div class="rounded-xl border border-border/80 bg-background p-4 flex flex-col gap-3 shadow-2xs">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Download class="w-4 h-4" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-semibold text-foreground">{t("saveExport.exportEpubTitle")}</span>
                  <span class="text-[11px] text-muted-foreground truncate">
                    {state.metadata.title ? `${state.metadata.title}.epub` : t("saveExport.defaultBookFilename")}
                  </span>
                </div>
              </div>
              <span class="text-xs font-mono font-medium text-muted-foreground shrink-0 tabular-nums pt-0.5 select-none">
                {epubEstimatedSize()}
              </span>
            </div>

            <p class="text-[11px] text-muted-foreground leading-relaxed">
              {t("saveExport.exportEpubDesc")}
            </p>

            <button
              type="button"
              onClick={handleExportEpub}
              disabled={exporting() || (state.files.length === 0 && state.sectionGroups.length === 0)}
              class="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs shadow-xs transition-opacity cursor-pointer flex items-center justify-center gap-2"
            >
              <Show when={exporting()} fallback={<Download class="w-3.5 h-3.5" />}>
                <Loader2 class="w-3.5 h-3.5 animate-spin" />
              </Show>
              <span>{exporting() ? t("saveExport.exportingEpub") : t("saveExport.downloadEpub")}</span>
            </button>
          </div>

          <div class="rounded-xl border border-border/80 bg-background p-4 flex flex-col gap-3 shadow-2xs">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <FileBox class="w-4 h-4" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-semibold text-foreground">{t("saveExport.projectFileTitle")}</span>
                  <span class="text-[11px] text-muted-foreground">{t("saveExport.projectFileFormat")}</span>
                </div>
              </div>
              <span class="text-xs font-mono font-medium text-muted-foreground shrink-0 tabular-nums pt-0.5 select-none">
                {projectFileSize()}
              </span>
            </div>

            <p class="text-[11px] text-muted-foreground leading-relaxed">
              {t("saveExport.projectFileDesc")}
            </p>

            <div class="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportProject}
                disabled={exportingProject() || (state.files.length === 0 && state.sectionGroups.length === 0)}
                class="w-full py-1.5 px-3 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Show when={exportingProject()} fallback={<FileDown class="w-3.5 h-3.5" />}>
                  <Loader2 class="w-3.5 h-3.5 animate-spin" />
                </Show>
                <span>{exportingProject() ? t("saveExport.savingProject") : t("saveExport.saveProject")}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef?.click()}
                disabled={importingProject()}
                class="w-full py-1.5 px-3 rounded-lg border border-dashed border-border hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Show when={importingProject()} fallback={<FileUp class="w-3.5 h-3.5 text-primary" />}>
                  <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
                </Show>
                <span>{importingProject() ? t("saveExport.loadingProject") : t("saveExport.loadProject")}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".editnovel,.json"
                class="hidden"
                onChange={handleFileInputChange}
              />

              <Show when={importError()}>
                <p class="text-[11px] text-rose-500 font-medium">{importError()}</p>
              </Show>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-border flex flex-col gap-3">
          <div class="rounded-xl border border-border/80 bg-background p-4 flex flex-col gap-3 shadow-2xs">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <HardDrive class="w-4 h-4" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-semibold text-foreground">{t("saveExport.localMemoryTitle")}</span>
                  <span class="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span
                      class={`w-1.5 h-1.5 rounded-full ${
                        state.localSaveEnabled ? "bg-emerald-500" : "bg-muted-foreground/60"
                      }`}
                    />
                    {state.localSaveEnabled ? t("saveExport.savingActive") : t("saveExport.savingPaused")}
                  </span>
                </div>
              </div>
              <span class="text-xs font-mono font-medium text-muted-foreground shrink-0 tabular-nums pt-0.5 select-none">
                {localMemorySize()}
              </span>
            </div>

            <p class="text-[11px] text-muted-foreground leading-relaxed">
              {t("saveExport.localMemoryDesc")}
            </p>

            <div class="flex items-center justify-between pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={state.localSaveEnabled}
                onClick={() => setLocalSaveEnabled(!state.localSaveEnabled)}
                class="flex items-center gap-2 cursor-pointer select-none"
              >
                <div
                  class={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    state.localSaveEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
                      state.localSaveEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span class="text-xs font-medium text-foreground">
                  {state.localSaveEnabled ? t("saveExport.savingEnabled") : t("saveExport.savingDisabled")}
                </span>
              </button>

              <button
                type="button"
                onClick={handleClearLocal}
                title={t("saveExport.clearLocalTitle")}
                class="p-1.5 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
