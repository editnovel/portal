import initWasm, {
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

let wasmReady = false;
let wasmInitPromise: Promise<void> | null = null;

async function ensureWasmInitialized(): Promise<void> {
  if (wasmReady) return;
  if (!wasmInitPromise) {
    wasmInitPromise = initWasm(wasmUrl).then(() => {
      init_engine();
      wasmReady = true;
    });
  }
  await wasmInitPromise;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  try {
    await ensureWasmInitialized();

    if (type === "parse_book") {
      const { fileName, fileBytes } = payload;
      const rawJson = parse_book_file_wasm(fileBytes, fileName);
      const parsed = JSON.parse(rawJson);

      const transferList: Transferable[] = [];
      const imagesData: Array<{ name: string; bytes: Uint8Array }> = [];
      for (const img of parsed.images) {
        const bytes = get_image_bytes_wasm(fileName, img.name);
        if (bytes) {
          const u8 = new Uint8Array(bytes);
          imagesData.push({ name: img.name, bytes: u8 });
          transferList.push(u8.buffer);
        }
      }

      (self as unknown as Worker).postMessage(
        {
          id,
          type: "parse_book_success",
          result: {
            payload: parsed,
            imagesData,
          },
        },
        transferList
      );
    } else if (type === "audit_spelling") {
      const { fileId, optionsJson } = payload;
      const raw = audit_spelling_wasm(fileId, optionsJson);
      self.postMessage({ id, type: "audit_spelling_success", result: JSON.parse(raw) });
    } else if (type === "audit_dynamic_paragraphs") {
      const { requestJson } = payload;
      const raw = audit_dynamic_paragraphs_wasm(requestJson);
      self.postMessage({ id, type: "audit_dynamic_paragraphs_success", result: JSON.parse(raw) });
    } else if (type === "build_epub") {
      const { payloadJson } = payload;
      const epubBytes = build_epub_wasm(payloadJson);
      const copy = new Uint8Array(epubBytes);
      (self as unknown as Worker).postMessage(
        { id, type: "build_epub_success", result: copy },
        [copy.buffer]
      );
    } else if (type === "remove_book") {
      const { fileName } = payload;
      remove_book_file_wasm(fileName);
      self.postMessage({ id, type: "remove_book_success" });
    } else if (type === "set_custom_cover") {
      const { filename, ext, data } = payload;
      set_custom_cover_wasm(filename, ext, data);
      self.postMessage({ id, type: "set_custom_cover_success" });
    } else if (type === "clear_custom_cover") {
      clear_custom_cover_wasm();
      self.postMessage({ id, type: "clear_custom_cover_success" });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, type: "error", error: errorMsg });
  }
};
