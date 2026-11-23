import * as Comlink from "comlink";
import type {
  BookMetadata,
  DynamicAuditRequest,
  EditorialRule,
  ExtractedImage,
  FileSectionGroup,
  GlossaryReplacement,
  OcrPageInput,
  ParseOptions,
  RegexRule,
  SpellAuditOptions,
  SpellCorrectionItem,
} from "./types";
import type {
  BuildEpubWorkerPayload,
  EditNovelWorkerApi,
  ParsedBookPayload,
  SpellAuditWorkerResult,
  TransformSectionRequest,
  TransformSectionResult,
} from "./worker-contract";

export type {
  BuildEpubWorkerPayload,
  EditNovelWorkerApi,
  ParsedBookPayload,
  SpellAuditWorkerResult,
  TransformSectionRequest,
  TransformSectionResult,
};

function getImageMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

let workerInstance: Worker | null = null;
let workerApiProxy: Comlink.Remote<EditNovelWorkerApi> | null = null;

function getWorkerApi(): Comlink.Remote<EditNovelWorkerApi> | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!workerInstance) {
    workerInstance = new Worker(new URL("./wasm-worker.ts", import.meta.url), {
      type: "module",
    });
    workerInstance.onerror = (e) => {
      console.warn("WASM Worker error:", e);
    };
    workerApiProxy = Comlink.wrap<EditNovelWorkerApi>(workerInstance);
  }
  return workerApiProxy;
}

function requireWorkerApi(): Comlink.Remote<EditNovelWorkerApi> {
  const api = getWorkerApi();
  if (!api) {
    throw new Error("Web Worker is not available in this environment");
  }
  return api;
}

