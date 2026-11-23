import { describe, expect, it } from "vitest";
import { OcrClient } from "~/lib/ocr/ocr-client";
import {
  buildOcrPageInput,
  decodeCtcOutput,
  decodeDbNetBoxes,
  parseDictionary,
  sortAndGroupOcrBoxes,
} from "~/lib/ocr/ocr-postprocess";
import {
  alignToMultiple,
  computeDetectionResize,
  cropLineToRecTensor,
  rgbaToDbNetTensor,
} from "~/lib/ocr/ocr-preprocess";
import type { OcrRecognizedBox, OcrWorkerRequest, OcrWorkerResponse } from "~/lib/ocr/types";

describe("OCR preprocessing", () => {
  it("aligns dimensions to multiples of 32 and respects limitSideLen", () => {
    expect(alignToMultiple(10)).toBe(32);
    expect(alignToMultiple(65)).toBe(64);
    expect(alignToMultiple(100)).toBe(96);

    const resize = computeDetectionResize(1920, 1080, 960);
    expect(resize.targetWidth).toBe(960);
    expect(resize.targetHeight % 32).toBe(0);
    expect(resize.targetHeight).toBe(544);
  });

  it("builds normalized CHW float32 tensors for DBNet and CTC recognition", () => {
    const width = 40;
    const height = 20;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = 255;
      rgba[i * 4 + 1] = 128;
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 255;
    }

    const detTensor = rgbaToDbNetTensor(rgba, width, height, 960);
    expect(detTensor.dims).toEqual([1, 3, 32, 32]);
    expect(detTensor.data.length).toBe(3 * 32 * 32);
    expect(detTensor.data[0]).toBeGreaterThan(2);
    expect(detTensor.data[2 * 32 * 32]).toBeLessThan(-1.5);

    const recTensor = cropLineToRecTensor(rgba, width, height, [4, 2, 36, 18], 48, 320);
    expect(recTensor.dims[0]).toBe(1);
    expect(recTensor.dims[1]).toBe(3);
    expect(recTensor.dims[2]).toBe(48);
    expect(recTensor.dims[3] % 32).toBe(0);
    expect(recTensor.data[0]).toBeCloseTo(1, 2);
  });
});

