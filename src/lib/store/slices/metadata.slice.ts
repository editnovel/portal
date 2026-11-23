import { batch } from "solid-js";
import { type SetStoreFunction } from "solid-js/store";
import { safeRevokeBlobUrl } from "../../blob-utils";
import { getImageDimensions } from "../../hardware-image";
import type { AppState, BookMetadata, ChapterSection, ExtractedImage } from "../../types";
import { clearCustomCoverBridge, setCustomCoverBridge } from "../../wasm-bridge";
import { flashStepSpinner, touchProject } from "./ui.slice";

export const INITIAL_METADATA: BookMetadata = {
  title: "Mi Novela",
  author: "Autor",
  illustrator: "",
  series: "",
  volume: "1",
  language: "es",
  publisher: "EditNovel",
  description: "Novela digital maquetada en EPUB 3.",
  isbn: "",
  publishedYear: "2026",
  copyrightNotice: "Todos los derechos reservados.",
  translator: "",
  coverUrl: "",
  coverImageName: "",
  originalCoverUrl: "",
  originalCoverName: "",
  isCustomCover: false,
  hasCoverRemoved: false,
};

export const userEditedMetadata = new Set<string>();

export let customCoverBlob: Blob | null = null;
export function setCustomCoverBlob(blob: Blob | null): void {
  customCoverBlob = blob;
}
export function getCustomCoverBlob(): Blob | null {
  return customCoverBlob;
}

