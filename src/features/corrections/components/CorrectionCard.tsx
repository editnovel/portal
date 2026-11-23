import { BookPlus, CircleX } from "lucide-solid";
import { type Component, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import type { SpellCorrectionItem } from "~/lib/types";

export interface CorrectionCardProps {
  correction: SpellCorrectionItem;
  isSelected: boolean;
  onSelect: () => void;
  onApply: (id: string, customReplacement?: string) => void;
  onIgnore: (id: string) => void;
  onAddToDictionary: (word: string) => void;
}

export const getCategoryDotClass = (cat: SpellCorrectionItem["category"]): string => {
  if (cat === "typo") return "bg-rose-500 shadow-rose-500/50";
  if (cat === "casing") return "bg-purple-500 shadow-purple-500/50";
  if (cat === "punctuation") return "bg-amber-400 shadow-amber-400/50";
  if (cat === "grammar") return "bg-blue-500 shadow-blue-500/50";
  return "bg-sky-400 shadow-sky-400/50";
};

export const getCategoryLabel = (cat: SpellCorrectionItem["category"]): string => {
  if (cat === "typo") return t("correctionPanel.typo");
  if (cat === "casing") return t("correctionPanel.casing");
  if (cat === "punctuation") return t("correctionPanel.punctuation");
  if (cat === "grammar") return t("correctionPanel.grammar");
  if (cat === "smell") return t("correctionPanel.smell");
  return t("correctionPanel.style");
};

export const CorrectionCard: Component<CorrectionCardProps> = (props) => {
  const corr = () => props.correction;

  return (
    <div
      class={`rounded-lg border transition-all duration-150 ${
        props.isSelected
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20 shadow-xs"
          : "border-border/60 bg-card hover:bg-muted/40 hover:border-border cursor-pointer"
      }`}
      onClick={props.onSelect}
    >
      <Show
        when={props.isSelected}
        fallback={
          <div class="p-2.5 flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2 min-w-0">
              <span
                class={`w-2 h-2 rounded-full shrink-0 shadow-xs ${getCategoryDotClass(
                  corr().category
                )}`}
              />
              <span class="font-medium text-foreground truncate max-w-[140px]">
                {corr().originalToken}
              </span>
              <span class="text-muted-foreground shrink-0">–</span>
              <span class="text-muted-foreground truncate">
                {getCategoryLabel(corr().category)}
              </span>
            </div>
          </div>
        }
      >
        <div class="p-3 flex flex-col gap-2.5 text-xs">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span
                class={`w-2 h-2 rounded-full shrink-0 shadow-xs ${getCategoryDotClass(
                  corr().category
                )}`}
              />
              <span class="font-semibold text-foreground">
                {getCategoryLabel(corr().category)}
              </span>
            </div>
          </div>

          <div class="text-[11px] text-muted-foreground leading-relaxed pl-4 border-l-2 border-primary/40 font-serif">
            <span class="text-muted-foreground/80 line-through mr-1">
              {corr().originalToken}
            </span>
            <span class="text-foreground font-semibold">{corr().replacementToken}</span>
            <Show when={corr().contextSnippet}>
              <p class="mt-1 text-[10px] text-muted-foreground/90 font-mono truncate">
                {corr().contextSnippet}
              </p>
            </Show>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap pt-1">
            <Show
              when={corr().suggestions && corr().suggestions!.length > 1}
              fallback={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onApply(corr().id);
                  }}
                  class="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>{corr().replacementToken}</span>
                </button>
              }
            >
              <For each={corr().suggestions?.slice(0, 3)}>
                {(sugg) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onApply(corr().id, sugg);
                    }}
                    class="px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{sugg}</span>
                  </button>
                )}
              </For>
            </Show>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                props.onIgnore(corr().id);
              }}
              class="px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CircleX class="w-3.5 h-3.5" />
              <span>{t("correctionPanel.ignoreInText")}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                props.onAddToDictionary(corr().originalToken);
              }}
              class="px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title={t("correctionPanel.addToDictionary")}
            >
              <BookPlus class="w-3.5 h-3.5 text-primary" />
              <span>{t("correctionPanel.addToDictionary")}</span>
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};
