import initWasm, {
  apply_editorial_transforms_wasm,
  audit_dynamic_paragraphs_wasm,
  audit_spelling_wasm,
  build_epub_wasm,
  clear_custom_cover_wasm,
  get_image_bytes_wasm,
  init_engine,
  parse_book_file_wasm,
  remove_book_file_wasm,
  set_custom_cover_wasm,
} from "~/wasm/engine";
import wasmUrl from "~/wasm/engine_bg.wasm?url";
import type {
  BookMetadata,
  DynamicAuditRequest,
  EditorialRule,
  ExtractedImage,
  FileSectionGroup,
  GlossaryReplacement,
  RegexRule,
  SpellAuditOptions,
  SpellCorrectionItem,
} from "./types";

export interface ParsedBookPayload {
  metadata: BookMetadata;
  groups: FileSectionGroup[];
  images: ExtractedImage[];
  detectedRules: EditorialRule[];
  spellCorrections: SpellCorrectionItem[];
  ignoredJapaneseCount: number;
  ignoredForeignCount: number;
  ignoredProperNounsCount: number;
}

let wasmReady = false;
let wasmInitPromise: Promise<void> | null = null;

export async function ensureWasmInitialized(): Promise<void> {
  if (wasmReady) return;
  if (!wasmInitPromise) {
    wasmInitPromise = initWasm(wasmUrl).then(() => {
      init_engine();
      wasmReady = true;
    });
  }
  await wasmInitPromise;
}

if (typeof window !== "undefined") {
  void ensureWasmInitialized();
}

function getImageMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

let workerInstance: Worker | null = null;
let reqCounter = 0;
const pendingRequests = new Map<
  number,
  { resolve: (val: any) => void; reject: (err: any) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!workerInstance) {
    workerInstance = new Worker(new URL("./wasm-worker.ts", import.meta.url), {
      type: "module",
    });
    workerInstance.onmessage = (e: MessageEvent) => {
      const { id, type, result, error } = e.data;
      const handler = pendingRequests.get(id);
      if (!handler) return;
      pendingRequests.delete(id);
      if (type === "error" || error) {
        handler.reject(new Error(error || "Worker error"));
      } else {
        handler.resolve(result);
      }
    };
    workerInstance.onerror = (e) => {
      console.warn("WASM Worker error:", e);
    };
  }
  return workerInstance;
}

function sendToWorker<T>(type: string, payload: any, transfer: Transferable[] = []): Promise<T> {
  const worker = getWorker();
  if (!worker) {
    return Promise.reject(new Error("Worker not supported"));
  }
  return new Promise<T>((resolve, reject) => {
    const id = ++reqCounter;
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload }, transfer);
  });
}

export async function parseBookFile(file: File): Promise<ParsedBookPayload> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const worker = getWorker();
  if (worker) {
    try {
      const res = await sendToWorker<{
        payload: ParsedBookPayload;
        imagesData: Array<{ name: string; bytes: Uint8Array }>;
      }>("parse_book", { fileName: file.name, fileBytes: bytes }, [bytes.buffer]);

      const payload = res.payload;
      const imageUrlMap = new Map<string, string>();
      for (const img of res.imagesData) {
        const blob = new Blob([img.bytes as unknown as BlobPart], { type: getImageMimeType(img.name) });
        const blobUrl = URL.createObjectURL(blob);
        const targetImg = payload.images.find((i) => i.name === img.name);
        if (targetImg) {
          targetImg.url = blobUrl;
        }
        imageUrlMap.set(`../Images/${img.name}`, blobUrl);
      }

      if (imageUrlMap.size > 0) {
        const pattern = Array.from(imageUrlMap.keys())
          .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|");
        const regex = new RegExp(pattern, "g");
        for (const group of payload.groups) {
          for (const sec of group.sections) {
            sec.htmlContent = sec.htmlContent.replace(regex, (m) => imageUrlMap.get(m) || m);
          }
        }
      }

      return payload;
    } catch (err) {
      console.warn("Worker parsing failed, executing on main thread:", err);
    }
  }

  await ensureWasmInitialized();
  const rawJson = parse_book_file_wasm(bytes, file.name);
  const payload = JSON.parse(rawJson) as ParsedBookPayload;

  const imageUrlMap = new Map<string, string>();
  for (const img of payload.images) {
    const imgBytes = get_image_bytes_wasm(file.name, img.name);
    if (imgBytes) {
      const copy = new Uint8Array(imgBytes);
      const blob = new Blob([copy], { type: getImageMimeType(img.name) });
      const blobUrl = URL.createObjectURL(blob);
      img.url = blobUrl;
      imageUrlMap.set(`../Images/${img.name}`, blobUrl);
    }
  }

  if (imageUrlMap.size > 0) {
    const pattern = Array.from(imageUrlMap.keys())
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const regex = new RegExp(pattern, "g");
    for (const group of payload.groups) {
      for (const sec of group.sections) {
        sec.htmlContent = sec.htmlContent.replace(regex, (m) => imageUrlMap.get(m) || m);
      }
    }
  }

  return payload;
}

