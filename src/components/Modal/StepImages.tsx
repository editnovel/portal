import { AlertTriangle, Ban, Check, Eye, EyeOff, Loader2 } from "lucide-solid";
import { type Component, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  state,
  toggleDiscardTinyImages,
  toggleImageDiscard,
  toggleShowSpoilers,
} from "~/lib/store";

export const StepImages: Component = () => {
  const keptImages = () => state.images.filter((img) => !img.isDiscarded);
  const discardedImages = () => state.images.filter((img) => img.isDiscarded);
  const isFilterLowResActive = () =>
    state.images.some((img) => img.type === "tiled" && img.isDiscarded);

  return (
    <div class="flex flex-col gap-6 py-2">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-foreground">{t("stepImages.title")}</h3>
          <p class="text-xs text-muted-foreground mt-0.5">{t("stepImages.subtitle")}</p>
        </div>

        <div class="flex items-center gap-3">
          <label class="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isFilterLowResActive()}
              onChange={() => toggleDiscardTinyImages()}
              class="rounded border-border text-primary focus:ring-ring w-4 h-4"
            />
            <span>{t("stepImages.filterLowRes")}</span>
          </label>

          <button
            type="button"
            onClick={() => toggleShowSpoilers()}
            class="p-2 rounded-lg border border-border bg-card hover:bg-accent text-card-foreground transition-colors"
            title={
              state.showSpoilers
                ? t("stepImages.hideIllustrations")
                : t("stepImages.revealIllustrations")
            }
          >
            <Show when={state.showSpoilers} fallback={<Eye class="w-4 h-4" />}>
              <EyeOff class="w-4 h-4" />
            </Show>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-foreground">
            {t("stepImages.includedInBook", { count: keptImages().length })}
          </span>
          <Show when={!state.showSpoilers}>
            <span class="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <AlertTriangle class="w-3.5 h-3.5" />
              <span>{t("stepImages.spoilerProtectionActive")}</span>
            </span>
          </Show>
        </div>

        <div class="relative min-h-[160px] p-4 border border-border rounded-xl bg-card">
          <Show
            when={state.showSpoilers}
            fallback={
              <div class="absolute inset-0 z-10 backdrop-blur-md bg-background/60 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle class="w-8 h-8 text-muted-foreground mb-2" />
                <p class="text-xs font-medium text-foreground">
                  {t("stepImages.spoilerWarningTitle")}
                </p>
                <p class="text-[11px] text-muted-foreground mt-0.5 mb-3">
                  {t("stepImages.spoilerWarningSubtitle")}
                </p>
                <button
                  type="button"
                  onClick={() => toggleShowSpoilers()}
                  class="p-2 rounded-lg border border-border bg-card hover:bg-accent text-card-foreground transition-colors shadow-xs"
                >
                  <Eye class="w-4 h-4" />
                </button>
              </div>
            }
          >
            <Show
              when={keptImages().length > 0}
              fallback={
                <Show
                  when={state.isProcessing}
                  fallback={
                    <div class="p-8 text-center text-xs text-muted-foreground">
                      {t("stepImages.noImagesIncluded")}
                    </div>
                  }
                >
                  <div class="flex flex-col gap-4">
                    <div class="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                      <Loader2 class="w-4 h-4 animate-spin text-primary" />
                      <span>{t("stepFiles.parsingBackground")}</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
                      <For each={[1, 2, 3, 4]}>
                        {() => (
                          <div class="aspect-3/4 rounded-lg bg-muted/40 border border-border" />
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              }
            >
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <For each={keptImages()}>
                  {(img) => (
                    <div class="group relative rounded-lg border border-border overflow-hidden bg-muted/30 flex flex-col">
                      <div class="aspect-3/4 relative overflow-hidden bg-muted flex items-center justify-center">
                        <img
                          src={img.url}
                          alt={img.name}
                          class="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div class="absolute top-2 right-2">
                          <button
                            type="button"
                            onClick={() => toggleImageDiscard(img.id)}
                            class="p-1.5 rounded-md bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground backdrop-blur-xs transition-colors shadow-xs cursor-pointer"
                            title={t("stepImages.discardImage")}
                          >
                            <Ban class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div class="p-2 flex flex-col gap-0.5">
                        <span
                          class="text-[11px] font-medium text-foreground truncate"
                          title={img.name}
                        >
                          {img.name}
                        </span>
                        <div class="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span class="uppercase">{img.type}</span>
                          <span>{img.resolution}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </div>

      <Show when={discardedImages().length > 0}>
        <div class="flex flex-col gap-3 pt-2 border-t border-border">
          <span class="text-xs font-semibold text-muted-foreground">
            {t("stepImages.discardedTitle", { count: discardedImages().length })}
          </span>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 opacity-75">
            <For each={discardedImages()}>
              {(img) => (
                <div class="relative rounded-lg border border-border overflow-hidden bg-muted/20 flex flex-col">
                  <div class="aspect-3/4 relative overflow-hidden bg-muted flex items-center justify-center grayscale">
                    <img src={img.url} alt={img.name} class="w-full h-full object-cover" />
                    <div class="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={() => toggleImageDiscard(img.id)}
                        class="p-1.5 rounded-md bg-background/80 hover:bg-primary hover:text-primary-foreground text-foreground backdrop-blur-xs transition-colors shadow-xs"
                        title={t("stepImages.restoreImage")}
                      >
                        <Check class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div class="p-2 flex flex-col gap-0.5">
                    <span
                      class="text-[11px] font-medium text-muted-foreground truncate"
                      title={img.name}
                    >
                      {img.name}
                    </span>
                    <div class="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span class="uppercase">{img.type}</span>
                      <span>{img.resolution}</span>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};
