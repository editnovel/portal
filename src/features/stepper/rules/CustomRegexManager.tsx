import { AlertCircle, Plus, Trash2 } from "lucide-solid";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import { addRegexRule, removeRegexRule, state, toggleRegexRule } from "~/lib/store";

interface AutoRegexDef {
  id: string;
  pattern: string;
  replacement: string;
  flags: string;
  description: string;
  ruleId: string;
}

const AUTO_REGEX_RULES: AutoRegexDef[] = [
  {
    id: "auto-dialogue-dashes",
    pattern: "^-\\s+",
    replacement: "—",
    flags: "gm",
    description: "Standardize dialogue lines starting with hyphen to em-dash",
    ruleId: "rule-dialogue-dashes",
  },
  {
    id: "auto-double-hyphens",
    pattern: "--",
    replacement: "—",
    flags: "g",
    description: "Convert double hyphens to em-dash",
    ruleId: "rule-dialogue-dashes",
  },
  {
    id: "auto-curly-quotes",
    pattern: '([\\s(\\[>])"(\\w)',
    replacement: "$1“$2",
    flags: "g",
    description: "Convert straight quotes into typographic curly quotes",
    ruleId: "rule-curly-quotes",
  },
  {
    id: "auto-ellipsis",
    pattern: "\\.{3,}",
    replacement: "…",
    flags: "g",
    description: "Convert multiple periods to typographic ellipsis",
    ruleId: "rule-ellipsis",
  },
  {
    id: "auto-clean-breaks",
    pattern: "(<p>\\s*</p>\\s*){2,}",
    replacement: '""',
    flags: "g",
    description: "Consolidate redundant blank paragraph breaks",
    ruleId: "rule-clean-breaks",
  },
  {
    id: "auto-strip-headers",
    pattern: "^\\s*\\d+\\s*$",
    replacement: '""',
    flags: "gm",
    description: "Strip isolated page numbers and running headers",
    ruleId: "rule-strip-headers",
  },
];

export const CustomRegexManager: Component = () => {
  const [newPattern, setNewPattern] = createSignal("");
  const [newReplacement, setNewReplacement] = createSignal("");
  const [newFlags, setNewFlags] = createSignal("g");

  const patternValidation = createMemo<{ valid: boolean; error?: string }>(() => {
    const pat = newPattern().trim();
    if (!pat) return { valid: false };
    try {
      new RegExp(pat, newFlags());
      return { valid: true };
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Invalid regular expression";
      return { valid: false, error: err };
    }
  });

  const handleAddRegex = (e: Event) => {
    e.preventDefault();
    if (!patternValidation().valid) return;
    addRegexRule(newPattern().trim(), newReplacement(), newFlags());
    setNewPattern("");
    setNewReplacement("");
  };

  return (
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-foreground">
            {t("stepRules.generatedRegexTitle")}
          </span>
          <span class="text-[10px] text-muted-foreground font-mono">
            {t("stepRules.activeCount", { count: AUTO_REGEX_RULES.length })}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <For each={AUTO_REGEX_RULES}>
            {(rule) => {
              const isEnabled = () => {
                const r = state.editorialRules.find((er) => er.id === rule.ruleId);
                return r ? r.enabled : true;
              };

              return (
                <div
                  class={`p-3 rounded-lg border text-xs flex flex-col gap-1.5 transition-colors ${
                    isEnabled()
                      ? "border-border bg-card"
                      : "border-border/40 bg-muted/20 opacity-60"
                  }`}
                >
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-[11px] font-medium text-foreground bg-secondary px-1.5 py-0.5 rounded truncate max-w-[140px]">
                      {rule.pattern}
                    </span>
                    <span class="text-[10px] text-muted-foreground font-mono">
                      /{rule.flags}/
                    </span>
                  </div>
                  <span class="text-[11px] text-muted-foreground line-clamp-2">
                    {rule.description}
                  </span>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-foreground">
            {t("stepRules.customRegexTitle")}
          </span>
          <span class="text-[10px] text-muted-foreground font-mono">
            {t("stepRules.addedCount", { count: state.regexRules.length })}
          </span>
        </div>

        <form onSubmit={handleAddRegex} class="flex flex-col gap-2">
          <div class="grid grid-cols-12 gap-2">
            <input
              type="text"
              value={newPattern()}
              onInput={(e) => setNewPattern(e.currentTarget.value)}
              placeholder={t("stepRules.patternPlaceholder")}
              class={`col-span-6 px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 ${
                patternValidation().error
                  ? "border-destructive focus:ring-destructive"
                  : "border-border focus:ring-ring"
              }`}
            />
            <input
              type="text"
              value={newReplacement()}
              onInput={(e) => setNewReplacement(e.currentTarget.value)}
              placeholder={t("stepRules.replacementPlaceholder")}
              class="col-span-4 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="text"
              value={newFlags()}
              onInput={(e) => setNewFlags(e.currentTarget.value)}
              placeholder={t("stepRules.flagsPlaceholder")}
              class="col-span-2 px-2 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-mono text-center focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <Show when={patternValidation().error}>
            <div class="flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertCircle class="w-3.5 h-3.5" />
              <span>{patternValidation().error}</span>
            </div>
          </Show>

          <button
            type="submit"
            disabled={!patternValidation().valid}
            class="self-end inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{t("stepRules.addRule")}</span>
          </button>
        </form>

        <Show
          when={state.regexRules.length > 0}
          fallback={
            <div class="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              {t("stepRules.noCustomRegex")}
            </div>
          }
        >
          <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            <For each={state.regexRules}>
              {(rule) => (
                <div class="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-foreground font-medium">{rule.pattern}</span>
                    <span class="text-muted-foreground font-mono">→</span>
                    <span class="font-mono text-primary font-medium">"{rule.replacement}"</span>
                    <span class="text-[10px] text-muted-foreground font-mono">
                      /{rule.flags}/
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={[toggleRegexRule, rule.id]}
                        class="sr-only peer"
                      />
                      <div class="w-7 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary" />
                    </label>

                    <button
                      type="button"
                      onClick={[removeRegexRule, rule.id]}
                      class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};
