import {
  CheckCircle2,
  FileArchive,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import { addFiles, removeFile, state, toggleFileActive } from "~/lib/store";

function truncateMiddle(str: string, maxLength = 26): string {
  if (str.length <= maxLength) return str;
  const charsToShow = maxLength - 3;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return `${str.substring(0, frontChars)}...${str.substring(str.length - backChars)}`;
}

export const StepFiles: Component = () => {
  const [isDragging, setIsDragging] = createSignal(false);
  let fileInputRef: HTMLInputElement | undefined;

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      await addFiles(filesArray);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      const filesArray = Array.from(target.files);
      await addFiles(filesArray);
      target.value = "";
    }
  };

  return (
    <div class="flex flex-col gap-6 py-2">
      <section
        aria-label="File upload dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        class={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all ${
          isDragging()
            ? "border-primary bg-accent/30 scale-[0.99]"
            : "border-border hover:border-muted-foreground/50 bg-muted/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={true}
          accept=".pdf,.epub"
          onChange={handleFileInputChange}
          class="hidden"
        />

        <div class="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground mb-3">
          <UploadCloud class="w-6 h-6" />
        </div>

        <p class="text-sm font-medium text-foreground">
          {t("stepFiles.dropzoneTitle")}{" "}
          <button
            type="button"
            onClick={() => fileInputRef?.click()}
            class="text-primary underline font-medium hover:opacity-80 cursor-pointer"
          >
            {t("stepFiles.browseFiles")}
          </button>
        </p>
        <p class="text-xs text-muted-foreground mt-1">{t("stepFiles.dropzoneSubtitle")}</p>
      </section>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{t("stepFiles.loadedSources", { count: state.files.length })}</span>
          <Show when={state.isProcessing}>
            <span class="inline-flex items-center gap-1.5 text-foreground font-medium">
              <Loader2 class="w-3.5 h-3.5 animate-spin" />
              {t("stepFiles.parsingBackground")}
            </span>
          </Show>
        </div>

        <Show
          when={state.files.length > 0}
          fallback={
            <div class="p-8 text-center text-xs text-muted-foreground border border-border rounded-lg bg-card">
              {t("stepFiles.noDocsYet")}
            </div>
          }
        >
          <div class="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
            <For each={state.files}>
              {(file) => (
                <div class="flex items-center justify-between p-3 text-sm hover:bg-muted/40 transition-colors">
                  <div class="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={file.active}
                      onChange={() => toggleFileActive(file.id)}
                      class="rounded border-border text-primary focus:ring-ring w-4 h-4 cursor-pointer"
                    />

                    <div class="flex items-center gap-2 min-w-0">
                      <Show
                        when={file.extension === "pdf"}
                        fallback={<FileArchive class="w-4 h-4 text-muted-foreground shrink-0" />}
                      >
                        <FileText class="w-4 h-4 text-muted-foreground shrink-0" />
                      </Show>
                      <span class="font-medium text-foreground truncate" title={file.name}>
                        {truncateMiddle(file.name)}
                      </span>
                    </div>

                    <span class="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {file.extension}
                    </span>
                  </div>

                  <div class="flex items-center gap-4 shrink-0">
                    <Show when={file.status === "processing"}>
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            class="h-full bg-primary transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>{t("stepFiles.statusExtracting")}</span>
                        </span>
                      </div>
                    </Show>

                    <Show when={file.status === "ready"}>
                      <span class="inline-flex items-center gap-1 text-xs text-foreground font-medium">
                        <CheckCircle2 class="w-3.5 h-3.5 text-primary" />
                        <span>{t("stepFiles.statusChapters", { count: file.sectionCount })}</span>
                      </span>
                    </Show>

                    <Show when={file.status === "error"}>
                      <span class="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                        <XCircle class="w-3.5 h-3.5" />
                        <span>{t("stepFiles.statusError")}</span>
                      </span>
                    </Show>

                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                      title={t("stepFiles.removeFile")}
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};
