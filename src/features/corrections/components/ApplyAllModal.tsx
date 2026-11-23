import { type Component, Show } from "solid-js";
import { Modal } from "~/components/ui/Modal";
import { t } from "~/lib/i18n";
import { applyAllCorrections } from "~/lib/store";

export interface ApplyAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount: number;
  spellingCount: number;
  grammarCount: number;
}

export const ApplyAllModal: Component<ApplyAllModalProps> = (props) => {
  const handleApply = (mode: "all" | "typo" | "grammar") => {
    applyAllCorrections(mode);
    props.onClose();
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={t("correctionPanel.confirmApplyAllTitle")}
      maxWidth="max-w-sm"
      showCloseButton={true}
    >
      <div class="flex flex-col gap-4">
        <p class="text-xs text-muted-foreground leading-relaxed">
          {t("correctionPanel.confirmApplyAllDesc", { count: props.pendingCount })}
        </p>

        <div class="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={[handleApply, "all"]}
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer"
          >
            <span>{t("correctionPanel.applyAll")}</span>
            <span class="text-[11px] font-semibold text-primary">{props.pendingCount}</span>
          </button>

          <Show when={props.spellingCount > 0}>
            <button
              type="button"
              onClick={[handleApply, "typo"]}
              class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              <span>{t("correctionPanel.applyOnlySpelling")}</span>
              <span class="text-[11px] font-semibold text-rose-500">{props.spellingCount}</span>
            </button>
          </Show>

          <Show when={props.grammarCount > 0}>
            <button
              type="button"
              onClick={[handleApply, "grammar"]}
              class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              <span>{t("correctionPanel.applyOnlyGrammar")}</span>
              <span class="text-[11px] font-semibold text-blue-500">{props.grammarCount}</span>
            </button>
          </Show>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={props.onClose}
            class="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors cursor-pointer focus:ring-2 focus:ring-primary/40 focus:outline-none text-center"
          >
            {t("correctionPanel.cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
};
