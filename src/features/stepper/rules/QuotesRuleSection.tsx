import { type Component, createSignal, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  detectedQuotes,
  setUnifiedQuoteSymbol,
  setUnifyQuotes,
  state,
} from "~/lib/store";

const PRESET_QUOTES = ["« »", "“ ”", "「 」", "‘ ’", '" "'];

export const QuotesRuleSection: Component = () => {
  const [visibleCount, setVisibleCount] = createSignal(20);

  const handleScroll = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 40) {
      if (visibleCount() < detectedQuotes().length) {
        setVisibleCount((prev) => Math.min(prev + 20, detectedQuotes().length));
      }
    }
  };

  return (
    <div class="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card shadow-2xs">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5 pr-4">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-foreground">
              {t("stepRules.unifyQuotesTitle")}
            </span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {detectedQuotes().length}
            </span>
          </div>
          <span class="text-[11px] text-muted-foreground">
            {t("stepRules.unifyQuotesDesc")}
          </span>
        </div>

        <label class="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={state.unifyQuotes}
            onChange={(e) => setUnifyQuotes(e.currentTarget.checked)}
            class="sr-only peer"
          />
          <div class="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
        </label>
      </div>

      <Show when={state.unifyQuotes}>
        <div class="flex flex-col gap-2 pt-3 border-t border-border">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-foreground">
              {t("stepRules.quotesSymbolLabel")}
            </span>
            <div class="flex items-center gap-1">
              <For each={PRESET_QUOTES}>
                {(preset) => (
                  <button
                    type="button"
                    onClick={[setUnifiedQuoteSymbol, preset]}
                    class={`px-1.5 py-0.5 text-[10px] rounded border font-mono transition-colors cursor-pointer ${
                      state.unifiedQuoteSymbol === preset
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {preset}
                  </button>
                )}
              </For>
            </div>
          </div>
          <input
            type="text"
            value={state.unifiedQuoteSymbol}
            onInput={(e) => setUnifiedQuoteSymbol(e.currentTarget.value)}
            placeholder="« »"
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary text-center"
          />
        </div>
      </Show>

      <div class="flex flex-col gap-2 pt-3 border-t border-border">
        <div class="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t("stepRules.detectedQuotesLabel")}</span>
          <span class="font-mono text-[10px]">
            {t("stepRules.countOf", {
              current: Math.min(visibleCount(), detectedQuotes().length),
              total: detectedQuotes().length,
            })}
          </span>
        </div>

        <div
          onScroll={handleScroll}
          class="max-h-56 overflow-y-auto rounded-lg border border-border bg-background divide-y divide-border/60 p-1"
        >
          <Show
            when={detectedQuotes().length > 0}
            fallback={
              <div class="py-6 text-center text-xs text-muted-foreground">
                {t("stepRules.noQuotesDetected")}
              </div>
            }
          >
            <For each={detectedQuotes().slice(0, visibleCount())}>
              {(item) => {
                const quoteParts = () => state.unifiedQuoteSymbol.trim().split(/\s+/);
                const openChar = () => quoteParts()[0] || "«";
                const closeChar = () => quoteParts()[1] || quoteParts()[0] || "»";

                return (
                  <div class="p-2 text-xs flex flex-col gap-1 hover:bg-muted/20 transition-colors">
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-[11px] text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                        {item.sectionTitle}
                      </span>
                      <span class="px-2 py-0.5 rounded bg-secondary font-mono text-[10px] text-primary font-semibold">
                        {state.unifyQuotes
                          ? `${openChar()} ${closeChar()}`
                          : `${item.openChar} ${item.closeChar}`}
                      </span>
                    </div>
                    <div class="text-[10px] text-muted-foreground italic truncate">
                      <span>{item.snippet}</span>
                    </div>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>
      </div>
    </div>
  );
};