export function removeBookFileFromEngine(fileName: string): void {
  const worker = getWorker();
  if (worker) {
    void sendToWorker("remove_book", { fileName });
  }
  if (wasmReady) {
    remove_book_file_wasm(fileName);
  }
}

export async function auditSpellingInEngine(
  fileId: string,
  options: SpellAuditOptions
): Promise<{
  corrections: SpellCorrectionItem[];
  ignoredJapaneseCount: number;
  ignoredForeignCount: number;
  ignoredProperNounsCount: number;
}> {
  const worker = getWorker();
  if (worker) {
    try {
      return await sendToWorker("audit_spelling", {
        fileId,
        optionsJson: JSON.stringify(options),
      });
    } catch {}
  }
  if (!wasmReady) {
    return {
      corrections: [],
      ignoredJapaneseCount: 0,
      ignoredForeignCount: 0,
      ignoredProperNounsCount: 0,
    };
  }
  const raw = audit_spelling_wasm(fileId, JSON.stringify(options));
  return JSON.parse(raw);
}

export async function auditDynamicParagraphsInEngine(
  request: DynamicAuditRequest
): Promise<SpellCorrectionItem[]> {
  const worker = getWorker();
  if (worker) {
    try {
      return await sendToWorker<SpellCorrectionItem[]>("audit_dynamic_paragraphs", {
        requestJson: JSON.stringify(request),
      });
    } catch {}
  }
  if (!wasmReady) {
    return [];
  }
  const raw = audit_dynamic_paragraphs_wasm(JSON.stringify(request));
  return JSON.parse(raw);
}

export function applyEditorialTransforms(
  content: string,
  editorialRules: EditorialRule[],
  regexRules: RegexRule[],
  glossary: GlossaryReplacement[]
): string {
  if (!wasmReady || !content) return content;
  return apply_editorial_transforms_wasm(
    content,
    JSON.stringify(editorialRules),
    JSON.stringify(regexRules),
    JSON.stringify(glossary)
  );
}

export async function setCustomCoverBridge(
  filename: string,
  ext: string,
  data: Uint8Array
): Promise<void> {
  const worker = getWorker();
  if (worker) {
    void sendToWorker("set_custom_cover", { filename, ext, data });
  }
  await ensureWasmInitialized();
  set_custom_cover_wasm(filename, ext, data);
}

export async function clearCustomCoverBridge(): Promise<void> {
  const worker = getWorker();
  if (worker) {
    void sendToWorker("clear_custom_cover", {});
  }
  await ensureWasmInitialized();
  clear_custom_cover_wasm();
}

function convertNoterefSpansToLinks(html: string): string {
  return html.replace(
    /<span([^>]*class=["'][^"']*noteref[^"']*["'][^>]*)>([\s\S]*?)<\/span>/gi,
    (full, attrs, inner) => {
      let fnNum = "";
      const fnMatch = attrs.match(/data-fn-id=["']fn-(\d+)["']/i);
      if (fnMatch) {
        fnNum = fnMatch[1];
      } else {
        const refMatch = attrs.match(/id=["']fnref-(\d+)["']/i);
        if (refMatch) {
          fnNum = refMatch[1];
        } else {
          const numMatch = inner.match(/\[(\d+)\]/);
          if (numMatch) fnNum = numMatch[1];
        }
      }

      if (fnNum) {
        return `<a href="#fn-${fnNum}" id="fnref-${fnNum}" class="noteref" epub:type="noteref" role="doc-noteref">${inner}</a>`;
      }
      return full;
    }
  );
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
  const exportGroups = groups.map((g) => ({
    ...g,
    sections: g.sections.map((s) => ({
      ...s,
      htmlContent: convertNoterefSpansToLinks(s.htmlContent),
    })),
  }));

  const payloadJson = JSON.stringify({
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
  });

  const worker = getWorker();
  if (worker) {
    try {
      const epubBytes = await sendToWorker<Uint8Array>("build_epub", { payloadJson });
      const copy = new Uint8Array(epubBytes);
      return new Blob([copy], { type: "application/epub+zip" });
    } catch {}
  }

  await ensureWasmInitialized();
  const epubBytes = build_epub_wasm(payloadJson);
  const copy = new Uint8Array(epubBytes);
  return new Blob([copy], { type: "application/epub+zip" });
}