export function createMetadataSlice(state: AppState, setState: SetStoreFunction<AppState>) {
  function updateMetadata<K extends keyof BookMetadata>(key: K, value: BookMetadata[K]): void {
    userEditedMetadata.add(key);
    setState("metadata", key, value);
    touchProject();
    flashStepSpinner(5);
  }

  function getDetectedCovers(): ExtractedImage[] {
    const seen = new Set<string>();
    const list: ExtractedImage[] = [];
    for (const img of state.images) {
      if (img.type === "cover" && img.id !== "img-custom-cover" && img.url && !seen.has(img.url)) {
        seen.add(img.url);
        list.push(img);
      }
    }
    return list;
  }

  function formatCoverLabel(img: ExtractedImage, index: number): string {
    if (img.fileId) {
      const volMatch = img.fileId.match(
        /(?:vol(?:umen|ume|\.)?|tom[oe]|book|libro|parte|part)\s*(\d+)/i
      );
      if (volMatch) {
        return `Volumen ${volMatch[1]}`;
      }
      const clean = img.fileId.replace(/\.[^/.]+$/, "").trim();
      if (clean) return clean;
    }
    return `Portada ${index + 1}`;
  }

  function suggestWorkTitle(): string {
    const seriesCandidates: string[] = [];
    const fileCandidates: string[] = [];

    for (const group of state.sectionGroups) {
      if (group.fileId) {
        fileCandidates.push(group.fileId);
      }
    }
    for (const file of state.files) {
      if (file.name) {
        fileCandidates.push(file.name);
      }
    }

    if (state.metadata.series && state.metadata.series.trim().length > 1) {
      seriesCandidates.push(state.metadata.series.trim());
    }

    const cleanCandidate = (str: string): string => {
      let s = str
        .replace(/\.(pdf|epub|mobi|azw3|txt)$/i, "")
        .replace(/[._]/g, " ")
        .trim();

      s = s.replace(
        /\s*[-–—:|~#]\s*(?:vol(?:umen|ume|\.)?|tom[oe]|book|libro|parte|part|v\.?)?\s*\d+.*$/i,
        ""
      );
      s = s.replace(
        /\s*[\(\[\{]\s*(?:vol(?:umen|ume|\.)?|tom[oe]|book|libro|parte|part|v\.?)?\s*\d+.*?[\)\]\}]\s*$/i,
        ""
      );
      s = s.replace(
        /\s+(?:vol(?:umen|ume|\.)?|tom[oe]|book|libro|parte|part)\.?\s*\d+.*$/i,
        ""
      );
      s = s.replace(/\s*[-–—:|~#]\s*\d+\s*$/i, "");
      s = s.replace(/[\s\-–—:_]+$/, "").trim();
      return s;
    };

    if (seriesCandidates.length > 0) {
      const s = cleanCandidate(seriesCandidates[0]);
      if (s.length > 2) {
        return s;
      }
    }

    const cleanedFiles = fileCandidates.map(cleanCandidate).filter((s) => s.length > 0);

    if (cleanedFiles.length === 0) {
      if (state.metadata.title) {
        return cleanCandidate(state.metadata.title);
      }
      return "";
    }

    if (cleanedFiles.length === 1) {
      return cleanedFiles[0];
    }

    const tokenizedList = cleanedFiles.map((f) => f.split(/\s+/).filter(Boolean));
    const firstTokens = tokenizedList[0];
    const commonTokens: string[] = [];

    for (let i = 0; i < firstTokens.length; i++) {
      const token = firstTokens[i].toLowerCase();
      const allMatch = tokenizedList.every(
        (tokens) => tokens[i] && tokens[i].toLowerCase() === token
      );
      if (allMatch) {
        commonTokens.push(firstTokens[i]);
      } else {
        break;
      }
    }

    if (commonTokens.length > 0) {
      const combined = commonTokens.join(" ");
      const cleaned = cleanCandidate(combined);
      if (cleaned.length > 2) {
        return cleaned;
      }
    }

    let commonPrefix = cleanedFiles[0];
    for (let i = 1; i < cleanedFiles.length; i++) {
      let j = 0;
      while (
        j < commonPrefix.length &&
        j < cleanedFiles[i].length &&
        commonPrefix[j].toLowerCase() === cleanedFiles[i][j].toLowerCase()
      ) {
        j++;
      }
      commonPrefix = commonPrefix.slice(0, j);
    }

    const finalPrefix = cleanCandidate(commonPrefix);
    if (finalPrefix.length > 2) {
      return finalPrefix;
    }

    return cleanedFiles[0];
  }

  function applyAutoMetadataSuggestions(): void {
    const activeReadyFiles = state.files.filter((f) => f.status === "ready" && f.active);
    const totalReadyFiles = state.files.filter((f) => f.status === "ready");
    const count = activeReadyFiles.length > 0 ? activeReadyFiles.length : totalReadyFiles.length;

    setState("metadata", (prev) => {
      const next = { ...prev };

      if (!userEditedMetadata.has("volume")) {
        if (count > 1) {
          next.volume = "";
        } else if (count === 1) {
          const singleFile = activeReadyFiles[0] || totalReadyFiles[0];
          if (singleFile) {
            const volMatch = singleFile.name.match(
              /(?:vol(?:umen|ume|\.)?|tom[oe]|book|libro|parte|part)\s*(\d+)/i
            );
            if (volMatch) {
              next.volume = `Volumen ${volMatch[1]}`;
            }
          }
        } else {
          next.volume = "";
        }
      }

      if (!userEditedMetadata.has("title")) {
        const suggested = suggestWorkTitle();
        if (suggested) {
          next.title = suggested;
        }
      }

      if (!prev.isCustomCover && !prev.hasCoverRemoved) {
        const covers = getDetectedCovers();
        if (covers.length > 0) {
          const lastCover = covers[covers.length - 1];
          next.coverUrl = lastCover.url;
          next.coverImageName = lastCover.name;
          next.originalCoverUrl = lastCover.url;
          next.originalCoverName = lastCover.name;
          next.hasCoverRemoved = false;
        }
      }

      return next;
    });
  }

  async function selectDetectedCover(img: ExtractedImage): Promise<void> {
    const url = img.url;
    const fileName = img.name;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
        await setCustomCoverBridge(fileName, ext, bytes);
      }
    } catch (err) {
      console.warn("Could not sync selected cover with WASM bridge:", err);
    }

    batch(() => {
      setState("metadata", (prev) => ({
        ...prev,
        coverUrl: url,
        coverImageName: fileName,
        originalCoverUrl: url,
        originalCoverName: fileName,
        isCustomCover: false,
        hasCoverRemoved: false,
      }));

      setState("images", (i) => i.id === img.id, "isDiscarded", false);
      customCoverBlob = null;
      touchProject();

      const coverHtml = `<div class="full-illustration-wrap"><img src="${url}" alt="Portada" class="full-illustration-img" /></div>`;
      setState("sectionGroups", (prevGroups) =>
        prevGroups.map((group) => {
          const coverSec = group.sections.find((s) => s.type === "cover" || s.id.endsWith("-cover"));
          if (coverSec) {
            return {
              ...group,
              sections: group.sections.map((s) =>
                s.id === coverSec.id ? { ...s, htmlContent: coverHtml } : s
              ),
            };
          }
          return group;
        })
      );
    });

    flashStepSpinner(5);
    flashStepSpinner(6);
  }

  function currentCoverInfo(): {
    url: string;
    name: string;
    isCustom: boolean;
    hasOriginal: boolean;
  } | null {
    const meta = state.metadata;
    if (meta.hasCoverRemoved) {
      return null;
    }
    if (meta.coverUrl) {
      return {
        url: meta.coverUrl,
        name: meta.coverImageName || "cover",
        isCustom: !!meta.isCustomCover,
        hasOriginal: !!meta.originalCoverUrl,
      };
    }
    const coverImg = state.images.find((img) => img.type === "cover" && !img.isDiscarded);
    if (coverImg && coverImg.url) {
      return {
        url: coverImg.url,
        name: coverImg.name,
        isCustom: false,
        hasOriginal: true,
      };
    }
    return null;
  }

  async function setCustomCoverImage(file: File): Promise<void> {
    if (state.metadata.isCustomCover && state.metadata.coverUrl) {
      safeRevokeBlobUrl(state.metadata.coverUrl);
    }
    customCoverBlob = file;
    const url = URL.createObjectURL(file);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const coverFileName = `custom_cover.${ext}`;

    let resolution = "Custom";
    try {
      const dims = await getImageDimensions(file);
      resolution = `${dims.width}x${dims.height}`;
    } catch {}

    await setCustomCoverBridge(coverFileName, ext, bytes);

    const prevCover = state.images.find((img) => img.type === "cover");
    const origUrl =
      state.metadata.originalCoverUrl ||
      (prevCover && !state.metadata.isCustomCover ? prevCover.url : "");
    const origName =
      state.metadata.originalCoverName ||
      (prevCover && !state.metadata.isCustomCover ? prevCover.name : "");

    batch(() => {
      setState("metadata", (prev) => ({
        ...prev,
        coverUrl: url,
        coverImageName: coverFileName,
        originalCoverUrl: origUrl || prev.originalCoverUrl,
        originalCoverName: origName || prev.originalCoverName,
        isCustomCover: true,
        hasCoverRemoved: false,
      }));

      const existingCoverIndex = state.images.findIndex((img) => img.type === "cover");
      const customImageItem: ExtractedImage = {
        id: "img-custom-cover",
        fileId: state.files[0]?.name || "manual",
        name: coverFileName,
        url,
        resolution,
        isDiscarded: false,
        type: "cover",
      };

      if (existingCoverIndex >= 0) {
        setState("images", existingCoverIndex, customImageItem);
      } else {
        setState("images", (prev) => [customImageItem, ...prev]);
      }

      const coverHtml = `<div class="full-illustration-wrap"><img src="${url}" alt="Portada" class="full-illustration-img" /></div>`;
      let coverFound = false;

      setState("sectionGroups", (prevGroups) =>
        prevGroups.map((group) => {
          const coverSec = group.sections.find((s) => s.type === "cover" || s.id.endsWith("-cover"));
          if (coverSec) {
            coverFound = true;
            return {
              ...group,
              sections: group.sections.map((s) =>
                s.id === coverSec.id ? { ...s, htmlContent: coverHtml } : s
              ),
            };
          }
          return group;
        })
      );

      if (!coverFound && state.sectionGroups.length > 0) {
        const firstGroup = state.sectionGroups[0];
        const newCoverSec: ChapterSection = {
          id: `sec-${firstGroup.fileId}-cover`,
          fileId: firstGroup.fileId,
          originalTitle: "Portada",
          title: "Portada",
          type: "cover",
          order: 0,
          htmlContent: coverHtml,
        };
        setState("sectionGroups", 0, "sections", (prev) => [
          newCoverSec,
          ...prev.map((s, idx) => ({ ...s, order: idx + 1 })),
        ]);
      }
      touchProject();
    });

    flashStepSpinner(5);
    flashStepSpinner(6);
  }

  async function removeCoverImage(): Promise<void> {
    await clearCustomCoverBridge();
    if (state.metadata.isCustomCover && state.metadata.coverUrl) {
      safeRevokeBlobUrl(state.metadata.coverUrl);
    }

    const prevCover = state.images.find((img) => img.type === "cover");
    const origUrl =
      state.metadata.originalCoverUrl ||
      (prevCover && !state.metadata.isCustomCover ? prevCover.url : "");
    const origName =
      state.metadata.originalCoverName ||
      (prevCover && !state.metadata.isCustomCover ? prevCover.name : "");

    batch(() => {
      setState("metadata", (prev) => ({
        ...prev,
        coverUrl: "",
        coverImageName: "",
        originalCoverUrl: origUrl || prev.originalCoverUrl,
        originalCoverName: origName || prev.originalCoverName,
        isCustomCover: false,
        hasCoverRemoved: true,
      }));

      setState("images", (img) => img.type === "cover", "isDiscarded", true);

      let activeCoverId: string | null = null;
      setState("sectionGroups", (prevGroups) =>
        prevGroups.map((group) => {
          const coverSec = group.sections.find((s) => s.type === "cover" || s.id.endsWith("-cover"));
          if (coverSec && state.activeSectionId === coverSec.id) {
            activeCoverId = coverSec.id;
          }
          return {
            ...group,
            sections: group.sections.filter((s) => s.type !== "cover" && !s.id.endsWith("-cover")),
          };
        })
      );

      if (activeCoverId) {
        const firstAvailable = state.sectionGroups[0]?.sections[0];
        if (firstAvailable) {
          setState("activeSectionId", firstAvailable.id);
        }
      }
      customCoverBlob = null;
      touchProject();
    });

    flashStepSpinner(5);
    flashStepSpinner(6);
  }

  async function restoreOriginalCoverImage(): Promise<void> {
    const origUrl = state.metadata.originalCoverUrl;
    const origName = state.metadata.originalCoverName || "cover.jpg";
    if (!origUrl) return;

    customCoverBlob = null;
    await clearCustomCoverBridge();

    batch(() => {
      setState("metadata", (prev) => ({
        ...prev,
        coverUrl: origUrl,
        coverImageName: origName,
        isCustomCover: false,
        hasCoverRemoved: false,
      }));

      const origImageItem: ExtractedImage = {
        id: "img-restored-cover",
        fileId: state.files[0]?.name || "manual",
        name: origName,
        url: origUrl,
        resolution: "Original",
        isDiscarded: false,
        type: "cover",
      };

      const existingCoverIndex = state.images.findIndex((img) => img.type === "cover");
      if (existingCoverIndex >= 0) {
        setState("images", existingCoverIndex, origImageItem);
      } else {
        setState("images", (prev) => [origImageItem, ...prev]);
      }

      const coverHtml = `<div class="full-illustration-wrap"><img src="${origUrl}" alt="Portada" class="full-illustration-img" /></div>`;
      let coverFound = false;

      setState("sectionGroups", (prevGroups) =>
        prevGroups.map((group) => {
          const coverSec = group.sections.find((s) => s.type === "cover" || s.id.endsWith("-cover"));
          if (coverSec) {
            coverFound = true;
            return {
              ...group,
              sections: group.sections.map((s) =>
                s.id === coverSec.id ? { ...s, htmlContent: coverHtml } : s
              ),
            };
          }
          return group;
        })
      );

      if (!coverFound && state.sectionGroups.length > 0) {
        const firstGroup = state.sectionGroups[0];
        const newCoverSec: ChapterSection = {
          id: `sec-${firstGroup.fileId}-cover`,
          fileId: firstGroup.fileId,
          originalTitle: "Portada",
          title: "Portada",
          type: "cover",
          order: 0,
          htmlContent: coverHtml,
        };
        setState("sectionGroups", 0, "sections", (prev) => [
          newCoverSec,
          ...prev.map((s, idx) => ({ ...s, order: idx + 1 })),
        ]);
      }
      touchProject();
    });

    flashStepSpinner(5);
    flashStepSpinner(6);
  }

  return {
    updateMetadata,
    getDetectedCovers,
    formatCoverLabel,
    suggestWorkTitle,
    applyAutoMetadataSuggestions,
    selectDetectedCover,
    currentCoverInfo,
    setCustomCoverImage,
    removeCoverImage,
    restoreOriginalCoverImage,
  };
}
