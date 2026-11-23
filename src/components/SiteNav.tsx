import { A, useLocation } from "@solidjs/router";
import { ArrowRight, BookOpen } from "lucide-solid";
import type { Component } from "solid-js";
import { t } from "~/lib/i18n";

export const SiteNav: Component = () => {
  const location = useLocation();

  const navLinks = [
    { href: "/home", labelKey: "nav.home" as const },
    { href: "/features", labelKey: "nav.features" as const },
    { href: "/faq", labelKey: "nav.faq" as const },
    { href: "/about", labelKey: "nav.about" as const },
  ];

  return (
    <header class="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <A href="/home" class="flex items-center gap-2.5">
          <img src="/logo.png" alt="EditNovel logo" class="w-6 h-6 object-contain" />
          <span class="font-bold text-sm tracking-tight text-foreground">editnovel</span>
        </A>

        <nav
          class="hidden md:flex items-center gap-4 text-xs font-medium"
          aria-label={t("nav.mainNavAria")}
        >
          {navLinks.map((link) => (
            <A
              href={link.href}
              class={`transition-colors hover:text-foreground ${
                location.pathname === link.href
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {t(link.labelKey)}
            </A>
          ))}
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <A
          href="/"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
        >
          <span>{t("home.openEditor")}</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </A>
      </div>
    </header>
  );
};
