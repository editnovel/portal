import { ArrowLeftRight, BookOpen, SpellCheck2 } from "lucide-solid";
import { type Component, createMemo, Show } from "solid-js";
import { t } from "~/lib/i18n";
import { setRightPaneMode, state } from "~/lib/store";

export const RightPaneSwitcher: Component = () => {
  const isOriginal = () => state.rightPaneMode === "original";
  const isSpell = () => state.rightPaneMode === "spell";

  const pendingCount = createMemo(() => {
    return state.spellCorrections.filter((c) => !c.applied && !c.ignored && c.enabled !== false)
      .length;
  });

  const handleToggle = () => {
    setRightPaneMode(isOriginal() ? "spell" : "original");
  };

  return (
    <div class="inline-flex items-center p-0.5 rounded-lg bg-secondary/60 text-xs select-none">
      <button
        type="button"
        onClick={() => setRightPaneMode("original")}
        class={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
          isOriginal()
            ? "bg-background text-foreground font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        }`}
        title={t("correctionPanel.originalDoc")}
      >
        <BookOpen class="w-3.5 h-3.5" />
        <span class="text-[11px]">{t("correctionPanel.originalDoc")}</span>
      </button>

      <button
        type="button"
        onClick={handleToggle}
        class="p-1 mx-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors cursor-pointer"
        title={t("reader.togglePaneView")}
      >
        <ArrowLeftRight class="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={() => setRightPaneMode("spell")}
        class={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
          isSpell()
            ? "bg-background text-foreground font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        }`}
        title={t("correctionPanel.corrections")}
      >
        <SpellCheck2 class="w-3.5 h-3.5" />
        <span class="text-[11px]">{t("correctionPanel.corrections")}</span>
        <Show when={pendingCount() > 0}>
          <span class="px-1.5 py-0.2 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-semibold">
            {pendingCount()}
          </span>
        </Show>
      </button>
    </div>
  );
};
