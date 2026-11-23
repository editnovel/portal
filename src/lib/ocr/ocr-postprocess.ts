import type { OcrLineInput, OcrPageInput, OcrWordSpan } from "../types";
import type { OcrRawBox, OcrRecognizedBox } from "./types";

export interface DbNetDecodeOptions {
  binThreshold?: number;
  boxThreshold?: number;
  minArea?: number;
  unclipRatio?: number;
}

export function decodeDbNetBoxes(
  probMap: Float32Array,
  mapWidth: number,
  mapHeight: number,
  origWidth: number,
  origHeight: number,
  options: DbNetDecodeOptions = {}
): OcrRawBox[] {
  const binThreshold = options.binThreshold ?? 0.3;
  const boxThreshold = options.boxThreshold ?? 0.5;
  const minArea = options.minArea ?? 12;
  const unclipRatio = options.unclipRatio ?? 1.5;

  if (mapWidth <= 0 || mapHeight <= 0 || probMap.length < mapWidth * mapHeight) {
    return [];
  }

  const totalPixels = mapWidth * mapHeight;
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  const boxes: OcrRawBox[] = [];

  const scaleX = origWidth / mapWidth;
  const scaleY = origHeight / mapHeight;

  for (let startIdx = 0; startIdx < totalPixels; startIdx++) {
    if (visited[startIdx] === 1 || probMap[startIdx] < binThreshold) {
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail++] = startIdx;
    visited[startIdx] = 1;

    let minX = mapWidth;
    let minY = mapHeight;
    let maxX = 0;
    let maxY = 0;
    let scoreSum = 0;
    let pixelCount = 0;

    while (head < tail) {
      const idx = queue[head++];
      const y = Math.floor(idx / mapWidth);
      const x = idx - y * mapWidth;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      scoreSum += probMap[idx];
      pixelCount += 1;

      if (x + 1 < mapWidth) {
        const right = idx + 1;
        if (visited[right] === 0 && probMap[right] >= binThreshold) {
          visited[right] = 1;
          queue[tail++] = right;
        }
      }
      if (x - 1 >= 0) {
        const left = idx - 1;
        if (visited[left] === 0 && probMap[left] >= binThreshold) {
          visited[left] = 1;
          queue[tail++] = left;
        }
      }
      if (y + 1 < mapHeight) {
        const down = idx + mapWidth;
        if (visited[down] === 0 && probMap[down] >= binThreshold) {
          visited[down] = 1;
          queue[tail++] = down;
        }
      }
      if (y - 1 >= 0) {
        const up = idx - mapWidth;
        if (visited[up] === 0 && probMap[up] >= binThreshold) {
          visited[up] = 1;
          queue[tail++] = up;
        }
      }
    }

    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    const meanScore = scoreSum / Math.max(1, pixelCount);

    if (pixelCount < minArea || boxW < 2 || boxH < 2 || meanScore < boxThreshold) {
      continue;
    }

    const perimeter = 2 * (boxW + boxH);
    const pad = perimeter > 0 ? (boxW * boxH * (unclipRatio - 1)) / perimeter : 0;

    const x0 = Math.max(0, Math.floor((minX - pad) * scaleX));
    const y0 = Math.max(0, Math.floor((minY - pad) * scaleY));
    const x1 = Math.min(origWidth, Math.ceil((maxX + 1 + pad) * scaleX));
    const y1 = Math.min(origHeight, Math.ceil((maxY + 1 + pad) * scaleY));

    if (x1 > x0 && y1 > y0) {
      boxes.push({
        bbox: [x0, y0, x1, y1],
        score: meanScore,
      });
    }
  }

  return boxes;
}

