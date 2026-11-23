import { createMemo } from "solid-js";
import { type SetStoreFunction } from "solid-js/store";
import { safeRevokeBlobUrl } from "../../blob-utils";
import type { AppState, ExtractedImage, UploadedBookFile } from "../../types";
import { parseBookFile, removeBookFileFromEngine } from "../../wasm-bridge";
import { flashStepSpinner } from "./ui.slice";

export function filterDiscardedImages(html: string, images: ExtractedImage[]): string {
  if (!html || !images || images.length === 0) return html;
  const discarded = images.filter((img) => img.isDiscarded);
  if (discarded.length === 0) return html;

  let result = html;
  for (const img of discarded) {
    const patterns: string[] = [];
    if (img.url) {
      patterns.push(img.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
    if (img.name) {
      const escName = img.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      patterns.push(`[^"']*(?:^|[\\/])${escName}(?:[?#][^"']*)?`);
    }

    for (const pat of patterns) {
      const srcAttr = `src=["']${pat}["']`;

      const wrapRegex = new RegExp(
        `<div[^>]*class=["'][^"']*(?:full-illustration-wrap|inline-image)[^"']*["'][^>]*>[\\s\\S]*?<img[^>]*${srcAttr}[^>]*>[\\s\\S]*?<\\/div>`,
        "gi"
      );
      result = result.replace(wrapRegex, "");

      const figRegex = new RegExp(
        `<figure[^>]*>[\\s\\S]*?<img[^>]*${srcAttr}[^>]*>[\\s\\S]*?<\\/figure>`,
        "gi"
      );
      result = result.replace(figRegex, "");

      const pRegex = new RegExp(`<p[^>]*>\\s*<img[^>]*${srcAttr}[^>]*>\\s*<\\/p>`, "gi");
      result = result.replace(pRegex, "");

      const imgRegex = new RegExp(`<img[^>]*${srcAttr}[^>]*>`, "gi");
      result = result.replace(imgRegex, "");
    }
  }
  return result;
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
        const payload = await parseBookFile(f);
        setState("files", (item) => item.id === upFile.id, "progress", 90);

        setState("files", (item) => item.id === upFile.id, {
          status: "ready",
          progress: 100,
          sectionCount: payload.groups.reduce((acc, g) => acc + g.sections.length, 0),
          imageCount: payload.images.length,
          pdfBlobUrl: blobUrl,
        });

        setState("sectionGroups", (prev) => [...prev, ...payload.groups]);
        setState("images", (prev) => [...prev, ...payload.images]);
        const detectedCover = payload.images.find((img) => img.type === "cover" && !img.isDiscarded);
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
  };
}
