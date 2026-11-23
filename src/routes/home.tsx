import { Link, Meta, Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  Layers,
  Lock,
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

export default function HomePage(): JSX.Element {
  const siteUrl = getSiteUrl();

  const features = [
    {
      icon: ShieldCheck,
      title: () => t("home.featurePrivacyTitle"),
      desc: () => t("home.featurePrivacyDesc"),
    },
    {
      icon: Type,
      title: () => t("home.featureTypeTitle"),
      desc: () => t("home.featureTypeDesc"),
    },
    {
      icon: Layers,
      title: () => t("home.featureLayersTitle"),
      desc: () => t("home.featureLayersDesc"),
    },
    {
      icon: Zap,
      title: () => t("home.featureZapTitle"),
      desc: () => t("home.featureZapDesc"),
    },
    {
      icon: SlidersHorizontal,
      title: () => t("home.featureRulesTitle"),
      desc: () => t("home.featureRulesDesc"),
    },
    {
      icon: FileCode2,
      title: () => t("home.featureEpubTitle"),
      desc: () => t("home.featureEpubDesc"),
    },
  ];

  const faqs = [
    {
      q: () => t("home.faq1Q"),
      a: () => t("home.faq1A"),
    },
    {
      q: () => t("home.faq2Q"),
      a: () => t("home.faq2A"),
    },
    {
      q: () => t("home.faq3Q"),
      a: () => t("home.faq3A"),
    },
  ];

  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col">
      <Title>EditNovel — Maquetación y Publicación de Novelas Ligeras</Title>
      <Meta
        name="description"
        content="Convierte escaneos y PDFs en ediciones digitales EPUB 3 de calidad coleccionista con tipografía Libron, notas interactivas y motor WebAssembly 100% privado."
      />
      <Meta
        property="og:title"
        content="EditNovel — Publicación Digital y Maquetación de Novelas"
      />
      <Meta
        property="og:description"
        content="Estudio editorial de código abierto para artesanos y traductores de novelas ligeras. Conversor de PDF a EPUB sin servidores."
      />
      <Meta property="og:url" content={`${siteUrl}/home`} />
      <Meta property="og:type" content="website" />
      <Meta property="og:image" content={`${siteUrl}/og-image.png`} />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta
        name="twitter:title"
        content="EditNovel — Publicación Digital y Maquetación de Novelas"
      />
      <Meta
        name="twitter:description"
        content="Estudio editorial de código abierto para artesanos y traductores de novelas ligeras."
      />
      <Meta name="twitter:image" content={`${siteUrl}/og-image.png`} />
      <Link rel="canonical" href={`${siteUrl}/home`} />

      <SiteNav />

      <main class="flex-1 max-w-5xl mx-auto px-6 py-12 flex flex-col gap-16">
        <section class="flex flex-col items-center text-center gap-6 pt-4">
          <img src="/logo.png" alt="EditNovel logo" class="w-16 h-16 object-contain" />
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
            <BookOpen class="w-3.5 h-3.5" />
            <span>{t("home.badge")}</span>
          </div>

          <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl leading-tight">
            {t("home.heroTitle")}
          </h1>

          <p class="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t("home.heroDesc")}
          </p>

          <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
            <A
              href="/"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <span>{t("home.openEditor")}</span>
              <ArrowRight class="w-4 h-4" />
            </A>
            <A
              href="/features"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-secondary/50 transition-colors"
            >
              <span>{t("home.allFeaturesButton")}</span>
            </A>
          </div>
        </section>

        <section id="features" class="flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold tracking-tight text-foreground">
              {t("home.keyFeaturesTitle")}
            </h2>
            <A
              href="/features"
              class="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>{t("home.exploreInDepth")}</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </A>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <For each={features}>
              {(feat) => (
                <div class="p-6 rounded-2xl border border-border bg-card flex flex-col gap-3 shadow-2xs hover:border-muted-foreground/40 transition-colors">
                  <div class="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                    <feat.icon class="w-5 h-5" />
                  </div>
                  <h3 class="text-base font-semibold text-foreground">{feat.title()}</h3>
                  <p class="text-xs text-muted-foreground leading-relaxed">{feat.desc()}</p>
                </div>
              )}
            </For>
          </div>
        </section>

        <section
          id="privacy"
          class="p-8 rounded-2xl border border-border bg-card/60 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div class="flex flex-col gap-3 max-w-xl">
            <div class="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Lock class="w-4 h-4" />
              <span>{t("home.zeroTelemetryBadge")}</span>
            </div>
            <h2 class="text-2xl font-bold tracking-tight text-foreground">
              {t("home.privacyTitle")}
            </h2>
            <p class="text-xs text-muted-foreground leading-relaxed">{t("home.privacyDesc")}</p>
          </div>

          <div class="p-4 rounded-xl border border-border bg-background flex flex-col gap-2 shrink-0 w-full md:w-64">
            <div class="flex items-center gap-2 text-xs font-medium text-foreground">
              <CheckCircle2 class="w-4 h-4 text-primary" />
              <span>{t("home.localWasm")}</span>
            </div>
            <div class="flex items-center gap-2 text-xs font-medium text-foreground">
              <CheckCircle2 class="w-4 h-4 text-primary" />
              <span>{t("home.offlineReady")}</span>
            </div>
            <div class="flex items-center gap-2 text-xs font-medium text-foreground">
              <CheckCircle2 class="w-4 h-4 text-primary" />
              <span>{t("home.noAccount")}</span>
            </div>
          </div>
        </section>

        <section id="faq" class="flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold tracking-tight text-foreground">{t("home.faqTitle")}</h2>
            <A
              href="/faq"
              class="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>{t("home.allFaqButton")}</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </A>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <For each={faqs}>
              {(faq) => (
                <div class="p-5 rounded-xl border border-border bg-card flex flex-col gap-2">
                  <h3 class="text-sm font-semibold text-foreground">{faq.q()}</h3>
                  <p class="text-xs text-muted-foreground leading-relaxed">{faq.a()}</p>
                </div>
              )}
            </For>
          </div>
        </section>

        <section id="attributions" class="flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold tracking-tight text-foreground">
              {t("home.attributionsTitle")}
            </h2>
          </div>
          <div class="p-6 sm:p-8 rounded-2xl border border-border bg-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs">
            <div class="flex flex-col gap-2 max-w-2xl">
              <div class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Type class="w-4 h-4" />
                <span>{t("home.typographyEditorialBadge")}</span>
              </div>
              <h3 class="text-xl font-bold tracking-tight text-foreground">
                {t("home.libronTitle")}
              </h3>
              <p class="text-sm text-muted-foreground leading-relaxed">{t("home.libronDesc")}</p>
            </div>
            <a
              href="https://github.com/nicoverbruggen/libron"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors shrink-0 border border-border"
            >
              <span>{t("home.libronGithub")}</span>
              <ExternalLink class="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
