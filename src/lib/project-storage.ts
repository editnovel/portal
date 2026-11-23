import Dexie, { type Table } from "dexie";
import { unwrap } from "solid-js/store";
import {
  activeRawSection,
  activeSection,
  addFiles,
  cancelPendingAutoSave,
  exportCurrentEpub,
  getCustomCoverBlob,
  setCustomCoverBlob,
  setState,
  state,
  userEditedMetadata,
} from "./store";
import type {
  BookMetadata,
  EditorialRule,
  ExtractedImage,
  FileSectionGroup,
  GlossaryReplacement,
  ModalStepId,
  PresetId,
  ReaderSettings,
  RegexRule,
  SpellCorrectionItem,
  UploadedBookFile,
} from "./types";
import { parseBookFile, setCustomCoverBridge } from "./wasm-bridge";
import { compressString, decompressToString } from "./compression";
import {
  clearOpfsStorage,
  deleteFileFromOpfs,
  isOpfsSupported,
  readFileFromOpfs,
  saveFileToOpfs,
} from "./opfs-storage";

export interface StoredProjectRecord {
  id: string;
  timestamp: number;
  metadata: BookMetadata;
  sectionGroups: FileSectionGroup[];
  activeSectionId: string | null;
  images: ExtractedImage[];
  editorialRules: EditorialRule[];
  regexRules: RegexRule[];
  glossary: GlossaryReplacement[];
  readerSettings: ReaderSettings;
  spellCorrections: SpellCorrectionItem[];
  spellIgnoredWords: string[];
  spellLanguageMode: "hybrid" | "es" | "en";
  spellIgnoreJapanese: boolean;
  spellIgnoreForeign: boolean;
  spellIgnoreProperNouns: boolean;
  unifyBreaks: boolean;
  unifiedBreakSymbol: string;
  unifyDialogue: boolean;
  unifiedDialogueSymbol: string;
  unifyQuotes: boolean;
  unifiedQuoteSymbol: string;
  unifyEllipsis: boolean;
  unifiedEllipsisSymbol: string;
  filesMeta: Array<{
    id: string;
    name: string;
    size: number;
    extension: "pdf" | "epub";
    status: "idle" | "processing" | "ready" | "error";
    progress: number;
    sectionCount: number;
    imageCount: number;
    active: boolean;
  }>;
  selectedPreset?: PresetId;
  currentStep?: ModalStepId;
  globalSpellEnabled?: boolean;
  spellVolumeSettings?: Record<string, boolean>;
  userEditedMetadataKeys?: string[];
  showSpoilers?: boolean;
}

export interface StoredFileRecord {
  id: string;
  name: string;
  type: string;
  blob: Blob;
}

class EditNovelDatabase extends Dexie {
  projects!: Table<StoredProjectRecord, string>;
  files!: Table<StoredFileRecord, string>;

  constructor() {
    super("EditNovelDatabase");
    this.version(1).stores({
      projects: "id, timestamp",
      files: "id, name",
    });
  }
}

export const db = new EditNovelDatabase();

