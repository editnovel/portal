import { Link, Meta, Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCode2,
  FileText,
  Layers,
  Lock,
  PenTool,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Type,
  Zap,
} from "lucide-solid";
import { For, type JSX } from "solid-js";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteNav } from "~/components/SiteNav";
import { getSiteUrl } from "~/lib/env";
import { t } from "~/lib/i18n";

export default function FeaturesPage(): JSX.Element {
  const siteUrl = getSiteUrl();

  const featureList = [
    {
      icon: FileCode2,
      title: () => t("featuresPage.items.converterTitle"),
      tag: () => t("featuresPage.items.converterTag"),
      desc: () => t("featuresPage.items.converterDesc"),
    },
    {
      icon: Type,
      title: () => t("featuresPage.items.typographyTitle"),
      tag: () => t("featuresPage.items.typographyTag"),
      desc: () => t("featuresPage.items.typographyDesc"),
    },
    {
      icon: Zap,
      title: () => t("featuresPage.items.previewTitle"),
      tag: () => t("featuresPage.items.previewTag"),
      desc: () => t("featuresPage.items.previewDesc"),
    },
    {
      icon: PenTool,
      title: () => t("featuresPage.items.footnotesTitle"),
      tag: () => t("featuresPage.items.footnotesTag"),
      desc: () => t("featuresPage.items.footnotesDesc"),
    },
    {
      icon: SlidersHorizontal,
      title: () => t("featuresPage.items.rulesTitle"),
      tag: () => t("featuresPage.items.rulesTag"),
      desc: () => t("featuresPage.items.rulesDesc"),
    },
    {
      icon: Layers,
      title: () => t("featuresPage.items.sectionsTitle"),
      tag: () => t("featuresPage.items.sectionsTag"),
      desc: () => t("featuresPage.items.sectionsDesc"),
    },
    {
      icon: ShieldCheck,
      title: () => t("featuresPage.items.mediaTitle"),
      tag: () => t("featuresPage.items.mediaTag"),
      desc: () => t("featuresPage.items.mediaDesc"),
    },
    {
      icon: Lock,
      title: () => t("featuresPage.items.privacyTitle"),
      tag: () => t("featuresPage.items.privacyTag"),
      desc: () => t("featuresPage.items.privacyDesc"),
    },
  ];

  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col">
      <Title>Características — EditNovel Studio: Editor EPUB 3</Title>
      <Meta
        name="description"
        content="Conoce las características de EditNovel: conversión de PDF a EPUB, editor WYSIWYG, tipografía Libron, notas al pie y motor WebAssembly offline."
      />
      <Meta property="og:title" content="Características de EditNovel Studio — Publicación de Novelas Ligeras" />
      <Meta
        property="og:description"
        content="Herramientas profesionales para maquetar, editar y exportar novelas ligeras en EPUB 3 con tipografía de calidad coleccionista."
      />
      <Meta property="og:url" content={`${siteUrl}/features`} />
      <Meta property="og:type" content="website" />
      <Meta property="og:image" content={`${siteUrl}/og-image.png`} />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Características de EditNovel Studio" />
      <Meta
        name="twitter:description"
        content="Herramientas profesionales para maquetar, editar y exportar novelas ligeras en EPUB 3."
      />
      <Meta name="twitter:image" content={`${siteUrl}/og-image.png`} />
      <Link rel="canonical" href={`${siteUrl}/features`} />

      <SiteNav />

      <main class="flex-1 max-w-5xl mx-auto px-6 py-12 flex flex-col gap-16">
        <section class="flex flex-col items-center text-center gap-4 pt-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
            <BookOpen class="w-3.5 h-3.5" />
            <span>{t("featuresPage.badge")}</span>
          </div>

          <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl leading-tight">
            {t("featuresPage.heroTitle")}
          </h1>

          <p class="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t("featuresPage.heroDesc")}
          </p>
        </section>

        <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <For each={featureList}>
            {(feat) => (
              <article class="p-6 rounded-2xl border border-border bg-card flex flex-col gap-3 shadow-2xs hover:border-muted-foreground/40 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                    <feat.icon class="w-5 h-5" />
                  </div>
                  <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-semibold">
                    {feat.tag()}
                  </span>
                </div>
                <h2 class="text-lg font-semibold text-foreground">{feat.title()}</h2>
                <p class="text-xs text-muted-foreground leading-relaxed">{feat.desc()}</p>
              </article>
            )}
          </For>
        </section>

        <section class="p-8 rounded-2xl border border-border bg-card/60 text-center flex flex-col items-center gap-6">
          <h2 class="text-2xl font-bold tracking-tight text-foreground">
            {t("featuresPage.ctaTitle")}
          </h2>
          <p class="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            {t("featuresPage.ctaDesc")}
          </p>
          <A
            href="/"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <span>{t("featuresPage.openStudio")}</span>
            <ArrowRight class="w-4 h-4" />
          </A>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
