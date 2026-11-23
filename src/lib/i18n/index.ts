import * as i18n from "@solid-primitives/i18n";
import { createMemo, createSignal } from "solid-js";
import { dict as enDict } from "./en";
import { dict as esDict } from "./es";

export type Locale = "es" | "en";

export interface LocaleOption {
  code: Locale;
  label: string;
}

export const AVAILABLE_LOCALES: LocaleOption[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

function detectUserLocale(): Locale {
  if (typeof navigator !== "undefined") {
    const candidateLanguages = navigator.languages || [navigator.language];
    for (const l of candidateLanguages) {
      if (l?.toLowerCase().startsWith("es")) {
        return "es";
      }
    }
    return "en";
  }
  return "es";
}

function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("app_locale") as Locale | null;
    if (saved === "es" || saved === "en") {
      return saved;
    }
    return detectUserLocale();
  }
  return "es";
}

export const [locale, setLocale] = createSignal<Locale>(getInitialLocale());

export function setAppLocale(newLocale: Locale): void {
  setLocale(newLocale);
  if (typeof window !== "undefined") {
    localStorage.setItem("app_locale", newLocale);
  }
}

const flatDictionaries = {
  es: i18n.flatten(esDict),
  en: i18n.flatten(enDict),
};

const activeDict = createMemo(() => flatDictionaries[locale()]);

export const t = i18n.translator(activeDict, i18n.resolveTemplate);
