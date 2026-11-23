export interface DbNetPreprocessResult {
  data: Float32Array;
  dims: [1, 3, number, number];
  scaleX: number;
  scaleY: number;
  targetWidth: number;
  targetHeight: number;
}

export interface RecPreprocessResult {
  data: Float32Array;
  dims: [1, 3, number, number];
  targetWidth: number;
  targetHeight: number;
}

const DB_MEAN: readonly [number, number, number] = [0.485, 0.456, 0.406];
const DB_STD: readonly [number, number, number] = [0.229, 0.224, 0.225];

export function alignToMultiple(value: number, multiple = 32): number {
  const safe = Math.max(multiple, Math.round(value / multiple) * multiple);
  return safe;
}

export function computeDetectionResize(
  width: number,
  height: number,
  limitSideLen = 960
): { targetWidth: number; targetHeight: number; scaleX: number; scaleY: number } {
  const maxSide = Math.max(width, height);
  const ratio = maxSide > limitSideLen ? limitSideLen / maxSide : 1;
  const resizedW = Math.max(32, Math.round(width * ratio));
  const resizedH = Math.max(32, Math.round(height * ratio));
  const targetWidth = alignToMultiple(resizedW, 32);
  const targetHeight = alignToMultiple(resizedH, 32);
  return {
    targetWidth,
    targetHeight,
    scaleX: targetWidth / Math.max(1, width),
    scaleY: targetHeight / Math.max(1, height),
  };
}

function resizeRgbaWithOffscreenCanvas(
  rgba: Uint8ClampedArray | Uint8Array,
  srcWidth: number,
  srcHeight: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
  dstWidth: number,
  dstHeight: number
): Uint8ClampedArray | null {
  if (typeof OffscreenCanvas === "undefined" || typeof ImageData === "undefined") {
    return null;
  }
  const srcCanvas = new OffscreenCanvas(srcWidth, srcHeight);
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) return null;

  const clamped = new Uint8ClampedArray(rgba.byteLength);
  clamped.set(rgba);
  srcCtx.putImageData(new ImageData(clamped, srcWidth, srcHeight), 0, 0);

  const dstCanvas = new OffscreenCanvas(dstWidth, dstHeight);
  const dstCtx = dstCanvas.getContext("2d");
  if (!dstCtx) return null;

  dstCtx.fillStyle = "#808080";
  dstCtx.fillRect(0, 0, dstWidth, dstHeight);
  dstCtx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, dstWidth, dstHeight);
  return dstCtx.getImageData(0, 0, dstWidth, dstHeight).data;
}

