import type { ReaderSettings } from "./reader-settings";
export type { ReaderSettings };

export type ModalStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ModalDisplayMode = "expanded" | "docked";
export type PresetId = "visual-novel" | "generic" | "webnovel" | "readme" | "paper";
export type LanguageProfile = "auto" | "es" | "en";

export interface ParseOptions {
  language: LanguageProfile;
  presetId: PresetId;
}

export interface OcrDetectionInfo {
  needsOcr: boolean;
  scannedPageNumbers: number[];
}

export interface OcrWordSpan {
  text: string;
  bbox: [number, number, number, number];
  confidence: number;
}

export interface OcrLineInput {
  text: string;
  bbox: [number, number, number, number];
  spans: OcrWordSpan[];
}

export interface OcrPageInput {
  pageNum: number;
  width: number;
  height: number;
  lines: OcrLineInput[];
}

export interface UploadedBookFile {
  id: string;
  name: string;
  extension: "pdf" | "epub";
  size: number;
  active: boolean;
  status: "idle" | "processing" | "ready" | "error";
  progress: number;
  errorMessage?: string;
  sectionCount: number;
  imageCount: number;
  pdfBlobUrl?: string;
  rawFile?: File | Blob;
}

export interface ChapterSection {
  id: string;
  fileId: string;
  originalTitle: string;
  title: string;
  type: "prologue" | "chapter" | "interlude" | "epilogue" | "afterword" | "cover" | "color";
  order: number;
  htmlContent: string;
  startPage?: number;
  endPage?: number;
}

export interface FileSectionGroup {
  fileId: string;
  fileName: string;
  sections: ChapterSection[];
  collapsed: boolean;
}

export interface BookMetadata {
  title: string;
  author: string;
  illustrator: string;
  series: string;
  volume: string;
  language: string;
  publisher: string;
  description: string;
  isbn?: string;
  publishedYear?: string;
  copyrightNotice?: string;
  translator?: string;
  coverUrl?: string;
  coverImageName?: string;
  originalCoverUrl?: string;
  originalCoverName?: string;
  isCustomCover?: boolean;
  hasCoverRemoved?: boolean;
}

export interface ExtractedImage {
  id: string;
  fileId: string;
  name: string;
  url: string;
  resolution: string;
  isDiscarded: boolean;
  type: "cover" | "color" | "bw" | "tiled";
}

export interface EditorialRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  affectedCount: number;
}

export interface RegexRule {
  id: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
  flags: string;
  affectedCount: number;
}

export interface GlossaryReplacement {
  id: string;
  find: string;
  replace: string;
  enabled: boolean;
}

export interface SpellCorrectionItem {
  id: string;
  fileId: string;
  volumeNum: number;
  pageNum: number;
  sectionTitle: string;
  category: string;
  confidence: number;
  isSmell: boolean;
  originalToken: string;
  replacementToken: string;
  suggestions?: string[];
  paragraphId?: string;
  sectionId?: string;
  paragraphBefore: string;
  paragraphAfter: string;
  contextSnippet: string;
  language: "es" | "en";
  enabled: boolean;
  applied?: boolean;
  ignored?: boolean;
}

export interface DynamicParagraphInput {
  id: string;
  text: string;
  sectionId?: string;
  sectionTitle?: string;
  pageNum?: number;
}

export interface DynamicAuditRequest {
  fileId: string;
  paragraphs: DynamicParagraphInput[];
  options: SpellAuditOptions;
}

export interface SpellAuditOptions {
  languageMode: "hybrid" | "es" | "en";
  ignoreJapanese: boolean;
  ignoreForeign: boolean;
  ignoreProperNouns: boolean;
  ignoredWords: string[];
}

export interface DetectedSceneBreak {
  id: string;
  sectionId: string;
  sectionTitle: string;
  fileId: string;
  symbol: string;
  snippetBefore: string;
  snippetAfter: string;
}

export interface DetectedDialogueItem {
  id: string;
  sectionId: string;
  sectionTitle: string;
  fileId: string;
  originalPrefix: string;
  text: string;
  snippet: string;
}

export interface DetectedQuoteItem {
  id: string;
  sectionId: string;
  sectionTitle: string;
  fileId: string;
  openChar: string;
  closeChar: string;
  text: string;
  snippet: string;
}

export interface DetectedEllipsisItem {
  id: string;
  sectionId: string;
  sectionTitle: string;
  fileId: string;
  symbol: string;
  snippet: string;
}

export interface AppState {
  currentStep: ModalStepId;
  selectedPreset: PresetId;
  modalMode: ModalDisplayMode;
  files: UploadedBookFile[];
  sectionGroups: FileSectionGroup[];
  activeSectionId: string | null;
  metadata: BookMetadata;
  images: ExtractedImage[];
  showSpoilers: boolean;
  editorialRules: EditorialRule[];
  regexRules: RegexRule[];
  glossary: GlossaryReplacement[];
  readerSettings: ReaderSettings;
  sidebarOpen: boolean;
  syncScroll: boolean;
  isProcessing: boolean;
  stepSpinners: Record<number, boolean>;
  readerSettingsOpen: boolean;
  saveExportOpen: boolean;
  localSaveEnabled: boolean;
  lastSavedTimestamp: number | null;
  rightPaneMode: "original" | "spell";
  selectedCorrectionId: string | null;
  unifyBreaks: boolean;
  unifiedBreakSymbol: string;
  unifyDialogue: boolean;
  unifiedDialogueSymbol: string;
  unifyQuotes: boolean;
  unifiedQuoteSymbol: string;
  unifyEllipsis: boolean;
  unifiedEllipsisSymbol: string;
  globalSpellEnabled: boolean;
  spellLanguageMode: "hybrid" | "es" | "en";
  spellIgnoreJapanese: boolean;
  spellIgnoreForeign: boolean;
  spellIgnoreProperNouns: boolean;
  spellIgnoredWords: string[];
  spellVolumeSettings: Record<string, boolean>;
  spellCorrections: SpellCorrectionItem[];
  spellIgnoredJapaneseCount: number;
  spellIgnoredForeignCount: number;
  spellIgnoredProperNounsCount: number;
}
