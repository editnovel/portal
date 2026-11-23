import * as Comlink from "comlink";
import { OPFS_DIRS } from "./opfs-keys";
import type {
  DynamicAuditRequest,
  OcrPageInput,
  ParseOptions,
  SpellAuditOptions,
  SpellCorrectionItem,
} from "./types";
import type {
  BuildEpubWorkerPayload,
  EditNovelWorkerApi,
  ParsedBookPayload,
  ParsedBookWorkerResult,
  SpellAuditWorkerResult,
  TransformSectionRequest,
  TransformSectionResult,
} from "./worker-contract";

interface WasmEngineModule {
  default: (moduleOrPath?: { module_or_path?: string } | string) => Promise<unknown>;
  initThreadPool?: (numThreads: number) => Promise<void>;
  init_thread_pool?: (numThreads: number) => Promise<void>;
  init_engine: () => void;
  init_dictionary_wasm?: (lang: string, bytes: Uint8Array) => void;
  parse_book_file_wasm: (bytes: Uint8Array, filename: string) => string;
  parse_book_file_with_options_wasm?: (
    bytes: Uint8Array,
    filename: string,
    optionsJson: string
  ) => string;
  inject_ocr_pages_wasm?: (fileId: string, pagesJson: string, optionsJson: string) => string;
  remove_book_file_wasm: (fileId: string) => void;
  get_image_bytes_wasm: (fileId: string, imageName: string) => Uint8Array | undefined;
  audit_spelling_wasm: (fileId: string, optionsJson: string) => string;
  audit_dynamic_paragraphs_wasm: (requestJson: string) => string;
  apply_editorial_transforms_wasm: (
    content: string,
    editorialRulesJson: string,
    regexRulesJson: string,
    glossaryJson: string
  ) => string;
  transform_section_blocks_wasm?: (requestJson: string) => string;
  set_custom_cover_wasm: (filename: string, ext: string, data: Uint8Array) => void;
  clear_custom_cover_wasm: () => void;
  build_epub_wasm: (payloadJson: string) => Uint8Array;
  compress_brotli_wasm?: (bytes: Uint8Array) => Uint8Array;
  decompress_brotli_wasm?: (bytes: Uint8Array) => Uint8Array;
}

const engineLoaders = import.meta.glob<WasmEngineModule>([
  "../wasm/mt/engine.js",
  "../wasm/st/engine.js",
  "../wasm/engine.js",
]);

const wasmUrlLoaders = import.meta.glob<string>(
  ["../wasm/mt/engine_bg.wasm", "../wasm/st/engine_bg.wasm", "../wasm/engine_bg.wasm"],
  { query: "?url", import: "default" }
);

let loadedModule: WasmEngineModule | null = null;
let isParallelActive = false;
let initPromise: Promise<WasmEngineModule> | null = null;
let dictionariesPromise: Promise<void> | null = null;

function findLoader<T>(
  record: Record<string, () => Promise<T>>,
  suffix: string
): (() => Promise<T>) | undefined {
  for (const [key, loader] of Object.entries(record)) {
    if (key.endsWith(suffix)) {
      return loader;
    }
  }
  return undefined;
}

async function tryLoadVariant(
  jsSuffix: string,
  wasmSuffix: string,
  enableThreads: boolean
): Promise<WasmEngineModule | null> {
  const jsLoader = findLoader(engineLoaders, jsSuffix);
  if (!jsLoader) return null;
  try {
    const mod = await jsLoader();
    const urlLoader = findLoader(wasmUrlLoaders, wasmSuffix);
    const wasmUrl = urlLoader ? await urlLoader() : undefined;
    if (wasmUrl) {
      await mod.default({ module_or_path: wasmUrl });
    } else {
      await mod.default();
    }
    mod.init_engine();
    if (enableThreads) {
      const threadInit = mod.initThreadPool ?? mod.init_thread_pool;
      if (typeof threadInit === "function") {
        const concurrency =
          typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
        await threadInit(Math.min(4, Math.max(1, concurrency)));
        isParallelActive = true;
      }
    }
    return mod;
  } catch {
    return null;
  }
}