describe("OCR postprocessing and block/line sorting", () => {
  it("decodes DBNet probability map into scaled bounding boxes", () => {
    const mapW = 32;
    const mapH = 32;
    const probMap = new Float32Array(mapW * mapH);

    for (let y = 4; y <= 8; y++) {
      for (let x = 2; x <= 14; x++) {
        probMap[y * mapW + x] = 0.92;
      }
    }

    for (let y = 18; y <= 22; y++) {
      for (let x = 10; x <= 26; x++) {
        probMap[y * mapW + x] = 0.85;
      }
    }

    probMap[1 * mapW + 1] = 0.95;

    const boxes = decodeDbNetBoxes(probMap, mapW, mapH, 640, 640, {
      binThreshold: 0.3,
      boxThreshold: 0.5,
      minArea: 10,
      unclipRatio: 1.2,
    });

    expect(boxes).toHaveLength(2);
    expect(boxes[0]?.score).toBeCloseTo(0.92, 2);
    expect(boxes[0]?.bbox[0]).toBeLessThan(60);
    expect(boxes[0]?.bbox[2]).toBeGreaterThan(260);
    expect(boxes[1]?.bbox[1]).toBeGreaterThan(320);
  });

  it("decodes CTC logits with blank removal and repeat collapsing", () => {
    const dict = parseDictionary("h\ne\nl\no\n");
    const vocabSize = 6;
    const timeSteps = 8;
    const logits = new Float32Array(timeSteps * vocabSize);

    const sequence = [1, 1, 0, 2, 3, 0, 3, 4];
    for (let t = 0; t < timeSteps; t++) {
      for (let c = 0; c < vocabSize; c++) {
        logits[t * vocabSize + c] = c === sequence[t] ? 10 : -5;
      }
    }

    const decoded = decodeCtcOutput(logits, timeSteps, vocabSize, dict);
    expect(decoded.text).toBe("hello");
    expect(decoded.confidence).toBeGreaterThan(0.99);
  });

  it("merges same-line spans left-to-right and sorts lines top-to-bottom", () => {
    const unordered: OcrRecognizedBox[] = [
      { bbox: [180, 122, 260, 144], text: "world", confidence: 0.94 },
      { bbox: [40, 200, 180, 224], text: "Second line", confidence: 0.97 },
      { bbox: [40, 120, 110, 142], text: "Hello", confidence: 0.98 },
      { bbox: [118, 121, 172, 143], text: "dear", confidence: 0.95 },
      { bbox: [40, 40, 200, 65], text: "   ", confidence: 0.5 },
    ];

    const page = buildOcrPageInput(3, 800, 1000, unordered);
    expect(page.pageNum).toBe(3);
    expect(page.width).toBe(800);
    expect(page.height).toBe(1000);
    expect(page.lines).toHaveLength(2);
    expect(page.lines[0]?.text).toBe("Hello dear world");
    expect(page.lines[0]?.bbox).toEqual([40, 120, 260, 144]);
    expect(page.lines[0]?.spans.map((s) => s.text)).toEqual(["Hello", "dear", "world"]);
    expect(page.lines[1]?.text).toBe("Second line");
  });

  it("orders multi-column blocks with full-width header and footer via XY-cut", () => {
    const boxes: OcrRecognizedBox[] = [
      { bbox: [520, 160, 880, 185], text: "Right Col 2", confidence: 0.91 },
      { bbox: [60, 160, 420, 185], text: "Left Col 2", confidence: 0.93 },
      { bbox: [200, 40, 760, 72], text: "Paper Title", confidence: 0.99 },
      { bbox: [520, 110, 880, 135], text: "Right Col 1", confidence: 0.92 },
      { bbox: [60, 110, 420, 135], text: "Left Col 1", confidence: 0.95 },
      { bbox: [300, 900, 660, 924], text: "Page Footer", confidence: 0.96 },
    ];

    const lines = sortAndGroupOcrBoxes(boxes, 1000, 1000);
    expect(lines.map((l) => l.text)).toEqual([
      "Paper Title",
      "Left Col 1",
      "Left Col 2",
      "Right Col 1",
      "Right Col 2",
      "Page Footer",
    ]);
  });

  it("runs OcrClient lifecycle with a mock worker", async () => {
    let messageHandler: ((event: MessageEvent<OcrWorkerResponse>) => void) | null = null;
    let terminated = false;

    const mockWorker = {
      set onmessage(fn: ((event: MessageEvent<OcrWorkerResponse>) => void) | null) {
        messageHandler = fn;
      },
      set onerror(_fn: ((err: ErrorEvent) => void) | null) {},
      postMessage(msg: OcrWorkerRequest) {
        queueMicrotask(() => {
          if (!messageHandler) return;
          if (msg.type === "init") {
            messageHandler({
              data: {
                id: msg.id,
                type: "init_success",
                result: { provider: "wasm" },
              },
            } as MessageEvent<OcrWorkerResponse>);
          } else if (msg.type === "recognize_page") {
            messageHandler({
              data: {
                id: msg.id,
                type: "recognize_page_success",
                result: {
                  pageNum: msg.payload.pageNum,
                  width: msg.payload.width,
                  height: msg.payload.height,
                  lines: [
                    {
                      text: "Recognized line",
                      bbox: [10, 10, 100, 30],
                      spans: [
                        { text: "Recognized line", bbox: [10, 10, 100, 30], confidence: 0.97 },
                      ],
                    },
                  ],
                },
              },
            } as MessageEvent<OcrWorkerResponse>);
          } else if (msg.type === "dispose") {
            messageHandler({
              data: { id: msg.id, type: "dispose_success", result: true },
            } as MessageEvent<OcrWorkerResponse>);
          }
        });
      },
      terminate() {
        terminated = true;
      },
    } as unknown as Worker;

    const manifest = {
      variant: "ppocrv4-mobile" as const,
      assets: {
        det: { key: "det" as const, fileName: "det.onnx", url: "https://x/det", minBytes: 2 },
        rec: { key: "rec" as const, fileName: "rec.onnx", url: "https://x/rec", minBytes: 2 },
        dict: { key: "dict" as const, fileName: "dict.txt", url: "https://x/dict", minBytes: 2 },
      },
    };

    const fetcher = async () => {
      const bytes = new Uint8Array([10, 20, 30, 40]);
      return new Response(bytes.buffer, {
        status: 200,
        headers: { "content-length": "4" },
      });
    };

    const client = new OcrClient({
      manifest,
      workerFactory: () => mockWorker,
      fetcher: fetcher as typeof fetch,
    });

    const pages = await client.recognizePages([
      { pageNum: 1, width: 200, height: 300, rgba: new Uint8ClampedArray(200 * 300 * 4) },
    ]);

    expect(client.provider).toBe("wasm");
    expect(pages).toHaveLength(1);
    expect(pages[0]?.lines[0]?.text).toBe("Recognized line");

    await client.dispose();
    expect(terminated).toBe(true);
    expect(client.isReady).toBe(false);
  });
});
