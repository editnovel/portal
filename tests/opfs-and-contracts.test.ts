import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  clearOcrModelCache,
  ensureOcrModelsCached,
  getOcrCacheStatus,
} from "~/lib/ocr/model-cache";
import type { OcrDownloadProgress, OcrModelManifest } from "~/lib/ocr/types";
import { OPFS_DIRS, type OpfsBucket } from "~/lib/opfs-keys";
import type { OcrDetectionInfo, OcrPageInput, ParseOptions } from "~/lib/types";
import type { EditNovelWorkerApi, ParsedBookPayload } from "~/lib/worker-contract";

class MockMemoryFile {
  private readonly data: Uint8Array;
  readonly name: string;

  constructor(name: string, data: Uint8Array) {
    this.name = name;
    this.data = data;
  }

  get size(): number {
    return this.data.byteLength;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const copy = new Uint8Array(this.data.byteLength);
    copy.set(this.data);
    return copy.buffer;
  }
}

class MockMemoryFileHandle {
  private bytes = new Uint8Array(0);
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async getFile(): Promise<MockMemoryFile> {
    return new MockMemoryFile(this.name, this.bytes);
  }

  async createWritable(): Promise<{
    write: (data: ArrayBuffer) => Promise<void>;
    close: () => Promise<void>;
  }> {
    const chunks: Uint8Array[] = [];
    return {
      write: async (data: ArrayBuffer) => {
        chunks.push(new Uint8Array(data));
      },
      close: async () => {
        const total = chunks.reduce((acc, c) => acc + c.byteLength, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) {
          merged.set(c, offset);
          offset += c.byteLength;
        }
        this.bytes = merged;
      },
    };
  }
}

class MockMemoryDirHandle {
  private readonly subdirs = new Map<string, MockMemoryDirHandle>();
  private readonly files = new Map<string, MockMemoryFileHandle>();

  async getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<MockMemoryDirHandle> {
    const existing = this.subdirs.get(name);
    if (existing) return existing;
    if (options?.create) {
      const created = new MockMemoryDirHandle();
      this.subdirs.set(name, created);
      return created;
    }
    throw new DOMException(`Directory not found: ${name}`, "NotFoundError");
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MockMemoryFileHandle> {
    const existing = this.files.get(name);
    if (existing) return existing;
    if (options?.create) {
      const created = new MockMemoryFileHandle(name);
      this.files.set(name, created);
      return created;
    }
    throw new DOMException(`File not found: ${name}`, "NotFoundError");
  }

  async removeEntry(name: string): Promise<void> {
    if (this.subdirs.delete(name) || this.files.delete(name)) {
      return;
    }
    throw new DOMException(`Entry not found: ${name}`, "NotFoundError");
  }
}

const originalNavigatorStorageDescriptor = Object.getOwnPropertyDescriptor(navigator, "storage");

function installMockOpfs(): MockMemoryDirHandle {
  const root = new MockMemoryDirHandle();
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {
      getDirectory: async () => root,
    },
  });
  return root;
}

function makeTestManifest(): OcrModelManifest {
  return {
    variant: "ppocrv4-mobile",
    assets: {
      det: {
        key: "det",
        fileName: "det.onnx",
        url: "https://models.example.test/det.onnx",
        minBytes: 4,
      },
      rec: {
        key: "rec",
        fileName: "rec.onnx",
        url: "https://models.example.test/rec.onnx",
        minBytes: 4,
      },
      dict: {
        key: "dict",
        fileName: "dict.txt",
        url: "https://models.example.test/dict.txt",
        minBytes: 3,
      },
    },
  };
}

