import { createMemo } from "solid-js";
import { type SetStoreFunction } from "solid-js/store";
import type {
  AppState,
  DetectedDialogueItem,
  DetectedEllipsisItem,
  DetectedQuoteItem,
  DetectedSceneBreak,
  GlossaryReplacement,
  RegexRule,
} from "../../types";
import { flashStepSpinner } from "./ui.slice";

export function formatDialogueWithSymbol(cleanText: string, symbol: string): string {
  const trimmed = symbol.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2) {
    return `${parts[0]}${cleanText}${parts[1]}`;
  }
  if (trimmed === "「」" || trimmed === "「 」") {
    return `「${cleanText}」`;
  }
  if (trimmed === "『』" || trimmed === "『 』") {
    return `『${cleanText}』`;
  }
  if (trimmed === "«»" || trimmed === "« »") {
    return `«${cleanText}»`;
  }
  if (trimmed === "“”" || trimmed === "“ ”") {
    return `“${cleanText}”`;
  }
  return `${trimmed} ${cleanText}`;
}

export function applyDialogueUnification(html: string, symbol: string): string {
  if (!html || !symbol) return html;
  return html.replace(
    /<p([^>]*)>\s*([—–\-]{1,2}\s*|[「『«“"])([\s\S]*?)<\/p>/gi,
    (_match, attrs, _prefix, inner) => {
      let clean = inner.trim();
      clean = clean.replace(/[」』»”"]$/, "").trim();
      const formatted = formatDialogueWithSymbol(clean, symbol);
      return `<p${attrs}>${formatted}</p>`;
    }
  );
}

export function applyQuotesUnification(html: string, symbol: string): string {
  if (!html || !symbol) return html;
  const parts = symbol.trim().split(/\s+/);
  const open = parts[0] || "«";
  const close = parts[1] || parts[0] || "»";
  return html.replace(
    /([>\s(\[])["“«「]([^"”»」]+)["”»」]/g,
    `$1${open}$2${close}`
  );
}

export function applyEllipsisUnification(html: string, symbol: string): string {
  if (!html || !symbol) return html;
  return html.replace(/(\.{3,}|…+)/g, symbol);
}

export function createRulesSlice(state: AppState, setState: SetStoreFunction<AppState>) {
  function toggleEditorialRule(ruleId: string): void {
    setState(
      "editorialRules",
      (r) => r.id === ruleId,
      "enabled",
      (prev) => !prev
    );
    flashStepSpinner(8);
  }

  function toggleRegexRule(ruleId: string): void {
    setState(
      "regexRules",
      (r) => r.id === ruleId,
      "enabled",
      (prev) => !prev
    );
    flashStepSpinner(8);
  }

  function addRegexRule(pattern: string, replacement: string, flags = "g"): void {
    const newRule: RegexRule = {
      id: `reg-${Date.now()}`,
      pattern,
      replacement,
      enabled: true,
      flags,
      affectedCount: 0,
    };
    setState("regexRules", (prev) => [...prev, newRule]);
    flashStepSpinner(8);
  }

  function removeRegexRule(ruleId: string): void {
    setState("regexRules", (prev) => prev.filter((r) => r.id !== ruleId));
    flashStepSpinner(8);
  }

  function addGlossaryReplacement(find: string, replace: string): void {
    const item: GlossaryReplacement = {
      id: `gloss-${Date.now()}`,
      find,
      replace,
      enabled: true,
    };
    setState("glossary", (prev) => [...prev, item]);
    flashStepSpinner(8);
  }

  function removeGlossaryReplacement(id: string): void {
    setState("glossary", (prev) => prev.filter((g) => g.id !== id));
    flashStepSpinner(8);
  }

  function toggleGlossaryReplacement(id: string): void {
    setState(
      "glossary",
      (g) => g.id === id,
      "enabled",
      (prev) => !prev
    );
    flashStepSpinner(8);
  }

  function setUnifyBreaks(enabled: boolean): void {
    setState("unifyBreaks", enabled);
  }

  function setUnifiedBreakSymbol(symbol: string): void {
    setState("unifiedBreakSymbol", symbol);
  }

  function setUnifyDialogue(enabled: boolean): void {
    setState("unifyDialogue", enabled);
    setState("editorialRules", (r) => r.id === "rule-dialogue-dashes", "enabled", enabled);
  }

  function setUnifiedDialogueSymbol(symbol: string): void {
    setState("unifiedDialogueSymbol", symbol);
  }

  function setUnifyQuotes(enabled: boolean): void {
    setState("unifyQuotes", enabled);
    setState("editorialRules", (r) => r.id === "rule-curly-quotes", "enabled", enabled);
  }

  function setUnifiedQuoteSymbol(symbol: string): void {
    setState("unifiedQuoteSymbol", symbol);
  }

  function setUnifyEllipsis(enabled: boolean): void {
    setState("unifyEllipsis", enabled);
    setState("editorialRules", (r) => r.id === "rule-ellipsis", "enabled", enabled);
  }

  function setUnifiedEllipsisSymbol(symbol: string): void {
    setState("unifiedEllipsisSymbol", symbol);
  }

  interface SectionRulesCacheItem {
    html: string;
    breaks: DetectedSceneBreak[];
    dialogue: DetectedDialogueItem[];
    quotes: DetectedQuoteItem[];
    ellipses: DetectedEllipsisItem[];
  }

  const sectionRulesCache = new Map<string, SectionRulesCacheItem>();

  function extractSectionRules(
    secId: string,
    secTitle: string,
    fileId: string,
    html: string
  ): SectionRulesCacheItem {
    const cached = sectionRulesCache.get(secId);
    if (cached && cached.html === html) {
      return cached;
    }

    const breaks: DetectedSceneBreak[] = [];
    const dialogue: DetectedDialogueItem[] = [];
    const quotes: DetectedQuoteItem[] = [];
    const ellipses: DetectedEllipsisItem[] = [];

    if (!html) {
      const empty = { html, breaks, dialogue, quotes, ellipses };
      sectionRulesCache.set(secId, empty);
      return empty;
    }

    const breakRegex = /<(?:div|p)[^>]*class=["'][^"']*(?:scene-break|break)[^"']*["'][^>]*data-symbol=["']([^"']+)["'][^>]*>|<(?:div|p)[^>]*class=["'][^"']*(?:scene-break|break)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p)>|<hr[^>]*class=["'][^"']*(?:scene-break|break)[^"']*["'][^>]*>/gi;
    let bMatch: RegExpExecArray | null;
    let bCount = 0;
    while ((bMatch = breakRegex.exec(html)) !== null) {
      bCount++;
      const sym = (bMatch[1] || bMatch[2] || "◆ ◇ ◆ ◇ ◆").replace(/<[^>]+>/g, "").trim();
      const idx = bMatch.index;
      const beforeHtml = html.slice(Math.max(0, idx - 150), idx).replace(/<[^>]+>/g, " ").trim();
      const afterHtml = html.slice(idx + bMatch[0].length, idx + bMatch[0].length + 150).replace(/<[^>]+>/g, " ").trim();
      breaks.push({
        id: `sb-${secId}-${bCount}`,
        sectionId: secId,
        sectionTitle: secTitle,
        fileId,
        symbol: sym || "◆ ◇ ◆ ◇ ◆",
        snippetBefore: beforeHtml ? (beforeHtml.length > 70 ? "…" + beforeHtml.slice(-70) : beforeHtml) : "",
        snippetAfter: afterHtml ? (afterHtml.length > 70 ? afterHtml.slice(0, 70) + "…" : afterHtml) : "",
      });
    }

    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch: RegExpExecArray | null;
    let dCount = 0;
    let qCount = 0;
    let eCount = 0;

    const quoteRe = /(?:(")([^"]+)(")|(“)([^”]+)(”)|(«)([^»]+)(»)|(「)([^」]+)(」))/g;
    const ellipsisRe = /(\.{3,}|…+)/g;

    while ((pMatch = pRegex.exec(html)) !== null) {
      const raw = pMatch[1].replace(/<[^>]+>/g, "").trim();
      if (!raw) continue;

      const dMatch = raw.match(/^([—–\-]{1,2}\s*|[「『«“"])/);
      if (dMatch) {
        dCount++;
        const prefix = dMatch[1];
        let clean = raw.slice(prefix.length).trim();
        clean = clean.replace(/[」』»”"]$/, "").trim();
        dialogue.push({
          id: `dl-${secId}-${dCount}`,
          sectionId: secId,
          sectionTitle: secTitle,
          fileId,
          originalPrefix: prefix.trim() || prefix,
          text: clean,
          snippet: raw.length > 90 ? raw.slice(0, 90) + "…" : raw,
        });
      }

      quoteRe.lastIndex = 0;
      let qm: RegExpExecArray | null;
      while ((qm = quoteRe.exec(raw)) !== null) {
        qCount++;
        const open = qm[1] || qm[4] || qm[7] || qm[10] || '"';
        const text = qm[2] || qm[5] || qm[8] || qm[11] || "";
        const close = qm[3] || qm[6] || qm[9] || qm[12] || '"';
        const startIdx = Math.max(0, qm.index - 20);
        const endIdx = Math.min(raw.length, qm.index + qm[0].length + 20);
        const snippet =
          (startIdx > 0 ? "…" : "") +
          raw.slice(startIdx, endIdx) +
          (endIdx < raw.length ? "…" : "");
        quotes.push({
          id: `qt-${secId}-${qCount}`,
          sectionId: secId,
          sectionTitle: secTitle,
          fileId,
          openChar: open,
          closeChar: close,
          text,
          snippet,
        });
        if (qCount > 250) break;
      }

      ellipsisRe.lastIndex = 0;
      let em: RegExpExecArray | null;
      while ((em = ellipsisRe.exec(raw)) !== null) {
        eCount++;
        const symbol = em[1];
        const startIdx = Math.max(0, em.index - 20);
        const endIdx = Math.min(raw.length, em.index + symbol.length + 20);
        const snippet =
          (startIdx > 0 ? "…" : "") +
          raw.slice(startIdx, endIdx) +
          (endIdx < raw.length ? "…" : "");
        ellipses.push({
          id: `el-${secId}-${eCount}`,
          sectionId: secId,
          sectionTitle: secTitle,
          fileId,
          symbol,
          snippet,
        });
        if (eCount > 250) break;
      }
    }

    const result: SectionRulesCacheItem = { html, breaks, dialogue, quotes, ellipses };
    sectionRulesCache.set(secId, result);
    return result;
  }

  const detectedSceneBreaks = createMemo<DetectedSceneBreak[]>(() => {
    const groups = state.sectionGroups;
    const results: DetectedSceneBreak[] = [];
    for (const group of groups) {
      for (const sec of group.sections) {
        if (!sec.htmlContent) continue;
        const data = extractSectionRules(sec.id, sec.title || sec.originalTitle || "Sección", sec.fileId, sec.htmlContent);
        results.push(...data.breaks);
      }
    }
    return results;
  });

  const detectedDialogueLines = createMemo<DetectedDialogueItem[]>(() => {
    const groups = state.sectionGroups;
    const results: DetectedDialogueItem[] = [];
    for (const group of groups) {
      for (const sec of group.sections) {
        if (!sec.htmlContent) continue;
        const data = extractSectionRules(sec.id, sec.title || sec.originalTitle || "Sección", sec.fileId, sec.htmlContent);
        results.push(...data.dialogue);
      }
    }
    return results;
  });

  const detectedQuotes = createMemo<DetectedQuoteItem[]>(() => {
    const groups = state.sectionGroups;
    const results: DetectedQuoteItem[] = [];
    for (const group of groups) {
      for (const sec of group.sections) {
        if (!sec.htmlContent) continue;
        const data = extractSectionRules(sec.id, sec.title || sec.originalTitle || "Sección", sec.fileId, sec.htmlContent);
        results.push(...data.quotes);
      }
    }
    return results;
  });

  const detectedEllipses = createMemo<DetectedEllipsisItem[]>(() => {
    const groups = state.sectionGroups;
    const results: DetectedEllipsisItem[] = [];
    for (const group of groups) {
      for (const sec of group.sections) {
        if (!sec.htmlContent) continue;
        const data = extractSectionRules(sec.id, sec.title || sec.originalTitle || "Sección", sec.fileId, sec.htmlContent);
        results.push(...data.ellipses);
      }
    }
    return results;
  });

  return {
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
  };
}
