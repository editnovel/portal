import { Trash2 } from "lucide-solid";
import { type Component, createEffect, createSignal, For, Show } from "solid-js";
import { Modal } from "~/components/ui/Modal";
import { t } from "~/lib/i18n";
import { state } from "~/lib/store";

export interface UnifyBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUnified: boolean;
  initialSymbol: string;
  onSave: (symbol: string) => void;
  onDelete: () => void;
  onDisableUnify: () => void;
  onGoToTypography: () => void;
}

const PRESET_SYMBOLS = ["◆ ◇ ◆ ◇ ◆", "* * *", "✦ ✦ ✦", "◇ ◇ ◇"];

export const UnifyBreakModal: Component<UnifyBreakModalProps> = (props) => {
  const [symbol, setSymbol] = createSignal("");

  createEffect(() => {
    if (props.isOpen) {
      setSymbol(props.initialSymbol || "◆ ◇ ◆ ◇ ◆");
    }
  });

  const title = () =>
    props.isUnified
      ? `${t("stepRules.editBreakTitle")} ${t("editor.unifiedBadge")}`
      : t("stepRules.editBreakTitle");

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={title()}
      maxWidth="max-w-sm"
      showCloseButton={true}
    >
      <Show
        when={!props.isUnified}
        fallback={
          <div class="flex flex-col gap-3">
            <p class="text-xs text-muted-foreground">
              {t("stepRules.unifiedBreakActiveNotice", {
                symbol: state.unifiedBreakSymbol || "◆ ◇ ◆ ◇ ◆",
              })}
            </p>
            <div class="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={props.onGoToTypography}
                class="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {t("stepRules.goToTypography")}
              </button>
              <button
                type="button"
                onClick={props.onDisableUnify}
                class="w-full py-2 px-3 rounded-lg border border-border hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer"
              >
                {t("stepRules.disableUnifyToEdit")}
              </button>
            </div>
          </div>
        }
      >
        <div class="flex flex-col gap-3">
          <p class="text-[11px] text-muted-foreground">{t("stepRules.editBreakDesc")}</p>

          <div class="flex items-center gap-1">
            <For each={PRESET_SYMBOLS}>
              {(preset) => (
                <button
                  type="button"
                  onClick={() => setSymbol(preset)}
                  class={`px-2 py-0.5 text-[10px] rounded border font-mono transition-colors cursor-pointer ${
                    symbol() === preset
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {preset}
                </button>
              )}
            </For>
          </div>

          <input
            type="text"
            value={symbol()}
            onInput={(e) => setSymbol(e.currentTarget.value)}
            placeholder="◆ ◇ ◆ ◇ ◆"
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary text-center"
          />

          <div class="flex items-center justify-between pt-2 border-t border-border gap-2">
            <button
              type="button"
              onClick={props.onDelete}
              class="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>{t("stepRules.deleteBreak")}</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={props.onClose}
                class="py-1.5 px-3 rounded-lg border border-border hover:bg-secondary text-foreground text-xs transition-colors cursor-pointer"
              >
                {t("stepRules.cancel")}
              </button>
              <button
                type="button"
                onClick={() => props.onSave(symbol())}
                class="py-1.5 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors cursor-pointer"
              >
                {t("stepRules.saveBreak")}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </Modal>
  );
};
