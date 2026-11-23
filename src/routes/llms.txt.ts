import { getSiteUrl } from "~/lib/env";

export function GET(): Response {
  const siteUrl = getSiteUrl();
  const text = `# EditNovel Studio
> Estudio editorial web de código abierto, privado y conversor de PDF a EPUB 3 para novelas ligeras, manuscritos digitales y literatura serializada.

EditNovel Studio es una plataforma web orientada a traductores, editores independientes y autores de novelas ligeras. Funciona 100% en el navegador del cliente mediante WebAssembly en Rust, Origin Private File System (OPFS), vectorización SIMD-128 y compresión nativa de streams, garantizando privacidad absoluta (zero-telemetry) y funcionamiento sin conexión.

## Enlaces Principales
- [Editor Studio](${siteUrl}/): Interfaz de edición WYSIWYG, maquetación, visor sincronizado de PDF y vista previa de e-reader.
- [Portal Informativo](${siteUrl}/home): Resumen del proyecto, propuesta de valor y características destacadas.
- [Características y Módulos](${siteUrl}/features): Desglose técnico de la arquitectura, tipografía, motor y almacenamiento.
- [Preguntas Frecuentes (FAQ)](${siteUrl}/faq): Respuestas sobre privacidad, límites de tamaño, formatos compatibles y lectores de tinta electrónica.
- [Acerca del Proyecto](${siteUrl}/about): Filosofía de diseño, arquitectura local y tecnologías empleadas.

## Capacidades Técnicas y Arquitectura
- Motor WebAssembly en Rust: Extracción y parsing de PDFs y EPUBs, clasificación de imágenes, limpieza de HTML y generación de EPUB 3 estándar con cumplimiento riguroso de especificaciones W3C.
- Aceleración por Hardware:
  - Vectorización SIMD-128 en WebAssembly para acelerar la tokenización de texto y análisis ortográfico masivo.
  - Almacenamiento en disco de latencia ultrabaja mediante OPFS (Origin Private File System), soportando proyectos masivos de cientos de megabytes sin restricciones de memoria RAM.
  - Decodificación acelerada por hardware mediante Web Codecs API (ImageDecoder) para portadas e ilustraciones.
  - Renderizado de PDF desacoplado del hilo principal mediante OffscreenCanvas con transferencias GPU zero-copy.
  - Compresión y descompresión de proyectos mediante Compression Streams API nativa del navegador.
- Editor TipTap WYSIWYG: Soporte para formato de novela ligera, citas interactivas, notas al pie con popover flotante, letras capitulares (drop caps) y reglas tipográficas avanzadas.
- Reglas Editoriales y Sustituciones: Transformaciones automáticas de comillas, rayas de diálogo (em-dash), saltos de escena y glosario de términos.
- Auditoría Ortográfica Híbrida: Detección ortográfica inteligente respetando nombres propios, términos extranjeros y vocabulario japonés romanizado (rōmaji).
- Exportación EPUB 3 Válida: Paquetes optimizados para Apple Books, Kobo, Kindle, Calibre y lectores de tinta electrónica (e-Ink).
`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