export function parseDictionary(dictText: string): string[] {
  const lines = dictText.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function softmaxProbAt(
  logits: Float32Array,
  offset: number,
  vocabSize: number,
  targetIdx: number
): number {
  let maxVal = Number.NEGATIVE_INFINITY;
  let sumVal = 0;
  let allProbLike = true;

  for (let c = 0; c < vocabSize; c++) {
    const val = logits[offset + c];
    if (val < 0 || val > 1.0001) {
      allProbLike = false;
    }
    sumVal += val;
    if (val > maxVal) {
      maxVal = val;
    }
  }

  if (allProbLike && Math.abs(sumVal - 1) < 0.02) {
    return Math.min(1, Math.max(0, logits[offset + targetIdx]));
  }

  let expSum = 0;
  for (let c = 0; c < vocabSize; c++) {
    expSum += Math.exp(logits[offset + c] - maxVal);
  }
  return expSum > 0 ? Math.exp(logits[offset + targetIdx] - maxVal) / expSum : 0;
}

export function decodeCtcOutput(
  logits: Float32Array,
  timeSteps: number,
  vocabSize: number,
  dict: readonly string[]
): { text: string; confidence: number } {
  if (timeSteps <= 0 || vocabSize <= 0 || logits.length < timeSteps * vocabSize) {
    return { text: "", confidence: 0 };
  }

  const chars: string[] = [];
  let confSum = 0;
  let confCount = 0;
  let prevIdx = -1;

  for (let t = 0; t < timeSteps; t++) {
    const offset = t * vocabSize;
    let bestIdx = 0;
    let bestVal = logits[offset];
    for (let c = 1; c < vocabSize; c++) {
      const val = logits[offset + c];
      if (val > bestVal) {
        bestVal = val;
        bestIdx = c;
      }
    }

    if (bestIdx !== 0 && bestIdx !== prevIdx) {
      const charIdx = bestIdx - 1;
      const mapped = charIdx < dict.length ? dict[charIdx] : charIdx === dict.length ? " " : "";
      if (mapped.length > 0) {
        chars.push(mapped);
        confSum += softmaxProbAt(logits, offset, vocabSize, bestIdx);
        confCount += 1;
      }
    }
    prevIdx = bestIdx;
  }

  return {
    text: chars.join("").trim(),
    confidence: confCount > 0 ? confSum / confCount : 0,
  };
}

interface LineFragment {
  bbox: [number, number, number, number];
  spans: OcrWordSpan[];
}

function normalizeBox(box: OcrRecognizedBox): OcrWordSpan | null {
  const trimmed = box.text.trim();
  if (trimmed.length === 0) return null;
  const x0 = Math.min(box.bbox[0], box.bbox[2]);
  const y0 = Math.min(box.bbox[1], box.bbox[3]);
  const x1 = Math.max(box.bbox[0], box.bbox[2]);
  const y1 = Math.max(box.bbox[1], box.bbox[3]);
  if (x1 <= x0 || y1 <= y0) return null;
  return {
    text: trimmed,
    bbox: [x0, y0, x1, y1],
    confidence: box.confidence,
  };
}

function canMergeIntoLine(
  a: [number, number, number, number],
  b: [number, number, number, number],
  maxGap: number
): boolean {
  const hA = a[3] - a[1];
  const hB = b[3] - b[1];
  const minH = Math.max(1, Math.min(hA, hB));
  const overlapY = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  const centerDiff = Math.abs((a[1] + a[3]) * 0.5 - (b[1] + b[3]) * 0.5);
  const sameLineY = overlapY >= minH * 0.4 || centerDiff <= minH * 0.45;
  if (!sameLineY) return false;

  const horizontalGap = Math.max(b[0] - a[2], a[0] - b[2]);
  return horizontalGap <= maxGap;
}

function mergeHorizontalFragments(spans: OcrWordSpan[], pageWidth: number): LineFragment[] {
  const sorted = [...spans].sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
  const lines: LineFragment[] = [];

  for (const span of sorted) {
    const spanHeight = span.bbox[3] - span.bbox[1];
    const maxGap = Math.max(spanHeight * 2.5, pageWidth * 0.08);
    let targetLine: LineFragment | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const line of lines) {
      if (canMergeIntoLine(line.bbox, span.bbox, maxGap)) {
        const dist = Math.abs(
          (line.bbox[1] + line.bbox[3]) * 0.5 - (span.bbox[1] + span.bbox[3]) * 0.5
        );
        if (dist < bestDist) {
          bestDist = dist;
          targetLine = line;
        }
      }
    }

    if (targetLine) {
      targetLine.spans.push(span);
      targetLine.bbox = [
        Math.min(targetLine.bbox[0], span.bbox[0]),
        Math.min(targetLine.bbox[1], span.bbox[1]),
        Math.max(targetLine.bbox[2], span.bbox[2]),
        Math.max(targetLine.bbox[3], span.bbox[3]),
      ];
    } else {
      lines.push({
        bbox: [...span.bbox] as [number, number, number, number],
        spans: [span],
      });
    }
  }

  for (const line of lines) {
    line.spans.sort((a, b) => a.bbox[0] - b.bbox[0] || a.bbox[1] - b.bbox[1]);
  }

  return lines;
}

function splitHorizontalBands(fragments: LineFragment[]): LineFragment[][] {
  const sorted = [...fragments].sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
  const bands: LineFragment[][] = [];
  let currentBand: LineFragment[] = [];
  let currentMaxY = Number.NEGATIVE_INFINITY;

  for (const frag of sorted) {
    if (currentBand.length === 0) {
      currentBand.push(frag);
      currentMaxY = frag.bbox[3];
      continue;
    }
    if (frag.bbox[1] >= currentMaxY - 1) {
      bands.push(currentBand);
      currentBand = [frag];
      currentMaxY = frag.bbox[3];
    } else {
      currentBand.push(frag);
      if (frag.bbox[3] > currentMaxY) {
        currentMaxY = frag.bbox[3];
      }
    }
  }
  if (currentBand.length > 0) {
    bands.push(currentBand);
  }
  return bands;
}

