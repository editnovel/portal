import { type SetStoreFunction } from "solid-js/store";
import type { AppState, SpellAuditOptions, SpellCorrectionItem } from "../../types";
import { auditSpellingInEngine } from "../../wasm-bridge";
import {
  correctionScrollTrigger,
  flashStepSpinner,
  setCorrectionScrollTrigger,
} from "./ui.slice";

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createSpellSlice(
  state: AppState,
  setState: SetStoreFunction<AppState>,
  updateSectionHtml: (sectionId: string, html: string) => void,
  setActiveSectionId: (id: string) => void,
  setSelectedCorrectionId: (id: string | null) => void
) {
  function toggleGlobalSpell(): void {
    setState("globalSpellEnabled", (prev) => !prev);
    flashStepSpinner(7);
  }

  function toggleVolumeSpell(fileId: string): void {
    setState("spellVolumeSettings", fileId, (prev) => (prev !== undefined ? !prev : false));
    flashStepSpinner(7);
  }

  function toggleSpellCorrection(correctionId: string): void {
    setState(
      "spellCorrections",
      (c) => c.id === correctionId,
      "enabled",
      (prev) => !prev
    );
    flashStepSpinner(7);
  }

  function acceptAllSpellCorrections(volumeFileId?: string): void {
    setState("spellCorrections", (c) => !volumeFileId || c.fileId === volumeFileId, "enabled", true);
    flashStepSpinner(7);
  }

  function discardAllSpellCorrections(volumeFileId?: string): void {
    setState("spellCorrections", (c) => !volumeFileId || c.fileId === volumeFileId, "enabled", false);
    flashStepSpinner(7);
  }

  function setSpellLanguageMode(mode: "hybrid" | "es" | "en"): void {
    setState("spellLanguageMode", mode);
    reAuditSpelling();
  }

  function toggleSpellIgnoreJapanese(): void {
    setState("spellIgnoreJapanese", (prev) => !prev);
    reAuditSpelling();
  }

  function toggleSpellIgnoreForeign(): void {
    setState("spellIgnoreForeign", (prev) => !prev);
    reAuditSpelling();
  }

  function toggleSpellIgnoreProperNouns(): void {
    setState("spellIgnoreProperNouns", (prev) => !prev);
    reAuditSpelling();
  }

  function addIgnoredWord(word: string): void {
    const trimmed = word.trim();
    if (!trimmed || state.spellIgnoredWords.includes(trimmed)) return;
    setState("spellIgnoredWords", (prev) => [...prev, trimmed]);
    reAuditSpelling();
  }

  function removeIgnoredWord(word: string): void {
    setState("spellIgnoredWords", (prev) => prev.filter((w) => w !== word));
    reAuditSpelling();
  }

  function applySingleCorrection(correctionId: string, customReplacement?: string): void {
    const corr = state.spellCorrections.find((c) => c.id === correctionId);
    if (!corr || corr.applied) return;
    const replacement = customReplacement || corr.replacementToken;

    const clean = (s?: string) => (s ? s.replace(/^\d+[\.\s\-\:]+/, "").trim().toLowerCase() : "");
    const cClean = clean(corr.sectionTitle);

    for (const group of state.sectionGroups) {
      const sec = group.sections.find(
        (s) =>
          (corr.sectionId && s.id === corr.sectionId) ||
          s.title === corr.sectionTitle ||
          s.originalTitle === corr.sectionTitle ||
          (cClean && (clean(s.title) === cClean || clean(s.originalTitle) === cClean))
      );
      if (sec) {
        const esc = escapeRegExp(corr.originalToken);
        const startsWord = /^[\p{L}\p{N}]/u.test(corr.originalToken);
        const endsWord = /[\p{L}\p{N}]$/u.test(corr.originalToken);
        const pattern = `${startsWord ? "(?<![\\p{L}\\p{N}])" : ""}${esc}${endsWord ? "(?![\\p{L}\\p{N}])" : ""}`;
        const regex = new RegExp(pattern, "u");
        const newHtml = sec.htmlContent.replace(regex, replacement);
        updateSectionHtml(sec.id, newHtml);
        break;
      }
    }

    setState("spellCorrections", (c) => c.id === correctionId, {
      applied: true,
      ignored: false,
      enabled: true,
    });
    if (state.selectedCorrectionId === correctionId) {
      setSelectedCorrectionId(null);
    }
  }

  function ignoreSingleCorrection(correctionId: string): void {
    setState("spellCorrections", (c) => c.id === correctionId, { ignored: true, enabled: false });
    if (state.selectedCorrectionId === correctionId) {
      setSelectedCorrectionId(null);
    }
  }

  function navigateToCorrection(correctionId: string): void {
    const corr = state.spellCorrections.find((c) => c.id === correctionId);
    if (!corr) return;

    const clean = (s?: string) => (s ? s.replace(/^\d+[\.\s\-\:]+/, "").trim().toLowerCase() : "");
    const cClean = clean(corr.sectionTitle);

    let targetSecId: string | null = null;
    for (const group of state.sectionGroups) {
      const sec = group.sections.find(
        (s) =>
          (corr.sectionId && s.id === corr.sectionId) ||
          s.id === corr.sectionTitle ||
          s.title === corr.sectionTitle ||
          s.originalTitle === corr.sectionTitle ||
          (cClean && (clean(s.title) === cClean || clean(s.originalTitle) === cClean)) ||
          (corr.sectionTitle && s.title.includes(corr.sectionTitle)) ||
          (corr.sectionTitle && corr.sectionTitle.includes(s.title))
      );
      if (sec) {
        targetSecId = sec.id;
        break;
      }
    }

    if (targetSecId && state.activeSectionId !== targetSecId) {
      setActiveSectionId(targetSecId);
    }
    setSelectedCorrectionId(correctionId);
    setCorrectionScrollTrigger({ id: correctionId, timestamp: Date.now() });
  }

  function applyAllCorrections(categoryFilter?: SpellCorrectionItem["category"] | "all"): void {
    const toApply = state.spellCorrections.filter(
      (c) =>
        !c.applied &&
        !c.ignored &&
        c.enabled !== false &&
        (!categoryFilter || categoryFilter === "all" || c.category === categoryFilter)
    );
    if (toApply.length === 0) return;

    const appliedIds = new Set<string>();
    const clean = (s?: string) => (s ? s.replace(/^\d+[\.\s\-\:]+/, "").trim().toLowerCase() : "");

    setState("sectionGroups", (groups) =>
      groups.map((group) => ({
        ...group,
        sections: group.sections.map((sec) => {
          let content = sec.htmlContent;
          const sTitleClean = clean(sec.title);
          const sOrigClean = clean(sec.originalTitle);

          const secCorrections = toApply.filter(
            (c) =>
              (c.sectionId && c.sectionId === sec.id) ||
              c.sectionTitle === sec.title ||
              c.sectionTitle === sec.originalTitle ||
              (clean(c.sectionTitle) &&
                (clean(c.sectionTitle) === sTitleClean || clean(c.sectionTitle) === sOrigClean))
          );
          for (const c of secCorrections) {
            if (appliedIds.has(c.id)) continue;
            const esc = escapeRegExp(c.originalToken);
            const startsWord = /^[\p{L}\p{N}]/u.test(c.originalToken);
            const endsWord = /[\p{L}\p{N}]$/u.test(c.originalToken);
            const pattern = `${startsWord ? "(?<![\\p{L}\\p{N}])" : ""}${esc}${endsWord ? "(?![\\p{L}\\p{N}])" : ""}`;
            const regex = new RegExp(pattern, "u");
            if (regex.test(content)) {
              content = content.replace(regex, c.replacementToken);
              appliedIds.add(c.id);
            }
          }
          return { ...sec, htmlContent: content };
        }),
      }))
    );

    setState("spellCorrections", (c) => appliedIds.has(c.id), {
      applied: true,
      ignored: false,
      enabled: true,
    });
  }

  function mergeSectionCorrections(
    sectionTitle: string,
    newCorrections: SpellCorrectionItem[]
  ): void {
    setState("spellCorrections", (prev) => {
      const retained = prev.filter((c) => c.sectionTitle !== sectionTitle);
      return [...retained, ...newCorrections];
    });
  }

  function mergeParagraphCorrections(
    sectionTitle: string,
    dirtyParagraphIds: string[],
    newCorrections: SpellCorrectionItem[]
  ): void {
    const dirtySet = new Set(dirtyParagraphIds);
    setState("spellCorrections", (prev) => {
      const retained = prev.filter(
        (c) => !(c.sectionTitle === sectionTitle && c.paragraphId && dirtySet.has(c.paragraphId))
      );
      return [...retained, ...newCorrections];
    });
  }

  async function reAuditSpelling(): Promise<void> {
    const options: SpellAuditOptions = {
      languageMode: state.spellLanguageMode,
      ignoreJapanese: state.spellIgnoreJapanese,
      ignoreForeign: state.spellIgnoreForeign,
      ignoreProperNouns: state.spellIgnoreProperNouns,
      ignoredWords: [...state.spellIgnoredWords],
    };

    const disabledIds = new Set(state.spellCorrections.filter((c) => !c.enabled).map((c) => c.id));
    let allCorrections: SpellCorrectionItem[] = [];
    let totalJapanese = 0;
    let totalForeign = 0;
    let totalProperNouns = 0;

    for (const file of state.files) {
      const res = await auditSpellingInEngine(file.name, options);
      for (const c of res.corrections) {
        if (disabledIds.has(c.id)) {
          c.enabled = false;
        }
      }
      allCorrections = allCorrections.concat(res.corrections);
      totalJapanese += res.ignoredJapaneseCount;
      totalForeign += res.ignoredForeignCount;
      totalProperNouns += res.ignoredProperNounsCount;
    }

    setState("spellCorrections", allCorrections);
    setState("spellIgnoredJapaneseCount", totalJapanese);
    setState("spellIgnoredForeignCount", totalForeign);
    setState("spellIgnoredProperNounsCount", totalProperNouns);
    flashStepSpinner(7);
  }

  return {
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
  };
}
