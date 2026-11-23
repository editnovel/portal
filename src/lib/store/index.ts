import { batch, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { safeRevokeBlobUrl } from "../blob-utils";
import { DEFAULT_READER_SETTINGS } from "../reader-settings";
import type { AppState, ExtractedImage } from "../types";
import {
  buildEpubFromEngine,
  clearCustomCoverBridge,
  removeBookFileFromEngine,
} from "../wasm-bridge";
import { createFilesSlice, filterDiscardedImages } from "./slices/files.slice";
import {
  createMetadataSlice,
  customCoverBlob,
  getCustomCoverBlob,
  INITIAL_METADATA,
  setCustomCoverBlob,
  userEditedMetadata,
} from "./slices/metadata.slice";
import {
  applyDialogueUnification,
  applyEllipsisUnification,
  applyQuotesUnification,
  createRulesSlice,
  formatDialogueWithSymbol,
} from "./slices/rules.slice";
import { createSectionsSlice } from "./slices/sections.slice";
import { createSpellSlice } from "./slices/spell.slice";
import {
  cancelPendingAutoSave,
  correctionScrollTrigger,
  createUiSlice,
  getInitialLocalSaveEnabled,
  projectVersion,
  registerAutoSaveCanceller,
  setCorrectionScrollTrigger,
  touchProject,
} from "./slices/ui.slice";
import {
  createDefaultInitialGroup,
  DEFAULT_INITIAL_SECTION_ID,
  DEFAULT_TEMPLATE_HTML,
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

const { uiSlice, sectionsSlice, metadataSlice, filesSlice, rulesSlice, spellSlice } = createRoot(
  () => {
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
  }
);

function finalizeSectionExportDom(
  html: string,
  unifyBreaks: boolean,
  unifiedBreakSymbol: string,
  images: ExtractedImage[]
): string {
  if (!html || typeof DOMParser === "undefined") return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  let mutated = false;

  if (unifyBreaks && unifiedBreakSymbol) {
    const breakNodes = Array.from(doc.body.querySelectorAll("div.scene-break, [data-scene-break]"));
    for (const brNode of breakNodes) {
      brNode.className = "scene-break";
      brNode.removeAttribute("data-symbol");
      brNode.textContent = unifiedBreakSymbol;
      mutated = true;
    }
  }

  const spellSpans = Array.from(doc.body.querySelectorAll("span.spell-applied"));
  for (const span of spellSpans) {
    const parent = span.parentNode;
    if (parent) {
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
      mutated = true;
    }
  }

  const imageMap = new Map<string, string>();
  for (const img of images) {
    if (!img.isDiscarded && img.url) {
      imageMap.set(img.url, `../Images/${img.name}`);
    }
  }

  if (imageMap.size > 0) {
    const imgNodes = Array.from(doc.body.querySelectorAll("img"));
    for (const imgEl of imgNodes) {
      const src = imgEl.getAttribute("src");
      if (src && imageMap.has(src)) {
        imgEl.setAttribute("src", imageMap.get(src) || src);
        mutated = true;
      }
    }
  }

  return mutated ? doc.body.innerHTML : html;
}

export async function exportCurrentEpub(): Promise<void> {
  const activeGroups = state.sectionGroups.filter((g) => {
    const file = state.files.find((f) => f.name === g.fileId);
    return file ? file.active : true;
  });
  const cleanedGroups = activeGroups.map((g) => ({
    ...g,
    sections: g.sections.map((s) => {
      let content = filterDiscardedImages(s.htmlContent, state.images);
      if (state.unifyDialogue && state.unifiedDialogueSymbol) {
        content = applyDialogueUnification(content, state.unifiedDialogueSymbol);
      }
      if (state.unifyQuotes && state.unifiedQuoteSymbol) {
        content = applyQuotesUnification(content, state.unifiedQuoteSymbol);
      }
      if (state.unifyEllipsis && state.unifiedEllipsisSymbol) {
        content = applyEllipsisUnification(content, state.unifiedEllipsisSymbol);
      }
      content = finalizeSectionExportDom(
        content,
        state.unifyBreaks,
        state.unifiedBreakSymbol,
        state.images
      );
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

export { setState, state };

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
  cancelPendingAutoSave,
  correctionScrollTrigger,
  projectVersion,
  registerAutoSaveCanceller,
  setCorrectionScrollTrigger,
  touchProject,
};

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

export { customCoverBlob, getCustomCoverBlob, setCustomCoverBlob, userEditedMetadata };

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
  runOcrForFile,
} = filesSlice;

export { filterDiscardedImages };

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
  applyDialogueUnification,
  applyEllipsisUnification,
  applyQuotesUnification,
  formatDialogueWithSymbol,
};

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
  createDefaultInitialGroup,
  DEFAULT_INITIAL_SECTION_ID,
  DEFAULT_TEMPLATE_HTML,
  INITIAL_EDITORIAL_RULES,
  INITIAL_METADATA,
};
