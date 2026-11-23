import { Loader2, Sliders } from "lucide-solid";
import { type Component, createSignal, Show } from "solid-js";
import { BreaksRuleSection } from "~/features/stepper/rules/BreaksRuleSection";
import { CustomRegexManager } from "~/features/stepper/rules/CustomRegexManager";
import { DialogueRuleSection } from "~/features/stepper/rules/DialogueRuleSection";
import { EllipsisRuleSection } from "~/features/stepper/rules/EllipsisRuleSection";
import { GlossaryManager } from "~/features/stepper/rules/GlossaryManager";
import { QuotesRuleSection } from "~/features/stepper/rules/QuotesRuleSection";
import { t } from "~/lib/i18n";
import { state, toggleEditorialRule } from "~/lib/store";

export const StepRules: Component = () => {
  const [showAdvanced, setShowAdvanced] = createSignal(false);

  const stripHeadersRule = () =>
    state.editorialRules.find((r) => r.id === "rule-strip-headers");

  return (
    <div class="flex flex-col gap-6 py-2">
      <Show when={state.isProcessing}>
        <div class="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2.5 text-xs text-foreground animate-pulse">
          <Loader2 class="w-4 h-4 animate-spin text-primary shrink-0" />
          <span>{t("stepFiles.parsingBackground")}</span>
        </div>
      </Show>

      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-foreground">{t("stepRules.title")}</h3>
          <p class="text-xs text-muted-foreground mt-0.5">{t("stepRules.subtitle")}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-card-foreground transition-colors cursor-pointer"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>
            {showAdvanced() ? t("stepRules.standardRules") : t("stepRules.advancedRules")}
          </span>
        </button>
      </div>

      <Show
        when={showAdvanced()}
        fallback={
          <div class="flex flex-col gap-4">
            <BreaksRuleSection />
            <DialogueRuleSection />
            <QuotesRuleSection />
            <EllipsisRuleSection />

            <Show when={stripHeadersRule()}>
              {(rule) => (
                <div class="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                  <div class="flex flex-col gap-0.5 pr-4">
                    <span class="text-xs font-semibold text-foreground">
                      {t("stepRules.stripHeadersTitle")}
                    </span>
                    <span class="text-[11px] text-muted-foreground">
                      {t("stepRules.stripHeadersDesc")}
                    </span>
                  </div>

                  <div class="flex items-center gap-3 shrink-0">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                      {t("stepRules.editsCount", { count: rule().affectedCount })}
                    </span>

                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule().enabled}
                        onChange={() => toggleEditorialRule(rule().id)}
                        class="sr-only peer"
                      />
                      <div class="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>
                </div>
              )}
            </Show>
          </div>
        }
      >
        <div class="flex flex-col gap-6">
          <CustomRegexManager />
          <GlossaryManager />
        </div>
      </Show>
    </div>
  );
};
