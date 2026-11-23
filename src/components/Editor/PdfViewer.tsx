import { ArrowLeft, ArrowRight, Loader2, Search, ZoomIn, ZoomOut } from "lucide-solid";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  type Component,
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { SearchBar } from "~/components/ui/SearchBar";
import { t } from "~/lib/i18n";
import {
  buildChapterAnchors,
  type ChapterPdfBounds,
  editorFractionToPdfY,
  pdfYToEditorFraction,
  resolveCheckpoints,
  type SyncAnchor,
  type SyncCheckpoint,
} from "~/lib/pdf-sync";
import { activeRawSection, state } from "~/lib/store";
import { RightPaneSwitcher } from "./RightPaneSwitcher";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface PdfViewerProps {
  pdfUrl: string | null;
  scrollFraction?: number;
  onScrollFraction?: (fraction: number) => void;
  targetPage?: number;
  openSearchTrigger?: () => number;
}

interface PageMeta {
  pageNumber: number;
  width: number;
  height: number;
}

export const PdfViewer: Component<PdfViewerProps> = (props) => {
  let scrollContainerRef: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;

  const [loading, setLoading] = createSignal(false);
  const [totalPages, setTotalPages] = createSignal(0);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pagesMeta, setPagesMeta] = createSignal<PageMeta[]>([]);
  const [scale, setScale] = createSignal(1.2);
  const [visiblePages, setVisiblePages] = createSignal<Set<number>>(new Set());
  const [anchors, setAnchors] = createSignal<SyncAnchor[]>([]);
  const [checkpoints, setCheckpoints] = createSignal<SyncCheckpoint[]>([]);
  const [chapterBounds, setChapterBounds] = createSignal<ChapterPdfBounds | undefined>(undefined);

  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  const renderedPages = new Map<number, HTMLElement>();
  const renderingPages = new Set<number>();

  let isSyncing = false;
  let lastReportedFraction = -1;

  const [isSearchOpen, setIsSearchOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  const [isSearching, setIsSearching] = createSignal(false);
  const [matches, setMatches] = createSignal<{ pageNumber: number; matchIndex: number }[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = createSignal(0);
  let searchInputRef: HTMLInputElement | undefined;

  const pageTextCache = new Map<number, string>();
  let searchAbortController: AbortController | null = null;

  const getPageText = async (
    doc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number
  ): Promise<string> => {
    if (pageTextCache.has(pageNumber)) {
      return pageTextCache.get(pageNumber)!;
    }
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const str = content.items
      .map((it: unknown) =>
        typeof it === "object" &&
        it !== null &&
        "str" in it &&
        typeof (it as { str?: unknown }).str === "string"
          ? (it as { str: string }).str
          : ""
      )
      .join(" ");
    pageTextCache.set(pageNumber, str);
    return str;
  };

  const performSearch = async (query: string, caseSens: boolean) => {
    if (searchAbortController) {
      searchAbortController.abort();
    }
    const trimmed = query.trim();
    if (!pdfDoc || !trimmed) {
      setMatches([]);
      setCurrentMatchIdx(0);
      setIsSearching(false);
      return;
    }

    const abort = new AbortController();
    searchAbortController = abort;
    setIsSearching(true);

    try {
      const q = caseSens ? trimmed : trimmed.toLowerCase();
      const numPages = pdfDoc.numPages;
      const found: { pageNumber: number; matchIndex: number }[] = [];

      for (let p = 1; p <= numPages; p++) {
        if (abort.signal.aborted) return;
        const text = await getPageText(pdfDoc, p);
        if (abort.signal.aborted) return;
        const target = caseSens ? text : text.toLowerCase();
        let pos = target.indexOf(q, 0);
        let count = 0;
        while (pos !== -1) {
          found.push({ pageNumber: p, matchIndex: count });
          pos = target.indexOf(q, pos + q.length);
          count++;
        }
      }

      if (!abort.signal.aborted) {
        setMatches(found);
        if (found.length > 0) {
          const curP = currentPage();
          const firstOnOrAfter = found.findIndex((m) => m.pageNumber >= curP);
          const targetIdx = firstOnOrAfter !== -1 ? firstOnOrAfter : 0;
          setCurrentMatchIdx(targetIdx);
          void scrollToMatch(targetIdx);
        } else {
          setCurrentMatchIdx(0);
          updateAllPdfHighlights();
        }
      }
    } catch {
    } finally {
      if (!abort.signal.aborted) {
        setIsSearching(false);
      }
    }
  };

  const highlightTextLayer = (
    textLayerDiv: HTMLElement,
    query: string,
    caseSens: boolean,
    currentMatchIndexOnPage: number | null,
    pageNum: number
  ) => {
    const oldMarks = textLayerDiv.querySelectorAll("mark.pdf-search-match");
    oldMarks.forEach((m) => {
      const parent = m.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent || ""), m);
        parent.normalize();
      }
    });

    const trimmed = query.trim();
    if (!trimmed) return;

    const q = caseSens ? trimmed : trimmed.toLowerCase();
    let matchIdx = 0;

    const walker = document.createTreeWalker(textLayerDiv, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let curr = walker.nextNode();
    while (curr) {
      if (curr.textContent?.trim()) {
        textNodes.push(curr as Text);
      }
      curr = walker.nextNode();
    }

    for (const node of textNodes) {
      const orig = node.textContent || "";
      const cmp = caseSens ? orig : orig.toLowerCase();
      let idx = cmp.indexOf(q);
      if (idx === -1) continue;

      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      while (idx !== -1) {
        if (idx > lastIdx) {
          frag.appendChild(document.createTextNode(orig.slice(lastIdx, idx)));
        }
        const mark = document.createElement("mark");
        const isCurrent = currentMatchIndexOnPage !== null && currentMatchIndexOnPage === matchIdx;
        mark.className = isCurrent
          ? "pdf-search-match pdf-search-match-current"
          : "pdf-search-match";
        mark.setAttribute("data-pdf-page", String(pageNum));
        mark.setAttribute("data-pdf-match-index", String(matchIdx));
        mark.textContent = orig.slice(idx, idx + q.length);
        frag.appendChild(mark);

        matchIdx++;
        lastIdx = idx + q.length;
        idx = cmp.indexOf(q, lastIdx);
      }
      if (lastIdx < orig.length) {
        frag.appendChild(document.createTextNode(orig.slice(lastIdx)));
      }
      node.replaceWith(frag);
    }
  };

  const updateAllPdfHighlights = () => {
    const q = searchQuery().trim();
    const curMatch = matches()[currentMatchIdx()];
    for (const [pNum, wrapEl] of renderedPages) {
      const textLayerDiv = wrapEl.querySelector(".textLayer");
      if (textLayerDiv instanceof HTMLElement) {
        const curIdxOnPage = curMatch && curMatch.pageNumber === pNum ? curMatch.matchIndex : null;
        highlightTextLayer(textLayerDiv, q, caseSensitive(), curIdxOnPage, pNum);
      }
    }
  };

  const scrollToMatch = async (idx: number) => {
    const mList = matches();
    if (mList.length === 0 || idx < 0 || idx >= mList.length) return;
    const target = mList[idx];
    if (!scrollContainerRef) return;

    const pageContainer = scrollContainerRef.querySelector(
      `[data-page-num="${target.pageNumber}"]`
    );
    if (!(pageContainer instanceof HTMLDivElement)) return;

    if (!renderedPages.has(target.pageNumber)) {
      await renderPageToCanvas(target.pageNumber, pageContainer);
    }

    updateAllPdfHighlights();

    requestAnimationFrame(() => {
      if (!scrollContainerRef) return;
      const mark = pageContainer.querySelector(`[data-pdf-match-index="${target.matchIndex}"]`);
      if (mark instanceof HTMLElement) {
        const markRect = mark.getBoundingClientRect();
        const containerRect = scrollContainerRef.getBoundingClientRect();
        const deltaY =
          markRect.top + markRect.height / 2 - (containerRect.top + containerRect.height / 2);
        scrollContainerRef.scrollTo({
          top: scrollContainerRef.scrollTop + deltaY,
          behavior: "smooth",
        });
      } else {
        const pageRect = pageContainer.getBoundingClientRect();
        const containerRect = scrollContainerRef.getBoundingClientRect();
        const deltaY =
          pageRect.top + pageRect.height / 2 - (containerRect.top + containerRect.height / 2);
        scrollContainerRef.scrollTo({
          top: scrollContainerRef.scrollTop + deltaY,
          behavior: "smooth",
        });
      }
    });
  };

  const goToNextMatch = () => {
    const m = matches();
    if (m.length === 0) return;
    const nextIdx = (currentMatchIdx() + 1) % m.length;
    setCurrentMatchIdx(nextIdx);
    void scrollToMatch(nextIdx);
  };

  const goToPrevMatch = () => {
    const m = matches();
    if (m.length === 0) return;
    const prevIdx = (currentMatchIdx() - 1 + m.length) % m.length;
    setCurrentMatchIdx(prevIdx);
    void scrollToMatch(prevIdx);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    requestAnimationFrame(() => {
      searchInputRef?.focus();
      searchInputRef?.select();
    });
    if (searchQuery()) {
      void performSearch(searchQuery(), caseSensitive());
    }
  };

  const closeSearch = () => {
    if (searchAbortController) {
      searchAbortController.abort();
    }
    setIsSearchOpen(false);
    setSearchQuery("");
    setMatches([]);
    setCurrentMatchIdx(0);
    updateAllPdfHighlights();
  };

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    void performSearch(val, caseSensitive());
  };

  const toggleCaseSensitive = () => {
    const next = !caseSensitive();
    setCaseSensitive(next);
    void performSearch(searchQuery(), next);
  };

  createEffect(() => {
    const trigger = props.openSearchTrigger?.();
    if (trigger && trigger > 0) {
      openSearch();
    }
  });

  const loadPdf = async (url: string) => {
    setLoading(true);
    try {
      const loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/",
        cMapPacked: true,
      });
      const doc = await loadingTask.promise;
      pdfDoc = doc;
      setTotalPages(doc.numPages);

      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.0 });
      const metas: PageMeta[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        metas.push({
          pageNumber: i,
          width: viewport.width,
          height: viewport.height,
        });
      }
      setPagesMeta(metas);
    } catch {
      setTotalPages(0);
      setPagesMeta([]);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    const url = props.pdfUrl;
    if (url) {
      void loadPdf(url);
    } else {
      pdfDoc = null;
      setTotalPages(0);
      setPagesMeta([]);
    }
  });

  const destroyPageElement = (el?: HTMLElement | null) => {
    if (!el) return;
    const canvas = el.querySelector("canvas");
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    el.remove();
  };

  const pruneRenderedPages = (curPage: number) => {
    const MAX_PAGES_IN_MEMORY = 8;
    if (renderedPages.size <= MAX_PAGES_IN_MEMORY) return;

    let farthestPage = -1;
    let maxDistance = -1;

    for (const pageNum of renderedPages.keys()) {
      const distance = Math.abs(pageNum - curPage);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthestPage = pageNum;
      }
    }

    if (farthestPage !== -1) {
      const el = renderedPages.get(farthestPage);
      destroyPageElement(el);
      renderedPages.delete(farthestPage);
    }
  };

  const renderPageToCanvas = async (pageNum: number, container: HTMLDivElement) => {
    if (!pdfDoc || renderingPages.has(pageNum)) return;
    if (renderedPages.has(pageNum)) {
      const existing = renderedPages.get(pageNum);
      if (existing && existing.parentElement !== container) {
        container.appendChild(existing);
      }
      return;
    }

    renderingPages.add(pageNum);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const currentScale = scale();
      const viewport = page.getViewport({ scale: currentScale });

      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.className = "block";

      let renderedSuccessfully = false;
      let textContent: Awaited<ReturnType<pdfjsLib.PDFPageProxy["getTextContent"]>> | null = null;

      if (typeof OffscreenCanvas !== "undefined") {
        try {
          const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
          const offCtx = offscreen.getContext("2d");
          if (offCtx) {
            offCtx.scale(dpr, dpr);
            const [_, tc] = await Promise.all([
              page.render({
                canvas: offscreen as unknown as HTMLCanvasElement,
                canvasContext: offCtx as unknown as CanvasRenderingContext2D,
                viewport,
              }).promise,
              page.getTextContent(),
            ]);
            textContent = tc;
            const bitmap = offscreen.transferToImageBitmap();
            const bitmapCtx = canvas.getContext("bitmaprenderer");
            if (bitmapCtx) {
              bitmapCtx.transferFromImageBitmap(bitmap);
              renderedSuccessfully = true;
            } else {
              const ctx2d = canvas.getContext("2d");
              if (ctx2d) {
                ctx2d.drawImage(bitmap, 0, 0);
                bitmap.close();
                renderedSuccessfully = true;
              }
            }
          }
        } catch {
          renderedSuccessfully = false;
        }
      }

      if (!renderedSuccessfully) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
          const [_, tc] = await Promise.all([
            page.render({
              canvas,
              canvasContext: ctx,
              viewport,
            }).promise,
            page.getTextContent(),
          ]);
          textContent = tc;
          renderedSuccessfully = true;
        }
      }

      if (!renderedSuccessfully || !textContent || scale() !== currentScale) {
        return;
      }

      const pageWrap = document.createElement("div");
      pageWrap.className =
        "relative overflow-hidden shadow-lg rounded-sm bg-white border border-border/80 mx-auto block z-[1]";
      pageWrap.style.width = `${Math.floor(viewport.width)}px`;
      pageWrap.style.height = `${Math.floor(viewport.height)}px`;
      pageWrap.appendChild(canvas);

      const textLayerDiv = document.createElement("div");
      textLayerDiv.className = "textLayer";
      textLayerDiv.style.setProperty("--total-scale-factor", `${currentScale}`);
      textLayerDiv.style.setProperty("--scale-factor", `${currentScale}`);

      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
      });
      await textLayer.render();
      pageWrap.appendChild(textLayerDiv);

      if (isSearchOpen() && searchQuery().trim()) {
        const curMatch = matches()[currentMatchIdx()];
        const curIdxOnPage =
          curMatch && curMatch.pageNumber === pageNum ? curMatch.matchIndex : null;
        highlightTextLayer(textLayerDiv, searchQuery(), caseSensitive(), curIdxOnPage, pageNum);
      }

      const existing = renderedPages.get(pageNum);
      destroyPageElement(existing);
      renderedPages.set(pageNum, pageWrap);
      container.appendChild(pageWrap);
      pruneRenderedPages(pageNum);
    } catch {
    } finally {
      renderingPages.delete(pageNum);
    }
  };

  const updateCheckpoints = () => {
    if (!scrollContainerRef) return;
    const sec = activeRawSection();
    const startP = sec?.startPage || 1;
    const endP = sec?.endPage || startP;
    const editorScroll = document.getElementById(
      "novel-editor-scroll-container"
    ) as HTMLElement | null;
    if (!editorScroll) return;

    const res = resolveCheckpoints(anchors(), scrollContainerRef, editorScroll, startP, endP);
    setCheckpoints(res.checkpoints);
    setChapterBounds(res.bounds);
  };

  createEffect(() => {
    const doc = pdfDoc;
    const sec = activeRawSection();
    if (!doc || !sec) {
      setAnchors([]);
      setCheckpoints([]);
      setChapterBounds(undefined);
      return;
    }

    const startP = sec.startPage || 1;
    const endP = sec.endPage || startP;

    let cancelled = false;
    void (async () => {
      let editorRoot = document.querySelector(".novel-editor-content") as HTMLElement | null;
      if (!editorRoot) {
        await new Promise((r) => setTimeout(r, 150));
        editorRoot = document.querySelector(".novel-editor-content") as HTMLElement | null;
      }
      if (!editorRoot || cancelled) return;

      const built = await buildChapterAnchors(doc, startP, endP, editorRoot);
      if (cancelled) return;
      setAnchors(built);
      requestAnimationFrame(updateCheckpoints);
    })();

    onCleanup(() => {
      cancelled = true;
    });
  });

  createEffect(() => {
    anchors();
    scale();
    pagesMeta();
    requestAnimationFrame(updateCheckpoints);
  });

  const handleScroll = () => {
    if (!scrollContainerRef || isSyncing || !state.syncScroll) return;
    const currentPdfY = scrollContainerRef.scrollTop;
    const fraction = pdfYToEditorFraction(currentPdfY, checkpoints(), chapterBounds());
    if (Math.abs(fraction - lastReportedFraction) < 0.002) return;
    lastReportedFraction = fraction;
    if (props.onScrollFraction) {
      props.onScrollFraction(fraction);
    }
  };

  createEffect(() => {
    const fraction = props.scrollFraction;
    if (typeof fraction === "number" && scrollContainerRef && state.syncScroll) {
      const targetY = editorFractionToPdfY(fraction, checkpoints(), chapterBounds());
      if (Math.abs(scrollContainerRef.scrollTop - targetY) > 4) {
        isSyncing = true;
        scrollContainerRef.scrollTop = targetY;
        requestAnimationFrame(() => {
          isSyncing = false;
        });
      }
    }
  });

  createEffect(() => {
    const target = props.targetPage;
    if (typeof target === "number" && target > 0 && scrollContainerRef && pagesMeta().length > 0) {
      const targetEl = scrollContainerRef.querySelector(`[data-page-num="${target}"]`);
      if (targetEl instanceof HTMLElement) {
        isSyncing = true;
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          isSyncing = false;
        }, 300);
      }
    }
  });

  const setupObserver = (container: HTMLDivElement) => {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        const nextVisible = new Set(visiblePages());
        let topVisible = currentPage();

        for (const entry of entries) {
          const num = Number(entry.target.getAttribute("data-page-num"));
          if (!num) continue;

          if (entry.isIntersecting) {
            nextVisible.add(num);
            if (num < topVisible || !nextVisible.has(topVisible)) {
              topVisible = num;
            }
            if (entry.target instanceof HTMLDivElement) {
              void renderPageToCanvas(num, entry.target);
            }
          } else {
            nextVisible.delete(num);
            if (renderedPages.has(num)) {
              const el = renderedPages.get(num);
              destroyPageElement(el);
              renderedPages.delete(num);
            }
          }
        }
        setVisiblePages(nextVisible);
        setCurrentPage(topVisible);
      },
      {
        root: container,
        rootMargin: "300px 0px",
        threshold: 0.1,
      }
    );

    const pageElements = container.querySelectorAll("[data-page-num]");
    for (const el of pageElements) {
      observer.observe(el);
    }
  };

  onMount(() => {
    if (scrollContainerRef) {
      setupObserver(scrollContainerRef);
    }
    const handleResize = () => requestAnimationFrame(updateCheckpoints);
    window.addEventListener("resize", handleResize);
    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
    });
  });

  createEffect(() => {
    const metas = pagesMeta();
    if (metas.length > 0 && scrollContainerRef) {
      requestAnimationFrame(() => {
        if (scrollContainerRef) {
          setupObserver(scrollContainerRef);
        }
      });
    }
  });

  createEffect(() => {
    scale();
    for (const [, el] of renderedPages) {
      destroyPageElement(el);
    }
    renderedPages.clear();
    const vis = Array.from(visiblePages());
    for (const p of vis) {
      if (scrollContainerRef) {
        const el = scrollContainerRef.querySelector(`[data-page-num="${p}"]`);
        if (el instanceof HTMLDivElement) {
          void renderPageToCanvas(p, el);
        }
      }
    }
  });

  onCleanup(() => {
    observer?.disconnect();
    for (const [, el] of renderedPages) {
      destroyPageElement(el);
    }
    renderedPages.clear();
  });

  const jumpToPage = (num: number) => {
    const clamped = Math.max(1, Math.min(num, totalPages()));
    if (!scrollContainerRef) return;
    const targetEl = scrollContainerRef.querySelector(`[data-page-num="${clamped}"]`);
    if (targetEl instanceof HTMLElement) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div class="flex-1 flex flex-col h-full bg-muted/40 overflow-hidden relative">
      <div class="h-10 border-b border-border bg-card px-3 flex items-center justify-between text-xs text-muted-foreground shrink-0 z-10 relative">
        <div class="flex items-center gap-1.5 font-mono text-[11px]">
          <button
            type="button"
            disabled={currentPage() <= 1}
            onClick={() => jumpToPage(currentPage() - 1)}
            class="p-1 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
            title={t("pdfViewer.prevPage")}
          >
            <ArrowLeft class="w-3.5 h-3.5" />
          </button>
          <span class="font-medium text-foreground">
            {currentPage()} / {totalPages()}
          </span>
          <button
            type="button"
            disabled={currentPage() >= totalPages()}
            onClick={() => jumpToPage(currentPage() + 1)}
            class="p-1 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
            title={t("pdfViewer.nextPage")}
          >
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="absolute left-1/2 -translate-x-1/2">
          <RightPaneSwitcher />
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => (isSearchOpen() ? closeSearch() : openSearch())}
            class={`p-1 rounded transition-colors cursor-pointer mr-1 ${
              isSearchOpen()
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title={t("editor.searchTitle")}
          >
            <Search class="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={scale() <= 0.6}
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            class="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            title={t("pdfViewer.zoomOut")}
          >
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
          <span class="text-[10px] font-mono w-10 text-center">{Math.round(scale() * 100)}%</span>
          <button
            type="button"
            disabled={scale() >= 2.5}
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            class="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            title={t("pdfViewer.zoomIn")}
          >
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div class="absolute top-10 right-4 z-30">
        <SearchBar
          isOpen={isSearchOpen()}
          query={searchQuery()}
          onQueryChange={handleSearchInput}
          onNext={goToNextMatch}
          onPrev={goToPrevMatch}
          onClose={closeSearch}
          currentIndex={currentMatchIdx()}
          totalMatches={matches().length}
          caseSensitive={caseSensitive()}
          onToggleCaseSensitive={toggleCaseSensitive}
          placeholder={t("search.originalPlaceholder")}
          isSearching={isSearching()}
        />
      </div>

      <Show when={loading()}>
        <div class="absolute inset-0 z-20 bg-background/60 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 class="w-5 h-5 animate-spin text-primary" />
          <span>{t("pdfViewer.loadingPdf")}</span>
        </div>
      </Show>

      <Show
        when={props.pdfUrl && pagesMeta().length > 0}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground gap-2">
            <p class="font-medium text-foreground">{t("pdfViewer.noPdfAvailableTitle")}</p>
            <p>{t("pdfViewer.noPdfAvailableDesc")}</p>
          </div>
        }
      >
        <div
          id="novel-pdf-scroll-container"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          class="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center gap-4 select-text"
        >
          <For each={pagesMeta()}>
            {(meta) => (
              <div
                data-page-num={meta.pageNumber}
                class={`relative transition-all flex items-center justify-center ${
                  matches().length > 0 &&
                  matches()[currentMatchIdx()]?.pageNumber === meta.pageNumber
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : matches().some((m) => m.pageNumber === meta.pageNumber)
                      ? "ring-2 ring-primary/60"
                      : ""
                }`}
                style={{
                  width: `${Math.floor(meta.width * scale())}px`,
                  height: `${Math.floor(meta.height * scale())}px`,
                  "min-height": `${Math.floor(meta.height * scale())}px`,
                }}
              >
                <div class="absolute inset-0 bg-card/60 border border-border/60 rounded-sm shadow-xs flex items-center justify-center text-[11px] text-muted-foreground font-mono pointer-events-none select-none">
                  {t("pdfViewer.pageBadge", { page: meta.pageNumber })}
                </div>

                <Show when={matches().filter((m) => m.pageNumber === meta.pageNumber).length > 0}>
                  <div class="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-primary text-primary-foreground shadow-md flex items-center gap-1">
                    <Search class="w-3 h-3" />
                    <span>{matches().filter((m) => m.pageNumber === meta.pageNumber).length}</span>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