export async function saveProjectToIndexedDB(): Promise<number> {
  if (state.files.length === 0 && state.sectionGroups.length === 0) {
    return 0;
  }

  const timestamp = Date.now();

  const filesMeta = state.files.map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size,
    extension: f.extension,
    status: f.status,
    progress: f.progress,
    sectionCount: f.sectionCount,
    imageCount: f.imageCount,
    active: f.active,
  }));

  const currentFileIds = new Set(state.files.map((f) => f.id));
  const storedFileKeys = new Set(await db.files.toCollection().primaryKeys());

  for (const f of state.files) {
    if (f.rawFile && !storedFileKeys.has(f.id)) {
      if (isOpfsSupported()) {
        void saveFileToOpfs(f.id, f.rawFile);
      }
      await db.files.put({
        id: f.id,
        name: f.name,
        type: f.extension === "pdf" ? "application/pdf" : "application/epub+zip",
        blob: f.rawFile,
      });
      storedFileKeys.add(f.id);
    }
  }

  const customCover = getCustomCoverBlob();
  if (customCover && state.metadata.isCustomCover) {
    currentFileIds.add("__custom_cover__");
    if (!storedFileKeys.has("__custom_cover__")) {
      if (isOpfsSupported()) {
        void saveFileToOpfs("__custom_cover__", customCover);
      }
      await db.files.put({
        id: "__custom_cover__",
        name: state.metadata.coverImageName || "custom_cover.jpg",
        type: customCover.type || "image/jpeg",
        blob: customCover,
      });
      storedFileKeys.add("__custom_cover__");
    }
  } else {
    await db.files.delete("__custom_cover__");
    if (isOpfsSupported()) {
      void deleteFileFromOpfs("__custom_cover__");
    }
    storedFileKeys.delete("__custom_cover__");
  }

  for (const sfId of storedFileKeys) {
    if (!currentFileIds.has(sfId)) {
      await db.files.delete(sfId);
      if (isOpfsSupported()) {
        void deleteFileFromOpfs(sfId);
      }
    }
  }

  const record: StoredProjectRecord = {
    id: "current_project",
    timestamp,
    metadata: { ...state.metadata },
    sectionGroups: state.sectionGroups,
    activeSectionId: state.activeSectionId,
    images: state.images,
    editorialRules: state.editorialRules,
    regexRules: state.regexRules,
    glossary: state.glossary,
    readerSettings: { ...state.readerSettings },
    spellCorrections: state.spellCorrections,
    spellIgnoredWords: [...state.spellIgnoredWords],
    spellLanguageMode: state.spellLanguageMode,
    spellIgnoreJapanese: state.spellIgnoreJapanese,
    spellIgnoreForeign: state.spellIgnoreForeign,
    spellIgnoreProperNouns: state.spellIgnoreProperNouns,
    unifyBreaks: state.unifyBreaks,
    unifiedBreakSymbol: state.unifiedBreakSymbol,
    unifyDialogue: state.unifyDialogue,
    unifiedDialogueSymbol: state.unifiedDialogueSymbol,
    unifyQuotes: state.unifyQuotes,
    unifiedQuoteSymbol: state.unifiedQuoteSymbol,
    unifyEllipsis: state.unifyEllipsis,
    unifiedEllipsisSymbol: state.unifiedEllipsisSymbol,
    filesMeta,
    selectedPreset: state.selectedPreset,
    currentStep: state.currentStep,
    globalSpellEnabled: state.globalSpellEnabled,
    spellVolumeSettings: { ...state.spellVolumeSettings },
    userEditedMetadataKeys: Array.from(userEditedMetadata),
    showSpoilers: state.showSpoilers,
  };

  await db.projects.put(unwrap(record));
  setState("lastSavedTimestamp", timestamp);
  return timestamp;
}

export async function getSavedProjectMeta(): Promise<{
  title: string;
  timestamp: number;
  fileCount: number;
} | null> {
  try {
    const record = await db.projects.get("current_project");
    if (!record) return null;
    return {
      title: record.metadata.title || "Sin título",
      timestamp: record.timestamp,
      fileCount: record.filesMeta.length,
    };
  } catch {
    return null;
  }
}

export async function clearSavedProjectFromIndexedDB(): Promise<void> {
  cancelPendingAutoSave();
  await db.projects.delete("current_project");
  await db.files.clear();
  if (isOpfsSupported()) {
    void clearOpfsStorage();
  }
  setCustomCoverBlob(null);
  setState("lastSavedTimestamp", null);
}

