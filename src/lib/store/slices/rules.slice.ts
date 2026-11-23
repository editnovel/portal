import { createMemo } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
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

function getDialogueDelimiters(symbol: string): { open: string; close: string } {
  const trimmed = symbol.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2) {
    return { open: parts[0], close: parts[1] };
  }
  if (trimmed === "「」" || trimmed === "「 」") {
    return { open: "「", close: "」" };
  }
  if (trimmed === "『』" || trimmed === "『 』") {
    return { open: "『", close: "』" };
  }
  if (trimmed === "«»" || trimmed === "« »") {
    return { open: "«", close: "»" };
  }
  if (trimmed === "“”" || trimmed === "“ ”") {
    return { open: "“", close: "”" };
  }
  return { open: `${trimmed} `, close: "" };
}

export function formatDialogueWithSymbol(cleanText: string, symbol: string): string {
  const { open, close } = getDialogueDelimiters(symbol);
  return `${open}${cleanText}${close}`;
}

function collectEligibleTextNodes(doc: Document, root: Node): Text[] {
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent?.closest("code, pre, script, style")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

export function applyDialogueUnification(html: string, symbol: string): string {
  if (!html || !symbol || typeof DOMParser === "undefined") return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const paragraphs = Array.from(doc.body.querySelectorAll("p"));
  if (paragraphs.length === 0) return html;

  const { open, close } = getDialogueDelimiters(symbol);
  let mutated = false;

  for (const p of paragraphs) {
    if (p.closest("code, pre")) continue;
    const textNodes = collectEligibleTextNodes(doc, p).filter(
      (n) => (n.nodeValue || "").trim().length > 0
    );
    if (textNodes.length === 0) continue;

    const firstNode = textNodes[0];
    const firstVal = firstNode.nodeValue || "";
    const leadMatch = firstVal.match(/^(\s*)([—–-]{1,2}\s*|[「『«“"])/);
    if (!leadMatch) continue;

    const strippedFirst = firstVal.slice(leadMatch[0].length);
    firstNode.nodeValue = `${leadMatch[1]}${open}${strippedFirst}`;

    const lastNode = textNodes[textNodes.length - 1];
    const lastVal = lastNode.nodeValue || "";
    const strippedLast = lastVal.replace(/[」』»”"](\s*)$/, "$1");
    lastNode.nodeValue = close ? `${strippedLast.trimEnd()}${close}` : strippedLast;
    mutated = true;
  }

  return mutated ? doc.body.innerHTML : html;
}

export function applyQuotesUnification(html: string, symbol: string): string {
  if (!html || !symbol || typeof DOMParser === "undefined") return html;
  const parts = symbol.trim().split(/\s+/);
  const open = parts[0] || "«";
  const close = parts[1] || parts[0] || "»";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const textNodes = collectEligibleTextNodes(doc, doc.body);
  if (textNodes.length === 0) return html;

  const quotePattern = /(^|[\s([—–-])["“«「]([^"”»」]+)["”»」]/g;
  let mutated = false;

  for (const node of textNodes) {
    const val = node.nodeValue;
    if (!val) continue;
    quotePattern.lastIndex = 0;
    if (quotePattern.test(val)) {
      quotePattern.lastIndex = 0;
      node.nodeValue = val.replace(quotePattern, `$1${open}$2${close}`);
      mutated = true;
    }
  }

  return mutated ? doc.body.innerHTML : html;
}

export function applyEllipsisUnification(html: string, symbol: string): string {
  if (!html || !symbol || typeof DOMParser === "undefined") return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const textNodes = collectEligibleTextNodes(doc, doc.body);
  if (textNodes.length === 0) return html;

  const ellipsisPattern = /(\.{3,}|…+)/g;
  let mutated = false;

  for (const node of textNodes) {
    const val = node.nodeValue;
    if (!val) continue;
    ellipsisPattern.lastIndex = 0;
    if (ellipsisPattern.test(val)) {
      ellipsisPattern.lastIndex = 0;
      node.nodeValue = val.replace(ellipsisPattern, symbol);
      mutated = true;
    }
  }

  return mutated ? doc.body.innerHTML : html;
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

    if (!html || typeof DOMParser === "undefined") {
      const empty = { html, breaks, dialogue, quotes, ellipses };
      sectionRulesCache.set(secId, empty);
      return empty;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const breakElements = Array.from(
      doc.body.querySelectorAll(
        "div.scene-break, div.break, p.scene-break, p.break, hr.scene-break, hr.break, [data-scene-break]"
      )
    );
    let bCount = 0;
    for (const brEl of breakElements) {
      bCount++;
      const sym = (brEl.getAttribute("data-symbol") || brEl.textContent || "◆ ◇ ◆ ◇ ◆").trim();
      const beforeText = (brEl.previousElementSibling?.textContent || "").trim();
      const afterText = (brEl.nextElementSibling?.textContent || "").trim();
      breaks.push({
        id: `sb-${secId}-${bCount}`,
        sectionId: secId,
        sectionTitle: secTitle,
        fileId,
        symbol: sym || "◆ ◇ ◆ ◇ ◆",
        snippetBefore: beforeText
          ? beforeText.length > 70
            ? `…${beforeText.slice(-70)}`
            : beforeText
          : "",
        snippetAfter: afterText
          ? afterText.length > 70
            ? `${afterText.slice(0, 70)}…`
            : afterText
          : "",
      });
    }

    const paragraphElements = Array.from(doc.body.querySelectorAll("p"));
    let dCount = 0;
    let qCount = 0;
    let eCount = 0;

    const quoteRe = /(?:(")([^"]+)(")|(“)([^”]+)(”)|(«)([^»]+)(»)|(「)([^」]+)(」))/g;
    const ellipsisRe = /(\.{3,}|…+)/g;

    for (const pEl of paragraphElements) {
      if (
        pEl.closest("code, pre") ||
        pEl.classList.contains("scene-break") ||
        pEl.classList.contains("break")
      ) {
        continue;
      }

      const raw = collectEligibleTextNodes(doc, pEl)
        .map((n) => n.nodeValue || "")
        .join("")
        .trim();
      if (!raw) continue;

      const dMatch = raw.match(/^([—–-]{1,2}\s*|[「『«“"])/);
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
          snippet: raw.length > 90 ? `${raw.slice(0, 90)}…` : raw,
        });
      }

      quoteRe.lastIndex = 0;
      let qm = quoteRe.exec(raw);
      while (qm !== null) {
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
        qm = quoteRe.exec(raw);
      }

      ellipsisRe.lastIndex = 0;
      let em = ellipsisRe.exec(raw);
      while (em !== null) {
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
        em = ellipsisRe.exec(raw);
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
        const data = extractSectionRules(
          sec.id,
          sec.title || sec.originalTitle || "Sección",
          sec.fileId,
          sec.htmlContent
        );
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
        const data = extractSectionRules(
          sec.id,
          sec.title || sec.originalTitle || "Sección",
          sec.fileId,
          sec.htmlContent
        );
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
        const data = extractSectionRules(
          sec.id,
          sec.title || sec.originalTitle || "Sección",
          sec.fileId,
          sec.htmlContent
        );
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
        const data = extractSectionRules(
          sec.id,
          sec.title || sec.originalTitle || "Sección",
          sec.fileId,
          sec.htmlContent
        );
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
