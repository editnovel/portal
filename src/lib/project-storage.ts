import Dexie, { type Table } from "dexie";
import {
  strFromU8,
  strToU8,
  Unzip,
  UnzipInflate,
  UnzipPassThrough,
  Zip,
  ZipDeflate,
  ZipPassThrough,
} from "fflate";
import { unwrap } from "solid-js/store";
import { compressBrotli, decompressBrotli, decompressToString, isGzipBytes } from "./compression";
import { OPFS_DIRS } from "./opfs-keys";
import {
  buildImageOpfsKey,
  clearOpfsStorage,
  deleteFileFromOpfs,
  isOpfsSupported,
  listOpfsImageKeys,
  readFileFromOpfs,
  readImageFromOpfs,
  saveFileToOpfs,
  saveImageToOpfs,
} from "./opfs-storage";
import { DEFAULT_READER_SETTINGS } from "./reader-settings";
import {
  cancelPendingAutoSave,
  getCustomCoverBlob,
  setCustomCoverBlob,
  setState,
  state,
  userEditedMetadata,
} from "./store";
import type {
  BookMetadata,
  ChapterSection,
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

const CUSTOM_COVER_FILE_ID = "__custom_cover__";
const IMAGE_DB_PREFIX = "__img__";

export interface StoredFileMeta {
  id: string;
  name: string;
  size: number;
  extension: "pdf" | "epub";
  status: "idle" | "processing" | "ready" | "error";
  progress: number;
  sectionCount: number;
  imageCount: number;
  active: boolean;
}

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
  filesMeta: StoredFileMeta[];
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

export interface ExportProjectOptions {
  includeSources?: boolean;
}

interface EditNovelV2SourceEntry {
  id: string;
  name: string;
  size: number;
  extension: "pdf" | "epub";
  active: boolean;
  sectionCount: number;
  imageCount: number;
  path?: string;
}

interface EditNovelV2Manifest {
  format: "editnovel";
  version: 2;
  app: "editnovel";
  createdAt: string;
  timestamp: number;
  createdBy: "human" | "agent" | "hybrid";
  profile: string;
  metadata: BookMetadata;
  provenance: {
    sourceApp: string;
    exportedAt: string;
  };
  validationReport: {
    valid: boolean;
    warnings: string[];
    errors: string[];
  };
  sources: EditNovelV2SourceEntry[];
}

interface EditNovelV2TreeSection {
  id: string;
  fileId: string;
  originalTitle: string;
  title: string;
  type: ChapterSection["type"];
  order: number;
  startPage?: number;
  endPage?: number;
  path: string;
}

interface EditNovelV2TreeGroup {
  fileId: string;
  fileName: string;
  collapsed: boolean;
  sections: EditNovelV2TreeSection[];
}

interface EditNovelV2Tree {
  groups: EditNovelV2TreeGroup[];
}

interface EditNovelV2MediaItem {
  id: string;
  fileId: string;
  name: string;
  path: string;
  mimeType: string;
  resolution: string;
  isDiscarded: boolean;
  status: "keep" | "discard" | "uncertain";
  type: ExtractedImage["type"];
  reason?: string;
  altText?: string;
  decorative?: boolean;
}

interface EditNovelV2EditorialRules {
  editorialRules: EditorialRule[];
  regexRules: RegexRule[];
  glossary: GlossaryReplacement[];
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
  globalSpellEnabled?: boolean;
  spellVolumeSettings?: Record<string, boolean>;
}

interface EditNovelV2UiState {
  activeSectionId: string | null;
  readerSettings: ReaderSettings;
  selectedPreset?: PresetId;
  currentStep?: ModalStepId;
  userEditedMetadataKeys?: string[];
  showSpoilers?: boolean;
  filesMeta?: StoredFileMeta[];
}

interface LegacySerializedFile {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
}

interface LegacyExportPayload {
  version?: number;
  app: string;
  project: StoredProjectRecord;
  files: LegacySerializedFile[];
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

function getImageMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "avif") return "image/avif";
  return "image/jpeg";
}

function sanitizeArchiveSegment(segment: string): string {
  const cleaned = segment.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "item";
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapSectionXhtml(title: string, bodyHtml: string): string {
  const safeTitle = escapeXmlText(title || "Section");
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<html xmlns="http://www.w3.org/1999/xhtml">',
    "<head>",
    `<title>${safeTitle}</title>`,
    "</head>",
    "<body>",
    bodyHtml,
    "</body>",
    "</html>",
  ].join("\n");
}

function extractBodyFromXhtml(xhtml: string): string {
  const match = xhtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (match && typeof match[1] === "string") {
    return match[1].trim();
  }
  return xhtml;
}

function makeImageCompositeKey(fileId: string, name: string): string {
  return `${fileId}::${name}`;
}

