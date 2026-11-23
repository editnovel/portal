import type * as pdfjsLib from "pdfjs-dist";

export interface SyncAnchor {
  pageNum: number;
  relY: number;
  editorElement: HTMLElement | null;
  snippet: string;
}

export interface SyncCheckpoint {
  pageNum: number;
  pdfY: number;
  editorFraction: number;
}

export interface ChapterPdfBounds {
  startPage: number;
  endPage: number;
  topY: number;
  bottomY: number;
}

export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-\s+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractPageAnchors(
  page: pdfjsLib.PDFPageProxy
): Promise<Array<{ text: string; relY: number }>> {
  try {
    const content = await page.getTextContent();
    if (!content.items || content.items.length === 0) return [];

    const viewport = page.getViewport({ scale: 1.0 });
    const textItems: Array<{ text: string; relY: number }> = [];

    for (const item of content.items) {
      if ("str" in item && typeof item.str === "string") {
        const trimmed = item.str.trim();
        if (!trimmed) continue;
        const relY = Math.max(0, Math.min(1, 1 - item.transform[5] / viewport.height));
        textItems.push({ text: trimmed, relY });
      }
    }

    if (textItems.length === 0) return [];

    textItems.sort((a, b) => a.relY - b.relY);

    const isNoise = (str: string) => {
      const t = str.trim();
      return /^\d+$/.test(t) || /^[-—–\s\d]+$/.test(t) || t.length < 3;
    };

    const validItems = textItems.filter((i) => !isNoise(i.text));
    if (validItems.length === 0) return [];

    const result: Array<{ text: string; relY: number }> = [];

    const topItems = validItems.slice(0, 3);
    result.push({
      text: topItems.map((i) => i.text).join(" "),
      relY: topItems[0].relY,
    });

    if (validItems.length >= 8) {
      const midIdx = Math.floor(validItems.length / 2);
      const midItems = validItems.slice(midIdx - 1, midIdx + 2);
      result.push({
        text: midItems.map((i) => i.text).join(" "),
        relY: midItems[0].relY,
      });
    }

    const bottomItems = validItems.slice(-3);
    result.push({
      text: bottomItems.map((i) => i.text).join(" "),
      relY: bottomItems[bottomItems.length - 1].relY,
    });

    return result;
  } catch {
    return [];
  }
}

export function matchSnippetInEditor(snippet: string, editorRoot: HTMLElement): HTMLElement | null {
  if (!snippet || !editorRoot) return null;

  const cleanSnippet = normalizeForMatching(snippet);
  const words = cleanSnippet.split(" ").filter((w) => w.length > 0);
  if (words.length === 0) return null;

  const probe5 = words.slice(0, 5).join(" ");
  const probe3 = words.slice(0, 3).join(" ");

  const blocks = editorRoot.querySelectorAll("p, h1, h2, h3, h4, blockquote, div.scene-break");
  let bestMatch: HTMLElement | null = null;
  let bestScore = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!(block instanceof HTMLElement)) continue;
    const text = block.textContent || "";
    if (!text.trim()) continue;

    const cleanBlock = normalizeForMatching(text);
    if (probe5 && cleanBlock.includes(probe5)) {
      return block;
    }
    if (probe3 && cleanBlock.includes(probe3) && !bestMatch) {
      bestMatch = block;
      bestScore = 0.8;
      continue;
    }

    let matches = 0;
    for (const w of words) {
      if (w.length > 2 && cleanBlock.includes(w)) {
        matches++;
      }
    }
    const score = matches / Math.max(1, words.length);
    if (score > 0.55 && score > bestScore) {
      bestScore = score;
      bestMatch = block;
    }
  }

  return bestMatch;
}

export async function buildChapterAnchors(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  startPage: number,
  endPage: number,
  editorRoot: HTMLElement
): Promise<SyncAnchor[]> {
  const anchors: SyncAnchor[] = [];
  const minPage = Math.max(1, startPage);
  const maxPage = Math.min(pdfDoc.numPages, Math.max(minPage, endPage));

  for (let p = minPage; p <= maxPage; p++) {
    try {
      const page = await pdfDoc.getPage(p);
      const rawAnchors = await extractPageAnchors(page);
      for (const raw of rawAnchors) {
        const el = matchSnippetInEditor(raw.text, editorRoot);
        anchors.push({
          pageNum: p,
          relY: raw.relY,
          editorElement: el,
          snippet: raw.text,
        });
      }
    } catch {}
  }

  return anchors;
}