describe("OPFS keys and worker contracts", () => {
  afterEach(() => {
    if (originalNavigatorStorageDescriptor) {
      Object.defineProperty(navigator, "storage", originalNavigatorStorageDescriptor);
    } else {
      Reflect.deleteProperty(navigator, "storage");
    }
    mock.restore();
  });

  it("defines distinct OPFS directory keys including ocrModels", () => {
    const values = Object.values(OPFS_DIRS);
    const unique = new Set<OpfsBucket>(values);

    expect(OPFS_DIRS.binaries).toBe("editnovel_binary_store");
    expect(OPFS_DIRS.images).toBe("editnovel_images");
    expect(OPFS_DIRS.dictionaries).toBe("editnovel_dicts");
    expect(OPFS_DIRS.ocrModels).toBe("editnovel_ocr_models");
    expect(unique.size).toBe(values.length);
  });

  it("validates ParseOptions, OcrDetectionInfo, and OcrPageInput contracts", () => {
    const parseOptions: ParseOptions = {
      language: "es",
      presetId: "visual-novel",
    };
    const detection: OcrDetectionInfo = {
      needsOcr: true,
      scannedPageNumbers: [1, 2, 5],
    };
    const page: OcrPageInput = {
      pageNum: 1,
      width: 800,
      height: 1200,
      lines: [
        {
          text: "Hello world",
          bbox: [20, 40, 220, 72],
          spans: [
            { text: "Hello", bbox: [20, 40, 100, 72], confidence: 0.98 },
            { text: "world", bbox: [110, 40, 220, 72], confidence: 0.96 },
          ],
        },
      ],
    };
    const payload: ParsedBookPayload = {
      metadata: {
        title: "Test",
        author: "Author",
        illustrator: "",
        series: "",
        volume: "1",
        language: "es",
        publisher: "",
        description: "",
      },
      groups: [],
      images: [],
      detectedRules: [],
      spellCorrections: [],
      ignoredJapaneseCount: 0,
      ignoredForeignCount: 0,
      ignoredProperNounsCount: 0,
      needsOcr: detection.needsOcr,
      scannedPageNumbers: detection.scannedPageNumbers,
    };

    const apiMethodNames: Array<keyof EditNovelWorkerApi> = [
      "warmup",
      "initDictionary",
      "parseBookFile",
      "injectOcrPages",
      "removeBookFile",
      "auditSpelling",
      "auditDynamicParagraphs",
      "transformSection",
      "setCustomCover",
      "clearCustomCover",
      "buildEpub",
      "compressBrotli",
      "decompressBrotli",
    ];

    expect(parseOptions.presetId).toBe("visual-novel");
    expect(payload.needsOcr).toBe(true);
    expect(payload.scannedPageNumbers).toEqual([1, 2, 5]);
    expect(page.lines[0]?.spans).toHaveLength(2);
    expect(apiMethodNames).toContain("injectOcrPages");
  });

  it("caches OCR models in OPFS on first fetch and serves offline afterward", async () => {
    installMockOpfs();
    const manifest = makeTestManifest();

    const payloads = new Map<string, Uint8Array>([
      [manifest.assets.det.url, new Uint8Array([1, 2, 3, 4, 5])],
      [manifest.assets.rec.url, new Uint8Array([6, 7, 8, 9, 10, 11])],
      [manifest.assets.dict.url, new TextEncoder().encode("a\nb\nc\n")],
    ]);

    const mockFetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      const data = payloads.get(url);
      if (!data) {
        return new Response(null, { status: 404 });
      }
      const copy = new Uint8Array(data.byteLength);
      copy.set(data);
      return new Response(copy.buffer, {
        status: 200,
        headers: { "content-length": String(data.byteLength) },
      });
    });

    const progressEvents: OcrDownloadProgress[] = [];
    const first = await ensureOcrModelsCached({
      manifest,
      fetcher: mockFetch as typeof fetch,
      onProgress: (p) => progressEvents.push(p),
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(first.det).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(first.rec).toEqual(new Uint8Array([6, 7, 8, 9, 10, 11]));
    expect(progressEvents.at(-1)?.percent).toBe(100);

    const statusBeforeClear = await getOcrCacheStatus(manifest);
    expect(statusBeforeClear.readyOffline).toBe(true);
    expect(statusBeforeClear.cachedKeys).toEqual(["det", "rec", "dict"]);

    const offlineFetch = mock(async () => {
      throw new Error("Network should not be called when cached offline");
    });

    const second = await ensureOcrModelsCached({
      manifest,
      fetcher: offlineFetch as typeof fetch,
    });

    expect(offlineFetch).not.toHaveBeenCalled();
    expect(second.det).toEqual(first.det);
    expect(second.dict).toEqual(first.dict);

    await clearOcrModelCache("ppocrv4-mobile");
    const statusAfterClear = await getOcrCacheStatus(manifest);
    expect(statusAfterClear.readyOffline).toBe(false);
    expect(statusAfterClear.missingKeys).toEqual(["det", "rec", "dict"]);
  });

  it("rejects truncated downloads failing Content-Length or minBytes verification", async () => {
    installMockOpfs();
    const manifest = makeTestManifest();

    const truncatedFetch = mock(async () => {
      const partial = new Uint8Array([1, 2]);
      return new Response(partial.buffer, {
        status: 200,
        headers: { "content-length": "10" },
      });
    });

    await expect(
      ensureOcrModelsCached({
        manifest,
        fetcher: truncatedFetch as typeof fetch,
      })
    ).rejects.toThrow(/size mismatch/);
  });
});
