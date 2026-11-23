import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileCode2,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
} from "lucide-solid";
import { type Component, Show } from "solid-js";
import { t } from "~/lib/i18n";
import { setPreset, setStep, state } from "~/lib/store";
import type { PresetId } from "~/lib/types";

export const StepPresets: Component = () => {
  const currentPreset = () => state.selectedPreset;

  const handleSelectPreset = (preset: PresetId) => {
    if (preset === "visual-novel") {
      setPreset(preset);
    }
  };

  return (
    <div class="flex flex-col gap-5 py-3">
      <Show when={state.isProcessing}>
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-foreground text-xs font-medium w-fit animate-pulse">
          <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
          <span>{t("stepFiles.parsingBackground")}</span>
        </div>
      </Show>
      <div class="p-4 rounded-xl border border-border/80 bg-muted/20 opacity-55 cursor-not-allowed relative select-none flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
            <FileText class="w-4 h-4" />
          </div>
          <h3 class="text-sm font-semibold text-foreground">
            {t("stepPresets.genericTitle")}
          </h3>
        </div>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground shrink-0 border border-border">
          <Clock class="w-3 h-3" />
          <span>{t("stepPresets.workInProgress")}</span>
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleSelectPreset("visual-novel")}
          class={`p-4 rounded-xl border text-left transition-all relative flex items-center justify-between gap-3 cursor-pointer ${
            currentPreset() === "visual-novel"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
              : "border-border bg-card hover:border-muted-foreground/40"
          }`}
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen class="w-4 h-4" />
            </div>
            <h3 class="text-sm font-semibold text-foreground">
              {t("stepPresets.visualNovelTitle")}
            </h3>
          </div>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-semibold border border-primary/20 shrink-0">
            <CheckCircle2 class="w-3.5 h-3.5" />
            <span>{t("stepPresets.activeBadge")}</span>
          </span>
        </button>

        <div class="p-4 rounded-xl border border-border/80 bg-muted/20 opacity-55 cursor-not-allowed relative select-none flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
              <Layers class="w-4 h-4" />
            </div>
            <h3 class="text-sm font-semibold text-foreground">
              {t("stepPresets.webnovelTitle")}
            </h3>
          </div>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground shrink-0 border border-border">
            <Clock class="w-3 h-3" />
            <span>{t("stepPresets.workInProgress")}</span>
          </span>
        </div>

        <div class="p-4 rounded-xl border border-border/80 bg-muted/20 opacity-55 cursor-not-allowed relative select-none flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
              <FileCode2 class="w-4 h-4" />
            </div>
            <h3 class="text-sm font-semibold text-foreground">
              {t("stepPresets.readmeTitle")}
            </h3>
          </div>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground shrink-0 border border-border">
            <Clock class="w-3 h-3" />
            <span>{t("stepPresets.workInProgress")}</span>
          </span>
        </div>

        <div class="p-4 rounded-xl border border-border/80 bg-muted/20 opacity-55 cursor-not-allowed relative select-none flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
              <GraduationCap class="w-4 h-4" />
            </div>
            <h3 class="text-sm font-semibold text-foreground">
              {t("stepPresets.paperTitle")}
            </h3>
          </div>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground shrink-0 border border-border">
            <Clock class="w-3 h-3" />
            <span>{t("stepPresets.workInProgress")}</span>
          </span>
        </div>
      </div>

      <div class="flex items-center justify-end pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={() => setStep(3)}
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <span>{t("stepPresets.continueButton")}</span>
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