async function ensureWasmInitialized(): Promise<WasmEngineModule> {
  if (loadedModule) return loadedModule;
  if (!initPromise) {
    initPromise = (async () => {
      const canUseThreads = Boolean(
        typeof self !== "undefined" &&
          self.crossOriginIsolated &&
          typeof SharedArrayBuffer !== "undefined"
      );

      if (canUseThreads) {
        const mtMod = await tryLoadVariant("/wasm/mt/engine.js", "/wasm/mt/engine_bg.wasm", true);
        if (mtMod) {
          loadedModule = mtMod;
          return mtMod;
        }
      }

      const stMod = await tryLoadVariant("/wasm/st/engine.js", "/wasm/st/engine_bg.wasm", false);
      if (stMod) {
        loadedModule = stMod;
        return stMod;
      }

      const fallbackMod = await tryLoadVariant("/wasm/engine.js", "/wasm/engine_bg.wasm", false);
      if (fallbackMod) {
        loadedModule = fallbackMod;
        return fallbackMod;
      }

      throw new Error("Failed to initialize WASM engine module");
    })();
  }
  return initPromise;
}

function isLikelyPlainText(bytes: Uint8Array): boolean {
  if (bytes.byteLength === 0) return false;
  const sampleLen = Math.min(bytes.byteLength, 128);
  for (let i = 0; i < sampleLen; i++) {
    const b = bytes[i];
    if (b < 0x09 || (b > 0x0d && b < 0x20)) {
      return false;
    }
  }
  return true;
}

async function getOpfsDictDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.storage === "undefined" ||
    typeof navigator.storage.getDirectory !== "function"
  ) {
    return null;
  }
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(OPFS_DIRS.dictionaries, { create: true });
  } catch {
    return null;
  }
}

async function readDictFromOpfs(fileName: string): Promise<Uint8Array | null> {
  const dir = await getOpfsDictDirectory();
  if (!dir) return null;
  try {
    const handle = await dir.getFileHandle(fileName);
    const file = await handle.getFile();
    if (file.size === 0) return null;
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function writeDictToOpfs(fileName: string, bytes: Uint8Array): Promise<void> {
  const dir = await getOpfsDictDirectory();
  if (!dir) return;
  try {
    const handle = await dir.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await writable.write(copy.buffer);
    await writable.close();
  } catch {}
}

function decodeDictionaryBytes(mod: WasmEngineModule, rawBytes: Uint8Array): Uint8Array {
  if (isLikelyPlainText(rawBytes)) {
    return rawBytes;
  }
  if (typeof mod.decompress_brotli_wasm === "function") {
    try {
      return new Uint8Array(mod.decompress_brotli_wasm(rawBytes));
    } catch {
      return rawBytes;
    }
  }
  return rawBytes;
}

const DICTIONARY_SOURCES: ReadonlyArray<{
  lang: "es" | "en" | "ja";
  cacheName: string;
  url: string;
}> = [
  { lang: "es", cacheName: "es_frequency.txt", url: "/dicts/es_frequency.txt.br" },
  { lang: "en", cacheName: "en_frequency.txt", url: "/dicts/en_frequency.txt.br" },
  { lang: "ja", cacheName: "ja_romaji_common.tsv", url: "/dicts/ja_romaji_common.tsv.br" },
];

async function ensureDictionariesLoaded(): Promise<void> {
  const mod = await ensureWasmInitialized();
  if (typeof mod.init_dictionary_wasm !== "function") {
    return;
  }
  if (!dictionariesPromise) {
    dictionariesPromise = (async () => {
      await Promise.all(
        DICTIONARY_SOURCES.map(async (entry) => {
          try {
            const cached = await readDictFromOpfs(entry.cacheName);
            if (cached && cached.byteLength > 0) {
              mod.init_dictionary_wasm?.(entry.lang, cached);
              return;
            }
            if (typeof fetch !== "function") return;
            const response = await fetch(entry.url);
            if (!response.ok) return;
            const rawBytes = new Uint8Array(await response.arrayBuffer());
            if (rawBytes.byteLength === 0) return;
            const decoded = decodeDictionaryBytes(mod, rawBytes);
            mod.init_dictionary_wasm?.(entry.lang, decoded);
            await writeDictToOpfs(entry.cacheName, decoded);
          } catch {}
        })
      );
    })();
  }
  await dictionariesPromise;
}

function computeRulesSignature(request: TransformSectionRequest): string {
  const ed = request.editorialRules
    .filter((r) => r.enabled)
    .map((r) => r.id)
    .join(",");
  const rx = request.regexRules
    .filter((r) => r.enabled)
    .map((r) => `${r.pattern}/${r.flags}->${r.replacement}`)
    .join("|");
  const gl = request.glossary
    .filter((g) => g.enabled)
    .map((g) => `${g.find}=>${g.replace}`)
    .join("|");
  return `${ed}::${rx}::${gl}`;
}

async function gzipFallback(
  bytes: Uint8Array,
  mode: "compress" | "decompress"
): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined" || typeof DecompressionStream === "undefined") {
    return new Uint8Array(bytes);
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(copy);
      controller.close();
    },
  });
  const transform =
    mode === "compress" ? new CompressionStream("gzip") : new DecompressionStream("gzip");
  const piped = stream.pipeThrough(transform);
  const buffer = await new Response(piped).arrayBuffer();
  return new Uint8Array(buffer);
}

