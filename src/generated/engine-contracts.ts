export type PresetId = "visual-novel" | "generic" | "webnovel" | "readme" | "paper";
export type LanguageProfile = "auto" | "es" | "en";
export type DictionaryLanguageCode = "es" | "en" | "ja";

export interface LocalizedLabel {
  es: string;
  en: string;
}

export interface PresetProfileContract {
  id: PresetId;
  enableDropCaps: boolean;
  enableLitRpgBrackets: boolean;
  enableSceneBreaks: boolean;
  footnoteStyle: string;
  fullPageIllustrations: boolean;
}

export interface PresetDescriptor {
  id: PresetId;
  aliases: string[];
  profile: PresetProfileContract;
}

export interface LanguageDescriptor {
  code: LanguageProfile;
  labels: LocalizedLabel;
}

export interface DictionaryAsset {
  lang: DictionaryLanguageCode;
  cacheName: string;
  brFileName: string;
  url: string;
}

export interface EngineEditorialRuleContract {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  affectedCount: number;
}

export interface EngineManifestContract {
  schemaVersion: number;
  engineVersion: string;
  archiveFormat: "editnovel";
  archiveSchemaVersion: 2;
  presets: PresetDescriptor[];
  presetAliases: Record<string, PresetId>;
  languages: LanguageDescriptor[];
  dictionaries: DictionaryAsset[];
  defaultEditorialRules: EngineEditorialRuleContract[];
}

export interface EngineBookMetadataContract {
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
}

export interface EngineRegexRuleContract {
  id: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
  flags: string;
  affectedCount: number;
}

export interface EngineGlossaryReplacementContract {
  id: string;
  find: string;
  replace: string;
  enabled: boolean;
}

export interface EditNovelV2SourceEntry {
  id: string;
  name: string;
  extension: "pdf" | "epub";
  active: boolean;
  sectionCount: number;
  imageCount: number;
  path?: string;
}

export interface EditNovelV2Provenance {
  sourceApp: string;
  exportedAt: string;
}