function splitVerticalColumns(fragments: LineFragment[], minGutterGap: number): LineFragment[][] {
  const sorted = [...fragments].sort((a, b) => a.bbox[0] - b.bbox[0] || a.bbox[1] - b.bbox[1]);
  const columns: LineFragment[][] = [];
  let currentCol: LineFragment[] = [];
  let currentMaxX = Number.NEGATIVE_INFINITY;

  for (const frag of sorted) {
    if (currentCol.length === 0) {
      currentCol.push(frag);
      currentMaxX = frag.bbox[2];
      continue;
    }
    if (frag.bbox[0] - currentMaxX >= minGutterGap) {
      columns.push(currentCol);
      currentCol = [frag];
      currentMaxX = frag.bbox[2];
    } else {
      currentCol.push(frag);
      if (frag.bbox[2] > currentMaxX) {
        currentMaxX = frag.bbox[2];
      }
    }
  }
  if (currentCol.length > 0) {
    columns.push(currentCol);
  }
  return columns;
}

function orderFragmentsXYCut(fragments: LineFragment[], minGutterGap: number): LineFragment[] {
  if (fragments.length <= 1) {
    return fragments;
  }

  const columns = splitVerticalColumns(fragments, minGutterGap);
  if (columns.length > 1) {
    const ordered: LineFragment[] = [];
    for (const col of columns) {
      const sortedCol = orderFragmentsXYCut(col, minGutterGap);
      for (const item of sortedCol) {
        ordered.push(item);
      }
    }
    return ordered;
  }

  const bands = splitHorizontalBands(fragments);
  if (bands.length <= 1) {
    return [...fragments].sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
  }

  const groupedBands: LineFragment[][] = [];
  for (const band of bands) {
    const prev = groupedBands[groupedBands.length - 1];
    const bandCols = splitVerticalColumns(band, minGutterGap);
    if (prev && bandCols.length > 1) {
      const candidate = [...prev, ...band];
      if (splitVerticalColumns(candidate, minGutterGap).length > 1) {
        groupedBands[groupedBands.length - 1] = candidate;
        continue;
      }
    }
    groupedBands.push(band);
  }

  const ordered: LineFragment[] = [];
  for (const group of groupedBands) {
    if (group.length === fragments.length) {
      const sorted = [...group].sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
      for (const item of sorted) {
        ordered.push(item);
      }
    } else {
      const sortedGroup = orderFragmentsXYCut(group, minGutterGap);
      for (const item of sortedGroup) {
        ordered.push(item);
      }
    }
  }
  return ordered;
}

function joinLineSpans(spans: readonly OcrWordSpan[]): string {
  if (spans.length === 0) return "";
  if (spans.length === 1) return spans[0].text;
  let result = spans[0].text;
  for (let i = 1; i < spans.length; i++) {
    const prev = result;
    const next = spans[i].text;
    const prevLast = prev.charAt(prev.length - 1);
    const nextFirst = next.charAt(0);
    const isCjkOrPunct =
      /[\u3000-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(prevLast) &&
      /[\u3000-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(nextFirst);
    result += isCjkOrPunct ? next : ` ${next}`;
  }
  return result;
}

export function sortAndGroupOcrBoxes(
  boxes: readonly OcrRecognizedBox[],
  pageWidth: number,
  _pageHeight: number
): OcrLineInput[] {
  const normalized: OcrWordSpan[] = [];
  for (const box of boxes) {
    const span = normalizeBox(box);
    if (span) {
      normalized.push(span);
    }
  }

  if (normalized.length === 0) {
    return [];
  }

  const fragments = mergeHorizontalFragments(normalized, pageWidth);
  const heights = fragments.map((f) => f.bbox[3] - f.bbox[1]).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] ?? 16;
  const minGutterGap = Math.max(medianHeight * 1.5, pageWidth * 0.04);

  const ordered = orderFragmentsXYCut(fragments, minGutterGap);

  return ordered.map((frag) => ({
    text: joinLineSpans(frag.spans),
    bbox: frag.bbox,
    spans: frag.spans,
  }));
}

export function buildOcrPageInput(
  pageNum: number,
  width: number,
  height: number,
  boxes: readonly OcrRecognizedBox[]
): OcrPageInput {
  return {
    pageNum,
    width,
    height,
    lines: sortAndGroupOcrBoxes(boxes, width, height),
  };
}