function replaceImageSourcesInHtml(html: string, imageUrlMap: Map<string, string>): string {
  if (!html || imageUrlMap.size === 0) return html;
  if (typeof DOMParser === "undefined") {
    let fallback = html;
    for (const [key, url] of imageUrlMap.entries()) {
      fallback = fallback.split(key).join(url);
    }
    return fallback;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgs = Array.from(doc.body.querySelectorAll("img"));
  if (imgs.length === 0) return html;
  let mutated = false;
  for (const img of imgs) {
    const src = img.getAttribute("src");
    if (src && imageUrlMap.has(src)) {
      img.setAttribute("src", imageUrlMap.get(src) || src);
      mutated = true;
    }
  }
  return mutated ? doc.body.innerHTML : html;
}

export async function warmupWasmWorker(): Promise<{ parallel: boolean }> {
  const api = getWorkerApi();
  if (!api) return { parallel: false };
  try {
    return await api.warmup();
  } catch {
    return { parallel: false };
  }
}

export const warmup = warmupWasmWorker;

export async function initDictionaryInEngine(
  lang: "es" | "en" | "ja",
  bytes: Uint8Array
): Promise<void> {
  const api = getWorkerApi();
  if (!api) return;
  const copy = new Uint8Array(bytes);
  await api.initDictionary(lang, Comlink.transfer(copy, [copy.buffer]));
}

export const initDictionary = initDictionaryInEngine;

export async function parseBookFile(
  file: File,
  options?: ParseOptions
): Promise<ParsedBookPayload> {
  const api = requireWorkerApi();
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const res = await api.parseBookFile(file.name, Comlink.transfer(bytes, [bytes.buffer]), options);

  const payload = res.payload;
  const imageUrlMap = new Map<string, string>();
  for (const img of res.imagesData) {
    const copy = new Uint8Array(img.bytes.byteLength);
    copy.set(img.bytes);
    const blob = new Blob([copy.buffer], { type: getImageMimeType(img.name) });
    const blobUrl = URL.createObjectURL(blob);
    const targetImg = payload.images.find((i) => i.name === img.name);
    if (targetImg) {
      targetImg.url = blobUrl;
    }
    imageUrlMap.set(`../Images/${img.name}`, blobUrl);
  }

  if (imageUrlMap.size > 0) {
    for (const group of payload.groups) {
      for (const sec of group.sections) {
        sec.htmlContent = replaceImageSourcesInHtml(sec.htmlContent, imageUrlMap);
      }
    }
  }

  return payload;
}

export async function injectOcrPagesInEngine(
  fileId: string,
  pages: OcrPageInput[],
  options?: ParseOptions
): Promise<ParsedBookPayload> {
  const api = requireWorkerApi();
  return api.injectOcrPages(fileId, pages, options);
}

export const injectOcrPages = injectOcrPagesInEngine;

export function removeBookFileFromEngine(fileName: string): void {
  const api = getWorkerApi();
  if (api) {
    void api.removeBookFile(fileName);
  }
}

export async function auditSpellingInEngine(
  fileId: string,
  options: SpellAuditOptions
): Promise<SpellAuditWorkerResult> {
  const api = getWorkerApi();
  if (!api) {
    return {
      corrections: [],
      ignoredJapaneseCount: 0,
      ignoredForeignCount: 0,
      ignoredProperNounsCount: 0,
    };
  }
  try {
    return await api.auditSpelling(fileId, options);
  } catch {
    return {
      corrections: [],
      ignoredJapaneseCount: 0,
      ignoredForeignCount: 0,
      ignoredProperNounsCount: 0,
    };
  }
}

export async function auditDynamicParagraphsInEngine(
  request: DynamicAuditRequest
): Promise<SpellCorrectionItem[]> {
  const api = getWorkerApi();
  if (!api) return [];
  try {
    return await api.auditDynamicParagraphs(request);
  } catch {
    return [];
  }
}

export async function transformSectionInEngine(
  request: TransformSectionRequest
): Promise<TransformSectionResult> {
  const api = getWorkerApi();
  if (!api || !request.html) {
    return {
      requestId: request.requestId,
      sectionId: request.sectionId,
      html: request.html,
      rulesSignature: "",
    };
  }
  return api.transformSection(request);
}

export const transformSection = transformSectionInEngine;

export async function setCustomCoverBridge(
  filename: string,
  ext: string,
  data: Uint8Array
): Promise<void> {
  const api = getWorkerApi();
  if (!api) return;
  const copy = new Uint8Array(data);
  await api.setCustomCover(filename, ext, Comlink.transfer(copy, [copy.buffer]));
}

export async function clearCustomCoverBridge(): Promise<void> {
  const api = getWorkerApi();
  if (!api) return;
  await api.clearCustomCover();
}

export function convertNoterefSpansToLinks(html: string): string {
  if (!html || typeof DOMParser === "undefined") return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const spans = Array.from(doc.body.querySelectorAll("span.noteref"));
  if (spans.length === 0) return html;

  for (const span of spans) {
    let fnNum = "";
    const dataFnId = span.getAttribute("data-fn-id") || "";
    const fnMatch = dataFnId.match(/^fn-(\d+)$/i);
    if (fnMatch) {
      fnNum = fnMatch[1];
    } else {
      const idAttr = span.getAttribute("id") || "";
      const refMatch = idAttr.match(/^fnref-(\d+)$/i);
      if (refMatch) {
        fnNum = refMatch[1];
      } else {
        const text = span.textContent || "";
        const numMatch = text.match(/\[(\d+)\]/);
        if (numMatch) {
          fnNum = numMatch[1];
        }
      }
    }

    if (fnNum) {
      const anchor = doc.createElement("a");
      anchor.setAttribute("href", `#fn-${fnNum}`);
      anchor.setAttribute("id", `fnref-${fnNum}`);
      anchor.setAttribute("class", "noteref");
      anchor.setAttribute("epub:type", "noteref");
      anchor.setAttribute("role", "doc-noteref");
      while (span.firstChild) {
        anchor.appendChild(span.firstChild);
      }
      span.replaceWith(anchor);
    }
  }

  return doc.body.innerHTML;
}

export async function buildEpubFromEngine(
  metadata: BookMetadata,
  groups: FileSectionGroup[],
  images: ExtractedImage[],
  editorialRules: EditorialRule[],
  regexRules: RegexRule[],
  glossary: GlossaryReplacement[],
  spellCorrections?: SpellCorrectionItem[],
  globalSpellEnabled?: boolean,
  volumeSpellSettings?: Record<string, boolean>
): Promise<Blob> {
  const api = requireWorkerApi();
  const exportGroups = groups.map((g) => ({
    ...g,
    sections: g.sections.map((s) => ({
      ...s,
      htmlContent: convertNoterefSpansToLinks(s.htmlContent),
    })),
  }));

  const payload: BuildEpubWorkerPayload = {
    metadata,
    groups: exportGroups,
    images,
    editorialRules,
    regexRules,
    glossary,
    spellCorrections,
    globalSpellEnabled,
    volumeSpellSettings,
    removeCover: metadata.hasCoverRemoved,
  };

  const epubBytes = await api.buildEpub(payload);
  const copy = new Uint8Array(epubBytes.byteLength);
  copy.set(epubBytes);
  return new Blob([copy.buffer], { type: "application/epub+zip" });
}

export async function compressBrotliInEngine(bytes: Uint8Array): Promise<Uint8Array> {
  const api = requireWorkerApi();
  const copy = new Uint8Array(bytes);
  return api.compressBrotli(Comlink.transfer(copy, [copy.buffer]));
}

export const compressBrotli = compressBrotliInEngine;

export async function decompressBrotliInEngine(bytes: Uint8Array): Promise<Uint8Array> {
  const api = requireWorkerApi();
  const copy = new Uint8Array(bytes);
  return api.decompressBrotli(Comlink.transfer(copy, [copy.buffer]));
}

export const decompressBrotli = decompressBrotliInEngine;

export const wasmBridge = {
  warmup: warmupWasmWorker,
  initDictionary: initDictionaryInEngine,
  parseBookFile,
  injectOcrPages: injectOcrPagesInEngine,
  removeBookFile: removeBookFileFromEngine,
  auditSpelling: auditSpellingInEngine,
  auditDynamicParagraphs: auditDynamicParagraphsInEngine,
  transformSection: transformSectionInEngine,
  setCustomCover: setCustomCoverBridge,
  clearCustomCover: clearCustomCoverBridge,
  buildEpub: buildEpubFromEngine,
  compressBrotli: compressBrotliInEngine,
  decompressBrotli: decompressBrotliInEngine,
};
