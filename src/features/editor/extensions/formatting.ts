import { Extension, Mark } from "@tiptap/core";

export const LiteraryParagraphExtension = Extension.create({
  name: "literaryParagraph",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          class: {
            default: null,
            parseHTML: (element) => element.getAttribute("class") || null,
            renderHTML: (attributes) => {
              if (!attributes.class) return {};
              return { class: attributes.class };
            },
            keepOnSplit: false,
          },
        },
      },
    ];
  },
});

export const SubscriptMark = Mark.create({
  name: "subscript",
  parseHTML() {
    return [{ tag: "sub" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sub", HTMLAttributes, 0];
  },
});

export const SuperscriptMark = Mark.create({
  name: "superscript",
  parseHTML() {
    return [{ tag: "sup" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", HTMLAttributes, 0];
  },
});

export const UnderlineMark = Mark.create({
  name: "underline",
  parseHTML() {
    return [
      { tag: "u" },
      {
        style: "text-decoration",
        consuming: false,
        getAttrs: (style) => {
          if (typeof style === "string" && style.includes("underline")) {
            return {};
          }
          return false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["u", HTMLAttributes, 0];
  },
  addKeyboardShortcuts() {
    return {
      "Mod-u": () => this.editor.commands.toggleMark(this.name),
      "Mod-U": () => this.editor.commands.toggleMark(this.name),
    };
  },
});

export const CustomTextAlign = Extension.create({
  name: "customTextAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => {
              if (element.style.textAlign) return element.style.textAlign;
              if (
                element.classList.contains("center") ||
                element.classList.contains("align-center")
              ) {
                return "center";
              }
              if (element.classList.contains("align-left")) {
                return "left";
              }
              return null;
            },
            renderHTML: (attributes) => {
              if (!attributes.textAlign) return {};
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },
});