async function fetchBlobFromLocalUrl(url: string): Promise<Blob | null> {
  if (!url || (!url.startsWith("blob:") && !url.startsWith("data:"))) {
    return null;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

async function pushBlobToZipEntry(entry: ZipPassThrough | ZipDeflate, blob: Blob): Promise<void> {
  if (typeof blob.stream === "function") {
    const reader = blob.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        entry.push(new Uint8Array(0), true);
        break;
      }
      if (value && value.byteLength > 0) {
        entry.push(value, false);
      }
    }
    return;
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  entry.push(bytes, true);
}

function addDeflatedTextEntry(zip: Zip, path: string, content: string): void {
  const entry = new ZipDeflate(path, { level: 6 });
  zip.add(entry);
  entry.push(strToU8(content), true);
}

async function addStoredBlobEntry(zip: Zip, path: string, blob: Blob): Promise<void> {
  const entry = new ZipPassThrough(path);
  zip.add(entry);
  await pushBlobToZipEntry(entry, blob);
}

async function createStreamingZipBlob(writer: (zip: Zip) => Promise<void>): Promise<Blob> {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let zipError: Error | null = null;
  const zip = new Zip((err, data, _final) => {
    if (err) {
      zipError = err;
      return;
    }
    if (data && data.byteLength > 0) {
      chunks.push(new Uint8Array(data));
    }
  });
  await writer(zip);
  zip.end();
  if (zipError) {
    throw zipError;
  }
  return new Blob(chunks, { type: "application/octet-stream" });
}

async function extractZipEntries(file: File): Promise<Map<string, Uint8Array>> {
  const entries = new Map<string, Uint8Array>();
  let extractError: Error | null = null;
  const unzipper = new Unzip((entry) => {
    if (entry.name.endsWith("/")) return;
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    entry.ondata = (err, data, final) => {
      if (err) {
        extractError = err;
        return;
      }
      if (data && data.byteLength > 0) {
        chunks.push(data);
        totalLength += data.byteLength;
      }
      if (final) {
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.byteLength;
        }
        entries.set(entry.name.replace(/\\/g, "/"), merged);
      }
    };
    entry.start();
  });
  unzipper.register(UnzipPassThrough);
  unzipper.register(UnzipInflate);

  if (typeof file.stream === "function") {
    const reader = file.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        unzipper.push(new Uint8Array(0), true);
        break;
      }
      if (value && value.byteLength > 0) {
        unzipper.push(value, false);
      }
    }
  } else {
    const bytes = new Uint8Array(await file.arrayBuffer());
    unzipper.push(bytes, true);
  }

  if (extractError) {
    throw extractError;
  }
  return entries;
}

async function readZipTextEntry(
  entries: Map<string, Uint8Array>,
  path: string
): Promise<string | null> {
  const plain = entries.get(path);
  if (plain) {
    return strFromU8(plain);
  }
  const brotli = entries.get(`${path}.br`);
  if (brotli) {
    const decompressed = await decompressBrotli(brotli);
    return strFromU8(decompressed);
  }
  return null;
}

async function readZipJsonEntry<T>(
  entries: Map<string, Uint8Array>,
  path: string
): Promise<T | null> {
  const text = await readZipTextEntry(entries, path);
  if (!text) return null;
  return JSON.parse(text) as T;
}

function mapProfileToPreset(profile: string | undefined): PresetId | undefined {
  if (
    profile === "visual-novel" ||
    profile === "generic" ||
    profile === "webnovel" ||
    profile === "readme" ||
    profile === "paper"
  ) {
    return profile;
  }
  if (profile === "en-light-novel" || profile === "es-editorial") {
    return "visual-novel";
  }
  if (profile === "en-litrpg") {
    return "webnovel";
  }
  if (profile === "en-fiction") {
    return "generic";
  }
  return undefined;
}

function normalizeSectionType(value: string | undefined): ChapterSection["type"] {
  if (
    value === "prologue" ||
    value === "chapter" ||
    value === "interlude" ||
    value === "epilogue" ||
    value === "afterword" ||
    value === "cover" ||
    value === "color"
  ) {
    return value;
  }
  return "chapter";
}

function normalizeImageType(value: string | undefined): ExtractedImage["type"] {
  if (value === "cover" || value === "color" || value === "bw" || value === "tiled") {
    return value;
  }
  return "color";
}

