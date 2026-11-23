import { Check, Settings, X } from "lucide-solid";
import { type Component, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  AVAILABLE_FONTS,
  type MarginSize,
  type ReaderFont,
  type ScrollMode,
  type TextAlignment,
} from "~/lib/reader-settings";
import { state, updateReaderSettings } from "~/lib/store";

interface ReaderSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const marginLabels: Record<MarginSize, () => string> = {
  compact: () => t("readerSettings.margins.compact"),
  normal: () => t("readerSettings.margins.normal"),
  spacious: () => t("readerSettings.margins.spacious"),
};

const alignLabels: Record<TextAlignment, () => string> = {
  justify: () => t("readerSettings.alignments.justify"),
  left: () => t("readerSettings.alignments.left"),
};

const scrollModeLabels: Record<ScrollMode, () => string> = {
  continuous: () => t("readerSettings.scrollModes.continuous"),
  paginated: () => t("readerSettings.scrollModes.paginated"),
};

export const ReaderSettingsPanel: Component<ReaderSettingsPanelProps> = (props) => {
  return (
    <Show when={props.isOpen}>
      <button
        type="button"
        aria-label={t("readerSettings.closeAria")}
        class="fixed inset-0 z-30 bg-background/40 backdrop-blur-sm cursor-default border-0"
        onClick={props.onClose}
        tabIndex={-1}
      />

      <div class="fixed top-0 right-0 w-80 h-full bg-card border-l border-border p-6 shadow-2xl flex flex-col gap-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-200">
        <div class="flex items-center justify-between pb-3 border-b border-border">
          <div class="flex items-center gap-2 text-foreground font-semibold text-sm">
            <Settings class="w-4 h-4 text-muted-foreground" />
            <span>{t("readerSettings.title")}</span>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold text-foreground">{t("readerSettings.typeface")}</span>
          <div class="grid grid-cols-1 gap-2">
            <For each={AVAILABLE_FONTS}>
              {(font) => {
                const isSelected = () => state.readerSettings.fontFamily === font.id;
                return (
                  <button
                    type="button"
                    onClick={() =>
                      updateReaderSettings({
                        fontFamily: font.id as ReaderFont,
                      })
                    }
                    class={`flex items-start justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected()
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                        : "border-border hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div class="flex flex-col">
                      <span class="text-xs font-semibold">
                        {font.name} • {font.type}
                      </span>
                    </div>

                    <Show when={isSelected()}>
                      <Check class="w-4 h-4 text-primary shrink-0" />
                    </Show>
                  </button>
                );
              }}
            </For>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-foreground">{t("readerSettings.fontSize")}</span>
              <span class="font-mono text-muted-foreground">{state.readerSettings.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="26"
              step="1"
              value={state.readerSettings.fontSize}
              onInput={(e) =>
                updateReaderSettings({
                  fontSize: Number(e.currentTarget.value),
                })
              }
              class="w-full accent-primary cursor-pointer"
            />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-foreground">{t("readerSettings.lineHeight")}</span>
              <span class="font-mono text-muted-foreground">{state.readerSettings.lineHeight}</span>
            </div>
            <input
              type="range"
              min="1.4"
              max="2.2"
              step="0.05"
              value={state.readerSettings.lineHeight}
              onInput={(e) =>
                updateReaderSettings({
                  lineHeight: Number(e.currentTarget.value),
                })
              }
              class="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-foreground">
            {t("readerSettings.readingMargins")}
          </span>
          <div class="grid grid-cols-3 gap-2">
            {(["compact", "normal", "spacious"] as MarginSize[]).map((m) => (
              <button
                type="button"
                onClick={() => updateReaderSettings({ margin: m })}
                class={`py-1.5 text-xs font-medium capitalize rounded-md border transition-colors ${
                  state.readerSettings.margin === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted text-foreground"
                }`}
              >
                {marginLabels[m]()}
              </button>
            ))}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-foreground">
            {t("readerSettings.textJustification")}
          </span>
          <div class="grid grid-cols-2 gap-2">
            {(["justify", "left"] as TextAlignment[]).map((align) => (
              <button
                type="button"
                onClick={() => updateReaderSettings({ textAlign: align })}
                class={`py-1.5 text-xs font-medium capitalize rounded-md border transition-colors ${
                  state.readerSettings.textAlign === align
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted text-foreground"
                }`}
              >
                {alignLabels[align]()}
              </button>
            ))}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-foreground">
            {t("readerSettings.scrollLayout")}
          </span>
          <div class="grid grid-cols-2 gap-2">
            {(["continuous", "paginated"] as ScrollMode[]).map((mode) => (
              <button
                type="button"
                onClick={() => updateReaderSettings({ scrollMode: mode })}
                class={`py-1.5 text-xs font-medium capitalize rounded-md border transition-colors ${
                  state.readerSettings.scrollMode === mode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted text-foreground"
                }`}
              >
                {scrollModeLabels[mode]()}
              </button>
            ))}
          </div>
        </div>

        <div class="flex flex-col gap-3 pt-3 border-t border-border">
          <label class="flex items-center justify-between text-xs cursor-pointer">
            <span class="font-medium text-foreground">
              {t("readerSettings.automaticHyphenation")}
            </span>
            <input
              type="checkbox"
              checked={state.readerSettings.hyphenation}
              onChange={(e) => updateReaderSettings({ hyphenation: e.currentTarget.checked })}
              class="rounded border-border text-primary focus:ring-ring w-4 h-4 cursor-pointer"
            />
          </label>

          <label class="flex items-center justify-between text-xs cursor-pointer">
            <span class="font-medium text-foreground">
              {t("readerSettings.hangingPunctuation")}
            </span>
            <input
              type="checkbox"
              checked={state.readerSettings.hangingPunctuation}
              onChange={(e) =>
                updateReaderSettings({
                  hangingPunctuation: e.currentTarget.checked,
                })
              }
              class="rounded border-border text-primary focus:ring-ring w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </div>
    </Show>
  );
};
