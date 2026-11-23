import {
  BookOpen,
  Check,
  Image as ImageIcon,
  Images,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-solid";
import { type Component, createMemo, createSignal, For, onMount, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  applyAutoMetadataSuggestions,
  currentCoverInfo,
  formatCoverLabel,
  getDetectedCovers,
  removeCoverImage,
  restoreOriginalCoverImage,
  selectDetectedCover,
  setCustomCoverImage,
  state,
  updateMetadata,
} from "~/lib/store";

export const StepConfig: Component = () => {
  let fileInputRef: HTMLInputElement | undefined;
  const [isDragging, setIsDragging] = createSignal(false);
  const [showCoverGallery, setShowCoverGallery] = createSignal(false);
  const cover = () => currentCoverInfo();
  const detectedCovers = createMemo(() => getDetectedCovers());

  onMount(() => {
    applyAutoMetadataSuggestions();
  });

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    await setCustomCoverImage(file);
  };

  const onFileInputChange = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files && input.files[0]) {
      await handleFile(input.files[0]);
      input.value = "";
    }
  };

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div class="flex flex-col gap-6 py-2">
      <Show when={state.isProcessing}>
        <div class="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2.5 text-xs text-foreground animate-pulse">
          <Loader2 class="w-4 h-4 animate-spin text-primary shrink-0" />
          <span>{t("stepFiles.parsingBackground")}</span>
        </div>
      </Show>

      <div>
        <h3 class="text-sm font-medium text-foreground">{t("stepConfig.title")}</h3>
        <p class="text-xs text-muted-foreground mt-0.5">{t("stepConfig.subtitle")}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div class="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.novelTitle")}</span>
              <input
                type="text"
                value={state.metadata.title}
                onInput={(e) => updateMetadata("title", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.titlePlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.author")}</span>
              <input
                type="text"
                value={state.metadata.author}
                onInput={(e) => updateMetadata("author", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.authorPlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.illustrator")}</span>
              <input
                type="text"
                value={state.metadata.illustrator}
                onInput={(e) => updateMetadata("illustrator", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.illustratorPlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.seriesName")}</span>
              <input
                type="text"
                value={state.metadata.series}
                onInput={(e) => updateMetadata("series", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.seriesPlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.volumeName")}</span>
              <input
                type="text"
                value={state.metadata.volume}
                onInput={(e) => updateMetadata("volume", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.volumePlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-foreground">
                {t("stepConfig.languageCode")}
              </span>
              <input
                type="text"
                value={state.metadata.language}
                onInput={(e) => updateMetadata("language", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                placeholder={t("stepConfig.languagePlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.publisher")}</span>
              <input
                type="text"
                value={state.metadata.publisher}
                onInput={(e) => updateMetadata("publisher", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.publisherPlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.translator")}</span>
              <input
                type="text"
                value={state.metadata.translator || ""}
                onInput={(e) => updateMetadata("translator", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.translatorPlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.publishedYear")}</span>
              <input
                type="text"
                value={state.metadata.publishedYear || ""}
                onInput={(e) => updateMetadata("publishedYear", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.publishedYearPlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.isbn")}</span>
              <input
                type="text"
                value={state.metadata.isbn || ""}
                onInput={(e) => updateMetadata("isbn", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                placeholder={t("stepConfig.isbnPlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.copyrightNotice")}</span>
              <input
                type="text"
                value={state.metadata.copyrightNotice || ""}
                onInput={(e) => updateMetadata("copyrightNotice", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("stepConfig.copyrightNoticePlaceholder")}
              />
            </label>

            <label class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <span class="text-xs font-medium text-foreground">{t("stepConfig.synopsis")}</span>
              <textarea
                rows={4}
                value={state.metadata.description}
                onInput={(e) => updateMetadata("description", e.currentTarget.value)}
                class="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
                placeholder={t("stepConfig.synopsisPlaceholder")}
              />
            </label>
          </div>
        </div>

        <div class="lg:col-span-5 xl:col-span-4 flex flex-col gap-3">
          <div class="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-3 shadow-xs">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <BookOpen class="w-4 h-4 text-primary" />
                <span class="text-xs font-semibold text-foreground">
                  {t("stepConfig.coverTitle")}
                </span>
              </div>
              <Show
                when={cover()}
                fallback={
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                    {t("stepConfig.noCoverBadge")}
                  </span>
                }
              >
                {(c) => (
                  <Show
                    when={c().isCustom}
                    fallback={
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        {t("stepConfig.coverDetectedBadge")}
                      </span>
                    }
                  >
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {t("stepConfig.coverCustomBadge")}
                    </span>
                  </Show>
                )}
              </Show>
            </div>

            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef?.click()}
              class={`aspect-[1/1.4] w-full max-h-[340px] relative rounded-lg border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-2 overflow-hidden ${
                isDragging()
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : cover()
                    ? "border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/30"
                    : "border-border bg-muted/30 hover:border-primary hover:bg-muted/40"
              }`}
            >
              <Show
                when={cover()}
                fallback={
                  <div class="flex flex-col items-center text-center p-4 gap-2">
                    <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <ImageIcon class="w-5 h-5" />
                    </div>
                    <span class="text-xs font-semibold text-foreground">
                      {t("stepConfig.noCoverTitle")}
                    </span>
                    <span class="text-[11px] text-muted-foreground max-w-[200px] leading-tight">
                      {t("stepConfig.dropCoverHere")}
                    </span>
                  </div>
                }
              >
                {(c) => (
                  <div class="relative w-full h-full flex items-center justify-center group/cover">
                    <img
                      src={c().url}
                      alt={t("stepConfig.coverTitle")}
                      class="max-w-full max-h-full object-contain rounded-md shadow-xs transition-transform duration-200 group-hover/cover:scale-[1.02]"
                    />
                    <div class="absolute inset-0 bg-background/60 opacity-0 group-hover/cover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 rounded-md backdrop-blur-[2px]">
                      <Upload class="w-5 h-5 text-foreground" />
                      <span class="text-xs font-medium text-foreground">
                        {t("stepConfig.changeCover")}
                      </span>
                    </div>
                  </div>
                )}
              </Show>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                onChange={onFileInputChange}
              />
            </div>

            <Show when={detectedCovers().length > 1}>
              <div class="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-lg border border-border/60">
                <span class="flex items-center gap-1.5 font-medium">
                  <Images class="w-3.5 h-3.5 text-primary" />
                  <span>{t("stepConfig.availableDetectedCovers", { count: detectedCovers().length })}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCoverGallery(true)}
                  class="text-primary hover:underline font-semibold cursor-pointer text-xs"
                >
                  {t("stepConfig.viewAllCovers")}
                </button>
              </div>
            </Show>

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef?.click()}
                class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 shadow-xs transition-opacity cursor-pointer"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>{cover() ? t("stepConfig.changeCover") : t("stepConfig.uploadCover")}</span>
              </button>

              <Show when={detectedCovers().length > 1}>
                <button
                  type="button"
                  onClick={() => setShowCoverGallery(true)}
                  class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer"
                  title={t("stepConfig.selectFromDetectedTooltip", { count: detectedCovers().length })}
                >
                  <Images class="w-3.5 h-3.5 text-primary" />
                  <span>{t("stepConfig.detectedButton", { count: detectedCovers().length })}</span>
                </button>
              </Show>

              <Show when={cover()}>
                <button
                  type="button"
                  onClick={async () => await removeCoverImage()}
                  class="p-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-colors cursor-pointer"
                  title={t("stepConfig.removeCover")}
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </Show>

              <Show when={cover()?.isCustom && cover()?.hasOriginal}>
                <button
                  type="button"
                  onClick={async () => await restoreOriginalCoverImage()}
                  class="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-colors cursor-pointer"
                  title={t("stepConfig.restoreOriginalCover")}
                >
                  <RotateCcw class="w-4 h-4" />
                </button>
              </Show>
            </div>

            <p class="text-[10px] text-muted-foreground/80 text-center leading-tight">
              {t("stepConfig.coverHint")}
            </p>
          </div>
        </div>
      </div>

      <Show when={showCoverGallery()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-xs">
          <div class="w-full max-w-3xl max-h-[85vh] rounded-xl border border-border bg-card p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-2">
                  <Images class="w-4 h-4 text-primary" />
                  <span class="text-sm font-semibold text-foreground">
                    {t("stepConfig.detectedCoversTitle", { count: detectedCovers().length })}
                  </span>
                </div>
                <span class="text-xs text-muted-foreground">
                  {t("stepConfig.detectedCoversSubtitle")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCoverGallery(false)}
                class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto pr-1">
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
                <For each={detectedCovers()}>
                  {(img, idx) => {
                    const isSelected = () => cover()?.url === img.url;
                    return (
                      <div
                        onClick={async () => {
                          await selectDetectedCover(img);
                          setShowCoverGallery(false);
                        }}
                        class={`group relative flex flex-col gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelected()
                            ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                        }`}
                      >
                        <div class="aspect-[1/1.4] w-full relative rounded-md overflow-hidden bg-muted/40 flex items-center justify-center">
                          <img
                            src={img.url}
                            alt={img.name}
                            class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <Show when={isSelected()}>
                            <div class="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                              <Check class="w-3 h-3" />
                              <span>{t("stepConfig.selectedBadge")}</span>
                            </div>
                          </Show>
                        </div>
                        <div class="flex items-center justify-between text-xs px-0.5">
                          <span class="font-medium text-foreground truncate text-[11px]">
                            {formatCoverLabel(img, idx())}
                          </span>
                          <span class="text-[10px] text-muted-foreground font-mono">
                            {img.resolution}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>

            <div class="flex items-center justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCoverGallery(false)}
                class="py-1.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {t("stepConfig.closeGallery")}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
