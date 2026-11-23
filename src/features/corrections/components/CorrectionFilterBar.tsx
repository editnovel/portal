import { Search } from "lucide-solid";
import { type Component, createMemo, Show } from "solid-js";
import { t } from "~/lib/i18n";

export interface CorrectionFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  pendingCount: number;
  appliedCount: number;
  dominantCategory: string | null;
}

export const CorrectionFilterBar: Component<CorrectionFilterBarProps> = (props) => {
  const dominantCategoryClasses = createMemo(() => {
    switch (props.dominantCategory) {
      case "typo":
        return {
          card: "border-rose-500/30 bg-rose-500/10",
          badge: "bg-rose-500 text-white",
        };
      case "grammar":
        return {
          card: "border-blue-500/30 bg-blue-500/10",
          badge: "bg-blue-600 text-white",
        };
      case "punctuation":
        return {
          card: "border-amber-500/30 bg-amber-500/10",
          badge: "bg-amber-500 text-amber-950",
        };
      case "casing":
        return {
          card: "border-purple-500/30 bg-purple-500/10",
          badge: "bg-purple-500 text-white",
        };
      case "smell":
      case "style":
        return {
          card: "border-emerald-500/30 bg-emerald-500/10",
          badge: "bg-emerald-500 text-white",
        };
      default:
        return {
          card: "border-border/80 bg-background/90",
          badge: "bg-primary text-primary-foreground",
        };
    }
  });

  return (
    <div class="p-3 border-b border-border/80 bg-muted/15 flex flex-col gap-2.5 shrink-0">
      <div
        class={`flex items-center gap-2.5 p-2.5 rounded-lg border shadow-2xs transition-colors ${dominantCategoryClasses().card}`}
      >
        <div
          class={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${dominantCategoryClasses().badge}`}
        >
          {props.pendingCount}
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-semibold text-foreground">
            {props.pendingCount === 1
              ? t("correctionPanel.problemsDetected")
              : t("correctionPanel.problemsDetectedPlural")}
          </span>
          <Show when={props.appliedCount > 0}>
            <span class="text-[10px] text-muted-foreground">
              {t("correctionPanel.appliedCount", { count: props.appliedCount })}
            </span>
          </Show>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("correctionPanel.searchPlaceholder")}
            value={props.searchQuery}
            onInput={(e) => props.onSearchChange(e.currentTarget.value)}
            class="w-full pl-8 pr-2.5 py-1 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div class="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={[props.onCategoryChange, "all"]}
            class={`px-2 py-0.8 text-[10px] rounded border transition-colors cursor-pointer shrink-0 ${
              props.categoryFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {t("correctionPanel.filterAll")}
          </button>
          <button
            type="button"
            onClick={[props.onCategoryChange, "typo"]}
            class={`px-2 py-0.8 text-[10px] rounded border transition-colors cursor-pointer shrink-0 ${
              props.categoryFilter === "typo"
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-background text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {t("correctionPanel.typo")}
          </button>
          <button
            type="button"
            onClick={[props.onCategoryChange, "casing"]}
            class={`px-2 py-0.8 text-[10px] rounded border transition-colors cursor-pointer shrink-0 ${
              props.categoryFilter === "casing"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-background text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {t("correctionPanel.casingShort")}
          </button>
          <button
            type="button"
            onClick={[props.onCategoryChange, "punctuation"]}
            class={`px-2 py-0.8 text-[10px] rounded border transition-colors cursor-pointer shrink-0 ${
              props.categoryFilter === "punctuation"
                ? "bg-amber-500 text-amber-950 border-amber-500"
                : "bg-background text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {t("correctionPanel.punctuation")}
          </button>
          <button
            type="button"
            onClick={[props.onCategoryChange, "grammar"]}
            class={`px-2 py-0.8 text-[10px] rounded border transition-colors cursor-pointer shrink-0 ${
              props.categoryFilter === "grammar"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-background text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {t("correctionPanel.grammar")}
          </button>
        </div>
      </div>
    </div>
  );
};