export async function restoreProjectFromIndexedDB(): Promise<boolean> {
  try {
    const record = await db.projects.get("current_project");
    if (!record) return false;

    const storedFiles = await db.files.toArray();
    const bookStoredFiles = storedFiles.filter((sf) => sf.id !== "__custom_cover__");
    if (bookStoredFiles.length === 0 && record.filesMeta.length > 0) return false;

    setState("isProcessing", true);

    const imageBlobMap = new Map<string, string>();
    for (const sf of bookStoredFiles) {
      let fileBlob: Blob = sf.blob;
      if (isOpfsSupported()) {
        const opfsFile = await readFileFromOpfs(sf.id);
        if (opfsFile) {
          fileBlob = opfsFile;
        }
      }
      const fileObj = new File([fileBlob], sf.name, { type: sf.type });
      const payload = await parseBookFile(fileObj);
      for (const img of payload.images) {
        if (img.url) {
          imageBlobMap.set(img.name, img.url);
        }
      }
    }

    const customCoverRecord = storedFiles.find((sf) => sf.id === "__custom_cover__");
    if (customCoverRecord && record.metadata.isCustomCover) {
      let blob: Blob = customCoverRecord.blob;
      if (isOpfsSupported()) {
        const opfsCover = await readFileFromOpfs("__custom_cover__");
        if (opfsCover) {
          blob = opfsCover;
        }
      }
      setCustomCoverBlob(blob);
      const newCoverUrl = URL.createObjectURL(blob);
      const ext = customCoverRecord.name.split(".").pop()?.toLowerCase() || "jpg";
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await setCustomCoverBridge(customCoverRecord.name, ext, bytes);
      record.metadata.coverUrl = newCoverUrl;
    }

    const restoredImages: ExtractedImage[] = record.images.map((img) => {
      if (img.id === "img-custom-cover" && record.metadata.coverUrl) {
        return { ...img, url: record.metadata.coverUrl };
      }
      const freshUrl = imageBlobMap.get(img.name);
      return {
        ...img,
        url: freshUrl || img.url,
      };
    });

    const restoredSectionGroups: FileSectionGroup[] = record.sectionGroups.map((g) => ({
      ...g,
      sections: g.sections.map((s) => {
        let content = s.htmlContent;
        if (s.type === "cover" && record.metadata.coverUrl) {
          content = `<div class="full-illustration-wrap"><img src="${record.metadata.coverUrl}" alt="Portada" class="full-illustration-img" /></div>`;
        } else {
          for (const img of restoredImages) {
            if (img.url) {
              content = content.split(`../Images/${img.name}`).join(img.url);
            }
          }
          for (let i = 0; i < record.images.length; i++) {
            const oldUrl = record.images[i]?.url;
            const newUrl = restoredImages[i]?.url;
            if (oldUrl && newUrl && oldUrl !== newUrl) {
              content = content.split(oldUrl).join(newUrl);
            }
          }
        }
        return { ...s, htmlContent: content };
      }),
    }));

    const restoredUploads: UploadedBookFile[] = record.filesMeta.map((fm) => {
      const sf = bookStoredFiles.find((s) => s.id === fm.id || s.name === fm.name);
      const isPdf = fm.extension === "pdf";
      const blobUrl = isPdf && sf ? URL.createObjectURL(sf.blob) : undefined;

      return {
        id: fm.id,
        name: fm.name,
        extension: fm.extension,
        size: fm.size,
        active: fm.active,
        status: "ready",
        progress: 100,
        sectionCount: fm.sectionCount,
        imageCount: fm.imageCount,
        pdfBlobUrl: blobUrl,
        rawFile: sf ? sf.blob : undefined,
      };
    });

    setState("files", restoredUploads);
    setState("metadata", record.metadata);
    setState("sectionGroups", restoredSectionGroups);
    setState("images", restoredImages);
    setState("spellCorrections", record.spellCorrections);
    setState("spellIgnoredWords", record.spellIgnoredWords);
    setState("spellLanguageMode", record.spellLanguageMode);
    setState("spellIgnoreJapanese", record.spellIgnoreJapanese);
    setState("spellIgnoreForeign", record.spellIgnoreForeign);
    setState("spellIgnoreProperNouns", record.spellIgnoreProperNouns);
    setState("editorialRules", record.editorialRules);
    setState("regexRules", record.regexRules);
    setState("glossary", record.glossary);
    setState("readerSettings", record.readerSettings);
    setState("unifyBreaks", record.unifyBreaks);
    setState("unifiedBreakSymbol", record.unifiedBreakSymbol);
    setState("unifyDialogue", record.unifyDialogue);
    setState("unifiedDialogueSymbol", record.unifiedDialogueSymbol);
    setState("unifyQuotes", record.unifyQuotes);
    setState("unifiedQuoteSymbol", record.unifiedQuoteSymbol);
    setState("unifyEllipsis", record.unifyEllipsis);
    setState("unifiedEllipsisSymbol", record.unifiedEllipsisSymbol);
    if (record.selectedPreset) setState("selectedPreset", record.selectedPreset);
    if (record.currentStep) setState("currentStep", record.currentStep);
    if (record.globalSpellEnabled !== undefined) setState("globalSpellEnabled", record.globalSpellEnabled);
    if (record.spellVolumeSettings) setState("spellVolumeSettings", record.spellVolumeSettings);
    if (record.showSpoilers !== undefined) setState("showSpoilers", record.showSpoilers);
    if (record.userEditedMetadataKeys) {
      userEditedMetadata.clear();
      for (const k of record.userEditedMetadataKeys) {
        userEditedMetadata.add(k);
      }
    }
    setState("activeSectionId", record.activeSectionId || restoredSectionGroups[0]?.sections[0]?.id || null);
    setState("lastSavedTimestamp", record.timestamp);
    setState("isProcessing", false);

    return true;
  } catch (err) {
    setState("isProcessing", false);
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result;
      if (typeof res === "string") {
        resolve(res);
      } else {
        reject(new Error("Failed to read blob"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const arr = base64.split(",");
  const bstr = atob(arr[1] || arr[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mimeType });
}

export async function exportProjectFile(): Promise<void> {
  await saveProjectToIndexedDB();

  const record = await db.projects.get("current_project");
  if (!record) return;

  const storedFiles = await db.files.toArray();
  const serializedFiles: Array<{ id: string; name: string; type: string; dataUrl: string }> = [];

  for (const f of storedFiles) {
    const dataUrl = await blobToBase64(f.blob);
    serializedFiles.push({
      id: f.id,
      name: f.name,
      type: f.type,
      dataUrl,
    });
  }

  const exportPayload = {
    version: 1,
    app: "editnovel",
    timestamp: Date.now(),
    project: record,
    files: serializedFiles,
  };

  const jsonString = JSON.stringify(exportPayload);
  const compressedBytes = await compressString(jsonString);
  const blob = new Blob([compressedBytes as unknown as BlobPart], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeTitle = (state.metadata.title || "proyecto").replace(/[\/\\:*?"<>|]/g, "_").trim();
  a.download = `${safeTitle}.editnovel`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importProjectFile(file: File): Promise<boolean> {
  try {
    let text: string;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      text = await decompressToString(bytes);
    } else {
      text = new TextDecoder().decode(bytes);
    }
    const payload = JSON.parse(text);

    if (payload.app !== "editnovel" || !payload.project || !Array.isArray(payload.files)) {
      throw new Error("Formato de archivo no válido");
    }

    await clearSavedProjectFromIndexedDB();

    for (const sf of payload.files) {
      const blob = base64ToBlob(sf.dataUrl, sf.type);
      await db.files.put({
        id: sf.id,
        name: sf.name,
        type: sf.type,
        blob,
      });
    }

    await db.projects.put({
      ...payload.project,
      id: "current_project",
      timestamp: Date.now(),
    });

    return await restoreProjectFromIndexedDB();
  } catch {
    return false;
  }
}
