import { deflateSync, gunzipSync, gzipSync, inflateSync, strFromU8, strToU8 } from "fflate";

interface BrotliBridgeModule {
  compressBrotli?: (bytes: Uint8Array) => Promise<Uint8Array>;
  decompressBrotli?: (bytes: Uint8Array) => Promise<Uint8Array>;
}

export function isCompressionStreamsSupported(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

export function isGzipBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function toArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

async function getBrotliBridge(): Promise<BrotliBridgeModule | null> {
  try {
    const mod = (await import("./wasm-bridge")) as BrotliBridgeModule;
    return mod;
  } catch {
    return null;
  }
}

export async function compressBytes(
  bytes: Uint8Array,
  format: "gzip" | "deflate" = "gzip"
): Promise<Uint8Array> {
  const safeBytes = toArrayBufferView(bytes);
  if (isCompressionStreamsSupported()) {
    try {
      const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
        start(controller) {
          controller.enqueue(safeBytes);
          controller.close();
        },
      });
      const compressedStream = stream.pipeThrough(new CompressionStream(format));
      const response = new Response(compressedStream);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {}
  }
  return format === "deflate" ? deflateSync(safeBytes) : gzipSync(safeBytes);
}

export async function decompressBytes(
  bytes: Uint8Array,
  format: "gzip" | "deflate" = "gzip"
): Promise<Uint8Array> {
  const safeBytes = toArrayBufferView(bytes);
  if (isCompressionStreamsSupported()) {
    try {
      const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
        start(controller) {
          controller.enqueue(safeBytes);
          controller.close();
        },
      });
      const decompressedStream = stream.pipeThrough(new DecompressionStream(format));
      const response = new Response(decompressedStream);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {}
  }
  return format === "deflate" ? inflateSync(safeBytes) : gunzipSync(safeBytes);
}

export async function compressBrotli(bytes: Uint8Array): Promise<Uint8Array> {
  const bridge = await getBrotliBridge();
  if (bridge && typeof bridge.compressBrotli === "function") {
    try {
      const compressed = await bridge.compressBrotli(bytes);
      if (compressed.byteLength > 0) {
        return compressed;
      }
    } catch {}
  }
  return compressBytes(bytes, "gzip");
}

export async function decompressBrotli(bytes: Uint8Array): Promise<Uint8Array> {
  if (isGzipBytes(bytes)) {
    return decompressBytes(bytes, "gzip");
  }
  const bridge = await getBrotliBridge();
  if (bridge && typeof bridge.decompressBrotli === "function") {
    return bridge.decompressBrotli(bytes);
  }
  throw new Error("Brotli decompression unavailable");
}

export async function compressString(text: string): Promise<Uint8Array> {
  return compressBytes(strToU8(text), "gzip");
}

export async function decompressToString(compressedBytes: Uint8Array): Promise<string> {
  if (isGzipBytes(compressedBytes)) {
    const decompressed = await decompressBytes(compressedBytes, "gzip");
    return strFromU8(decompressed);
  }
  const decompressed = await decompressBrotli(compressedBytes);
  return strFromU8(decompressed);
}

export async function compressStringBrotli(text: string): Promise<Uint8Array> {
  return compressBrotli(strToU8(text));
}

export async function decompressBrotliToString(compressedBytes: Uint8Array): Promise<string> {
  const decompressed = await decompressBrotli(compressedBytes);
  return strFromU8(decompressed);
}