export function resolveCheckpoints(
  anchors: SyncAnchor[],
  pdfContainer: HTMLElement,
  editorScrollContainer: HTMLElement,
  startPage: number,
  endPage: number
): { checkpoints: SyncCheckpoint[]; bounds: ChapterPdfBounds } {
  const minPage = Math.max(1, startPage);
  const maxPage = Math.max(minPage, endPage);

  const startEl = pdfContainer.querySelector(`[data-page-num="${minPage}"]`) as HTMLElement | null;
  const endEl = pdfContainer.querySelector(`[data-page-num="${maxPage}"]`) as HTMLElement | null;

  const topY = startEl ? startEl.offsetTop : 0;
  const bottomY = endEl ? endEl.offsetTop + endEl.offsetHeight : pdfContainer.scrollHeight;

  const bounds: ChapterPdfBounds = {
    startPage: minPage,
    endPage: maxPage,
    topY,
    bottomY,
  };

  const maxEditorScroll = Math.max(
    1,
    editorScrollContainer.scrollHeight - editorScrollContainer.clientHeight
  );

  const rawPoints: SyncCheckpoint[] = [{ pageNum: minPage, pdfY: topY, editorFraction: 0 }];

  for (const a of anchors) {
    if (!a.editorElement?.isConnected) continue;
    const pageEl = pdfContainer.querySelector(
      `[data-page-num="${a.pageNum}"]`
    ) as HTMLElement | null;
    if (!pageEl) continue;

    const pdfY = pageEl.offsetTop + pageEl.offsetHeight * a.relY;
    const editorFraction = Math.max(0, Math.min(1, a.editorElement.offsetTop / maxEditorScroll));

    rawPoints.push({
      pageNum: a.pageNum,
      pdfY,
      editorFraction,
    });
  }

  rawPoints.push({ pageNum: maxPage, pdfY: bottomY, editorFraction: 1 });

  rawPoints.sort((a, b) => a.pdfY - b.pdfY);

  const uniquePoints: SyncCheckpoint[] = [];
  for (const pt of rawPoints) {
    if (
      uniquePoints.length > 0 &&
      Math.abs(pt.pdfY - uniquePoints[uniquePoints.length - 1].pdfY) < 2
    ) {
      continue;
    }
    uniquePoints.push(pt);
  }

  for (let i = 1; i < uniquePoints.length; i++) {
    if (uniquePoints[i].editorFraction < uniquePoints[i - 1].editorFraction) {
      uniquePoints[i].editorFraction = uniquePoints[i - 1].editorFraction;
    }
  }

  return { checkpoints: uniquePoints, bounds };
}

export function pdfYToEditorFraction(
  pdfY: number,
  checkpoints: SyncCheckpoint[],
  bounds?: ChapterPdfBounds
): number {
  if (!checkpoints || checkpoints.length === 0) {
    if (bounds && bounds.bottomY > bounds.topY) {
      const frac = (pdfY - bounds.topY) / (bounds.bottomY - bounds.topY);
      return Math.max(0, Math.min(1, frac));
    }
    return 0;
  }

  if (pdfY <= checkpoints[0].pdfY) {
    return checkpoints[0].editorFraction;
  }
  const last = checkpoints[checkpoints.length - 1];
  if (pdfY >= last.pdfY) {
    return last.editorFraction;
  }

  for (let i = 0; i < checkpoints.length - 1; i++) {
    const cpA = checkpoints[i];
    const cpB = checkpoints[i + 1];
    if (pdfY >= cpA.pdfY && pdfY <= cpB.pdfY) {
      const span = cpB.pdfY - cpA.pdfY;
      if (span <= 0) return cpA.editorFraction;
      const t = (pdfY - cpA.pdfY) / span;
      return cpA.editorFraction + t * (cpB.editorFraction - cpA.editorFraction);
    }
  }

  return 0;
}

export function editorFractionToPdfY(
  editorFraction: number,
  checkpoints: SyncCheckpoint[],
  bounds?: ChapterPdfBounds
): number {
  const clamped = Math.max(0, Math.min(1, editorFraction));

  if (!checkpoints || checkpoints.length === 0) {
    if (bounds && bounds.bottomY > bounds.topY) {
      return bounds.topY + clamped * (bounds.bottomY - bounds.topY);
    }
    return 0;
  }

  if (clamped <= checkpoints[0].editorFraction) {
    return checkpoints[0].pdfY;
  }
  const last = checkpoints[checkpoints.length - 1];
  if (clamped >= last.editorFraction) {
    return last.pdfY;
  }

  for (let i = 0; i < checkpoints.length - 1; i++) {
    const cpA = checkpoints[i];
    const cpB = checkpoints[i + 1];
    if (clamped >= cpA.editorFraction && clamped <= cpB.editorFraction) {
      const span = cpB.editorFraction - cpA.editorFraction;
      if (span <= 0) return cpA.pdfY;
      const t = (clamped - cpA.editorFraction) / span;
      return cpA.pdfY + t * (cpB.pdfY - cpA.pdfY);
    }
  }

  return checkpoints[0].pdfY;
}
