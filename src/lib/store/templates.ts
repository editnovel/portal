import type { EditorialRule, FileSectionGroup, GlossaryReplacement, RegexRule } from "../types";

export const DEFAULT_INITIAL_SECTION_ID = "default-chapter-1";

export const DEFAULT_TEMPLATE_HTML = `<h1 class="chapter-title">Capítulo 1</h1>
<h2 class="chapter-subtitle">Bienvenido a EditNovel</h2>
<p class="first-paragraph">¡Bienvenido a <strong>EditNovel</strong>! Esta aplicación es un entorno de edición y maquetación diseñado específicamente para novelas y libros digitales en formato <strong>EPUB 3</strong>.</p>
<p>Puedes redactar directamente aquí tu historia, organizar tus capítulos en partes y personalizar cada aspecto del libro, o bien importar tus obras existentes desde el panel superior:</p>
<p>• <strong>Editor de EPUB</strong>: Importa cualquier archivo <code>.epub</code> para corregir la ortografía, modificar textos, reorganizar el índice o pulir la maquetación.</p>
<p>• <strong>Conversor inteligente de PDF a EPUB</strong>: Carga documentos PDF en la sección <em>Fuentes</em>; la aplicación extraerá el texto, las ilustraciones y la estructura para transformarlos automáticamente en un EPUB limpio y adaptable.</p>
<div class="scene-break" data-symbol="◆ ◇ ◆ ◇ ◆" data-scene-break="true">◆ ◇ ◆ ◇ ◆</div>
<p>Comienza a escribir sobre este texto, añade nuevos capítulos o partes desde el panel de la izquierda, o utiliza el menú superior para guardar y exportar tu trabajo.</p>`;

export function createDefaultInitialGroup(): FileSectionGroup {
  return {
    fileId: "part-1",
    fileName: "Parte 1",
    collapsed: false,
    sections: [
      {
        id: DEFAULT_INITIAL_SECTION_ID,
        fileId: "part-1",
        originalTitle: "Capítulo 1: Bienvenido a EditNovel",
        title: "Capítulo 1: Bienvenido",
        type: "chapter",
        order: 1,
        htmlContent: DEFAULT_TEMPLATE_HTML,
      },
    ],
  };
}

export function getSectionTemplate(type: "chapter" | "prologue" | "epilogue" | "afterword"): {
  title: string;
  html: string;
} {
  if (type === "prologue") {
    return {
      title: "Prólogo",
      html: `<h1 class="chapter-title">Prólogo</h1>
<h2 class="chapter-subtitle">Antes del comienzo</h2>
<p class="first-paragraph">Escribe aquí el contenido del prólogo...</p>`,
    };
  }
  if (type === "epilogue") {
    return {
      title: "Epílogo",
      html: `<h1 class="chapter-title">Epílogo</h1>
<h2 class="chapter-subtitle">El desenlace</h2>
<p class="first-paragraph">Escribe aquí el contenido del epílogo...</p>`,
    };
  }
  if (type === "afterword") {
    return {
      title: "Palabras del autor",
      html: `<h1 class="chapter-title">Palabras del autor</h1>
<h2 class="chapter-subtitle">Notas finales</h2>
<p class="first-paragraph">Escribe aquí tus comentarios, agradecimientos o notas del autor...</p>`,
    };
  }
  return {
    title: "Capítulo",
    html: `<h1 class="chapter-title">Capítulo</h1>
<h2 class="chapter-subtitle">Título del capítulo</h2>
<p class="first-paragraph">Escribe aquí el contenido del capítulo...</p>`,
  };
}

export const INITIAL_EDITORIAL_RULES: EditorialRule[] = [
  {
    id: "rule-dialogue-dashes",
    label: "Standardize Dialogue Em-Dashes",
    description:
      "Replaces double hyphens and standard dashes in spoken lines with typographic em-dashes (—).",
    enabled: true,
    affectedCount: 0,
  },
  {
    id: "rule-curly-quotes",
    label: "Smart Curly Quotes & Brackets",
    description:
      "Transforms straight quotation marks and angle brackets into curved or guillemet quotes (« » / “ ”).",
    enabled: true,
    affectedCount: 0,
  },
  {
    id: "rule-ellipsis",
    label: "Typographic Ellipses",
    description: "Substitutes three dots (...) with a single horizontal ellipsis glyph (…).",
    enabled: true,
    affectedCount: 0,
  },
  {
    id: "rule-clean-breaks",
    label: "Consolidate Multiple Blank Lines & Breaks",
    description: "Removes unnecessary blank lines and preserves deliberate scene transitions.",
    enabled: true,
    affectedCount: 0,
  },
  {
    id: "rule-strip-headers",
    label: "Strip Running Headers, Page Numbers & OCR Fixes",
    description: "Strips repeated PDF page markers and applies contextual spell/OCR corrections.",
    enabled: true,
    affectedCount: 0,
  },
];

export const INITIAL_REGEX_RULES: RegexRule[] = [];
export const INITIAL_GLOSSARY: GlossaryReplacement[] = [];
