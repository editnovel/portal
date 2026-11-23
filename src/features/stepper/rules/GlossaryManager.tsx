import { Plus, Trash2 } from "lucide-solid";
import { type Component, createSignal, For, Show } from "solid-js";
import { t } from "~/lib/i18n";
import {
  addGlossaryReplacement,
  removeGlossaryReplacement,
  state,
  toggleGlossaryReplacement,
} from "~/lib/store";

export const GlossaryManager: Component = () => {
  const [newFindTerm, setNewFindTerm] = createSignal("");
  const [newReplaceTerm, setNewReplaceTerm] = createSignal("");

  const handleAddGlossary = (e: Event) => {
    e.preventDefault();
    if (!newFindTerm().trim()) return;
    addGlossaryReplacement(newFindTerm().trim(), newReplaceTerm().trim());
    setNewFindTerm("");
    setNewReplaceTerm("");
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-foreground">
          {t("stepRules.glossaryTitle")}
        </span>
        <span class="text-[10px] text-muted-foreground font-mono">
          {t("stepRules.replacementsCount", { count: state.glossary.length })}
        </span>
      </div>

      <form onSubmit={handleAddGlossary} class="flex flex-col gap-2">
        <div class="grid grid-cols-12 gap-2">
          <input
            type="text"
            value={newFindTerm()}
            onInput={(e) => setNewFindTerm(e.currentTarget.value)}
            placeholder={t("stepRules.termPlaceholder")}
            class="col-span-6 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            value={newReplaceTerm()}
            onInput={(e) => setNewReplaceTerm(e.currentTarget.value)}
            placeholder={t("stepRules.replaceTermPlaceholder")}
            class="col-span-6 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={!newFindTerm().trim()}
          class="self-end inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>{t("stepRules.addTerm")}</span>
        </button>
      </form>

      <Show
        when={state.glossary.length > 0}
        fallback={
          <div class="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            {t("stepRules.noGlossary")}
          </div>
        }
      >
        <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          <For each={state.glossary}>
            {(item) => (
              <div class="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-foreground">{item.find}</span>
                  <span class="text-muted-foreground font-mono">→</span>
                  <span class="font-medium text-primary">{item.replace}</span>
                </div>

                <div class="flex items-center gap-2">
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={[toggleGlossaryReplacement, item.id]}
                      class="sr-only peer"
                    />
                    <div class="w-7 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary" />
                  </label>

                  <button
                    type="button"
                    onClick={[removeGlossaryReplacement, item.id]}
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
  );
};
