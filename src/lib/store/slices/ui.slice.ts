import { batch, createSignal } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { ReaderSettings } from "../../reader-settings";
import type { AppState, ModalDisplayMode, ModalStepId, PresetId } from "../../types";

export function getInitialLocalSaveEnabled(): boolean {
  if (typeof window !== "undefined") {
    const val = localStorage.getItem("app_local_save_enabled");
    if (val !== null) {
      return val === "true";
    }
  }
  return true;
}

export const [projectVersion, setProjectVersion] = createSignal(0);

export function touchProject(): void {
  setProjectVersion((v) => v + 1);
}

let globalCancelAutoSave: (() => void) | null = null;

export function registerAutoSaveCanceller(fn: () => void): void {
  globalCancelAutoSave = fn;
}

export function cancelPendingAutoSave(): void {
  globalCancelAutoSave?.();
}

export const [correctionScrollTrigger, setCorrectionScrollTrigger] = createSignal<{
  id: string;
  timestamp: number;
} | null>(null);

let globalSetState: SetStoreFunction<AppState> | null = null;

export function flashStepSpinner(step: number, durationMs = 800): void {
  if (!globalSetState) return;
  globalSetState("stepSpinners", step, true);
  setTimeout(() => {
    globalSetState?.("stepSpinners", step, false);
  }, durationMs);
}

export function createUiSlice(setState: SetStoreFunction<AppState>) {
  globalSetState = setState;

  function setStep(step: ModalStepId): void {
    setState("currentStep", step);
  }

  function setPreset(preset: PresetId): void {
    setState("selectedPreset", preset);
  }

  function setModalMode(mode: ModalDisplayMode): void {
    setState("modalMode", mode);
  }

  function setModalModeWithTransition(mode: ModalDisplayMode): void {
    setState("modalMode", mode);
  }

  function setStepAndModalModeWithTransition(step: ModalStepId, mode: ModalDisplayMode): void {
    batch(() => {
      setState("currentStep", step);
      setState("modalMode", mode);
    });
  }

  function setReaderSettingsOpen(open: boolean): void {
    setState("readerSettingsOpen", open);
  }

  function toggleReaderSettings(): void {
    setState("readerSettingsOpen", (prev) => !prev);
  }

  function toggleSaveExport(): void {
    setState("saveExportOpen", (prev) => !prev);
  }

  function setSaveExportOpen(open: boolean): void {
    setState("saveExportOpen", open);
  }

  function setLocalSaveEnabled(enabled: boolean): void {
    setState("localSaveEnabled", enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_local_save_enabled", String(enabled));
    }
  }

  function toggleSidebar(): void {
    setState("sidebarOpen", (prev) => !prev);
  }

  function toggleSyncScroll(): void {
    setState("syncScroll", (prev) => !prev);
  }

  function updateReaderSettings(settings: Partial<ReaderSettings>): void {
    setState("readerSettings", (prev) => ({ ...prev, ...settings }));
  }

  function setRightPaneMode(mode: "original" | "spell"): void {
    setState("rightPaneMode", mode);
  }

  function setSelectedCorrectionId(id: string | null): void {
    setState("selectedCorrectionId", id);
  }

  return {
    setStep,
    setPreset,
    setModalMode,
    setModalModeWithTransition,
    setStepAndModalModeWithTransition,
    setReaderSettingsOpen,
    toggleReaderSettings,
    toggleSaveExport,
    setSaveExportOpen,
    setLocalSaveEnabled,
    toggleSidebar,
    toggleSyncScroll,
    updateReaderSettings,
    flashStepSpinner,
    setRightPaneMode,
    setSelectedCorrectionId,
  };
}
