import { Meta, Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { ArrowLeft, BookOpen } from "lucide-solid";
import type { JSX } from "solid-js";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteNav } from "~/components/SiteNav";
import { t } from "~/lib/i18n";

export default function NotFound(): JSX.Element {
  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col">
      <Title>Página no encontrada — EditNovel Studio</Title>
      <Meta name="robots" content="noindex, follow" />

      <SiteNav />

      <main class="flex-1 max-w-xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center gap-6">
        <div class="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-foreground">
          <BookOpen class="w-6 h-6" />
        </div>
        <h1 class="text-5xl font-extrabold tracking-tight text-foreground">404</h1>
        <h2 class="text-xl font-semibold text-foreground">{t("notFound.heading")}</h2>
        <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t("notFound.desc")}
        </p>

        <div class="flex items-center gap-3 pt-4">
          <A
            href="/"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>{t("notFound.backToEditor")}</span>
          </A>
          <A
            href="/home"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium hover:bg-secondary/50 transition-colors"
          >
            <span>{t("notFound.goToHome")}</span>
          </A>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