export interface EditNovelV2ValidationReport {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface EditNovelV2Manifest<TMetadata = EngineBookMetadataContract> {
  format: "editnovel";
  version: 2;
  app: "editnovel";
  createdAt: string;
  timestamp: number;
  createdBy: "human" | "agent" | "hybrid";
  profile: string;
  metadata: TMetadata;
  provenance: EditNovelV2Provenance;
  validationReport: EditNovelV2ValidationReport;
  sources: EditNovelV2SourceEntry[];
}

export interface EditNovelV2TreeSection<
  TSectionType extends string = "prologue" | "chapter" | "interlude" | "epilogue" | "afterword" | "cover" | "color",
> {
  id: string;
  fileId: string;
  originalTitle: string;
  title: string;
  type: TSectionType;
  order: number;
  startPage?: number;
  endPage?: number;
  path: string;
}

export interface EditNovelV2TreeGroup<
  TSectionType extends string = "prologue" | "chapter" | "interlude" | "epilogue" | "afterword" | "cover" | "color",
> {
  fileId: string;
  fileName: string;
  collapsed: boolean;
  sections: EditNovelV2TreeSection<TSectionType>[];
}

export interface EditNovelV2Tree<
  TSectionType extends string = "prologue" | "chapter" | "interlude" | "epilogue" | "afterword" | "cover" | "color",
> {
  groups: EditNovelV2TreeGroup<TSectionType>[];
}

export interface EditNovelV2MediaItem<
  TImageType extends string = "cover" | "color" | "bw" | "tiled",
> {
  id: string;
  fileId: string;
  name: string;
  path: string;
  mimeType: string;
  resolution: string;
  isDiscarded: boolean;
  status: "keep" | "discard" | "uncertain";
  type: TImageType;
  reason?: string;
  altText?: string;
  decorative?: boolean;
}

export interface EditNovelV2EditorialRules {
  editorialRules: EngineEditorialRuleContract[];
  regexRules: EngineRegexRuleContract[];
  glossary: EngineGlossaryReplacementContract[];
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

export const ENGINE_MANIFEST: EngineManifestContract = {
  "schemaVersion": 1,
  "engineVersion": "0.1.0",
  "archiveFormat": "editnovel",
  "archiveSchemaVersion": 2,
  "presets": [
    {
      "id": "visual-novel",
      "aliases": [
        "en-light-novel",
        "es-editorial",
        "light-novel"
      ],
      "profile": {
        "id": "visual-novel",
        "enableDropCaps": true,
        "enableLitRpgBrackets": true,
        "enableSceneBreaks": true,
        "footnoteStyle": "end_of_chapter",
        "fullPageIllustrations": true
      }
    },
    {
      "id": "generic",
      "aliases": [
        "en-fiction",
        "fiction"
      ],
      "profile": {
        "id": "generic",
        "enableDropCaps": true,
        "enableLitRpgBrackets": false,
        "enableSceneBreaks": true,
        "footnoteStyle": "end_of_chapter",
        "fullPageIllustrations": false
      }
    },
    {
      "id": "webnovel",
      "aliases": [
        "en-litrpg",
        "litrpg"
      ],
      "profile": {
        "id": "webnovel",
        "enableDropCaps": false,
        "enableLitRpgBrackets": true,
        "enableSceneBreaks": true,
        "footnoteStyle": "callout_card",
        "fullPageIllustrations": true
      }
    },
    {
      "id": "readme",
      "aliases": [],
      "profile": {
        "id": "readme",
        "enableDropCaps": false,
        "enableLitRpgBrackets": false,
        "enableSceneBreaks": true,
        "footnoteStyle": "end_of_chapter",
        "fullPageIllustrations": false
      }
    },
    {
      "id": "paper",
      "aliases": [],
      "profile": {
        "id": "paper",
        "enableDropCaps": false,
        "enableLitRpgBrackets": false,
        "enableSceneBreaks": false,
        "footnoteStyle": "end_of_chapter",
        "fullPageIllustrations": false
      }
    }
  ],
  "presetAliases": {
    "en-fiction": "generic",
    "en-light-novel": "visual-novel",
    "en-litrpg": "webnovel",
    "es-editorial": "visual-novel",
    "fiction": "generic",
    "generic": "generic",
    "light-novel": "visual-novel",
    "litrpg": "webnovel",
    "paper": "paper",
    "readme": "readme",
    "visual-novel": "visual-novel",
    "webnovel": "webnovel"
  },
  "languages": [
    {
      "code": "auto",
      "labels": {
        "es": "Automático",
        "en": "Auto"
      }
    },
    {
      "code": "es",
      "labels": {
        "es": "Español",
        "en": "Spanish"
      }
    },
    {
      "code": "en",
      "labels": {
        "es": "Inglés",
        "en": "English"
      }
    }
  ],
  "dictionaries": [
    {
      "lang": "es",
      "cacheName": "es_frequency.txt",
      "brFileName": "es_frequency.txt.br",
      "url": "/dicts/es_frequency.txt.br"
    },
    {
      "lang": "en",
      "cacheName": "en_frequency.txt",
      "brFileName": "en_frequency.txt.br",
      "url": "/dicts/en_frequency.txt.br"
    },
    {
      "lang": "ja",
      "cacheName": "ja_romaji_common.tsv",
      "brFileName": "ja_romaji_common.tsv.br",
      "url": "/dicts/ja_romaji_common.tsv.br"
    }
  ],
  "defaultEditorialRules": [
    {
      "id": "rule-dialogue-dashes",
      "label": "Standardize Dialogue Em-Dashes",
      "description": "Replaces double hyphens and standard dashes in spoken lines with typographic em-dashes (—).",
      "enabled": true,
      "affectedCount": 0
    },
    {
      "id": "rule-curly-quotes",
      "label": "Smart Curly Quotes & Brackets",
      "description": "Transforms straight quotation marks and angle brackets into curved or guillemet quotes (« » / “ ”).",
      "enabled": true,
      "affectedCount": 0
    },
    {
      "id": "rule-ellipsis",
      "label": "Typographic Ellipses",
      "description": "Substitutes three dots (...) with a single horizontal ellipsis glyph (…).",
      "enabled": true,
      "affectedCount": 0
    },
    {
      "id": "rule-clean-breaks",
      "label": "Consolidate Multiple Blank Lines & Breaks",
      "description": "Removes unnecessary blank lines and preserves deliberate scene transitions.",
      "enabled": true,
      "affectedCount": 0
    },
    {
      "id": "rule-strip-headers",
      "label": "Strip Running Headers, Page Numbers & OCR Fixes",
      "description": "Strips repeated PDF page markers and applies contextual spell/OCR corrections.",
      "enabled": true,
      "affectedCount": 0
    }
  ]
};
