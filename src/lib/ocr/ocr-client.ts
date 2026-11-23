import type { OcrPageInput } from "../types";
import { DEFAULT_OCR_MANIFESTS, ensureOcrModelsCached } from "./model-cache";
import type {
  OcrClientProgress,
  OcrExecutionProvider,
  OcrModelManifest,
  OcrModelVariant,
  OcrPageImageInput,
  OcrWorkerRequest,
  OcrWorkerResponse,
} from "./types";

interface PendingWorkerRequest<T> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

export interface OcrClientOptions {
  variant?: OcrModelVariant;
  manifest?: OcrModelManifest;
  workerFactory?: () => Worker;
  fetcher?: typeof fetch;
}

function toArrayBufferCopy(bytes: Uint8Array | Uint8ClampedArray): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export class OcrClient {
  private worker: Worker | null = null;
  private reqCounter = 0;
  private pending = new Map<number, PendingWorkerRequest<unknown>>();
  private initialized = false;
  private activeProvider: OcrExecutionProvider | null = null;
  private readonly manifest: OcrModelManifest;
  private readonly workerFactory: (() => Worker) | undefined;
  private readonly fetcher: typeof fetch | undefined;

  constructor(options: OcrClientOptions = {}) {
    const variant = options.variant ?? "ppocrv4-mobile";
    this.manifest = options.manifest ?? DEFAULT_OCR_MANIFESTS[variant];
    this.workerFactory = options.workerFactory;
    this.fetcher = options.fetcher;
  }

  get provider(): OcrExecutionProvider | null {
    return this.activeProvider;
  }

  get isReady(): boolean {
    return this.initialized;
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    if (this.workerFactory) {
      this.worker = this.workerFactory();
    } else {
      if (typeof Worker === "undefined") {
        throw new Error("Web Workers are not supported in this environment");
      }
      this.worker = new Worker(new URL("./ocr-worker.ts", import.meta.url), {
        type: "module",
      });
    }

    this.worker.onmessage = (event: MessageEvent<OcrWorkerResponse>) => {
      const msg = event.data;
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);

      if (msg.type === "error") {
        entry.reject(new Error(msg.error));
        return;
      }

      entry.resolve(msg.result);
    };

    this.worker.onerror = (err: ErrorEvent) => {
      const failure = new Error(err.message || "OCR worker execution error");
      for (const [, entry] of this.pending) {
        entry.reject(failure);
      }
      this.pending.clear();
      this.initialized = false;
    };

    return this.worker;
  }

  private send<T>(
    message: Omit<OcrWorkerRequest, "id">,
    transfer: Transferable[] = []
  ): Promise<T> {
    const worker = this.ensureWorker();
    const id = ++this.reqCounter;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      worker.postMessage({ ...message, id } as OcrWorkerRequest, transfer);
    });
  }

  async initialize(
    onProgress?: (progress: OcrClientProgress) => void,
    signal?: AbortSignal
  ): Promise<OcrExecutionProvider> {
    if (this.initialized && this.activeProvider) {
      return this.activeProvider;
    }

    const assets = await ensureOcrModelsCached({
      manifest: this.manifest,
      signal,
      fetcher: this.fetcher,
      onProgress: (download) => {
        onProgress?.({
          phase: "downloading",
          download,
        });
      },
    });

    onProgress?.({ phase: "initializing" });

    const detBuffer = toArrayBufferCopy(assets.det);
    const recBuffer = toArrayBufferCopy(assets.rec);
    const dictText = new TextDecoder("utf-8").decode(assets.dict);

    const res = await this.send<{ provider: OcrExecutionProvider }>(
      {
        type: "init",
        payload: {
          detModel: detBuffer,
          recModel: recBuffer,
          dictText,
        },
      },
      [detBuffer, recBuffer]
    );

    this.activeProvider = res.provider;
    this.initialized = true;
    return res.provider;
  }

  async recognizePage(page: OcrPageImageInput): Promise<OcrPageInput> {
    if (!this.initialized) {
      await this.initialize();
    }

    const rgbaCopy = toArrayBufferCopy(page.rgba);
    return this.send<OcrPageInput>(
      {
        type: "recognize_page",
        payload: {
          pageNum: page.pageNum,
          width: page.width,
          height: page.height,
          rgbaBuffer: rgbaCopy,
        },
      },
      [rgbaCopy]
    );
  }

  async recognizePages(
    pages: readonly OcrPageImageInput[],
    onProgress?: (progress: OcrClientProgress) => void,
    signal?: AbortSignal
  ): Promise<OcrPageInput[]> {
    const provider = await this.initialize(onProgress, signal);
    const results: OcrPageInput[] = [];

    for (let i = 0; i < pages.length; i++) {
      if (signal?.aborted) {
        throw new DOMException("OCR recognition aborted", "AbortError");
      }
      onProgress?.({
        phase: "recognizing",
        currentPage: i + 1,
        totalPages: pages.length,
        provider,
      });
      const pageResult = await this.recognizePage(pages[i]);
      results.push(pageResult);
    }

    onProgress?.({
      phase: "done",
      currentPage: pages.length,
      totalPages: pages.length,
      provider,
    });

    return results;
  }

  async dispose(): Promise<void> {
    if (!this.worker) return;
    try {
      await this.send<boolean>({ type: "dispose", payload: {} });
    } catch {}
    this.worker.terminate();
    this.worker = null;
    this.initialized = false;
    this.activeProvider = null;
    this.pending.clear();
  }
}

export function createOcrClient(options?: OcrClientOptions): OcrClient {
  return new OcrClient(options);
}