function defaultBookMetadata(): BookMetadata {
  return {
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
  };
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

export async function saveProjectToIndexedDB(): Promise<number> {
  if (state.files.length === 0 && state.sectionGroups.length === 0) {
    return 0;
  }

  const timestamp = Date.now();

  const filesMeta: StoredFileMeta[] = state.files.map((f) => ({
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
  const opfsAvailable = isOpfsSupported();

  for (const f of state.files) {
    if (f.rawFile && !storedFileKeys.has(f.id)) {
      if (opfsAvailable) {
        void saveFileToOpfs(f.id, f.rawFile, OPFS_DIRS.binaries);
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
    currentFileIds.add(CUSTOM_COVER_FILE_ID);
    if (!storedFileKeys.has(CUSTOM_COVER_FILE_ID)) {
      if (opfsAvailable) {
        void saveFileToOpfs(CUSTOM_COVER_FILE_ID, customCover, OPFS_DIRS.binaries);
      }
      await db.files.put({
        id: CUSTOM_COVER_FILE_ID,
        name: state.metadata.coverImageName || "custom_cover.jpg",
        type: customCover.type || "image/jpeg",
        blob: customCover,
      });
      storedFileKeys.add(CUSTOM_COVER_FILE_ID);
    }
  } else {
    await db.files.delete(CUSTOM_COVER_FILE_ID);
    if (opfsAvailable) {
      void deleteFileFromOpfs(CUSTOM_COVER_FILE_ID, OPFS_DIRS.binaries);
    }
    storedFileKeys.delete(CUSTOM_COVER_FILE_ID);
  }

  const cachedOpfsImageKeys = opfsAvailable
    ? new Set(await listOpfsImageKeys())
    : new Set<string>();
  const activeImageKeys = new Set<string>();

  for (const img of state.images) {
    if (!img.url || img.id === "img-custom-cover") continue;
    const imageKey = buildImageOpfsKey(img.fileId, img.name);
    activeImageKeys.add(imageKey);
    const idbImageKey = `${IMAGE_DB_PREFIX}${imageKey}`;

    if (opfsAvailable) {
      if (!cachedOpfsImageKeys.has(imageKey)) {
        const blob = await fetchBlobFromLocalUrl(img.url);
        if (blob) {
          const saved = await saveImageToOpfs(img.fileId, img.name, blob);
          if (saved) {
            cachedOpfsImageKeys.add(imageKey);
          } else if (!storedFileKeys.has(idbImageKey)) {
            currentFileIds.add(idbImageKey);
            await db.files.put({
              id: idbImageKey,
              name: img.name,
              type: blob.type || getImageMimeType(img.name),
              blob,
            });
            storedFileKeys.add(idbImageKey);
          }
        }
      }
    } else {
      currentFileIds.add(idbImageKey);
      if (!storedFileKeys.has(idbImageKey)) {
        const blob = await fetchBlobFromLocalUrl(img.url);
        if (blob) {
          await db.files.put({
            id: idbImageKey,
            name: img.name,
            type: blob.type || getImageMimeType(img.name),
            blob,
          });
          storedFileKeys.add(idbImageKey);
        }
      }
    }
  }

  if (opfsAvailable) {
    for (const staleKey of cachedOpfsImageKeys) {
      if (!activeImageKeys.has(staleKey)) {
        void deleteFileFromOpfs(staleKey, OPFS_DIRS.images);
      }
    }
  }

  for (const sfId of storedFileKeys) {
    if (!currentFileIds.has(sfId)) {
      await db.files.delete(sfId);
      if (opfsAvailable && !sfId.startsWith(IMAGE_DB_PREFIX)) {
        void deleteFileFromOpfs(sfId, OPFS_DIRS.binaries);
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
    await clearOpfsStorage();
  }
  setCustomCoverBlob(null);
  setState("lastSavedTimestamp", null);
}

export async function restoreProjectFromIndexedDB(): Promise<boolean> {
  try {
    const record = await db.projects.get("current_project");
    if (!record) return false;

    const storedFiles = await db.files.toArray();
    const idbImageMap = new Map<string, StoredFileRecord>();
    const bookStoredFiles: StoredFileRecord[] = [];
    let customCoverRecord: StoredFileRecord | undefined;

    for (const sf of storedFiles) {
      if (sf.id === CUSTOM_COVER_FILE_ID) {
        customCoverRecord = sf;
      } else if (sf.id.startsWith(IMAGE_DB_PREFIX)) {
        idbImageMap.set(sf.id, sf);
      } else {
        bookStoredFiles.push(sf);
      }
    }

    if (
      record.sectionGroups.length === 0 &&
      bookStoredFiles.length === 0 &&
      record.filesMeta.length > 0
    ) {
      return false;
    }

    setState("isProcessing", true);

    const opfsAvailable = isOpfsSupported();
    const imageUrlByComposite = new Map<string, string>();
    const imageUrlByName = new Map<string, string>();
    const missingFileIds = new Set<string>();

    for (const img of record.images) {
      if (img.id === "img-custom-cover") continue;
      let cachedBlob: Blob | null = null;
      if (opfsAvailable) {
        cachedBlob = await readImageFromOpfs(img.fileId, img.name);
      }
      if (!cachedBlob) {
        const idbKey = `${IMAGE_DB_PREFIX}${buildImageOpfsKey(img.fileId, img.name)}`;
        cachedBlob = idbImageMap.get(idbKey)?.blob ?? null;
      }

      if (cachedBlob) {
        const blobUrl = URL.createObjectURL(cachedBlob);
        imageUrlByComposite.set(makeImageCompositeKey(img.fileId, img.name), blobUrl);
        if (!imageUrlByName.has(img.name)) {
          imageUrlByName.set(img.name, blobUrl);
        }
      } else {
        missingFileIds.add(img.fileId);
      }
    }

    if (missingFileIds.size > 0) {
      for (const sf of bookStoredFiles) {
        if (!missingFileIds.has(sf.name) && !missingFileIds.has(sf.id)) {
          continue;
        }
        let fileBlob: Blob = sf.blob;
        if (opfsAvailable) {
          const opfsFile = await readFileFromOpfs(sf.id, OPFS_DIRS.binaries);
          if (opfsFile) {
            fileBlob = opfsFile;
          }
        }
        const fileObj = new File([fileBlob], sf.name, { type: sf.type });
        const payload = await parseBookFile(fileObj);
        for (const img of payload.images) {
          if (img.url) {
            imageUrlByComposite.set(makeImageCompositeKey(img.fileId, img.name), img.url);
            if (!imageUrlByName.has(img.name)) {
              imageUrlByName.set(img.name, img.url);
            }
            if (opfsAvailable) {
              const extractedBlob = await fetchBlobFromLocalUrl(img.url);
              if (extractedBlob) {
                void saveImageToOpfs(img.fileId, img.name, extractedBlob);
              }
            }
          }
        }
      }
    }

    const restoredMetadata: BookMetadata = { ...record.metadata };

    let coverBlob: Blob | null = null;
    let coverName = restoredMetadata.coverImageName || "custom_cover.jpg";
    if (restoredMetadata.isCustomCover) {
      if (opfsAvailable) {
        coverBlob = await readFileFromOpfs(CUSTOM_COVER_FILE_ID, OPFS_DIRS.binaries);
      }
      if (!coverBlob && customCoverRecord) {
        coverBlob = customCoverRecord.blob;
        coverName = customCoverRecord.name || coverName;
      } else if (customCoverRecord) {
        coverName = customCoverRecord.name || coverName;
      }
    }

    if (coverBlob && restoredMetadata.isCustomCover) {
      setCustomCoverBlob(coverBlob);
      const newCoverUrl = URL.createObjectURL(coverBlob);
      const ext = coverName.split(".").pop()?.toLowerCase() || "jpg";
      try {
        const bytes = new Uint8Array(await coverBlob.arrayBuffer());
        await setCustomCoverBridge(coverName, ext, bytes);
      } catch {}
      restoredMetadata.coverUrl = newCoverUrl;
    }

    const restoredImages: ExtractedImage[] = record.images.map((img) => {
      if (img.id === "img-custom-cover" && restoredMetadata.coverUrl) {
        return { ...img, url: restoredMetadata.coverUrl };
      }
      const freshUrl =
        imageUrlByComposite.get(makeImageCompositeKey(img.fileId, img.name)) ||
        imageUrlByName.get(img.name);
      return {
        ...img,
        url: freshUrl || img.url,
      };
    });

    if (!restoredMetadata.isCustomCover && restoredMetadata.coverImageName) {
      const matchedCover = restoredImages.find(
        (img) => img.name === restoredMetadata.coverImageName && img.url
      );
      if (matchedCover) {
        restoredMetadata.coverUrl = matchedCover.url;
      }
    }
    if (restoredMetadata.originalCoverName) {
      const matchedOrig = restoredImages.find(
        (img) => img.name === restoredMetadata.originalCoverName && img.url
      );
      if (matchedOrig) {
        restoredMetadata.originalCoverUrl = matchedOrig.url;
      }
    }

    const restoredSectionGroups: FileSectionGroup[] = record.sectionGroups.map((g) => ({
      ...g,
      sections: g.sections.map((s) => {
        let content = s.htmlContent;
        if (s.type === "cover" && restoredMetadata.coverUrl) {
          content = `<div class="full-illustration-wrap"><img src="${restoredMetadata.coverUrl}" alt="Portada" class="full-illustration-img" /></div>`;
        } else {
          for (const img of restoredImages) {
            if (img.url) {
              content = content.split(`../Images/${img.name}`).join(img.url);
              content = content.split(`../media/${img.name}`).join(img.url);
              content = content.split(`media/${img.name}`).join(img.url);
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

    const restoredUploads: UploadedBookFile[] = await Promise.all(
      record.filesMeta.map(async (fm) => {
        const sf = bookStoredFiles.find((s) => s.id === fm.id || s.name === fm.name);
        let rawBlob: Blob | undefined = sf?.blob;
        if (opfsAvailable) {
          const opfsRaw = await readFileFromOpfs(fm.id, OPFS_DIRS.binaries);
          if (opfsRaw) {
            rawBlob = opfsRaw;
          }
        }
        const isPdf = fm.extension === "pdf";
        const blobUrl = isPdf && rawBlob ? URL.createObjectURL(rawBlob) : undefined;

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
          rawFile: rawBlob,
        };
      })
    );

    setState("files", restoredUploads);
    setState("metadata", restoredMetadata);
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
    if (record.globalSpellEnabled !== undefined) {
      setState("globalSpellEnabled", record.globalSpellEnabled);
    }
    if (record.spellVolumeSettings) setState("spellVolumeSettings", record.spellVolumeSettings);
    if (record.showSpoilers !== undefined) setState("showSpoilers", record.showSpoilers);
    if (record.userEditedMetadataKeys) {
      userEditedMetadata.clear();
      for (const k of record.userEditedMetadataKeys) {
        userEditedMetadata.add(k);
      }
    }
    setState(
      "activeSectionId",
      record.activeSectionId || restoredSectionGroups[0]?.sections[0]?.id || null
    );
    setState("lastSavedTimestamp", record.timestamp);
    setState("isProcessing", false);

    return true;
  } catch {
    setState("isProcessing", false);
    return false;
  }
}

async function resolveImageBlobForExport(
  img: ExtractedImage,
  idbMap: Map<string, StoredFileRecord>
): Promise<Blob | null> {
  if (img.id === "img-custom-cover") {
    const custom = getCustomCoverBlob();
    if (custom) return custom;
    const coverRecord = idbMap.get(CUSTOM_COVER_FILE_ID);
    if (coverRecord) return coverRecord.blob;
  }
  if (isOpfsSupported()) {
    const opfsFile = await readImageFromOpfs(img.fileId, img.name);
    if (opfsFile) return opfsFile;
  }
  const idbKey = `${IMAGE_DB_PREFIX}${buildImageOpfsKey(img.fileId, img.name)}`;
  const idbRecord = idbMap.get(idbKey);
  if (idbRecord) return idbRecord.blob;
  return fetchBlobFromLocalUrl(img.url);
}

export async function exportProjectFile(options: ExportProjectOptions = {}): Promise<void> {
  await saveProjectToIndexedDB();

  const record = await db.projects.get("current_project");
  if (!record) return;

  const includeSources = options.includeSources ?? true;
  const storedFiles = await db.files.toArray();
  const storedFileMap = new Map(storedFiles.map((sf) => [sf.id, sf]));
  const opfsAvailable = isOpfsSupported();

  const zipBlob = await createStreamingZipBlob(async (zip) => {
    const usedMediaNames = new Set<string>();
    const mediaManifest: EditNovelV2MediaItem[] = [];
    const imageUrlToMediaRelPath = new Map<string, string>();
    const imageNameToMediaRelPath = new Map<string, string>();
    const imageCompositeToMediaRelPath = new Map<string, string>();

    for (const img of record.images) {
      let mediaFilename = sanitizeArchiveSegment(img.name || img.id);
      if (usedMediaNames.has(mediaFilename)) {
        mediaFilename = `${sanitizeArchiveSegment(img.fileId)}_${mediaFilename}`;
      }
      while (usedMediaNames.has(mediaFilename)) {
        mediaFilename = `${sanitizeArchiveSegment(img.id)}_${mediaFilename}`;
      }
      usedMediaNames.add(mediaFilename);

      const mediaZipPath = `media/${mediaFilename}`;
      const mediaRelPath = `../media/${mediaFilename}`;
      const imgBlob = await resolveImageBlobForExport(img, storedFileMap);
      if (imgBlob) {
        await addStoredBlobEntry(zip, mediaZipPath, imgBlob);
      }

      if (img.url) {
        imageUrlToMediaRelPath.set(img.url, mediaRelPath);
      }
      imageCompositeToMediaRelPath.set(makeImageCompositeKey(img.fileId, img.name), mediaRelPath);
      if (!imageNameToMediaRelPath.has(img.name)) {
        imageNameToMediaRelPath.set(img.name, mediaRelPath);
      }

      mediaManifest.push({
        id: img.id,
        fileId: img.fileId,
        name: img.name,
        path: mediaZipPath,
        mimeType: imgBlob?.type || getImageMimeType(img.name),
        resolution: img.resolution,
        isDiscarded: img.isDiscarded,
        status: img.isDiscarded ? "discard" : "keep",
        type: img.type,
      });
    }

    addDeflatedTextEntry(
      zip,
      "media/manifest.json",
      JSON.stringify({ items: mediaManifest }, null, 2)
    );

    const usedChapterPaths = new Set<string>();
    const treeGroups: EditNovelV2TreeGroup[] = [];

    for (const group of record.sectionGroups) {
      const treeSections: EditNovelV2TreeSection[] = [];
      for (const sec of group.sections) {
        let chapterFile = `${sanitizeArchiveSegment(sec.id)}.xhtml`;
        let counter = 1;
        while (usedChapterPaths.has(chapterFile)) {
          chapterFile = `${sanitizeArchiveSegment(sec.id)}_${counter++}.xhtml`;
        }
        usedChapterPaths.add(chapterFile);
        const chapterZipPath = `structure/chapters/${chapterFile}`;

        let html = sec.htmlContent;
        for (const [oldUrl, relPath] of imageUrlToMediaRelPath.entries()) {
          html = html.split(oldUrl).join(relPath);
        }
        for (const img of record.images) {
          const relPath =
            imageCompositeToMediaRelPath.get(makeImageCompositeKey(img.fileId, img.name)) ||
            imageNameToMediaRelPath.get(img.name);
          if (relPath) {
            html = html.split(`../Images/${img.name}`).join(relPath);
          }
        }

        addDeflatedTextEntry(zip, chapterZipPath, wrapSectionXhtml(sec.title, html));

        treeSections.push({
          id: sec.id,
          fileId: sec.fileId,
          originalTitle: sec.originalTitle,
          title: sec.title,
          type: sec.type,
          order: sec.order,
          startPage: sec.startPage,
          endPage: sec.endPage,
          path: chapterZipPath,
        });
      }

      treeGroups.push({
        fileId: group.fileId,
        fileName: group.fileName,
        collapsed: group.collapsed,
        sections: treeSections,
      });
    }

    const treePayload: EditNovelV2Tree = { groups: treeGroups };
    addDeflatedTextEntry(zip, "structure/tree.json", JSON.stringify(treePayload, null, 2));

    const editorialPayload: EditNovelV2EditorialRules = {
      editorialRules: record.editorialRules,
      regexRules: record.regexRules,
      glossary: record.glossary,
      spellIgnoredWords: record.spellIgnoredWords,
      spellLanguageMode: record.spellLanguageMode,
      spellIgnoreJapanese: record.spellIgnoreJapanese,
      spellIgnoreForeign: record.spellIgnoreForeign,
      spellIgnoreProperNouns: record.spellIgnoreProperNouns,
      unifyBreaks: record.unifyBreaks,
      unifiedBreakSymbol: record.unifiedBreakSymbol,
      unifyDialogue: record.unifyDialogue,
      unifiedDialogueSymbol: record.unifiedDialogueSymbol,
      unifyQuotes: record.unifyQuotes,
      unifiedQuoteSymbol: record.unifiedQuoteSymbol,
      unifyEllipsis: record.unifyEllipsis,
      unifiedEllipsisSymbol: record.unifiedEllipsisSymbol,
      globalSpellEnabled: record.globalSpellEnabled,
      spellVolumeSettings: record.spellVolumeSettings,
    };
    addDeflatedTextEntry(zip, "rules/editorial.json", JSON.stringify(editorialPayload, null, 2));

    addDeflatedTextEntry(
      zip,
      "rules/spell_audit.json",
      JSON.stringify({ corrections: record.spellCorrections }, null, 2)
    );

    const uiStatePayload: EditNovelV2UiState = {
      activeSectionId: record.activeSectionId,
      readerSettings: record.readerSettings,
      selectedPreset: record.selectedPreset,
      currentStep: record.currentStep,
      userEditedMetadataKeys: record.userEditedMetadataKeys,
      showSpoilers: record.showSpoilers,
      filesMeta: record.filesMeta,
    };
    addDeflatedTextEntry(zip, "ui/state.json", JSON.stringify(uiStatePayload, null, 2));

    const sourceEntries: EditNovelV2SourceEntry[] = [];
    for (const fm of record.filesMeta) {
      let sourcePath: string | undefined;
      if (includeSources) {
        let sourceBlob: Blob | null = storedFileMap.get(fm.id)?.blob ?? null;
        if (opfsAvailable) {
          const opfsSource = await readFileFromOpfs(fm.id, OPFS_DIRS.binaries);
          if (opfsSource) {
            sourceBlob = opfsSource;
          }
        }
        if (sourceBlob) {
          sourcePath = `sources/${sanitizeArchiveSegment(fm.id)}/${sanitizeArchiveSegment(fm.name)}`;
          await addStoredBlobEntry(zip, sourcePath, sourceBlob);
        }
      }
      sourceEntries.push({
        id: fm.id,
        name: fm.name,
        size: fm.size,
        extension: fm.extension,
        active: fm.active,
        sectionCount: fm.sectionCount,
        imageCount: fm.imageCount,
        path: sourcePath,
      });
    }

    const exportedMetadata: BookMetadata = {
      ...record.metadata,
      coverUrl:
        (record.metadata.coverImageName &&
          imageNameToMediaRelPath.get(record.metadata.coverImageName)) ||
        "",
      originalCoverUrl:
        (record.metadata.originalCoverName &&
          imageNameToMediaRelPath.get(record.metadata.originalCoverName)) ||
        "",
    };

    const nowIso = new Date().toISOString();
    const manifestPayload: EditNovelV2Manifest = {
      format: "editnovel",
      version: 2,
      app: "editnovel",
      createdAt: nowIso,
      timestamp: Date.now(),
      createdBy: "human",
      profile: record.selectedPreset || "visual-novel",
      metadata: exportedMetadata,
      provenance: {
        sourceApp: "editnovel-portal",
        exportedAt: nowIso,
      },
      validationReport: {
        valid: true,
        warnings: [],
        errors: [],
      },
      sources: sourceEntries,
    };

    addDeflatedTextEntry(zip, "manifest.json", JSON.stringify(manifestPayload, null, 2));
  });

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  const safeTitle = (state.metadata.title || "proyecto").replace(/[/\\:*?"<>|]/g, "_").trim();
  a.download = `${safeTitle || "proyecto"}.editnovel`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportCompressedJsonPayload(payload: unknown): Promise<Uint8Array> {
  return compressBrotli(strToU8(JSON.stringify(payload)));
}

async function importLegacyJsonProject(text: string): Promise<boolean> {
  const payload = JSON.parse(text) as LegacyExportPayload;
  if (payload.app !== "editnovel" || !payload.project || !Array.isArray(payload.files)) {
    throw new Error("Formato de archivo no válido");
  }

  await clearSavedProjectFromIndexedDB();
  const opfsAvailable = isOpfsSupported();

  for (const sf of payload.files) {
    const blob = base64ToBlob(sf.dataUrl, sf.type);
    if (opfsAvailable) {
      await saveFileToOpfs(sf.id, blob, OPFS_DIRS.binaries);
    }
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

  return restoreProjectFromIndexedDB();
}

async function importV2ZipProject(file: File): Promise<boolean> {
  const entries = await extractZipEntries(file);
  const rawManifest = await readZipJsonEntry<
    Partial<EditNovelV2Manifest> & {
      title?: string;
      author?: string;
      language?: string;
    }
  >(entries, "manifest.json");

  if (!rawManifest) {
    throw new Error("Missing manifest.json in .editnovel v2 archive");
  }
  if (rawManifest.format && rawManifest.format !== "editnovel" && rawManifest.app !== "editnovel") {
    throw new Error("Invalid .editnovel manifest format");
  }

  const treeData = await readZipJsonEntry<EditNovelV2Tree>(entries, "structure/tree.json");
  const mediaManifestRaw = await readZipJsonEntry<
    EditNovelV2MediaItem[] | { items?: EditNovelV2MediaItem[]; images?: EditNovelV2MediaItem[] }
  >(entries, "media/manifest.json");
  const editorialData = await readZipJsonEntry<Partial<EditNovelV2EditorialRules>>(
    entries,
    "rules/editorial.json"
  );
  const spellDataRaw = await readZipJsonEntry<
    SpellCorrectionItem[] | { corrections?: SpellCorrectionItem[] }
  >(entries, "rules/spell_audit.json");
  const uiStateData = await readZipJsonEntry<Partial<EditNovelV2UiState>>(entries, "ui/state.json");

  await clearSavedProjectFromIndexedDB();
  const opfsAvailable = isOpfsSupported();

  const mediaItems: EditNovelV2MediaItem[] = Array.isArray(mediaManifestRaw)
    ? mediaManifestRaw
    : mediaManifestRaw?.items || mediaManifestRaw?.images || [];

  const restoredMetadata: BookMetadata = {
    ...defaultBookMetadata(),
    ...(rawManifest.metadata || {}),
  };
  if (!rawManifest.metadata?.title && rawManifest.title) {
    restoredMetadata.title = rawManifest.title;
  }
  if (!rawManifest.metadata?.author && rawManifest.author) {
    restoredMetadata.author = rawManifest.author;
  }
  if (!rawManifest.metadata?.language && rawManifest.language) {
    restoredMetadata.language = rawManifest.language;
  }

  const restoredImages: ExtractedImage[] = [];
  for (const item of mediaItems) {
    const normalizedPath = item.path.replace(/^\.\//, "").replace(/\\/g, "/");
    const mediaBytes = entries.get(normalizedPath) || entries.get(`media/${item.name}`);
    const mimeType = item.mimeType || getImageMimeType(item.name);

    if (mediaBytes) {
      const mediaBlob = new Blob([new Uint8Array(mediaBytes)], { type: mimeType });
      if (item.id === "img-custom-cover" && restoredMetadata.isCustomCover) {
        if (opfsAvailable) {
          await saveFileToOpfs(CUSTOM_COVER_FILE_ID, mediaBlob, OPFS_DIRS.binaries);
        }
        await db.files.put({
          id: CUSTOM_COVER_FILE_ID,
          name: item.name || "custom_cover.jpg",
          type: mimeType,
          blob: mediaBlob,
        });
      } else {
        const imageKey = buildImageOpfsKey(item.fileId, item.name);
        let savedOpfs = false;
        if (opfsAvailable) {
          savedOpfs = await saveImageToOpfs(item.fileId, item.name, mediaBlob);
        }
        if (!savedOpfs) {
          await db.files.put({
            id: `${IMAGE_DB_PREFIX}${imageKey}`,
            name: item.name,
            type: mimeType,
            blob: mediaBlob,
          });
        }
      }
    }

    const isDiscarded =
      typeof item.isDiscarded === "boolean" ? item.isDiscarded : item.status === "discard";

    restoredImages.push({
      id: item.id,
      fileId: item.fileId,
      name: item.name,
      url: "",
      resolution: item.resolution || "Original",
      isDiscarded,
      type: normalizeImageType(item.type),
    });
  }

  const restoredSectionGroups: FileSectionGroup[] = [];
  if (treeData && Array.isArray(treeData.groups)) {
    for (const group of treeData.groups) {
      const sections: ChapterSection[] = [];
      for (const sec of group.sections) {
        const chapterPath = sec.path.startsWith("structure/")
          ? sec.path
          : `structure/${sec.path.replace(/^\.\//, "")}`;
        const rawXhtml =
          (await readZipTextEntry(entries, chapterPath)) ||
          (await readZipTextEntry(entries, sec.path)) ||
          "";
        sections.push({
          id: sec.id,
          fileId: sec.fileId,
          originalTitle: sec.originalTitle || sec.title,
          title: sec.title,
          type: normalizeSectionType(sec.type),
          order: sec.order,
          startPage: sec.startPage,
          endPage: sec.endPage,
          htmlContent: extractBodyFromXhtml(rawXhtml),
        });
      }
      restoredSectionGroups.push({
        fileId: group.fileId,
        fileName: group.fileName,
        collapsed: Boolean(group.collapsed),
        sections,
      });
    }
  }

  const manifestSources = Array.isArray(rawManifest.sources) ? rawManifest.sources : [];
  const filesMeta: StoredFileMeta[] = [];
  const seenFileIds = new Set<string>();

  for (const src of manifestSources) {
    seenFileIds.add(src.id);
    if (src.path) {
      const normalizedSourcePath = src.path.replace(/^\.\//, "").replace(/\\/g, "/");
      const sourceBytes = entries.get(normalizedSourcePath);
      if (sourceBytes) {
        const mime = src.extension === "pdf" ? "application/pdf" : "application/epub+zip";
        const sourceBlob = new Blob([new Uint8Array(sourceBytes)], { type: mime });
        if (opfsAvailable) {
          await saveFileToOpfs(src.id, sourceBlob, OPFS_DIRS.binaries);
        }
        await db.files.put({
          id: src.id,
          name: src.name,
          type: mime,
          blob: sourceBlob,
        });
      }
    }
    filesMeta.push({
      id: src.id,
      name: src.name,
      size: src.size,
      extension: src.extension === "epub" ? "epub" : "pdf",
      status: "ready",
      progress: 100,
      sectionCount: src.sectionCount,
      imageCount: src.imageCount,
      active: src.active,
    });
  }

  if (filesMeta.length === 0 && Array.isArray(uiStateData?.filesMeta)) {
    for (const fm of uiStateData.filesMeta) {
      if (!seenFileIds.has(fm.id)) {
        filesMeta.push(fm);
      }
    }
  }

  const spellCorrections: SpellCorrectionItem[] = Array.isArray(spellDataRaw)
    ? spellDataRaw
    : spellDataRaw?.corrections || [];

  const record: StoredProjectRecord = {
    id: "current_project",
    timestamp: Date.now(),
    metadata: restoredMetadata,
    sectionGroups: restoredSectionGroups,
    activeSectionId:
      uiStateData?.activeSectionId || restoredSectionGroups[0]?.sections[0]?.id || null,
    images: restoredImages,
    editorialRules: editorialData?.editorialRules || [],
    regexRules: editorialData?.regexRules || [],
    glossary: editorialData?.glossary || [],
    readerSettings: uiStateData?.readerSettings || { ...DEFAULT_READER_SETTINGS },
    spellCorrections,
    spellIgnoredWords: editorialData?.spellIgnoredWords || [],
    spellLanguageMode: editorialData?.spellLanguageMode || "hybrid",
    spellIgnoreJapanese: editorialData?.spellIgnoreJapanese ?? true,
    spellIgnoreForeign: editorialData?.spellIgnoreForeign ?? true,
    spellIgnoreProperNouns: editorialData?.spellIgnoreProperNouns ?? true,
    unifyBreaks: editorialData?.unifyBreaks ?? true,
    unifiedBreakSymbol: editorialData?.unifiedBreakSymbol || "◆ ◇ ◆ ◇ ◆",
    unifyDialogue: editorialData?.unifyDialogue ?? true,
    unifiedDialogueSymbol: editorialData?.unifiedDialogueSymbol || "「 」",
    unifyQuotes: editorialData?.unifyQuotes ?? true,
    unifiedQuoteSymbol: editorialData?.unifiedQuoteSymbol || "« »",
    unifyEllipsis: editorialData?.unifyEllipsis ?? true,
    unifiedEllipsisSymbol: editorialData?.unifiedEllipsisSymbol || "……",
    filesMeta,
    selectedPreset: uiStateData?.selectedPreset || mapProfileToPreset(rawManifest.profile),
    currentStep: uiStateData?.currentStep,
    globalSpellEnabled: editorialData?.globalSpellEnabled,
    spellVolumeSettings: editorialData?.spellVolumeSettings,
    userEditedMetadataKeys: uiStateData?.userEditedMetadataKeys,
    showSpoilers: uiStateData?.showSpoilers,
  };

  await db.projects.put(record);
  return restoreProjectFromIndexedDB();
}

export async function importProjectFile(file: File): Promise<boolean> {
  try {
    const headBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    if (headBytes.length >= 2 && headBytes[0] === 0x50 && headBytes[1] === 0x4b) {
      return await importV2ZipProject(file);
    }

    const fullBytes = new Uint8Array(await file.arrayBuffer());

    if (isGzipBytes(fullBytes)) {
      const text = await decompressToString(fullBytes);
      return await importLegacyJsonProject(text);
    }

    const firstNonWhitespace = fullBytes.find(
      (b) => b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d
    );
    if (firstNonWhitespace === 0x7b) {
      const text = new TextDecoder().decode(fullBytes);
      return await importLegacyJsonProject(text);
    }

    const decompressed = await decompressBrotli(fullBytes);
    const text = strFromU8(decompressed);
    return await importLegacyJsonProject(text);
  } catch {
    return false;
  }
}
