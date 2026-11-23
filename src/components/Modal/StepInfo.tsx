import { A } from "@solidjs/router";
import { ArrowRight, Loader2 } from "lucide-solid";
import { type Component, Show } from "solid-js";
import { t } from "~/lib/i18n";
import { setStep, state } from "~/lib/store";

export const StepInfo: Component = () => {
  return (
    <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-6 px-4">
      <div class="md:col-span-7 flex flex-col gap-4">
        <div class="flex items-center gap-2 flex-wrap">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium w-fit">
            <img src="/logo.png" alt="Logo" class="w-4 h-4 object-contain" />
            <span>{t("stepInfo.badge")}</span>
          </div>

          <Show when={state.isProcessing}>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-foreground text-xs font-medium animate-pulse">
              <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
              <span>{t("stepFiles.parsingBackground")}</span>
            </div>
          </Show>
        </div>
        <h2 class="text-3xl font-semibold tracking-tight text-foreground">
          {t("stepInfo.heroTitle")}
        </h2>
        <p class="text-base text-muted-foreground leading-relaxed">{t("stepInfo.heroDesc")}</p>
        <div class="pt-2">
          <button
            type="button"
            onClick={() => setStep(2)}
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <span>{t("stepInfo.beginButton")}</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="md:col-span-5 flex flex-col justify-center">
        <A
          href="/home"
          class="group block p-6 rounded-xl border border-border bg-card hover:bg-accent/40 transition-all text-card-foreground shadow-sm hover:shadow"
        >
          <div class="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center p-2 mb-4 group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="EditNovel logo" class="w-8 h-8 object-contain" />
          </div>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-foreground group-hover:underline">
              {t("stepInfo.guideTitle")}
            </h3>
            <ArrowRight class="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <p class="mt-2 text-xs text-muted-foreground leading-relaxed">
            {t("stepInfo.guideDesc")}
          </p>
        </A>
      </div>
    </div>
  );
};
