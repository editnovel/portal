import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SearchResult {
  from: number;
  to: number;
}

export interface SearchStorage {
  searchTerm: string;
  caseSensitive: boolean;
  results: SearchResult[];
  currentIndex: number | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findAndReplace: {
      setSearchTerm: (searchTerm: string) => ReturnType;
      setCaseSensitive: (caseSensitive: boolean) => ReturnType;
      goToNextResult: () => ReturnType;
      goToPreviousResult: () => ReturnType;
      goToPrevResult: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
  interface Storage {
    findAndReplace: SearchStorage;
  }
}

export const searchPluginKey = new PluginKey("findAndReplacePlugin");

export function findMatchesInDoc(doc: any, term: string, caseSensitive: boolean): SearchResult[] {
  if (!term) return [];
  const results: SearchResult[] = [];
  const query = caseSensitive ? term : term.toLowerCase();

  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return;
    const text = caseSensitive ? node.text : node.text.toLowerCase();
    let index = text.indexOf(query);
    while (index !== -1) {
      results.push({
        from: pos + index,
        to: pos + index + term.length,
      });
      index = text.indexOf(query, index + term.length);
    }
  });

  return results;
}

export const FindAndReplaceExtension = Extension.create<any, SearchStorage>({
  name: "findAndReplace",

  addStorage() {
    return {
      searchTerm: "",
      caseSensitive: false,
      results: [],
      currentIndex: null,
    };
  },

  addCommands() {
    const ext = this;
    return {
      setSearchTerm:
        (searchTerm: string) =>
        ({ editor, tr, dispatch }: any) => {
          ext.storage.searchTerm = searchTerm;
          const results = findMatchesInDoc(
            editor.state.doc,
            searchTerm,
            ext.storage.caseSensitive
          );
          ext.storage.results = results;
          ext.storage.currentIndex = results.length > 0 ? 0 : null;
          if (dispatch) {
            tr.setMeta(searchPluginKey, { update: true });
            if (ext.storage.currentIndex !== null && results[0]) {
              const res = results[0];
              tr.setSelection(TextSelection.create(tr.doc, res.from, res.to));
              tr.scrollIntoView();
            }
          }
          return true;
        },

      setCaseSensitive:
        (caseSensitive: boolean) =>
        ({ editor, tr, dispatch }: any) => {
          ext.storage.caseSensitive = caseSensitive;
          const results = findMatchesInDoc(
            editor.state.doc,
            ext.storage.searchTerm,
            caseSensitive
          );
          ext.storage.results = results;
          ext.storage.currentIndex = results.length > 0 ? 0 : null;
          if (dispatch) {
            tr.setMeta(searchPluginKey, { update: true });
          }
          return true;
        },

      goToNextResult:
        () =>
        ({ tr, dispatch }: any) => {
          const { results, currentIndex } = ext.storage;
          if (results.length === 0) return false;
          const nextIndex =
            currentIndex === null || currentIndex >= results.length - 1
              ? 0
              : currentIndex + 1;
          ext.storage.currentIndex = nextIndex;
          if (dispatch) {
            const res = results[nextIndex];
            tr.setSelection(TextSelection.create(tr.doc, res.from, res.to));
            tr.scrollIntoView();
            tr.setMeta(searchPluginKey, { update: true });
          }
          return true;
        },

      goToPreviousResult:
        () =>
        ({ tr, dispatch }: any) => {
          const { results, currentIndex } = ext.storage;
          if (results.length === 0) return false;
          const prevIndex =
            currentIndex === null || currentIndex <= 0
              ? results.length - 1
              : currentIndex - 1;
          ext.storage.currentIndex = prevIndex;
          if (dispatch) {
            const res = results[prevIndex];
            tr.setSelection(TextSelection.create(tr.doc, res.from, res.to));
            tr.scrollIntoView();
            tr.setMeta(searchPluginKey, { update: true });
          }
          return true;
        },

      goToPrevResult:
        () =>
        ({ commands }: any) => {
          return commands.goToPreviousResult();
        },

      clearSearch:
        () =>
        ({ tr, dispatch }: any) => {
          ext.storage.searchTerm = "";
          ext.storage.results = [];
          ext.storage.currentIndex = null;
          if (dispatch) {
            tr.setMeta(searchPluginKey, { update: true });
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return null;
          },
          apply(tr, prev, oldState, newState) {
            if (tr.docChanged && ext.storage.searchTerm) {
              const results = findMatchesInDoc(
                newState.doc,
                ext.storage.searchTerm,
                ext.storage.caseSensitive
              );
              ext.storage.results = results;
              if (results.length === 0) {
                ext.storage.currentIndex = null;
              } else if (
                ext.storage.currentIndex === null ||
                ext.storage.currentIndex >= results.length
              ) {
                ext.storage.currentIndex = 0;
              }
            }
            return null;
          },
        },
        props: {
          decorations(state) {
            const { results, currentIndex, searchTerm } = ext.storage;
            if (!searchTerm || results.length === 0) {
              return null;
            }
            const decos = results.map((res, idx) => {
              const isCurrent = idx === currentIndex;
              return Decoration.inline(res.from, res.to, {
                class: isCurrent
                  ? "find-and-replace-result find-and-replace-result-current"
                  : "find-and-replace-result",
              });
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
