import { type Component, createSignal, Show } from "solid-js";
import { t } from "~/lib/i18n";

export interface CorrectionDictionaryInputProps {
  isOpen: boolean;
  onAdd: (word: string) => void;
}

export const CorrectionDictionaryInput: Component<CorrectionDictionaryInputProps> = (props) => {
  const [text, setText] = createSignal("");

  const handleAdd = () => {
    const word = text().trim();
    if (word) {
      props.onAdd(word);
      setText("");
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="px-3 py-2 border-b border-border bg-card flex items-center gap-2 text-xs">
        <input
          type="text"
          placeholder={t("stepSpell.addIgnoredWordPlaceholder")}
          value={text()}
          onInput={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          class="flex-1 px-2.5 py-1 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleAdd}
          class="px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          {t("stepSpell.addWord")}
        </button>
      </div>
    </Show>
  );
};