function resizeRgbaBilinear(
  rgba: Uint8ClampedArray | Uint8Array,
  srcWidth: number,
  srcHeight: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
  dstWidth: number,
  dstHeight: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const scaleX = cropW / Math.max(1, dstWidth);
  const scaleY = cropH / Math.max(1, dstHeight);

  for (let y = 0; y < dstHeight; y++) {
    const sy = Math.min(srcHeight - 1, Math.max(0, cropY + (y + 0.5) * scaleY - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(srcHeight - 1, y0 + 1);
    const wy = sy - y0;

    for (let x = 0; x < dstWidth; x++) {
      const sx = Math.min(srcWidth - 1, Math.max(0, cropX + (x + 0.5) * scaleX - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(srcWidth - 1, x0 + 1);
      const wx = sx - x0;

      const idx00 = (y0 * srcWidth + x0) * 4;
      const idx10 = (y0 * srcWidth + x1) * 4;
      const idx01 = (y1 * srcWidth + x0) * 4;
      const idx11 = (y1 * srcWidth + x1) * 4;
      const dstIdx = (y * dstWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        const top = rgba[idx00 + c] * (1 - wx) + rgba[idx10 + c] * wx;
        const bottom = rgba[idx01 + c] * (1 - wx) + rgba[idx11 + c] * wx;
        out[dstIdx + c] = Math.round(top * (1 - wy) + bottom * wy);
      }
    }
  }

  return out;
}

function resizeRgba(
  rgba: Uint8ClampedArray | Uint8Array,
  srcWidth: number,
  srcHeight: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
  dstWidth: number,
  dstHeight: number
): Uint8ClampedArray {
  const canvasRes = resizeRgbaWithOffscreenCanvas(
    rgba,
    srcWidth,
    srcHeight,
    cropX,
    cropY,
    cropW,
    cropH,
    dstWidth,
    dstHeight
  );
  if (canvasRes) return canvasRes;
  return resizeRgbaBilinear(
    rgba,
    srcWidth,
    srcHeight,
    cropX,
    cropY,
    cropW,
    cropH,
    dstWidth,
    dstHeight
  );
}

export function rgbaToDbNetTensor(
  rgba: Uint8ClampedArray | Uint8Array,
  srcWidth: number,
  srcHeight: number,
  limitSideLen = 960
): DbNetPreprocessResult {
  const { targetWidth, targetHeight, scaleX, scaleY } = computeDetectionResize(
    srcWidth,
    srcHeight,
    limitSideLen
  );
  const resized = resizeRgba(
    rgba,
    srcWidth,
    srcHeight,
    0,
    0,
    srcWidth,
    srcHeight,
    targetWidth,
    targetHeight
  );

  const planeSize = targetWidth * targetHeight;
  const data = new Float32Array(3 * planeSize);
  const inv255 = 1 / 255;

  for (let i = 0; i < planeSize; i++) {
    const p = i * 4;
    data[i] = (resized[p] * inv255 - DB_MEAN[0]) / DB_STD[0];
    data[planeSize + i] = (resized[p + 1] * inv255 - DB_MEAN[1]) / DB_STD[1];
    data[2 * planeSize + i] = (resized[p + 2] * inv255 - DB_MEAN[2]) / DB_STD[2];
  }

  return {
    data,
    dims: [1, 3, targetHeight, targetWidth],
    scaleX,
    scaleY,
    targetWidth,
    targetHeight,
  };
}

export function cropLineToRecTensor(
  rgba: Uint8ClampedArray | Uint8Array,
  srcWidth: number,
  srcHeight: number,
  bbox: [number, number, number, number],
  targetHeight = 48,
  maxWidth = 640
): RecPreprocessResult {
  const x0 = Math.max(0, Math.floor(bbox[0]));
  const y0 = Math.max(0, Math.floor(bbox[1]));
  const x1 = Math.min(srcWidth, Math.ceil(bbox[2]));
  const y1 = Math.min(srcHeight, Math.ceil(bbox[3]));
  const cropW = Math.max(1, x1 - x0);
  const cropH = Math.max(1, y1 - y0);

  const aspect = cropW / cropH;
  const scaledW = Math.min(maxWidth, Math.max(1, Math.round(targetHeight * aspect)));
  const paddedWidth = Math.min(maxWidth, Math.max(32, alignToMultiple(scaledW, 32)));

  const resized = resizeRgba(
    rgba,
    srcWidth,
    srcHeight,
    x0,
    y0,
    cropW,
    cropH,
    scaledW,
    targetHeight
  );

  const planeSize = paddedWidth * targetHeight;
  const data = new Float32Array(3 * planeSize);
  const inv127 = 1 / 127.5;

  for (let y = 0; y < targetHeight; y++) {
    const rowOut = y * paddedWidth;
    const rowIn = y * scaledW;
    for (let x = 0; x < scaledW; x++) {
      const p = (rowIn + x) * 4;
      const outIdx = rowOut + x;
      data[outIdx] = resized[p] * inv127 - 1;
      data[planeSize + outIdx] = resized[p + 1] * inv127 - 1;
      data[2 * planeSize + outIdx] = resized[p + 2] * inv127 - 1;
    }
  }

  return {
    data,
    dims: [1, 3, targetHeight, paddedWidth],
    targetWidth: paddedWidth,
    targetHeight,
  };
}
