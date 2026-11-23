import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createMemo } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { getStoredLanguageProfile } from "~/components/Modal/StepPresets";
import { safeRevokeBlobUrl } from "../../blob-utils";
import { createOcrClient, type OcrClientProgress, type OcrPageImageInput } from "../../ocr";
import type { AppState, ExtractedImage, UploadedBookFile } from "../../types";
import { injectOcrPages, parseBookFile, removeBookFileFromEngine } from "../../wasm-bridge";
import { flashStepSpinner } from "./ui.slice";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

function matchesDiscardedImage(src: string, discarded: ExtractedImage[]): boolean {
  if (!src) return false;
  for (const img of discarded) {
    if (img.url && src === img.url) {
      return true;
    }
    if (img.name) {
      if (
        src === img.name ||
        src.endsWith(`/${img.name}`) ||
        src.endsWith(`\\${img.name}`) ||
        src.includes(`/${img.name}?`) ||
        src.includes(`/${img.name}#`)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function filterDiscardedImages(html: string, images: ExtractedImage[]): string {
  if (!html || !images || images.length === 0) return html;
  const discarded = images.filter((img) => img.isDiscarded);
  if (discarded.length === 0) return html;
  if (typeof DOMParser === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgElements = Array.from(doc.body.querySelectorAll("img"));
  if (imgElements.length === 0) return html;

  let mutated = false;
  for (const imgEl of imgElements) {
    const src = imgEl.getAttribute("src") || "";
    if (!matchesDiscardedImage(src, discarded)) {
      continue;
    }

    const wrapper = imgEl.closest("div.full-illustration-wrap, div.inline-image, figure");
    if (wrapper && doc.body.contains(wrapper)) {
      wrapper.remove();
      mutated = true;
      continue;
    }

    const parent = imgEl.parentElement;
    if (
      parent &&
      parent.tagName === "P" &&
      parent.querySelectorAll("img").length === 1 &&
      !(parent.textContent || "").trim()
    ) {
      parent.remove();
      mutated = true;
      continue;
    }

    imgEl.remove();
    mutated = true;
  }

  return mutated ? doc.body.innerHTML : html;
}

export function createFilesSlice(
  state: AppState,
  setState: SetStoreFunction<AppState>,
  userEditedMetadata: Set<string>,
  applyAutoMetadataSuggestions: () => void
) {
  const hasReadyFiles = createMemo<boolean>(() => {
    return state.files.some((f) => f.status === "ready" && f.active);
  });

  async function addFiles(fileList: File[]): Promise<void> {
    const allowed = fileList.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "pdf" || ext === "epub";
    });

    if (allowed.length === 0) return;

    setState("isProcessing", true);
    for (let s = 3; s <= 8; s++) {
      setState("stepSpinners", s, true);
    }

    const newUploads: UploadedBookFile[] = allowed.map((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() as "pdf" | "epub";
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: f.name,
        extension: ext,
        size: f.size,
        active: true,
        status: "processing",
        progress: 25,
        sectionCount: 0,
        imageCount: 0,
        rawFile: f,
      };
    });

    setState("files", (prev) => [...prev, ...newUploads]);

    for (let i = 0; i < allowed.length; i++) {
      const f = allowed[i];
      const upFile = newUploads[i];

      try {
        const isPdf = f.name.toLowerCase().endsWith(".pdf") || f.type.includes("pdf");
        const blobUrl = isPdf ? URL.createObjectURL(f) : undefined;
        setState("files", (item) => item.id === upFile.id, "progress", 50);
        const payload = await parseBookFile(f, {
          language: getStoredLanguageProfile(),
          presetId: state.selectedPreset,
        });
        setState("files", (item) => item.id === upFile.id, "progress", 90);

        setState("files", (item) => item.id === upFile.id, {
          status: "ready",
          progress: 100,
          sectionCount: payload.groups.reduce((acc, g) => acc + g.sections.length, 0),
          imageCount: payload.images.length,
          pdfBlobUrl: blobUrl,
          needsOcr: Boolean(payload.needsOcr),
          scannedPageNumbers: payload.scannedPageNumbers ?? [],
        });

        setState("sectionGroups", (prev) => [...prev, ...payload.groups]);
        setState("images", (prev) => [...prev, ...payload.images]);
        const detectedCover = payload.images.find(
          (img) => img.type === "cover" && !img.isDiscarded
        );
        setState("metadata", (prev) => ({
          ...prev,
          title: userEditedMetadata.has("title")
            ? prev.title
            : payload.metadata.title || prev.title,
          author: payload.metadata.author || prev.author,
          illustrator: payload.metadata.illustrator || prev.illustrator,
          series: payload.metadata.series || prev.series,
          volume: userEditedMetadata.has("volume")
            ? prev.volume
            : payload.metadata.volume || prev.volume,
          language: payload.metadata.language || prev.language,
          publisher: payload.metadata.publisher?.trim() || prev.publisher,
          description: payload.metadata.description?.trim() || prev.description,
          coverUrl: prev.isCustomCover ? prev.coverUrl : detectedCover?.url || prev.coverUrl,
          coverImageName: prev.isCustomCover
            ? prev.coverImageName
            : detectedCover?.name || prev.coverImageName,
          originalCoverUrl: detectedCover?.url || prev.originalCoverUrl,
          originalCoverName: detectedCover?.name || prev.originalCoverName,
          hasCoverRemoved: false,
        }));
        setState("editorialRules", (prev) => {
          return prev.map((rule) => {
            const detected = payload.detectedRules.find((d) => d.id === rule.id);
            return detected
              ? { ...rule, affectedCount: rule.affectedCount + detected.affectedCount }
              : rule;
          });
        });
        setState("spellCorrections", (prev) => [...prev, ...payload.spellCorrections]);
        setState("spellVolumeSettings", upFile.name, true);
        setState("spellIgnoredJapaneseCount", (prev) => prev + (payload.ignoredJapaneseCount || 0));
        setState("spellIgnoredForeignCount", (prev) => prev + (payload.ignoredForeignCount || 0));
        setState(
          "spellIgnoredProperNounsCount",
          (prev) => prev + (payload.ignoredProperNounsCount || 0)
        );

        if (!state.activeSectionId && payload.groups[0]?.sections[0]) {
          setState("activeSectionId", payload.groups[0].sections[0].id);
        }
      } catch {
        setState("files", (item) => item.id === upFile.id, {
          status: "error",
          errorMessage: "Failed to extract contents",
        });
      }
    }

    applyAutoMetadataSuggestions();

    setState("isProcessing", false);
    for (let s = 3; s <= 8; s++) {
      setState("stepSpinners", s, false);
    }
  }

  function toggleFileActive(fileId: string): void {
    setState(
      "files",
      (f) => f.id === fileId,
      "active",
      (prev) => !prev
    );
    applyAutoMetadataSuggestions();
    flashStepSpinner(3);
  }

  function removeFile(fileId: string): void {
    const target = state.files.find((f) => f.id === fileId);
    if (!target) return;

    safeRevokeBlobUrl(target.pdfBlobUrl);
    const relatedImages = state.images.filter((img) => img.fileId === target.name);
    for (const img of relatedImages) {
      safeRevokeBlobUrl(img.url);
    }

    removeBookFileFromEngine(target.name);

    setState("files", (prev) => prev.filter((f) => f.id !== fileId));
    setState("sectionGroups", (prev) => prev.filter((g) => g.fileId !== target.name));
    setState("images", (prev) => prev.filter((img) => img.fileId !== target.name));
    setState("spellCorrections", (prev) => prev.filter((c) => c.fileId !== target.name));
    setState("spellVolumeSettings", (prev) => {
      const next = { ...prev };
      delete next[target.name];
      return next;
    });

    const remaining = state.sectionGroups.flatMap((g) => g.sections);
    if (remaining.length > 0 && !remaining.some((s) => s.id === state.activeSectionId)) {
      setState("activeSectionId", remaining[0].id);
    } else if (remaining.length === 0) {
      setState("activeSectionId", null);
      userEditedMetadata.clear();
    }

    applyAutoMetadataSuggestions();
  }

  function toggleImageDiscard(imageId: string): void {
    setState(
      "images",
      (img) => img.id === imageId,
      "isDiscarded",
      (prev) => !prev
    );
    flashStepSpinner(6);
  }

  function markImageDiscardedByUrl(url: string, isDiscarded: boolean): void {
    setState(
      "images",
      (img) => img.url === url || url.includes(img.name),
      "isDiscarded",
      isDiscarded
    );
    flashStepSpinner(6);
  }

  function toggleShowSpoilers(): void {
    setState("showSpoilers", (prev) => !prev);
  }

  function toggleDiscardTinyImages(): void {
    const anyDiscarded = state.images.some((img) => img.type === "tiled" && img.isDiscarded);
    setState("images", (img) => img.type === "tiled", "isDiscarded", !anyDiscarded);
    flashStepSpinner(6);
  }

  function discardTinyImages(): void {
    toggleDiscardTinyImages();
  }

  async function renderPdfPageToRgba(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number
  ): Promise<OcrPageImageInput> {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const width = Math.max(1, Math.round(viewport.width));
    const height = Math.max(1, Math.round(viewport.height));

    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to acquire 2D context for OCR rasterization");
      }
      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
        canvas: canvas as unknown as HTMLCanvasElement,
      }).promise;
      const imageData = ctx.getImageData(0, 0, width, height);
      return {
        pageNum,
        width,
        height,
        rgba: new Uint8ClampedArray(imageData.data),
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to acquire canvas context for OCR rasterization");
    }
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const imageData = ctx.getImageData(0, 0, width, height);
    return {
      pageNum,
      width,
      height,
      rgba: new Uint8ClampedArray(imageData.data),
    };
  }

  async function runOcrForFile(
    fileId: string,
    onProgress?: (progress: OcrClientProgress) => void
  ): Promise<void> {
    const target = state.files.find((f) => f.id === fileId);
    if (target?.extension !== "pdf") return;

    const pageNumbers = target.scannedPageNumbers ?? [];
    if (pageNumbers.length === 0) return;

    let pdfSource: ArrayBuffer | null = null;
    if (target.rawFile) {
      pdfSource = await target.rawFile.arrayBuffer();
    } else if (target.pdfBlobUrl) {
      const resp = await fetch(target.pdfBlobUrl);
      pdfSource = await resp.arrayBuffer();
    }
    if (!pdfSource) {
      throw new Error("Original PDF bytes are unavailable for OCR");
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfSource) });
    const pdfDoc = await loadingTask.promise;
    const client = createOcrClient();
    setState("isProcessing", true);

    try {
      const renderedPages: OcrPageImageInput[] = [];
      for (const pageNum of pageNumbers) {
        renderedPages.push(await renderPdfPageToRgba(pdfDoc, pageNum));
      }

      const ocrPages = await client.recognizePages(renderedPages, onProgress);
      const payload = await injectOcrPages(target.name, ocrPages, {
        language: getStoredLanguageProfile(),
        presetId: state.selectedPreset,
      });

      const oldUrlByName = new Map<string, string>();
      for (const img of state.images) {
        if (img.fileId === target.name && img.url) {
          oldUrlByName.set(img.name, img.url);
        }
      }
      const nextImages = payload.images.map((img) => ({
        ...img,
        url: img.url || oldUrlByName.get(img.name) || "",
      }));

      setState("sectionGroups", (prev) => [
        ...prev.filter((g) => g.fileId !== target.name),
        ...payload.groups,
      ]);
      setState("images", (prev) => [
        ...prev.filter((img) => img.fileId !== target.name),
        ...nextImages,
      ]);
      setState("spellCorrections", (prev) => [
        ...prev.filter((c) => c.fileId !== target.name),
        ...payload.spellCorrections,
      ]);
      setState("files", (item) => item.id === fileId, {
        needsOcr: false,
        scannedPageNumbers: [],
        sectionCount: payload.groups.reduce((acc, g) => acc + g.sections.length, 0),
        imageCount: nextImages.length,
      });

      if (payload.groups[0]?.sections[0]) {
        setState("activeSectionId", payload.groups[0].sections[0].id);
      }
      applyAutoMetadataSuggestions();
    } finally {
      await client.dispose();
      await loadingTask.destroy();
      setState("isProcessing", false);
    }
  }

  return {
    hasReadyFiles,
    addFiles,
    toggleFileActive,
    removeFile,
    toggleImageDiscard,
    markImageDiscardedByUrl,
    toggleShowSpoilers,
    toggleDiscardTinyImages,
    discardTinyImages,
    runOcrForFile,
  };
}
