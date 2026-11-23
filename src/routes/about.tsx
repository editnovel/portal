import { Link, Meta, Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { ArrowRight, BookOpen, Feather, Lock, ShieldCheck, Terminal } from "lucide-solid";
import type { JSX } from "solid-js";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteNav } from "~/components/SiteNav";
import { getSiteUrl } from "~/lib/env";
import { t } from "~/lib/i18n";

export default function AboutPage(): JSX.Element {
  const siteUrl = getSiteUrl();

  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col">
      <Title>Acerca de EditNovel — Filosofía y Artesanía Editorial</Title>
      <Meta
        name="description"
        content="Conoce la visión de EditNovel: publicación de novelas ligeras de código abierto, privacidad total en WebAssembly y tipografía artesanal con Libron."
      />
      <Meta
        property="og:title"
        content="Acerca de EditNovel — Publicación Digital de Código Abierto"
      />
      <Meta
        property="og:description"
        content="Nuestra misión: brindar a traductores y artesanos editoriales una herramienta moderna, libre y 100% privada para crear libros digitales impecables."
      />
      <Meta property="og:url" content={`${siteUrl}/about`} />
      <Meta property="og:type" content="website" />
      <Meta property="og:image" content={`${siteUrl}/og-image.png`} />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta
        name="twitter:title"
        content="Acerca de EditNovel — Publicación Digital de Código Abierto"
      />
      <Meta
        name="twitter:description"
        content="Herramientas de publicación digital de código abierto y privacidad total en WebAssembly."
      />
      <Meta name="twitter:image" content={`${siteUrl}/og-image.png`} />
      <Link rel="canonical" href={`${siteUrl}/about`} />

      <SiteNav />

      <main class="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col gap-16">
        <section class="flex flex-col items-center text-center gap-4 pt-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
            <Feather class="w-3.5 h-3.5" />
            <span>{t("aboutPage.badge")}</span>
          </div>

          <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-2xl leading-tight">
            {t("aboutPage.heroTitle")}
          </h1>

          <p class="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            {t("aboutPage.heroDesc")}
          </p>
        </section>

        <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article class="p-6 rounded-2xl border border-border bg-card flex flex-col gap-3">
            <div class="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
              <BookOpen class="w-5 h-5" />
            </div>
            <h2 class="text-base font-semibold text-foreground">{t("aboutPage.card1Title")}</h2>
            <p class="text-xs text-muted-foreground leading-relaxed">{t("aboutPage.card1Desc")}</p>
          </article>

          <article class="p-6 rounded-2xl border border-border bg-card flex flex-col gap-3">
            <div class="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
              <Lock class="w-5 h-5" />
            </div>
            <h2 class="text-base font-semibold text-foreground">{t("aboutPage.card2Title")}</h2>
            <p class="text-xs text-muted-foreground leading-relaxed">{t("aboutPage.card2Desc")}</p>
          </article>

          <article class="p-6 rounded-2xl border border-border bg-card flex flex-col gap-3">
            <div class="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
              <Terminal class="w-5 h-5" />
            </div>
            <h2 class="text-base font-semibold text-foreground">{t("aboutPage.card3Title")}</h2>
            <p class="text-xs text-muted-foreground leading-relaxed">{t("aboutPage.card3Desc")}</p>
          </article>
        </section>

        <section class="p-8 rounded-2xl border border-border bg-card/60 flex flex-col gap-4">
          <div class="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck class="w-4 h-4" />
            <span>{t("aboutPage.privacyBadge")}</span>
          </div>
          <h2 class="text-xl font-bold tracking-tight text-foreground">
            {t("aboutPage.privacyTitle")}
          </h2>
          <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("aboutPage.privacyDesc")}
          </p>
        </section>

        <section class="text-center flex flex-col items-center gap-6">
          <h2 class="text-2xl font-bold tracking-tight text-foreground">
            {t("aboutPage.startTitle")}
          </h2>
          <A
            href="/"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <span>{t("aboutPage.openStudio")}</span>
            <ArrowRight class="w-4 h-4" />
          </A>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
