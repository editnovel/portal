import { Link, Meta, Title } from "@solidjs/meta";
import { clientOnly } from "@solidjs/start";
import { type JSX, onMount } from "solid-js";
import { getSiteUrl } from "~/lib/env";
import { warmupWasmWorker } from "~/lib/wasm-bridge";

const Workspace = clientOnly(() =>
  import("~/components/Editor/Workspace").then((m) => ({ default: m.Workspace }))
);
const StepperModal = clientOnly(() =>
  import("~/components/Modal/StepperModal").then((m) => ({ default: m.StepperModal }))
);

export default function IndexPage(): JSX.Element {
  const siteUrl = getSiteUrl();

  onMount(() => {
    void warmupWasmWorker();
  });

  return (
    <>
      <Title>EditNovel Studio — Editor de Novelas Ligeras a EPUB</Title>
      <Meta
        name="description"
        content="Estudio editorial de novelas ligeras en el navegador. Edición WYSIWYG, conversión de PDF a EPUB 3, tipografía Libron y motor WebAssembly local 100% privado."
      />
      <Meta
        property="og:title"
        content="EditNovel Studio — Editor de Novelas Ligeras y Conversor EPUB"
      />
      <Meta
        property="og:description"
        content="Crea ediciones EPUB 3 de calidad coleccionista a partir de PDFs y manuscritos con tipografía editorial profesional directamente en tu navegador."
      />
      <Meta property="og:url" content={`${siteUrl}/`} />
      <Meta property="og:type" content="website" />
      <Meta property="og:image" content={`${siteUrl}/og-image.png`} />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta
        name="twitter:title"
        content="EditNovel Studio — Editor de Novelas Ligeras y Conversor EPUB"
      />
      <Meta
        name="twitter:description"
        content="Estudio de publicación digital en el navegador para artesanos de novelas ligeras y traductores."
      />
      <Meta name="twitter:image" content={`${siteUrl}/og-image.png`} />
      <Link rel="canonical" href={`${siteUrl}/`} />

      <main
        class="relative w-screen h-screen overflow-hidden bg-background text-foreground"
        id="main-editor"
      >
        <h1 class="sr-only">
          EditNovel Studio — Editor de Novelas Ligeras y Conversor de PDF a EPUB
        </h1>
        <section class="sr-only">
          <h2>Estudio de maquetación y edición de novelas ligeras</h2>
          <p>
            EditNovel Studio proporciona un entorno de trabajo completo para escritores, editores y
            grupos de traducción de novelas ligeras. Importa manuscritos y archivos PDF para
            transformarlos en libros electrónicos EPUB 3 con tipografía Libron de calidad
            coleccionista.
          </p>
          <p>
            El espacio de trabajo incluye editor visual WYSIWYG sincronizado, previsualizador de
            lectura digital e-reader, extracción inteligente de ilustraciones a doble página,
            soporte para notas al pie bidireccionales y reglas automatizadas de formato editorial.
            Todo el procesamiento se realiza localmente en tu navegador mediante WebAssembly sin
            enviar datos a servidores externos.
          </p>
        </section>
        <Workspace />
        <StepperModal />
      </main>
    </>
  );
}
