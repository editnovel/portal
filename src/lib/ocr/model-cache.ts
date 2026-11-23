import { OPFS_DIRS } from "../opfs-keys";
import type {
  OcrCacheStatus,
  OcrDownloadProgress,
  OcrModelAsset,
  OcrModelKey,
  OcrModelManifest,
  OcrModelVariant,
} from "./types";

const HF_PPOCR_BASE = "https://huggingface.co/monkt/paddleocr-onnx/resolve/main";

export const DEFAULT_OCR_MANIFESTS: Record<OcrModelVariant, OcrModelManifest> = {
  "ppocrv4-mobile": {
    variant: "ppocrv4-mobile",
    assets: {
      det: {
        key: "det",
        fileName: "ch_PP-OCRv4_det_infer.onnx",
        url: `${HF_PPOCR_BASE}/detection/v4/ch_PP-OCRv4_det_infer.onnx`,
        minBytes: 100_000,
      },
      rec: {
        key: "rec",
        fileName: "latin_PP-OCRv4_rec_infer.onnx",
        url: `${HF_PPOCR_BASE}/recognition/latin/latin_PP-OCRv4_rec_infer.onnx`,
        minBytes: 100_000,
      },
      dict: {
        key: "dict",
        fileName: "latin_dict.txt",
        url: `${HF_PPOCR_BASE}/recognition/latin/latin_dict.txt`,
        minBytes: 128,
      },
    },
  },
  "ppocrv5-mobile": {
    variant: "ppocrv5-mobile",
    assets: {
      det: {
        key: "det",
        fileName: "PP-OCRv5_mobile_det_infer.onnx",
        url: `${HF_PPOCR_BASE}/detection/v5/PP-OCRv5_mobile_det_infer.onnx`,
        minBytes: 100_000,
      },
      rec: {
        key: "rec",
        fileName: "latin_PP-OCRv5_mobile_rec_infer.onnx",
        url: `${HF_PPOCR_BASE}/recognition/v5/latin_PP-OCRv5_mobile_rec_infer.onnx`,
        minBytes: 100_000,
      },
      dict: {
        key: "dict",
        fileName: "ppocrv5_latin_dict.txt",
        url: `${HF_PPOCR_BASE}/recognition/v5/ppocrv5_latin_dict.txt`,
        minBytes: 128,
      },
    },
  },
};

const ASSET_KEYS: readonly OcrModelKey[] = ["det", "rec", "dict"];

export function isOcrOpfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.getDirectory === "function"
  );
}

export function getOcrManifest(variant: OcrModelVariant = "ppocrv4-mobile"): OcrModelManifest {
  return DEFAULT_OCR_MANIFESTS[variant];
}

export async function getOcrModelsDirectory(
  variant: OcrModelVariant = "ppocrv4-mobile",
  create = true
): Promise<FileSystemDirectoryHandle | null> {
  if (!isOcrOpfsSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const modelsRoot = await root.getDirectoryHandle(OPFS_DIRS.ocrModels, { create });
    return await modelsRoot.getDirectoryHandle(variant, { create });
  } catch {
    return null;
  }
}

export function isValidCachedAssetSize(byteLength: number, asset: OcrModelAsset): boolean {
  if (byteLength < asset.minBytes) return false;
  if (asset.expectedBytes !== undefined && byteLength !== asset.expectedBytes) return false;
  return true;
}

