import { ChevronDown, ChevronUp, Loader2, Search, X } from "lucide-solid";
import { type Component, createEffect, onCleanup, Show } from "solid-js";
import { t } from "~/lib/i18n";

export interface SearchBarProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  currentIndex?: number;
  totalMatches?: number;
  caseSensitive?: boolean;
  onToggleCaseSensitive?: () => void;
  placeholder?: string;
  isSearching?: boolean;
}

export const SearchBar: Component<SearchBarProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.isOpen) {
      setTimeout(() => {
        inputRef?.focus();
        inputRef?.select();
      }, 50);
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        props.onPrev();
      } else {
        props.onNext();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      props.onNext();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      props.onPrev();
    } else if (e.key === "Escape") {
      e.preventDefault();
      props.onClose();
    }
  };

  createEffect(() => {
    if (!props.isOpen) return;
    const onWindowKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onWindowKey);
    onCleanup(() => {
      window.removeEventListener("keydown", onWindowKey);
    });
  });

  return (
    <Show when={props.isOpen}>
      <div
        role="search"
        class="absolute top-2 right-2 z-40 bg-card/95 border border-border shadow-lg rounded-xl p-2 flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 text-xs"
      >
        <Search class="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={props.query}
          onInput={(e) => props.onQueryChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={props.placeholder || t("search.placeholder")}
          class="bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground w-40 sm:w-56 text-xs"
        />

        <Show when={props.isSearching}>
          <Loader2 class="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
        </Show>

        <Show when={props.query.trim().length > 0 && !props.isSearching}>
          <span class="text-[11px] font-mono text-muted-foreground px-1 shrink-0 select-none">
            <Show
              when={(props.totalMatches ?? 0) > 0}
              fallback={t("search.noMatches")}
            >
              {t("search.matchCount", {
                current: (props.currentIndex ?? 0) + 1,
                total: props.totalMatches ?? 0,
              })}
            </Show>
          </span>
        </Show>

        <div class="flex items-center gap-0.5 border-l border-border pl-1.5 shrink-0">
          <button
            type="button"
            onClick={props.onPrev}
            disabled={(props.totalMatches ?? 0) === 0}
            class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title={t("search.previous")}
            aria-label={t("search.previous")}
          >
            <ChevronUp class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={props.onNext}
            disabled={(props.totalMatches ?? 0) === 0}
            class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title={t("search.next")}
            aria-label={t("search.next")}
          >
            <ChevronDown class="w-3.5 h-3.5" />
          </button>
        </div>

        <Show when={props.onToggleCaseSensitive}>
          <button
            type="button"
            onClick={props.onToggleCaseSensitive}
            class={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] transition-colors cursor-pointer ${
              props.caseSensitive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            title={t("search.caseSensitive")}
            aria-label={t("search.caseSensitive")}
          >
            Aa
          </button>
        </Show>

        <button
          type="button"
          onClick={props.onClose}
          class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer ml-0.5"
          title={t("search.close")}
          aria-label={t("search.close")}
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </Show>
  );
};
