export type ReaderFont = "libron" | "literata" | "merriweather" | "atkinson";
export type ScrollMode = "continuous" | "paginated";
export type MarginSize = "compact" | "normal" | "spacious";
export type TextAlignment = "justify" | "left";
export type ReaderTheme = "light" | "dark" | "sepia";

export interface ReaderSettings {
  fontFamily: ReaderFont;
  fontSize: number;
  lineHeight: number;
  scrollMode: ScrollMode;
  margin: MarginSize;
  textAlign: TextAlignment;
  hyphenation: boolean;
  hangingPunctuation: boolean;
  theme: ReaderTheme;
}

export interface FontOption {
  id: ReaderFont;
  name: string;
  type: "serif" | "sans-serif";
  description: string;
}

export const AVAILABLE_FONTS: readonly FontOption[] = [
  {
    id: "libron",
    name: "Libron",
    type: "serif",
    description: "Fuente serif predeterminada de libro físico",
  },
  {
    id: "literata",
    name: "Literata",
    type: "serif",
    description: "Diseñada para lectura digital continua y e-ink",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    type: "serif",
    description: "Serifas robustas para descanso visual en pantalla",
  },
  {
    id: "atkinson",
    name: "Atkinson Hyperlegible",
    type: "sans-serif",
    description: "Sans-serif de máxima legibilidad y menor fatiga",
  },
] as const;

export const DEFAULT_READER_SETTINGS: Readonly<ReaderSettings> = {
  fontFamily: "libron",
  fontSize: 18,
  lineHeight: 1.75,
  scrollMode: "continuous",
  margin: "normal",
  textAlign: "justify",
  hyphenation: true,
  hangingPunctuation: true,
  theme: "light",
};

export function getAppTheme(settingsTheme: ReaderTheme): "light" | "dark" | "sepia" {
  if (settingsTheme === "sepia") return "sepia";
  if (typeof document !== "undefined") {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") &&
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    return isDark ? "dark" : "light";
  }
  return "light";
}

export function readerSettingsToCssVariables(
  settings: ReaderSettings,
  overrideTheme?: "light" | "dark" | "sepia"
): Record<string, string> {
  const marginWidths: Record<MarginSize, { maxWidth: string; paddingX: string }> = {
    compact: { maxWidth: "52rem", paddingX: "1.25rem" },
    normal: { maxWidth: "42rem", paddingX: "2.5rem" },
    spacious: { maxWidth: "34rem", paddingX: "4rem" },
  };

  const fontFamilies: Record<ReaderFont, string> = {
    libron: 'var(--font-reader-libron, "Libron", serif)',
    literata: 'var(--font-reader-literata, "Literata", serif)',
    merriweather: 'var(--font-reader-merriweather, "Merriweather", serif)',
    atkinson: 'var(--font-reader-atkinson, "Atkinson Hyperlegible", sans-serif)',
  };

  const theme = overrideTheme || getAppTheme(settings.theme);
  const themeColors = {
    light: {
      "--reader-bg": "#ffffff",
      "--reader-text": "#0a0a0a",
      "--reader-muted": "#525252",
      "--reader-border": "#e5e5e5",
      "--reader-card-bg": "#f5f5f5",
    },
    dark: {
      "--reader-bg": "#0a0a0a",
      "--reader-text": "#ededed",
      "--reader-muted": "#a3a3a3",
      "--reader-border": "#262626",
      "--reader-card-bg": "#141414",
    },
    sepia: {
      "--reader-bg": "#fbf0d9",
      "--reader-text": "#433422",
      "--reader-muted": "#78654e",
      "--reader-border": "#ebd9b8",
      "--reader-card-bg": "#f4e5c8",
    },
  }[theme];

  return {
    "--reader-font": fontFamilies[settings.fontFamily],
    "--reader-font-size": `${settings.fontSize}px`,
    "--reader-line-height": `${settings.lineHeight}`,
    "--reader-max-width": marginWidths[settings.margin].maxWidth,
    "--reader-padding-x": marginWidths[settings.margin].paddingX,
    "--reader-text-align": settings.textAlign,
    "--reader-hyphens": settings.hyphenation ? "auto" : "none",
    "--reader-hanging-punctuation": settings.hangingPunctuation ? "first last" : "none",
    ...themeColors,
  };
}