export async function readCachedModelAsset(
  asset: OcrModelAsset,
  variant: OcrModelVariant = "ppocrv4-mobile"
): Promise<Uint8Array | null> {
  const dir = await getOcrModelsDirectory(variant, false);
  if (!dir) return null;
  try {
    const handle = await dir.getFileHandle(asset.fileName);
    const file = await handle.getFile();
    if (!isValidCachedAssetSize(file.size, asset)) {
      return null;
    }
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function writeCachedModelAsset(
  fileName: string,
  bytes: Uint8Array,
  variant: OcrModelVariant = "ppocrv4-mobile"
): Promise<boolean> {
  const dir = await getOcrModelsDirectory(variant, true);
  if (!dir) return false;
  try {
    const handle = await dir.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await writable.write(copy.buffer);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function getOcrCacheStatus(
  manifest: OcrModelManifest = DEFAULT_OCR_MANIFESTS["ppocrv4-mobile"]
): Promise<OcrCacheStatus> {
  const supported = isOcrOpfsSupported();
  if (!supported) {
    return {
      supported: false,
      variant: manifest.variant,
      cachedKeys: [],
      missingKeys: [...ASSET_KEYS],
      totalBytes: 0,
      readyOffline: false,
    };
  }

  const dir = await getOcrModelsDirectory(manifest.variant, false);
  if (!dir) {
    return {
      supported: true,
      variant: manifest.variant,
      cachedKeys: [],
      missingKeys: [...ASSET_KEYS],
      totalBytes: 0,
      readyOffline: false,
    };
  }

  const cachedKeys: OcrModelKey[] = [];
  const missingKeys: OcrModelKey[] = [];
  let totalBytes = 0;

  for (const key of ASSET_KEYS) {
    const asset = manifest.assets[key];
    try {
      const handle = await dir.getFileHandle(asset.fileName);
      const file = await handle.getFile();
      if (isValidCachedAssetSize(file.size, asset)) {
        cachedKeys.push(key);
        totalBytes += file.size;
      } else {
        missingKeys.push(key);
      }
    } catch {
      missingKeys.push(key);
    }
  }

  return {
    supported: true,
    variant: manifest.variant,
    cachedKeys,
    missingKeys,
    totalBytes,
    readyOffline: missingKeys.length === 0,
  };
}

async function downloadAssetWithProgress(
  asset: OcrModelAsset,
  fetcher: typeof fetch,
  signal: AbortSignal | undefined,
  onChunk: (loadedBytes: number, totalBytes: number) => void
): Promise<Uint8Array> {
  const response = await fetcher(asset.url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch OCR asset ${asset.fileName}: HTTP ${response.status}`);
  }

  const contentLengthHeader = response.headers.get("content-length");
  const expectedLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : 0;
  const totalBytes = Number.isFinite(expectedLength) && expectedLength > 0 ? expectedLength : 0;

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    verifyDownloadedSize(bytes.byteLength, totalBytes, asset);
    onChunk(bytes.byteLength, bytes.byteLength);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loadedBytes += value.byteLength;
      onChunk(loadedBytes, totalBytes || loadedBytes);
    }
  }

  const merged = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  verifyDownloadedSize(merged.byteLength, totalBytes, asset);
  return merged;
}

function verifyDownloadedSize(
  actualBytes: number,
  contentLength: number,
  asset: OcrModelAsset
): void {
  if (contentLength > 0 && actualBytes !== contentLength) {
    throw new Error(
      `OCR asset ${asset.fileName} size mismatch: expected ${contentLength} bytes, got ${actualBytes}`
    );
  }
  if (!isValidCachedAssetSize(actualBytes, asset)) {
    throw new Error(`OCR asset ${asset.fileName} failed verification: got ${actualBytes} bytes`);
  }
}

export interface EnsureOcrModelsOptions {
  manifest?: OcrModelManifest;
  onProgress?: (progress: OcrDownloadProgress) => void;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export async function ensureOcrModelsCached(
  options: EnsureOcrModelsOptions = {}
): Promise<Record<OcrModelKey, Uint8Array>> {
  const manifest = options.manifest ?? DEFAULT_OCR_MANIFESTS["ppocrv4-mobile"];
  const fetcher = options.fetcher ?? fetch;
  const result: Partial<Record<OcrModelKey, Uint8Array>> = {};
  let completedAssets = 0;

  for (const key of ASSET_KEYS) {
    if (options.signal?.aborted) {
      throw new DOMException("OCR model download aborted", "AbortError");
    }

    const asset = manifest.assets[key];
    const cached = await readCachedModelAsset(asset, manifest.variant);
    if (cached) {
      result[key] = cached;
      completedAssets += 1;
      options.onProgress?.({
        variant: manifest.variant,
        currentKey: key,
        loadedBytes: cached.byteLength,
        totalBytes: cached.byteLength,
        completedAssets,
        totalAssets: ASSET_KEYS.length,
        percent: Math.round((completedAssets / ASSET_KEYS.length) * 100),
      });
      continue;
    }

    const bytes = await downloadAssetWithProgress(
      asset,
      fetcher,
      options.signal,
      (loadedBytes, totalBytes) => {
        const assetFraction = totalBytes > 0 ? Math.min(1, loadedBytes / totalBytes) : 0;
        const percent = Math.min(
          99,
          Math.round(((completedAssets + assetFraction) / ASSET_KEYS.length) * 100)
        );
        options.onProgress?.({
          variant: manifest.variant,
          currentKey: key,
          loadedBytes,
          totalBytes,
          completedAssets,
          totalAssets: ASSET_KEYS.length,
          percent,
        });
      }
    );

    await writeCachedModelAsset(asset.fileName, bytes, manifest.variant);
    result[key] = bytes;
    completedAssets += 1;
    options.onProgress?.({
      variant: manifest.variant,
      currentKey: key,
      loadedBytes: bytes.byteLength,
      totalBytes: bytes.byteLength,
      completedAssets,
      totalAssets: ASSET_KEYS.length,
      percent: Math.round((completedAssets / ASSET_KEYS.length) * 100),
    });
  }

  return result as Record<OcrModelKey, Uint8Array>;
}

export async function clearOcrModelCache(variant?: OcrModelVariant): Promise<void> {
  if (!isOcrOpfsSupported()) return;
  try {
    const root = await navigator.storage.getDirectory();
    const modelsRoot = await root.getDirectoryHandle(OPFS_DIRS.ocrModels, { create: false });
    if (variant) {
      await modelsRoot.removeEntry(variant, { recursive: true });
      return;
    }
    await root.removeEntry(OPFS_DIRS.ocrModels, { recursive: true });
  } catch {}
}
