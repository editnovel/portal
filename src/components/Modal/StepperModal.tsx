import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileArchive,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  Settings,
  SlidersHorizontal,
  SpellCheck2,
  Type,
} from "lucide-solid";
import { type Component, createEffect, createSignal, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import { clearSavedProjectFromIndexedDB } from "~/lib/project-storage";
import { resetProject, setModalModeWithTransition, setStep, state } from "~/lib/store";
import type { ModalStepId } from "~/lib/types";
import { StepConfig } from "./StepConfig";
import { StepFiles } from "./StepFiles";
import { StepImages } from "./StepImages";
import { StepInfo } from "./StepInfo";
import { StepPresets } from "./StepPresets";
import { StepRules } from "./StepRules";
import { StepSections } from "./StepSections";
import { StepSpell } from "./StepSpell";

interface StepMeta {
  id: ModalStepId;
  labelKey:
    | "modal.steps.studio"
    | "modal.steps.presets"
    | "modal.steps.sources"
    | "modal.steps.structure"
    | "modal.steps.metadata"
    | "modal.steps.media"
    | "modal.steps.spelling"
    | "modal.steps.typography";
  icon: Component<{ class?: string }>;
}

const STEPS: StepMeta[] = [
  { id: 1, labelKey: "modal.steps.studio", icon: Info },
  { id: 2, labelKey: "modal.steps.presets", icon: SlidersHorizontal },
  { id: 3, labelKey: "modal.steps.sources", icon: FileArchive },
  { id: 4, labelKey: "modal.steps.structure", icon: BookOpen },
  { id: 5, labelKey: "modal.steps.metadata", icon: Settings },
  { id: 6, labelKey: "modal.steps.media", icon: ImageIcon },
  { id: 7, labelKey: "modal.steps.spelling", icon: SpellCheck2 },
  { id: 8, labelKey: "modal.steps.typography", icon: Type },
];

export const StepperModal: Component = () => {
  const [showResetConfirm, setShowResetConfirm] = createSignal(false);
  const [renderedSteps, setRenderedSteps] = createSignal<Record<number, boolean>>({
    [state.currentStep]: true,
  });

  const currentStep = () => state.currentStep;
  const isExpanded = () => state.modalMode === "expanded";
  const hasReadyFiles = () => state.files.some((f) => f.status === "ready");

  createEffect(() => {
    const step = currentStep();
    if (renderedSteps()[step]) return;

    requestAnimationFrame(() => {
      setRenderedSteps((prev) => ({ ...prev, [step]: true }));
    });
  });

  const canGoBack = () => currentStep() > 1;
  const canGoForward = () => {
    if (currentStep() === 1) return true;
    if (currentStep() === 2) return true;
    if (currentStep() === 3) return state.files.length > 0;
    return currentStep() < 8;
  };

  const handlePrev = () => {
    if (canGoBack()) setStep((currentStep() - 1) as ModalStepId);
  };

  const handleNext = () => {
    if (canGoForward()) setStep((currentStep() + 1) as ModalStepId);
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      setModalModeWithTransition("docked");
    }
  };

  const handleConfirmReset = async () => {
    await clearSavedProjectFromIndexedDB();
    resetProject();
    setRenderedSteps({ 1: true });
    setShowResetConfirm(false);
  };

  return (
    <div
      class={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 transition-[opacity] duration-200 ease-out ${
        isExpanded()
          ? "opacity-100 pointer-events-auto backdrop-blur-sm bg-background/60"
          : "opacity-0 pointer-events-none bg-transparent"
      }`}
      aria-hidden={!isExpanded()}
    >
      <button
        type="button"
        aria-label={t("modal.minimizeAria")}
        onClick={handleBackdropClick}
        class="absolute inset-0 w-full h-full cursor-pointer bg-transparent border-0 -z-0"
        tabIndex={-1}
      />
      <div
        class={`relative z-10 flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden cursor-default transition-[transform,opacity] duration-200 ease-out will-change-[transform,opacity] ${
          isExpanded() ? "scale-100 translate-y-0 opacity-100" : "scale-95 -translate-y-2 opacity-0"
        }`}
      >
          <div class="absolute top-4 right-4 z-20 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setModalModeWithTransition("docked")}
              class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title={t("modal.dockToTop")}
            >
              <ChevronUp class="w-4 h-4" />
            </button>
          </div>

          <Show when={showResetConfirm()}>
            <div class="absolute inset-0 z-50 backdrop-blur-md bg-background/85 flex items-center justify-center p-6">
              <div class="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl flex flex-col gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                    <AlertTriangle class="w-5 h-5" />
                  </div>
                  <div class="flex flex-col">
                    <h4 class="text-sm font-semibold text-foreground">
                      {t("modal.resetConfirmTitle")}
                    </h4>
                    <p class="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {t("modal.resetConfirmDesc")}
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    class="px-3 py-1.5 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {t("modal.resetConfirmButton")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    class="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 shadow-xs transition-opacity cursor-pointer"
                  >
                    {t("modal.resetCancelButton")}
                  </button>
                </div>
              </div>
            </div>
          </Show>

          <div class="pt-5 pb-3 px-6 sm:px-8 border-b border-border/60">
            <div class="flex items-center justify-between max-w-4xl mx-auto gap-3">
              <div class="flex flex-col items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  class="flex flex-col items-center group cursor-pointer"
                  title={t("modal.newProject")}
                >
                  <div class="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-foreground">
                    <Plus class="w-4 h-4" />
                  </div>
                  <div class="flex flex-col items-center mt-1.5 text-center">
                    <span class="text-xs font-semibold leading-tight text-muted-foreground group-hover:text-foreground">
                      {t("modal.new")}
                    </span>
                  </div>
                </button>
              </div>

              <div class="h-8 w-px bg-border/60 shrink-0 mx-1 self-center" />

              <div
                class="grid grid-cols-8 flex-1 relative px-1 py-1"
              >
              <For each={STEPS}>
                {(step, index) => {
                  const isActive = () => currentStep() === step.id;
                  const isPassed = () => currentStep() > step.id;
                  const isSpinning = () => !!state.stepSpinners[step.id];

                  return (
                    <div class="relative flex flex-col items-center w-full">
                      <Show when={index() < STEPS.length - 1}>
                        <div class="absolute left-1/2 top-4 -translate-y-1/2 w-full h-0.5 bg-border pointer-events-none z-0" />
                      </Show>

                      <button
                        type="button"
                        onClick={() => setStep(step.id)}
                        class="relative z-10 flex flex-col items-center group cursor-pointer w-full"
                      >
                        <div
                          class={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isActive()
                              ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-105"
                              : isPassed()
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Show when={isSpinning()} fallback={<step.icon class="w-4 h-4" />}>
                            <Loader2 class="w-4 h-4 animate-spin text-current" />
                          </Show>
                        </div>

                        <div class="flex flex-col items-center mt-1.5 text-center">
                          <span
                            class={`text-xs font-semibold leading-tight ${
                              isActive() ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {t(step.labelKey)}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-4 min-h-[360px]">
            <Show when={!renderedSteps()[currentStep()]}>
              <div class="flex items-center justify-center py-24">
                <Loader2 class="w-6 h-6 animate-spin text-primary opacity-60" />
              </div>
            </Show>

            <Show when={renderedSteps()[1]}>
              <div class={currentStep() === 1 ? "contents" : "hidden"}>
                <StepInfo />
              </div>
            </Show>
            <Show when={renderedSteps()[2]}>
              <div class={currentStep() === 2 ? "contents" : "hidden"}>
                <StepPresets />
              </div>
            </Show>
            <Show when={renderedSteps()[3]}>
              <div class={currentStep() === 3 ? "contents" : "hidden"}>
                <StepFiles />
              </div>
            </Show>
            <Show when={renderedSteps()[4]}>
              <div class={currentStep() === 4 ? "contents" : "hidden"}>
                <StepSections />
              </div>
            </Show>
            <Show when={renderedSteps()[5]}>
              <div class={currentStep() === 5 ? "contents" : "hidden"}>
                <StepConfig />
              </div>
            </Show>
            <Show when={renderedSteps()[6]}>
              <div class={currentStep() === 6 ? "contents" : "hidden"}>
                <StepImages />
              </div>
            </Show>
            <Show when={renderedSteps()[7]}>
              <div class={currentStep() === 7 ? "contents" : "hidden"}>
                <StepSpell />
              </div>
            </Show>
            <Show when={renderedSteps()[8]}>
              <div class={currentStep() === 8 ? "contents" : "hidden"}>
                <StepRules />
              </div>
            </Show>
          </div>
        </div>

        <Show when={isExpanded() && canGoBack()}>
          <button
            type="button"
            onClick={handlePrev}
            class="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full border border-border bg-card/95 hover:bg-accent text-card-foreground shadow-xl flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
            title={t("modal.prevStep")}
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
        </Show>

        <Show when={isExpanded() && canGoForward()}>
          <button
            type="button"
            onClick={handleNext}
            class="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full border border-border bg-card/95 hover:bg-accent text-card-foreground shadow-xl flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
            title={t("modal.nextStep")}
          >
            <ChevronRight class="w-5 h-5" />
          </button>
        </Show>
      </div>
  );
};
