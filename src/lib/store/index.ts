import { batch, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { safeRevokeBlobUrl } from "../blob-utils";
import { DEFAULT_READER_SETTINGS } from "../reader-settings";
import type { AppState } from "../types";
import {
  buildEpubFromEngine,
  clearCustomCoverBridge,
  removeBookFileFromEngine,
} from "../wasm-bridge";
import { createFilesSlice, filterDiscardedImages } from "./slices/files.slice";
import {
  createMetadataSlice,
  customCoverBlob,
  INITIAL_METADATA,
  setCustomCoverBlob,
  userEditedMetadata,
} from "./slices/metadata.slice";
import {
  applyDialogueUnification,
  applyEllipsisUnification,
  applyQuotesUnification,
  createRulesSlice,
} from "./slices/rules.slice";
import { createSectionsSlice } from "./slices/sections.slice";
import { createSpellSlice } from "./slices/spell.slice";
import {
  createUiSlice,
  getInitialLocalSaveEnabled,
} from "./slices/ui.slice";
import {
  createDefaultInitialGroup,
  DEFAULT_INITIAL_SECTION_ID,
  INITIAL_EDITORIAL_RULES,
  INITIAL_GLOSSARY,
  INITIAL_REGEX_RULES,
} from "./templates";

const [state, setState] = createStore<AppState>({
  currentStep: 1,
  selectedPreset: "visual-novel",
  modalMode: "docked",
  files: [],
  sectionGroups: [createDefaultInitialGroup()],
  activeSectionId: DEFAULT_INITIAL_SECTION_ID,
  metadata: INITIAL_METADATA,
  images: [],
  showSpoilers: false,
  editorialRules: INITIAL_EDITORIAL_RULES,
  regexRules: INITIAL_REGEX_RULES,
  glossary: INITIAL_GLOSSARY,
  readerSettings: { ...DEFAULT_READER_SETTINGS },
  sidebarOpen: true,
  syncScroll: true,
  isProcessing: false,
  stepSpinners: {},
  readerSettingsOpen: false,
  saveExportOpen: false,
  localSaveEnabled: getInitialLocalSaveEnabled(),
  lastSavedTimestamp: null,
  rightPaneMode: "original",
  selectedCorrectionId: null,
  unifyBreaks: true,
  unifiedBreakSymbol: "◆ ◇ ◆ ◇ ◆",
  unifyDialogue: true,
  unifiedDialogueSymbol: "「 」",
  unifyQuotes: true,
  unifiedQuoteSymbol: "« »",
  unifyEllipsis: true,
  unifiedEllipsisSymbol: "……",
  globalSpellEnabled: true,
  spellLanguageMode: "hybrid",
  spellIgnoreJapanese: true,
  spellIgnoreForeign: true,
  spellIgnoreProperNouns: true,
  spellIgnoredWords: [],
  spellVolumeSettings: {},
  spellCorrections: [],
  spellIgnoredJapaneseCount: 0,
  spellIgnoredForeignCount: 0,
  spellIgnoredProperNounsCount: 0,
});

const {
  uiSlice,
  sectionsSlice,
  metadataSlice,
  filesSlice,
  rulesSlice,
  spellSlice,
} = createRoot(() => {
  const ui = createUiSlice(setState);
  const sections = createSectionsSlice(state, setState);
  const metadata = createMetadataSlice(state, setState);
  const files = createFilesSlice(
    state,
    setState,
    userEditedMetadata,
    metadata.applyAutoMetadataSuggestions
  );
  const rules = createRulesSlice(state, setState);
  const spell = createSpellSlice(
    state,
    setState,
    sections.updateSectionHtml,
    sections.setActiveSectionId,
    ui.setSelectedCorrectionId
  );
  return {
    uiSlice: ui,
    sectionsSlice: sections,
    metadataSlice: metadata,
    filesSlice: files,
    rulesSlice: rules,
    spellSlice: spell,
  };
});

export async function exportCurrentEpub(): Promise<void> {
  const activeGroups = state.sectionGroups.filter((g) => {
    const file = state.files.find((f) => f.name === g.fileId);
    return file ? file.active : true;
  });
  const cleanedGroups = activeGroups.map((g) => ({
    ...g,
    sections: g.sections.map((s) => {
      let content = filterDiscardedImages(s.htmlContent, state.images);
      if (state.unifyBreaks && state.unifiedBreakSymbol) {
        content = content.replace(
          /<div[^>]*class=["'][^"']*scene-break[^"']*["'][^>]*>.*?<\/div>/gi,
          `<div class="scene-break">${state.unifiedBreakSymbol}</div>`
        );
      }
      if (state.unifyDialogue && state.unifiedDialogueSymbol) {
        content = applyDialogueUnification(content, state.unifiedDialogueSymbol);
      }
      if (state.unifyQuotes && state.unifiedQuoteSymbol) {
        content = applyQuotesUnification(content, state.unifiedQuoteSymbol);
      }
      if (state.unifyEllipsis && state.unifiedEllipsisSymbol) {
        content = applyEllipsisUnification(content, state.unifiedEllipsisSymbol);
      }
      content = content.replace(
        /<span[^>]*class=["'][^"']*spell-applied[^"']*["'][^>]*>(.*?)<\/span>/gi,
        "$1"
      );
      for (const img of state.images) {
        if (!img.isDiscarded && img.url) {
          content = content.split(img.url).join(`../Images/${img.name}`);
        }
      }
      return { ...s, htmlContent: content };
    }),
  }));
  const blob = await buildEpubFromEngine(
    state.metadata,
    cleanedGroups,
    state.images,
    state.editorialRules,
    state.regexRules,
    state.glossary,
    state.spellCorrections,
    state.globalSpellEnabled,
    state.spellVolumeSettings
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.metadata.title.replace(/\s+/g, "_") || "book"}.epub`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function resetProject(): void {
  void clearCustomCoverBridge();
  setCustomCoverBlob(null);
  userEditedMetadata.clear();
  for (const file of state.files) {
    if (file.pdfBlobUrl) {
      safeRevokeBlobUrl(file.pdfBlobUrl);
    }
    removeBookFileFromEngine(file.name);
  }
  for (const img of state.images) {
    safeRevokeBlobUrl(img.url);
  }
  if (state.metadata.isCustomCover) {
    safeRevokeBlobUrl(state.metadata.coverUrl);
  }
  batch(() => {
    const defGroup = createDefaultInitialGroup();
    setState("files", []);
    setState("sectionGroups", [defGroup]);
    setState("images", []);
    setState("activeSectionId", DEFAULT_INITIAL_SECTION_ID);
    setState("metadata", { ...INITIAL_METADATA });
    setState("editorialRules", (prev) => prev.map((r) => ({ ...r, affectedCount: 0 })));
    setState("regexRules", []);
    setState("glossary", []);
    setState("currentStep", 1);
    setState("selectedPreset", "visual-novel");
    setState("modalMode", "docked");
    setState("globalSpellEnabled", true);
    setState("spellLanguageMode", "hybrid");
    setState("spellIgnoreJapanese", true);
    setState("spellIgnoreForeign", true);
    setState("spellIgnoreProperNouns", true);
    setState("spellIgnoredWords", []);
    setState("spellVolumeSettings", {});
    setState("spellCorrections", []);
    setState("spellIgnoredJapaneseCount", 0);
    setState("spellIgnoredForeignCount", 0);
    setState("spellIgnoredProperNounsCount", 0);
  });
}

export { state, setState };

// Re-export UI Slice
export const {
  setStep,
  setPreset,
  setModalMode,
  setModalModeWithTransition,
  setStepAndModalModeWithTransition,
  setReaderSettingsOpen,
  toggleReaderSettings,
  toggleSaveExport,
  setSaveExportOpen,
  setLocalSaveEnabled,
  toggleSidebar,
  toggleSyncScroll,
  updateReaderSettings,
  flashStepSpinner,
  setRightPaneMode,
  setSelectedCorrectionId,
} = uiSlice;

export {
  projectVersion,
  touchProject,
  registerAutoSaveCanceller,
  cancelPendingAutoSave,
  correctionScrollTrigger,
  setCorrectionScrollTrigger,
} from "./slices/ui.slice";

// Re-export Sections Slice
export const {
  setSectionGroups,
  toggleGroupCollapse,
  setAllGroupsCollapsed,
  updateSectionTitle,
  resetSectionTitle,
  setActiveSectionId,
  scrollEditorToTop,
  updateSectionHtml,
  addNewSection,
  addNewPart,
  deleteSection,
  deletePart,
  updatePartTitle,
  activeSection,
  activeRawSection,
  activePdfBlobUrl,
  activeOriginalFileType,
} = sectionsSlice;

// Re-export Metadata Slice
export const {
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
} = metadataSlice;

export {
  userEditedMetadata,
  customCoverBlob,
  setCustomCoverBlob,
  getCustomCoverBlob,
} from "./slices/metadata.slice";

// Re-export Files Slice
export const {
  hasReadyFiles,
  addFiles,
  toggleFileActive,
  removeFile,
  toggleImageDiscard,
  markImageDiscardedByUrl,
  toggleShowSpoilers,
  toggleDiscardTinyImages,
  discardTinyImages,
} = filesSlice;

export { filterDiscardedImages } from "./slices/files.slice";

// Re-export Rules Slice
export const {
  toggleEditorialRule,
  toggleRegexRule,
  addRegexRule,
  removeRegexRule,
  addGlossaryReplacement,
  removeGlossaryReplacement,
  toggleGlossaryReplacement,
  setUnifyBreaks,
  setUnifiedBreakSymbol,
  setUnifyDialogue,
  setUnifiedDialogueSymbol,
  setUnifyQuotes,
  setUnifiedQuoteSymbol,
  setUnifyEllipsis,
  setUnifiedEllipsisSymbol,
  detectedSceneBreaks,
  detectedDialogueLines,
  detectedQuotes,
  detectedEllipses,
} = rulesSlice;

export {
  formatDialogueWithSymbol,
  applyDialogueUnification,
  applyQuotesUnification,
  applyEllipsisUnification,
} from "./slices/rules.slice";

// Re-export Spell Slice
export const {
  toggleGlobalSpell,
  toggleVolumeSpell,
  toggleSpellCorrection,
  acceptAllSpellCorrections,
  discardAllSpellCorrections,
  setSpellLanguageMode,
  toggleSpellIgnoreJapanese,
  toggleSpellIgnoreForeign,
  toggleSpellIgnoreProperNouns,
  addIgnoredWord,
  removeIgnoredWord,
  applySingleCorrection,
  ignoreSingleCorrection,
  navigateToCorrection,
  applyAllCorrections,
  mergeSectionCorrections,
  mergeParagraphCorrections,
  reAuditSpelling,
} = spellSlice;

export {
  DEFAULT_INITIAL_SECTION_ID,
  DEFAULT_TEMPLATE_HTML,
  createDefaultInitialGroup,
  INITIAL_EDITORIAL_RULES,
} from "./templates";

export { INITIAL_METADATA } from "./slices/metadata.slice";
