import type {
  BookMetadata,
  DynamicAuditRequest,
  EditorialRule,
  ExtractedImage,
  FileSectionGroup,
  GlossaryReplacement,
  OcrPageInput,
  ParseOptions,
  RegexRule,
  SpellAuditOptions,
  SpellCorrectionItem,
} from "./types";

export interface ParsedBookPayload {
  metadata: BookMetadata;
  groups: FileSectionGroup[];
  images: ExtractedImage[];
  detectedRules: EditorialRule[];
  spellCorrections: SpellCorrectionItem[];
  ignoredJapaneseCount: number;
  ignoredForeignCount: number;
  ignoredProperNounsCount: number;
  needsOcr?: boolean;
  scannedPageNumbers?: number[];
}

export interface ParsedBookWorkerResult {
  payload: ParsedBookPayload;
  imagesData: Array<{ name: string; bytes: Uint8Array }>;
}

export interface SpellAuditWorkerResult {
  corrections: SpellCorrectionItem[];
  ignoredJapaneseCount: number;
  ignoredForeignCount: number;
  ignoredProperNounsCount: number;
}

export interface TransformSectionRequest {
  requestId: number;
  sectionId: string;
  html: string;
  editorialRules: EditorialRule[];
  regexRules: RegexRule[];
  glossary: GlossaryReplacement[];
}

export interface TransformSectionResult {
  requestId: number;
  sectionId: string;
  html: string;
  rulesSignature: string;
}

export interface BuildEpubWorkerPayload {
  metadata: BookMetadata;
  groups: FileSectionGroup[];
  images: ExtractedImage[];
  editorialRules: EditorialRule[];
  regexRules: RegexRule[];
  glossary: GlossaryReplacement[];
  spellCorrections?: SpellCorrectionItem[];
  globalSpellEnabled?: boolean;
  volumeSpellSettings?: Record<string, boolean>;
  removeCover?: boolean;
}

export interface EditNovelWorkerApi {
  warmup(): Promise<{ parallel: boolean }>;
  initDictionary(lang: "es" | "en" | "ja", bytes: Uint8Array): Promise<void>;
  parseBookFile(
    fileName: string,
    fileBytes: Uint8Array,
    options?: ParseOptions
  ): Promise<ParsedBookWorkerResult>;
  injectOcrPages(
    fileId: string,
    pages: OcrPageInput[],
    options?: ParseOptions
  ): Promise<ParsedBookPayload>;
  removeBookFile(fileName: string): Promise<void>;
  auditSpelling(fileId: string, options: SpellAuditOptions): Promise<SpellAuditWorkerResult>;
  auditDynamicParagraphs(request: DynamicAuditRequest): Promise<SpellCorrectionItem[]>;
  transformSection(request: TransformSectionRequest): Promise<TransformSectionResult>;
  setCustomCover(filename: string, ext: string, data: Uint8Array): Promise<void>;
  clearCustomCover(): Promise<void>;
  buildEpub(payload: BuildEpubWorkerPayload): Promise<Uint8Array>;
  compressBrotli(bytes: Uint8Array): Promise<Uint8Array>;
  decompressBrotli(bytes: Uint8Array): Promise<Uint8Array>;
}
