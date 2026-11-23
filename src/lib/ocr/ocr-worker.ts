import * as ort from "onnxruntime-web";
import {
  buildOcrPageInput,
  decodeCtcOutput,
  decodeDbNetBoxes,
  parseDictionary,
} from "./ocr-postprocess";
import { cropLineToRecTensor, rgbaToDbNetTensor } from "./ocr-preprocess";
import type {
  OcrExecutionProvider,
  OcrRecognizedBox,
  OcrWorkerRequest,
  OcrWorkerResponse,
} from "./types";

interface WorkerSessionState {
  detSession: ort.InferenceSession;
  recSession: ort.InferenceSession;
  dict: string[];
  provider: OcrExecutionProvider;
}

let sessionState: WorkerSessionState | null = null;

async function isWebGpuAdapterAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const navWithGpu = navigator as Navigator & {
    gpu?: { requestAdapter?: () => Promise<unknown | null> };
  };
  if (!navWithGpu.gpu || typeof navWithGpu.gpu.requestAdapter !== "function") {
    return false;
  }
  try {
    const adapter = await navWithGpu.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

function configureOrtEnvironment(): void {
  ort.env.wasm.simd = true;
  const isIsolated = typeof self !== "undefined" && self.crossOriginIsolated === true;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 1;
  ort.env.wasm.numThreads = isIsolated ? Math.min(4, Math.max(1, cores)) : 1;
}

async function createSessionWithFallback(
  modelBytes: Uint8Array,
  preferWebGpu: boolean
): Promise<{ session: ort.InferenceSession; provider: OcrExecutionProvider }> {
  if (preferWebGpu) {
    try {
      const session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: ["webgpu", "wasm"],
        graphOptimizationLevel: "all",
      });
      return { session, provider: "webgpu" };
    } catch {}
  }

  const session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  return { session, provider: "wasm" };
}

async function extractFloat32Output(tensor: ort.OnnxValue): Promise<Float32Array> {
  if ("getData" in tensor && typeof tensor.getData === "function") {
    const raw = await tensor.getData();
    if (raw instanceof Float32Array) return raw;
    return new Float32Array(raw as ArrayLike<number>);
  }
  const cpuData = tensor.data;
  if (cpuData instanceof Float32Array) return cpuData;
  return new Float32Array(cpuData as ArrayLike<number>);
}

async function disposeSessions(): Promise<void> {
  if (!sessionState) return;
  const current = sessionState;
  sessionState = null;
  await Promise.allSettled([current.detSession.release(), current.recSession.release()]);
}

function postWorkerResponse(response: OcrWorkerResponse): void {
  self.postMessage(response);
}

self.onmessage = async (event: MessageEvent<OcrWorkerRequest>) => {
  const message = event.data;
  const { id } = message;

  try {
    if (message.type === "init") {
      await disposeSessions();
      configureOrtEnvironment();

      const webgpuReady = await isWebGpuAdapterAvailable();
      const detBytes = new Uint8Array(message.payload.detModel);
      const recBytes = new Uint8Array(message.payload.recModel);

      const detCreated = await createSessionWithFallback(detBytes, webgpuReady);
      const recCreated = await createSessionWithFallback(
        recBytes,
        detCreated.provider === "webgpu"
      );

      sessionState = {
        detSession: detCreated.session,
        recSession: recCreated.session,
        dict: parseDictionary(message.payload.dictText),
        provider: recCreated.provider,
      };

      postWorkerResponse({
        id,
        type: "init_success",
        result: { provider: sessionState.provider },
      });
      return;
    }

    if (message.type === "recognize_page") {
      if (!sessionState) {
        throw new Error("OCR worker is not initialized");
      }

      const { pageNum, width, height, rgbaBuffer } = message.payload;
      const rgba = new Uint8ClampedArray(rgbaBuffer);

      const detInput = rgbaToDbNetTensor(rgba, width, height);
      const detInputName = sessionState.detSession.inputNames[0] ?? "x";
      const detTensor = new ort.Tensor("float32", detInput.data, detInput.dims);
      const detOutputs = await sessionState.detSession.run({ [detInputName]: detTensor });
      const detOutputName = sessionState.detSession.outputNames[0];
      const detOutTensor = detOutputName ? detOutputs[detOutputName] : Object.values(detOutputs)[0];

      if (!detOutTensor) {
        throw new Error("DBNet detection model returned no output tensor");
      }

      const detProbMap = await extractFloat32Output(detOutTensor);
      const detDims = detOutTensor.dims;
      const mapHeight = Number(detDims[detDims.length - 2] ?? detInput.targetHeight);
      const mapWidth = Number(detDims[detDims.length - 1] ?? detInput.targetWidth);

      const rawBoxes = decodeDbNetBoxes(detProbMap, mapWidth, mapHeight, width, height);
      const recognizedBoxes: OcrRecognizedBox[] = [];
      const recInputName = sessionState.recSession.inputNames[0] ?? "x";
      const recOutputName = sessionState.recSession.outputNames[0];

      for (const box of rawBoxes) {
        const recInput = cropLineToRecTensor(rgba, width, height, box.bbox);
        const recTensor = new ort.Tensor("float32", recInput.data, recInput.dims);
        const recOutputs = await sessionState.recSession.run({ [recInputName]: recTensor });
        const recOutTensor = recOutputName
          ? recOutputs[recOutputName]
          : Object.values(recOutputs)[0];

        if (!recOutTensor) continue;

        const logits = await extractFloat32Output(recOutTensor);
        const recDims = recOutTensor.dims;
        const timeSteps = Number(recDims[recDims.length - 2] ?? 0);
        const vocabSize = Number(recDims[recDims.length - 1] ?? 0);
        const decoded = decodeCtcOutput(logits, timeSteps, vocabSize, sessionState.dict);

        if (decoded.text.length > 0) {
          recognizedBoxes.push({
            bbox: box.bbox,
            text: decoded.text,
            confidence: decoded.confidence,
          });
        }
      }

      const pageInput = buildOcrPageInput(pageNum, width, height, recognizedBoxes);
      postWorkerResponse({
        id,
        type: "recognize_page_success",
        result: pageInput,
      });
      return;
    }

    if (message.type === "dispose") {
      await disposeSessions();
      postWorkerResponse({
        id,
        type: "dispose_success",
        result: true,
      });
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    postWorkerResponse({
      id,
      type: "error",
      error: errorMessage,
    });
  }
};
