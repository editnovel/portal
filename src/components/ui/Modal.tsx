import { X } from "lucide-solid";
import {
  children,
  createEffect,
  mergeProps,
  onCleanup,
  type ParentComponent,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
}

export const Modal: ParentComponent<ModalProps> = (rawProps) => {
  const props = mergeProps(
    {
      maxWidth: "max-w-lg",
      showCloseButton: true,
      closeOnBackdrop: true,
      closeOnEsc: true,
    },
    rawProps
  );

  const resolvedChildren = children(() => props.children);

  createEffect(() => {
    if (!props.isOpen || !props.closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          role="dialog"
          aria-modal="true"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <div
            class="fixed inset-0 bg-background/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => {
              if (props.closeOnBackdrop) {
                props.onClose();
              }
            }}
          />

          <div
            class={`relative z-10 w-full ${props.maxWidth} rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4 max-h-[90vh] overflow-y-auto`}
          >
            <Show when={props.title || props.showCloseButton}>
              <div class="flex items-center justify-between pb-3 border-b border-border">
                <Show when={props.title}>
                  <h3 class="text-base font-semibold text-foreground tracking-tight">
                    {props.title}
                  </h3>
                </Show>
                <Show when={props.showCloseButton}>
                  <button
                    type="button"
                    onClick={props.onClose}
                    class="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer ml-auto"
                    aria-label="Cerrar modal"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </Show>
              </div>
            </Show>

            <div class="flex-1">{resolvedChildren()}</div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};
