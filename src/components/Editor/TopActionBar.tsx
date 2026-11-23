import { A } from "@solidjs/router";
import { ArrowUpDown, Download, Loader2, Save } from "lucide-solid";
import { type Component, createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  exportCurrentEpub,
  setStepAndModalModeWithTransition,
  state,
  toggleSaveExport,
  toggleSyncScroll,
} from "~/lib/store";
import type { ModalStepId } from "~/lib/types";

export type TopBarStepperState =
  | "hidden"
  | "no_files_idle"
  | "no_files_breathing"
  | "processing"
  | "with_files";

interface NavStep {
  id: ModalStepId;
  labelKey:
    | "topBar.presets"
    | "topBar.sources"
    | "topBar.structure"
    | "topBar.metadata"
    | "topBar.media"
    | "topBar.spelling"
    | "topBar.typography";
}

const WORKFLOW_STEPS: NavStep[] = [
  { id: 2, labelKey: "topBar.presets" },
  { id: 3, labelKey: "topBar.sources" },
  { id: 4, labelKey: "topBar.structure" },
  { id: 5, labelKey: "topBar.metadata" },
  { id: 6, labelKey: "topBar.media" },
  { id: 7, labelKey: "topBar.spelling" },
  { id: 8, labelKey: "topBar.typography" },
];

export const TopActionBar: Component = () => {
  const [exporting, setExporting] = createSignal(false);
  const [stepperState, setStepperState] = createSignal<TopBarStepperState>("hidden");

  const isExpanded = () => state.modalMode === "expanded";
  const isDocked = () => state.modalMode === "docked";
  const hasReadyFiles = () => state.files.some((f) => f.status === "ready");

  createEffect(() => {
    if (state.modalMode === "expanded") {
      setStepperState("hidden");
      return;
    }

    if (state.isProcessing) {
      setStepperState("processing");
      return;
    }

    if (hasReadyFiles()) {
      setStepperState("with_files");
      return;
    }

    setStepperState("no_files_idle");
    const timer = setTimeout(() => {
      setStepperState("no_files_breathing");
    }, 2500);

    onCleanup(() => {
      clearTimeout(timer);
    });
  });

  const isStepSelected = (stepId: ModalStepId) => {
    if (stepperState() !== "with_files") return false;
    return state.currentStep === stepId;
  };

  const isStepBreathing = (stepId: ModalStepId) => {
    return stepperState() === "no_files_breathing" && stepId === 3;
  };

  const isStepProcessing = (stepId: ModalStepId) => {
    return stepperState() === "processing" && stepId === 3;
  };

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      exportCurrentEpub();
      setExporting(false);
    }, 400);
  };

  return (
    <header class="h-12 border-b border-border bg-card px-4 flex items-center justify-between relative z-20 shrink-0">
      <A
        href="/home"
        class="flex items-center gap-2 hover:opacity-80 transition-opacity"
        title={t("topBar.logoTitle")}
      >
        <img src="/logo.png" alt="EditNovel logo" class="w-6 h-6 object-contain" />
        <span class="font-semibold text-sm tracking-tight text-foreground">
          {t("common.editnovel")}
        </span>
      </A>

      <nav
        aria-label="Workflow steps"
        class={`absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1 p-1 rounded-lg border border-border bg-secondary/50 transition-opacity duration-200 ${
          isExpanded() ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <For each={WORKFLOW_STEPS}>
          {(step) => {
            const selected = () => isStepSelected(step.id);
            const breathing = () => isStepBreathing(step.id);
            const processing = () => isStepProcessing(step.id);

            return (
              <button
                type="button"
                onClick={() => {
                  setStepAndModalModeWithTransition(step.id, "expanded");
                }}
                class={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  selected()
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50 font-normal"
                }`}
                title={t("topBar.openStep", { step: t(step.labelKey) })}
              >
                <span class="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                  <Show when={processing()}>
                    <Loader2 class="w-3 h-3 animate-spin text-primary" />
                  </Show>
                  <Show when={!processing()}>
                    <Show when={breathing()}>
                      <span class="absolute inline-flex w-full h-full rounded-full bg-primary/40 animate-breathing-ring" />
                    </Show>
                    <span
                      class={`rounded-full transition-transform ${
                        breathing()
                          ? "w-1.5 h-1.5 bg-primary animate-breathing-blink"
                          : selected()
                            ? "w-1.5 h-1.5 bg-primary scale-125"
                            : "w-1.5 h-1.5 bg-muted-foreground/40"
                      }`}
                    />
                  </Show>
                </span>
                <span class="text-[11px]">{t(step.labelKey)}</span>
              </button>
            );
          }}
        </For>
      </nav>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleSyncScroll()}
          class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            state.syncScroll
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
          title={t("topBar.syncScrollTitle")}
        >
          <ArrowUpDown class="w-3.5 h-3.5" />
          <span class="hidden lg:inline">{t("topBar.syncScroll")}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleSaveExport()}
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
        >
          <Save class="w-3.5 h-3.5" />
          <span>{t("topBar.saveExport")}</span>
        </button>
      </div>
    </header>
  );
};
