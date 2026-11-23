import { mergeAttributes, Node } from "@tiptap/core";
import { state } from "../../../lib/store";

export const SceneBreakNode = Node.create({
  name: "sceneBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      symbol: {
        default: "◆ ◇ ◆ ◇ ◆",
        parseHTML: (element) =>
          element.getAttribute("data-symbol") || element.textContent?.trim() || "◆ ◇ ◆ ◇ ◆",
        renderHTML: (attributes) => ({
          "data-symbol": attributes.symbol || "◆ ◇ ◆ ◇ ◆",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.scene-break",
        getAttrs: (element) => ({
          symbol:
            (element as HTMLElement).getAttribute("data-symbol") ||
            (element as HTMLElement).textContent?.trim() ||
            "◆ ◇ ◆ ◇ ◆",
        }),
      },
      {
        tag: "div[data-scene-break]",
        getAttrs: (element) => ({
          symbol:
            (element as HTMLElement).getAttribute("data-symbol") ||
            (element as HTMLElement).textContent?.trim() ||
            "◆ ◇ ◆ ◇ ◆",
        }),
      },
      {
        tag: "hr.scene-break",
        getAttrs: (element) => ({
          symbol:
            (element as HTMLElement).getAttribute("data-symbol") ||
            (element as HTMLElement).textContent?.trim() ||
            "◆ ◇ ◆ ◇ ◆",
        }),
      },
      {
        tag: "hr",
        getAttrs: (element) => ({
          symbol:
            (element as HTMLElement).getAttribute("data-symbol") ||
            (element as HTMLElement).textContent?.trim() ||
            "◆ ◇ ◆ ◇ ◆",
        }),
      },
      {
        tag: "p",
        getAttrs: (element) => {
          const text = (element as HTMLElement).textContent?.trim() || "";
          if (
            text === "◆ ◇ ◆ ◇ ◆" ||
            text === "* * *" ||
            text === "✦ ✦ ✦" ||
            text === "◇ ◇ ◇" ||
            text === "■ ■ ■" ||
            /^(?:[*◆◇■✦~—–-]\s*){3,}$/.test(text) ||
            /^(?:Parte|Part)\s+(\d+|[IVXLCDM]+)\.?$/i.test(text)
          ) {
            return { symbol: text };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const symbol =
      state.unifyBreaks && state.unifiedBreakSymbol
        ? state.unifiedBreakSymbol
        : HTMLAttributes["data-symbol"] || "◆ ◇ ◆ ◇ ◆";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "scene-break",
        "data-scene-break": "true",
      }),
      symbol,
    ];
  },
});
