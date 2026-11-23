import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCode2,
  FileText,
  GraduationCap,
  Languages,
  Layers,
  Loader2,
} from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";
import { type Locale, locale, t } from "~/lib/i18n";
import { setPreset, setStep, state } from "~/lib/store";
import type { LanguageProfile, PresetId } from "~/lib/types";

interface PresetCardConfig {
  id: PresetId;
  titleKey:
    | "stepPresets.genericTitle"
    | "stepPresets.visualNovelTitle"
    | "stepPresets.webnovelTitle"
    | "stepPresets.readmeTitle"
    | "stepPresets.paperTitle";
  descKey:
    | "stepPresets.genericDesc"
    | "stepPresets.visualNovelDesc"
    | "stepPresets.webnovelDesc"
    | "stepPresets.readmeDesc"
    | "stepPresets.paperDesc";
  icon: Component<{ class?: string }>;
}

const GENERAL_PRESET: PresetCardConfig = {
  id: "generic",
  titleKey: "stepPresets.genericTitle",
  descKey: "stepPresets.genericDesc",
  icon: FileText,
};

const SPECIALIZED_PRESETS: readonly PresetCardConfig[] = [
  {
    id: "visual-novel",
    titleKey: "stepPresets.visualNovelTitle",
    descKey: "stepPresets.visualNovelDesc",
    icon: BookOpen,
  },
  {
    id: "webnovel",
    titleKey: "stepPresets.webnovelTitle",
    descKey: "stepPresets.webnovelDesc",
    icon: Layers,
  },
  {
    id: "readme",
    titleKey: "stepPresets.readmeTitle",
    descKey: "stepPresets.readmeDesc",
    icon: FileCode2,
  },
  {
    id: "paper",
    titleKey: "stepPresets.paperTitle",
    descKey: "stepPresets.paperDesc",
    icon: GraduationCap,
  },
];

const LANGUAGE_PROFILE_STORAGE_KEY = "editnovel_language_profile";

const LANGUAGE_OPTIONS: readonly {
  id: LanguageProfile;
  label: Record<Locale, string>;
}[] = [
  { id: "auto", label: { es: "Automático", en: "Auto" } },
  { id: "es", label: { es: "Español", en: "Spanish" } },
  { id: "en", label: { es: "Inglés", en: "English" } },
];

const LANGUAGE_SECTION_LABEL: Record<Locale, string> = {
  es: "Perfil de idioma del documento",
  en: "Document language profile",
};

const SELECTED_BADGE_LABEL: Record<Locale, string> = {
  es: "Activo",
  en: "Active",
};

export function getStoredLanguageProfile(): LanguageProfile {
  if (typeof window === "undefined") return "auto";
  const saved = localStorage.getItem(LANGUAGE_PROFILE_STORAGE_KEY);
  if (saved === "auto" || saved === "es" || saved === "en") {
    return saved;
  }
  return "auto";
}

export const StepPresets: Component = () => {
  const currentPreset = () => state.selectedPreset;
  const [languageProfile, setLanguageProfile] = createSignal<LanguageProfile>(
    getStoredLanguageProfile()
  );

  const handleSelectPreset = (preset: PresetId) => {
    setPreset(preset);
  };

  const handleSelectLanguage = (lang: LanguageProfile) => {
    setLanguageProfile(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_PROFILE_STORAGE_KEY, lang);
    }
  };

  const renderPresetButton = (preset: PresetCardConfig) => {
    const isActive = () => currentPreset() === preset.id;
    const Icon = preset.icon;

    return (
      <button
        type="button"
        onClick={() => handleSelectPreset(preset.id)}
        aria-pressed={isActive()}
        class={`p-4 rounded-xl border text-left transition-all relative flex items-start justify-between gap-3 cursor-pointer ${
          isActive()
            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
            : "border-border bg-card hover:border-muted-foreground/40"
        }`}
      >
        <div class="flex items-start gap-3 min-w-0">
          <div
            class={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isActive() ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Icon class="w-4 h-4" />
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <h3 class="text-sm font-semibold text-foreground">{t(preset.titleKey)}</h3>
            <p class="text-xs text-muted-foreground leading-relaxed">{t(preset.descKey)}</p>
          </div>
        </div>
        <Show when={isActive()}>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-semibold border border-primary/20 shrink-0">
            <CheckCircle2 class="w-3.5 h-3.5" />
            <span>
              {preset.id === "visual-novel"
                ? t("stepPresets.activeBadge")
                : SELECTED_BADGE_LABEL[locale()]}
            </span>
          </span>
        </Show>
      </button>
    );
  };

  return (
    <div class="flex flex-col gap-5 py-3">
      <Show when={state.isProcessing}>
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-foreground text-xs font-medium w-fit animate-pulse">
          <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
          <span>{t("stepFiles.parsingBackground")}</span>
        </div>
      </Show>

      <div class="flex flex-col gap-2">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("stepPresets.categoryGeneral")}
        </span>
        {renderPresetButton(GENERAL_PRESET)}
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("stepPresets.categorySpecialized")}
        </span>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <For each={SPECIALIZED_PRESETS}>{(preset) => renderPresetButton(preset)}</For>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
        <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Languages class="w-4 h-4 text-primary" />
          <span>{LANGUAGE_SECTION_LABEL[locale()]}</span>
        </div>
        <div class="inline-flex items-center rounded-lg border border-border bg-secondary/50 p-1 gap-1">
          <For each={LANGUAGE_OPTIONS}>
            {(option) => {
              const selected = () => languageProfile() === option.id;
              return (
                <button
                  type="button"
                  aria-pressed={selected()}
                  onClick={() => handleSelectLanguage(option.id)}
                  class={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selected()
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label[locale()]}
                </button>
              );
            }}
          </For>
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