const workerApi: EditNovelWorkerApi = {
  async warmup(): Promise<{ parallel: boolean }> {
    await ensureWasmInitialized();
    void ensureDictionariesLoaded();
    return { parallel: isParallelActive };
  },

  async initDictionary(lang: "es" | "en" | "ja", bytes: Uint8Array): Promise<void> {
    const mod = await ensureWasmInitialized();
    const decoded = decodeDictionaryBytes(mod, bytes);
    mod.init_dictionary_wasm?.(lang, decoded);
    const entry = DICTIONARY_SOURCES.find((d) => d.lang === lang);
    if (entry) {
      await writeDictToOpfs(entry.cacheName, decoded);
    }
  },

  async parseBookFile(
    fileName: string,
    fileBytes: Uint8Array,
    options?: ParseOptions
  ): Promise<ParsedBookWorkerResult> {
    const mod = await ensureWasmInitialized();
    await ensureDictionariesLoaded();

    const rawJson =
      options && typeof mod.parse_book_file_with_options_wasm === "function"
        ? mod.parse_book_file_with_options_wasm(fileBytes, fileName, JSON.stringify(options))
        : mod.parse_book_file_wasm(fileBytes, fileName);

    const parsed = JSON.parse(rawJson) as ParsedBookPayload;
    const transferList: Transferable[] = [];
    const imagesData: Array<{ name: string; bytes: Uint8Array }> = [];

    for (const img of parsed.images) {
      const bytes = mod.get_image_bytes_wasm(fileName, img.name);
      if (bytes) {
        const u8 = new Uint8Array(bytes);
        imagesData.push({ name: img.name, bytes: u8 });
        transferList.push(u8.buffer);
      }
    }

    return Comlink.transfer(
      {
        payload: parsed,
        imagesData,
      },
      transferList
    );
  },

  async injectOcrPages(
    fileId: string,
    pages: OcrPageInput[],
    options?: ParseOptions
  ): Promise<ParsedBookPayload> {
    const mod = await ensureWasmInitialized();
    await ensureDictionariesLoaded();
    if (typeof mod.inject_ocr_pages_wasm !== "function") {
      throw new Error("inject_ocr_pages_wasm is not available in current WASM build");
    }
    const effectiveOptions: ParseOptions = options ?? {
      language: "auto",
      presetId: "visual-novel",
    };
    const rawJson = mod.inject_ocr_pages_wasm(
      fileId,
      JSON.stringify(pages),
      JSON.stringify(effectiveOptions)
    );
    return JSON.parse(rawJson) as ParsedBookPayload;
  },

  async removeBookFile(fileName: string): Promise<void> {
    const mod = await ensureWasmInitialized();
    mod.remove_book_file_wasm(fileName);
  },

  async auditSpelling(fileId: string, options: SpellAuditOptions): Promise<SpellAuditWorkerResult> {
    const mod = await ensureWasmInitialized();
    await ensureDictionariesLoaded();
    const raw = mod.audit_spelling_wasm(fileId, JSON.stringify(options));
    return JSON.parse(raw) as SpellAuditWorkerResult;
  },

  async auditDynamicParagraphs(request: DynamicAuditRequest): Promise<SpellCorrectionItem[]> {
    const mod = await ensureWasmInitialized();
    await ensureDictionariesLoaded();
    const raw = mod.audit_dynamic_paragraphs_wasm(JSON.stringify(request));
    return JSON.parse(raw) as SpellCorrectionItem[];
  },

  async transformSection(request: TransformSectionRequest): Promise<TransformSectionResult> {
    const mod = await ensureWasmInitialized();
    const signature = computeRulesSignature(request);
    if (typeof mod.transform_section_blocks_wasm === "function") {
      const raw = mod.transform_section_blocks_wasm(JSON.stringify(request));
      const parsed = JSON.parse(raw) as TransformSectionResult;
      return {
        requestId: parsed.requestId ?? request.requestId,
        sectionId: parsed.sectionId || request.sectionId,
        html: parsed.html,
        rulesSignature: parsed.rulesSignature || signature,
      };
    }

    const transformed = mod.apply_editorial_transforms_wasm(
      request.html,
      JSON.stringify(request.editorialRules),
      JSON.stringify(request.regexRules),
      JSON.stringify(request.glossary)
    );

    return {
      requestId: request.requestId,
      sectionId: request.sectionId,
      html: transformed,
      rulesSignature: signature,
    };
  },

  async setCustomCover(filename: string, ext: string, data: Uint8Array): Promise<void> {
    const mod = await ensureWasmInitialized();
    mod.set_custom_cover_wasm(filename, ext, data);
  },

  async clearCustomCover(): Promise<void> {
    const mod = await ensureWasmInitialized();
    mod.clear_custom_cover_wasm();
  },

  async buildEpub(payload: BuildEpubWorkerPayload): Promise<Uint8Array> {
    const mod = await ensureWasmInitialized();
    const epubBytes = mod.build_epub_wasm(JSON.stringify(payload));
    const copy = new Uint8Array(epubBytes);
    return Comlink.transfer(copy, [copy.buffer]);
  },

  async compressBrotli(bytes: Uint8Array): Promise<Uint8Array> {
    const mod = await ensureWasmInitialized();
    if (typeof mod.compress_brotli_wasm === "function") {
      const compressed = new Uint8Array(mod.compress_brotli_wasm(bytes));
      return Comlink.transfer(compressed, [compressed.buffer]);
    }
    const fallback = await gzipFallback(bytes, "compress");
    return Comlink.transfer(fallback, [fallback.buffer]);
  },

  async decompressBrotli(bytes: Uint8Array): Promise<Uint8Array> {
    const mod = await ensureWasmInitialized();
    if (typeof mod.decompress_brotli_wasm === "function") {
      const decompressed = new Uint8Array(mod.decompress_brotli_wasm(bytes));
      return Comlink.transfer(decompressed, [decompressed.buffer]);
    }
    if (bytes.byteLength >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const fallback = await gzipFallback(bytes, "decompress");
      return Comlink.transfer(fallback, [fallback.buffer]);
    }
    const copy = new Uint8Array(bytes);
    return Comlink.transfer(copy, [copy.buffer]);
  },
};

Comlink.expose(workerApi);
