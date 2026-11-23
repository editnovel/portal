import { Monitor, Moon, Settings, Sun, X } from "lucide-solid";
import { type Component, createSignal, For, onMount, Show } from "solid-js";
import { AVAILABLE_LOCALES, locale, setAppLocale, t } from "~/lib/i18n";
import { initTheme, setThemeMode, themeMode } from "~/lib/theme";

export const GlobalSettingsButton: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  onMount(() => {
    initTheme();
  });

  return (
    <>
      <div class="fixed bottom-3 right-3 z-50 select-none">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          class="w-8 h-8 rounded-full bg-card/90 hover:bg-secondary border border-border shadow-md backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer hover:scale-105 active:scale-95"
          title={t("globalSettings.title")}
          aria-label={t("globalSettings.title")}
        >
          <Settings class="w-4 h-4" />
        </button>
      </div>

      <Show when={isOpen()}>
        <button
          type="button"
          aria-label={t("globalSettings.close")}
          class="fixed inset-0 z-50 bg-background/50 backdrop-blur-xs cursor-default border-0"
          onClick={() => setIsOpen(false)}
          tabIndex={-1}
        />

        <div class="fixed bottom-13 right-3 z-50 w-76 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-card p-4 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150">
          <div class="flex items-center justify-between pb-2 border-b border-border">
            <div class="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Settings class="w-3.5 h-3.5 text-primary" />
              <span>{t("globalSettings.title")}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-semibold text-muted-foreground">{t("globalSettings.theme")}</span>
            <div class="grid grid-cols-3 gap-1 p-1 rounded-lg border border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setThemeMode("system")}
                class={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  themeMode() === "system"
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Monitor class="w-3 h-3" />
                <span>{t("globalSettings.themeSystem")}</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode("light")}
                class={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  themeMode() === "light"
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Sun class="w-3 h-3" />
                <span>{t("globalSettings.themeLight")}</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                class={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  themeMode() === "dark"
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Moon class="w-3 h-3" />
                <span>{t("globalSettings.themeDark")}</span>
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-semibold text-muted-foreground">{t("globalSettings.language")}</span>
            <div class="grid grid-cols-2 gap-1 p-1 rounded-lg border border-border bg-muted/20">
              <For each={AVAILABLE_LOCALES}>
                {(loc) => (
                  <button
                    type="button"
                    onClick={() => setAppLocale(loc.code)}
                    class={`flex items-center justify-center py-1 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      locale() === loc.code
                        ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{loc.label}</span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};
