import { Mark, mergeAttributes, Node } from "@tiptap/core";

export const getNextFootnoteNumber = (html: string): number => {
  const matches = [
    ...html.matchAll(/id=["']fn-(\d+)["']/g),
    ...html.matchAll(/href=["']#fn-(\d+)["']/g),
    ...html.matchAll(/data-fn-id=["']fn-(\d+)["']/g),
    ...html.matchAll(/id=["']fnref-(\d+)["']/g),
  ];
  let max = 0;
  for (const m of matches) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > max) {
      max = n;
    }
  }
  return max + 1;
};

export const FootnoteTagNode = Node.create({
  name: "footnoteTag",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [
      { tag: "div.footnote-card-tag" },
      { tag: "p.footnote-card-tag" },
      { tag: "strong.footnote-card-tag" },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "footnote-card-tag" }), 0];
  },
});

export const FootnoteBodyNode = Node.create({
  name: "footnoteBody",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      "data-placeholder": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-placeholder") || null,
        renderHTML: (attributes) => {
          if (!attributes["data-placeholder"]) return {};
          return { "data-placeholder": attributes["data-placeholder"] };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: "div.footnote-card-body" }, { tag: "p.footnote-card-body" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "footnote-card-body" }), 0];
  },
});

export const FootnoteCardNode = Node.create({
  name: "footnoteCard",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id") || null,
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { id: attributes.id };
        },
      },
      class: {
        default: "footnote-card",
        parseHTML: (element) => element.getAttribute("class") || "footnote-card",
        renderHTML: (attributes) => ({
          class: attributes.class || "footnote-card",
        }),
      },
      "epub:type": {
        default: "footnote",
        parseHTML: (element) => element.getAttribute("epub:type") || "footnote",
        renderHTML: (attributes) => ({
          "epub:type": attributes["epub:type"] || "footnote",
        }),
      },
      role: {
        default: "doc-footnote",
        parseHTML: (element) => element.getAttribute("role") || "doc-footnote",
        renderHTML: (attributes) => ({
          role: attributes.role || "doc-footnote",
        }),
      },
    };
  },
  parseHTML() {
    return [
      { tag: "aside.footnote-card" },
      { tag: 'aside[epub\\:type="footnote"]' },
      { tag: "aside" },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes), 0];
  },
});

export const FootnoteRefMark = Mark.create({
  name: "footnoteRef",
  priority: 1000,
  keepOnSplit: false,
  inclusive: false,
  addAttributes() {
    return {
      "data-fn-id": {
        default: null,
        parseHTML: (element) => {
          const fnId = element.getAttribute("data-fn-id");
          if (fnId) return fnId;
          const href = element.getAttribute("href") || "";
          if (href.startsWith("#")) return href.slice(1);
          return null;
        },
        renderHTML: (attributes) => {
          if (!attributes["data-fn-id"]) return {};
          return { "data-fn-id": attributes["data-fn-id"] };
        },
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id") || null,
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { id: attributes.id };
        },
      },
      class: {
        default: "noteref",
        parseHTML: (element) => element.getAttribute("class") || "noteref",
        renderHTML: (attributes) => ({
          class: attributes.class || "noteref",
        }),
      },
      "epub:type": {
        default: "noteref",
        parseHTML: (element) => element.getAttribute("epub:type") || "noteref",
        renderHTML: (attributes) => ({
          "epub:type": attributes["epub:type"] || "noteref",
        }),
      },
      role: {
        default: "doc-noteref",
        parseHTML: (element) => element.getAttribute("role") || "doc-noteref",
        renderHTML: (attributes) => ({
          role: attributes.role || "doc-noteref",
        }),
      },
    };
  },
  parseHTML() {
    return [
      { tag: "span.noteref" },
      { tag: 'span[epub\\:type="noteref"]' },
      { tag: "span[data-fn-id]" },
      { tag: "a.noteref" },
      { tag: 'a[epub\\:type="noteref"]' },
      { tag: 'a[href^="#fn-"]' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { href: _href, ...rest } = HTMLAttributes;
    return ["span", mergeAttributes(rest, { class: "noteref" }), 0];
  },
});
