import { Link, Meta, Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { ArrowRight, HelpCircle } from "lucide-solid";
import { For, type JSX } from "solid-js";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteNav } from "~/components/SiteNav";
import { getSiteUrl } from "~/lib/env";
import { t } from "~/lib/i18n";

export default function FaqPage(): JSX.Element {
  const siteUrl = getSiteUrl();

  const faqItems = [
    {
      q: () => t("faqPage.items.q1"),
      a: () => t("faqPage.items.a1"),
    },
    {
      q: () => t("faqPage.items.q2"),
      a: () => t("faqPage.items.a2"),
    },
    {
      q: () => t("faqPage.items.q3"),
      a: () => t("faqPage.items.a3"),
    },
    {
      q: () => t("faqPage.items.q4"),
      a: () => t("faqPage.items.a4"),
    },
    {
      q: () => t("faqPage.items.q5"),
      a: () => t("faqPage.items.a5"),
    },
    {
      q: () => t("faqPage.items.q6"),
      a: () => t("faqPage.items.a6"),
    },
    {
      q: () => t("faqPage.items.q7"),
      a: () => t("faqPage.items.a7"),
    },
  ];

  const faqSchema = () =>
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.q(),
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a(),
        },
      })),
    });

  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col">
      <Title>Preguntas Frecuentes — EditNovel Studio y EPUB 3</Title>
      <Meta
        name="description"
        content="Respuestas a preguntas habituales sobre EditNovel: privacidad con WebAssembly, compatibilidad con Kindle y Apple Books, tipografía Libron y uso sin conexión."
      />
      <Meta property="og:title" content="Preguntas Frecuentes — EditNovel Studio" />
      <Meta
        property="og:description"
        content="Resuelve dudas sobre la maquetación de novelas ligeras, privacidad y compatibilidad de archivos EPUB 3."
      />
      <Meta property="og:url" content={`${siteUrl}/faq`} />
      <Meta property="og:type" content="website" />
      <Meta property="og:image" content={`${siteUrl}/og-image.png`} />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Preguntas Frecuentes — EditNovel Studio" />
      <Meta
        name="twitter:description"
        content="Resuelve dudas sobre la maquetación de novelas ligeras y compatibilidad EPUB 3."
      />
      <Meta name="twitter:image" content={`${siteUrl}/og-image.png`} />
      <Link rel="canonical" href={`${siteUrl}/faq`} />

      <script type="application/ld+json" innerHTML={faqSchema()} />

      <SiteNav />

      <main class="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col gap-12">
        <section class="flex flex-col items-center text-center gap-4 pt-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
            <HelpCircle class="w-3.5 h-3.5" />
            <span>{t("faqPage.badge")}</span>
          </div>

          <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-2xl leading-tight">
            {t("faqPage.title")}
          </h1>

          <p class="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            {t("faqPage.desc")}
          </p>
        </section>

        <section class="flex flex-col gap-6" aria-label={t("faqPage.listAria")}>
          <For each={faqItems}>
            {(item) => (
              <article class="p-6 rounded-2xl border border-border bg-card flex flex-col gap-3 shadow-2xs">
                <h2 class="text-base font-semibold text-foreground">{item.q()}</h2>
                <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.a()}</p>
              </article>
            )}
          </For>
        </section>

        <section class="p-8 rounded-2xl border border-border bg-card/60 text-center flex flex-col items-center gap-4">
          <h2 class="text-xl font-bold tracking-tight text-foreground">{t("faqPage.ctaTitle")}</h2>
          <p class="text-xs text-muted-foreground max-w-md">
            {t("faqPage.ctaDesc")}
          </p>
          <A
            href="/"
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <span>{t("faqPage.ctaButton")}</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </A>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
