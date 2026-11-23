import { createMemo } from "solid-js";
import { type SetStoreFunction } from "solid-js/store";
import type { AppState, ChapterSection, FileSectionGroup } from "../../types";
import { applyEditorialTransforms } from "../../wasm-bridge";
import { getSectionTemplate } from "../templates";
import { filterDiscardedImages } from "./files.slice";
import { flashStepSpinner, touchProject } from "./ui.slice";

export function createSectionsSlice(state: AppState, setState: SetStoreFunction<AppState>) {
  function setSectionGroups(groups: FileSectionGroup[]): void {
    setState("sectionGroups", groups);
    flashStepSpinner(4);
  }

  function toggleGroupCollapse(groupIdx: number): void {
    setState("sectionGroups", groupIdx, "collapsed", (prev) => !prev);
  }

  function setAllGroupsCollapsed(collapsed: boolean): void {
    setState("sectionGroups", (groups) => groups.map((g) => ({ ...g, collapsed })));
  }

  function updateSectionTitle(sectionId: string, newTitle: string): void {
    for (let gIdx = 0; gIdx < state.sectionGroups.length; gIdx++) {
      const sIdx = state.sectionGroups[gIdx].sections.findIndex((s) => s.id === sectionId);
      if (sIdx !== -1) {
        setState("sectionGroups", gIdx, "sections", sIdx, "title", newTitle);
        touchProject();
        break;
      }
    }
  }

  function resetSectionTitle(sectionId: string): void {
    for (let gIdx = 0; gIdx < state.sectionGroups.length; gIdx++) {
      const sIdx = state.sectionGroups[gIdx].sections.findIndex((s) => s.id === sectionId);
      if (sIdx !== -1) {
        const orig = state.sectionGroups[gIdx].sections[sIdx].originalTitle;
        setState("sectionGroups", gIdx, "sections", sIdx, "title", orig);
        touchProject();
        break;
      }
    }
  }

  function setActiveSectionId(id: string): void {
    setState("activeSectionId", id);
  }

  function scrollEditorToTop(sectionId?: string): void {
    if (sectionId && state.activeSectionId !== sectionId) {
      setState("activeSectionId", sectionId);
    }
    const doScroll = () => {
      const el = document.getElementById("novel-editor-scroll-container");
      if (el) {
        el.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 60);
  }

  function updateSectionHtml(sectionId: string, html: string): void {
    for (let gIdx = 0; gIdx < state.sectionGroups.length; gIdx++) {
      const sIdx = state.sectionGroups[gIdx].sections.findIndex((s) => s.id === sectionId);
      if (sIdx !== -1) {
        setState("sectionGroups", gIdx, "sections", sIdx, "htmlContent", html);
        touchProject();
        break;
      }
    }
  }

  function addNewSection(
    groupId: string,
    targetSectionId: string | null,
    position: "above" | "below",
    sectionType: "chapter" | "prologue" | "epilogue" | "afterword"
  ): string {
    const newId = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const template = getSectionTemplate(sectionType);

    setState("sectionGroups", (g) => g.fileId === groupId, "sections", (prevSections) => {
      const list = [...prevSections];
      const newSec: ChapterSection = {
        id: newId,
        fileId: groupId,
        originalTitle: template.title,
        title: template.title,
        type: sectionType,
        order: list.length + 1,
        htmlContent: template.html,
      };
      if (!targetSectionId) {
        if (position === "above") {
          return [newSec, ...list];
        }
        return [...list, newSec];
      }
      const idx = list.findIndex((s) => s.id === targetSectionId);
      if (idx === -1) {
        return [...list, newSec];
      }
      const insertAt = position === "above" ? idx : idx + 1;
      list.splice(insertAt, 0, newSec);
      return list.map((s, i) => ({ ...s, order: i + 1 }));
    });

    setActiveSectionId(newId);
    touchProject();
    return newId;
  }

  function addNewPart(targetGroupId: string | null, position: "above" | "below"): string {
    const newGroupId = `part-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newSecId = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setState("sectionGroups", (prevGroups) => {
      const list = [...prevGroups];
      const partNum = list.length + 1;
      const defaultSec: ChapterSection = {
        id: newSecId,
        fileId: newGroupId,
        originalTitle: "Capítulo 1",
        title: "Capítulo 1",
        type: "chapter",
        order: 1,
        htmlContent: `<h1 class="chapter-title">Capítulo 1</h1>
<h2 class="chapter-subtitle">Subtítulo</h2>
<p class="first-paragraph">Escribe aquí el contenido del capítulo...</p>`,
      };
      const newGroup: FileSectionGroup = {
        fileId: newGroupId,
        fileName: `Parte ${partNum}`,
        collapsed: false,
        sections: [defaultSec],
      };
      if (!targetGroupId) {
        if (position === "above") {
          return [newGroup, ...list];
        }
        return [...list, newGroup];
      }
      const idx = list.findIndex((g) => g.fileId === targetGroupId);
      if (idx === -1) {
        return [...list, newGroup];
      }
      const insertAt = position === "above" ? idx : idx + 1;
      list.splice(insertAt, 0, newGroup);
      return list;
    });

    setActiveSectionId(newSecId);
    touchProject();
    return newGroupId;
  }

  function deleteSection(sectionId: string): void {
    const allSecs = state.sectionGroups.flatMap((g) => g.sections);
    const currIdx = allSecs.findIndex((s) => s.id === sectionId);
    let nextActiveId: string | null = state.activeSectionId;

    if (state.activeSectionId === sectionId) {
      if (allSecs.length > 1) {
        if (currIdx > 0) {
          nextActiveId = allSecs[currIdx - 1].id;
        } else {
          nextActiveId = allSecs[1].id;
        }
      } else {
        nextActiveId = null;
      }
    }

    setState("sectionGroups", (groups) =>
      groups.map((g) => ({
        ...g,
        sections: g.sections
          .filter((s) => s.id !== sectionId)
          .map((s, idx) => ({ ...s, order: idx + 1 })),
      }))
    );

    setState("activeSectionId", nextActiveId);
    touchProject();
  }

  function deletePart(groupId: string): void {
    if (state.sectionGroups.length <= 1) return;
    const groupToDelete = state.sectionGroups.find((g) => g.fileId === groupId);
    const containsActive = groupToDelete?.sections.some((s) => s.id === state.activeSectionId);

    const remainingGroups = state.sectionGroups.filter((g) => g.fileId !== groupId);
    let nextActiveId = state.activeSectionId;

    if (containsActive) {
      const remainingSecs = remainingGroups.flatMap((g) => g.sections);
      nextActiveId = remainingSecs.length > 0 ? remainingSecs[0].id : null;
    }

    setState("sectionGroups", remainingGroups);
    setState("activeSectionId", nextActiveId);
    touchProject();
  }

  function updatePartTitle(groupId: string, newTitle: string): void {
    const gIdx = state.sectionGroups.findIndex((g) => g.fileId === groupId);
    if (gIdx !== -1) {
      setState("sectionGroups", gIdx, "fileName", newTitle);
      touchProject();
    }
  }

  const activeSection = createMemo<ChapterSection | null>(() => {
    const currentId = state.activeSectionId;
    if (!currentId) return null;

    for (const group of state.sectionGroups) {
      const sec = group.sections.find((s) => s.id === currentId);
      if (sec) {
        const filtered = filterDiscardedImages(sec.htmlContent, state.images);
        const transformedContent = applyEditorialTransforms(
          filtered,
          state.editorialRules,
          state.regexRules,
          state.glossary
        );
        return {
          ...sec,
          htmlContent: transformedContent,
        };
      }
    }
    return null;
  });

  const activeRawSection = createMemo<ChapterSection | null>(() => {
    const currentId = state.activeSectionId;
    if (!currentId) return null;

    for (const group of state.sectionGroups) {
      const sec = group.sections.find((s) => s.id === currentId);
      if (sec) return sec;
    }
    return null;
  });

  const activePdfBlobUrl = createMemo<string | null>(() => {
    const currentId = state.activeSectionId;
    if (currentId) {
      for (const group of state.sectionGroups) {
        if (group.sections.some((s) => s.id === currentId)) {
          const file = state.files.find(
            (f) => f.id === group.fileId || f.name === group.fileName || f.name === group.fileId
          );
          if (file?.pdfBlobUrl) return file.pdfBlobUrl;
        }
      }
    }
    const firstPdf = state.files.find((f) => f.pdfBlobUrl);
    return firstPdf?.pdfBlobUrl || null;
  });

  const activeOriginalFileType = createMemo<"pdf" | "epub">(() => {
    const currentId = state.activeSectionId;
    if (currentId) {
      for (const group of state.sectionGroups) {
        if (group.sections.some((s) => s.id === currentId)) {
          const file = state.files.find(
            (f) => f.id === group.fileId || f.name === group.fileName || f.name === group.fileId
          );
          if (file?.extension === "epub") return "epub";
          if (file?.extension === "pdf") return "pdf";
        }
      }
    }
    const epubFile = state.files.find((f) => f.extension === "epub");
    if (epubFile) return "epub";
    const pdfFile = state.files.find((f) => f.extension === "pdf" || f.pdfBlobUrl);
    if (pdfFile) return "pdf";
    return "pdf";
  });

  return {
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
  };
}
