import { createSignal } from "solid-js";

export type ThemeMode = "system" | "light" | "dark";

function getSystemPrefersDark(): boolean {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

function getStoredTheme(): ThemeMode {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("app_theme") as ThemeMode | null;
    if (stored === "system" || stored === "light" || stored === "dark") {
      return stored;
    }
  }
  return "system";
}

export const [themeMode, setThemeModeSignal] = createSignal<ThemeMode>(getStoredTheme());

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const isDark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
  if (isDark) {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
  }
}

export function setThemeMode(mode: ThemeMode): void {
  setThemeModeSignal(mode);
  if (typeof window !== "undefined") {
    localStorage.setItem("app_theme", mode);
  }
  applyTheme(mode);
}

export function initTheme(): void {
  if (typeof window === "undefined") return;
  const initial = getStoredTheme();
  setThemeModeSignal(initial);
  applyTheme(initial);

  if (window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", () => {
      if (themeMode() === "system") {
        applyTheme("system");
      }
    });
  }
}

if (typeof window !== "undefined") {
  initTheme();
}
