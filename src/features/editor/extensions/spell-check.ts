import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { activeSection, state } from "../../../lib/store";

export const SpellAppliedMark = Mark.create({
  name: "spellApplied",
  addAttributes() {
    return {
      "data-corr-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-corr-id"),
        renderHTML: (attributes) => ({
          "data-corr-id": attributes["data-corr-id"],
        }),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span.spell-applied",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "spell-applied" }), 0];
  },
});

export const spellPluginKey = new PluginKey("spellCheckDecorations");

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenToPattern(token: string): string {
  const esc = escapeRegExp(token);
  const startsWord = /^[\p{L}\p{N}]/u.test(token);
  const endsWord = /[\p{L}\p{N}]$/u.test(token);
  return `${startsWord ? "(?<![\\p{L}\\p{N}])" : ""}${esc}${endsWord ? "(?![\\p{L}\\p{N}])" : ""}`;
}

export function buildSpellDecorations(doc: any, selection?: any): DecorationSet {
  const sec = activeSection();
  if (!sec) return DecorationSet.empty;
  const currentTitle = sec.title;
  const currentOrigTitle = sec.originalTitle;
  const currentId = sec.id;

  const clean = (s?: string) => (s ? s.replace(/^\d+[\.\s\-\:]+/, "").trim().toLowerCase() : "");
  const curTitleClean = clean(currentTitle);
  const curOrigClean = clean(currentOrigTitle);

  const sectionCorrections = state.spellCorrections.filter(
    (c) =>
      !c.applied &&
      !c.ignored &&
      c.enabled !== false &&
      (c.sectionId === currentId ||
        c.sectionTitle === currentTitle ||
        c.sectionTitle === currentOrigTitle ||
        (clean(c.sectionTitle) &&
          (clean(c.sectionTitle) === curTitleClean || clean(c.sectionTitle) === curOrigClean)))
  );

  if (sectionCorrections.length === 0) {
    return DecorationSet.empty;
  }

  const selectedId = state.selectedCorrectionId;
  const selectedCorr = sectionCorrections.find((c) => c.id === selectedId);

  const tokenGroups = new Map<string, typeof sectionCorrections>();
  for (const corr of sectionCorrections) {
    if (!corr.originalToken) continue;
    const list = tokenGroups.get(corr.originalToken) || [];
    list.push(corr);
    tokenGroups.set(corr.originalToken, list);
  }

  const sortedTokens = Array.from(tokenGroups.keys()).sort((a, b) => b.length - a.length);
  if (sortedTokens.length === 0) {
    return DecorationSet.empty;
  }
  const tokenRegexPattern = sortedTokens.map(tokenToPattern).join("|");
  const tokenRegex = new RegExp(tokenRegexPattern, "gu");

  const decos: Decoration[] = [];
  const activeBlockPositions = new Set<number>();
  const cursorPos = selection && selection.from === selection.to ? selection.from : -1;

  doc.descendants((node: any, pos: number) => {
    if (node.isBlock) {
      return true;
    }
    if (!node.isText || !node.text) return;
    const text = node.text;

    tokenRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(text)) !== null) {
      const token = match[0];
      const candidates = tokenGroups.get(token);
      if (!candidates || candidates.length === 0) continue;

      const from = pos + match.index;
      const to = from + token.length;

      let corr = candidates[0];
      let isSelected = false;

      try {
        const resolved = doc.resolve(from);
        const blockNode = resolved.parent;
        const blockText = blockNode ? blockNode.textContent : "";

        if (candidates.length > 1) {
          const matchBySnippet = candidates.find((c) => {
            if (!c.contextSnippet && !c.paragraphBefore) return false;
            const snip = c.contextSnippet
              ? c.contextSnippet.replace(/^[.…\s]+|[.…\s]+$/g, "").trim()
              : "";
            return (
              (snip && blockText.includes(snip)) ||
              (c.paragraphBefore && blockText.includes(c.paragraphBefore.trim()))
            );
          });
          if (matchBySnippet) {
            corr = matchBySnippet;
          }
        }

        if (selectedCorr && selectedCorr.originalToken === token) {
          if (selectedCorr.id === corr.id) {
            isSelected = true;
          } else {
            const snip = selectedCorr.contextSnippet
              ? selectedCorr.contextSnippet.replace(/^[.…\s]+|[.…\s]+$/g, "").trim()
              : "";
            const matchesSelectedBlock =
              (snip && blockText.includes(snip)) ||
              (selectedCorr.paragraphBefore &&
                blockText.includes(selectedCorr.paragraphBefore.trim()));
            if (matchesSelectedBlock) {
              corr = selectedCorr;
              isSelected = true;
            }
          }
        }
      } catch {
        isSelected = corr.id === selectedId;
      }

      if (!isSelected && cursorPos >= from && cursorPos <= to) {
        continue;
      }

      let cls = "spell-token-typo";
      if (isSelected) {
        cls = "spell-token-selected";
      } else if (corr.category === "grammar") {
        cls = "spell-token-grammar";
      } else if (corr.category === "punctuation") {
        cls = "spell-token-punctuation";
      } else if (corr.category === "casing") {
        cls = "spell-token-casing";
      } else if (
        corr.category === "smell" ||
        corr.category === "style" ||
        corr.category === "dictionary"
      ) {
        cls = "spell-token-style";
      }

      decos.push(
        Decoration.inline(from, to, {
          class: cls,
          "data-spell-corr-id": corr.id,
        })
      );

      if (isSelected) {
        try {
          const resolved = doc.resolve(from);
          const blockDepth = resolved.depth;
          if (blockDepth > 0) {
            const blockStart = resolved.start(blockDepth) - 1;
            const blockNode = resolved.node(blockDepth);
            if (!activeBlockPositions.has(blockStart)) {
              activeBlockPositions.add(blockStart);
              decos.push(
                Decoration.node(blockStart, blockStart + blockNode.nodeSize, {
                  class: "spell-active-line",
                })
              );
            }
          }
        } catch {}
      }
    }
  });

  if (decos.length === 0) {
    return DecorationSet.empty;
  }
  return DecorationSet.create(doc, decos);
}

export const SpellCheckExtension = Extension.create({
  name: "spellCheckDecorations",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: spellPluginKey,
        state: {
          init(_, { doc }) {
            return buildSpellDecorations(doc);
          },
          apply(tr, oldDecos, oldState, newState) {
            if (tr.docChanged || tr.selectionSet || tr.getMeta(spellPluginKey)) {
              return buildSpellDecorations(newState.doc, newState.selection);
            }
            return oldDecos.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            const decos = this.getState(state);
            return decos && decos !== DecorationSet.empty && decos.find().length > 0
              ? decos
              : null;
          },
        },
      }),
    ];
  },
});
