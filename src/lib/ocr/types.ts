import type { OcrPageInput } from "../types";

export type OcrExecutionProvider = "webgpu" | "wasm";

export type OcrModelKey = "det" | "rec" | "dict";

export type OcrModelVariant = "ppocrv4-mobile" | "ppocrv5-mobile";

export interface OcrModelAsset {
  key: OcrModelKey;
  fileName: string;
  url: string;
  minBytes: number;
  expectedBytes?: number;
}

export interface OcrModelManifest {
  variant: OcrModelVariant;
  assets: Record<OcrModelKey, OcrModelAsset>;
}

export interface OcrDownloadProgress {
  variant: OcrModelVariant;
  currentKey: OcrModelKey;
  loadedBytes: number;
  totalBytes: number;
  completedAssets: number;
  totalAssets: number;
  percent: number;
}

export interface OcrCacheStatus {
  supported: boolean;
  variant: OcrModelVariant;
  cachedKeys: OcrModelKey[];
  missingKeys: OcrModelKey[];
  totalBytes: number;
  readyOffline: boolean;
}

export interface OcrRawBox {
  bbox: [number, number, number, number];
  score: number;
}

export interface OcrRecognizedBox {
  bbox: [number, number, number, number];
  text: string;
  confidence: number;
}

export interface OcrPageImageInput {
  pageNum: number;
  width: number;
  height: number;
  rgba: Uint8ClampedArray | Uint8Array;
}

export interface OcrClientProgress {
  phase: "downloading" | "initializing" | "recognizing" | "done";
  currentPage?: number;
  totalPages?: number;
  download?: OcrDownloadProgress;
  provider?: OcrExecutionProvider;
}

export type OcrWorkerRequest =
  | {
      id: number;
      type: "init";
      payload: {
        detModel: ArrayBuffer;
        recModel: ArrayBuffer;
        dictText: string;
      };
    }
  | {
      id: number;
      type: "recognize_page";
      payload: {
        pageNum: number;
        width: number;
        height: number;
        rgbaBuffer: ArrayBuffer;
      };
    }
  | {
      id: number;
      type: "dispose";
      payload: Record<string, never>;
    };

export type OcrWorkerResponse =
  | {
      id: number;
      type: "init_success";
      result: {
        provider: OcrExecutionProvider;
      };
    }
  | {
      id: number;
      type: "recognize_page_success";
      result: OcrPageInput;
    }
  | {
      id: number;
      type: "dispose_success";
      result: true;
    }
  | {
      id: number;
      type: "error";
      error: string;
    };
