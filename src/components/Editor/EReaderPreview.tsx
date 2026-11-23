import {
  BookOpen,
  Search,
  SpellCheck2,
} from "lucide-solid";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { t } from "~/lib/i18n";
import { readerSettingsToCssVariables } from "~/lib/reader-settings";
import { activeSection, setRightPaneMode, state } from "~/lib/store";
import { RightPaneSwitcher } from "./RightPaneSwitcher";
import { SearchBar } from "~/components/ui/SearchBar";

interface EReaderPreviewProps {
  onScrollFraction?: (fraction: number) => void;
  scrollFraction?: number;
  openSearchTrigger?: () => number;
}

export const EReaderPreview: Component<EReaderPreviewProps> = (props) => {
  let iframeRef: HTMLIFrameElement | undefined;
  let isIframeLoaded = false;
  let lastSectionId: string | null = null;

  const [scrollProgress, setScrollProgress] = createSignal(0);
  const [isDark, setIsDark] = createSignal(false);
  const [isSearchOpen, setIsSearchOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  const [totalMatches, setTotalMatches] = createSignal(0);
  const [currentMatchIndex, setCurrentMatchIndex] = createSignal(0);
  let searchInputRef: HTMLInputElement | undefined;
  let matchElements: HTMLElement[] = [];

  const wordCount = createMemo(() => {
    const content = activeSection()?.htmlContent || "";
    const clean = content.replace(/<[^>]*>/g, " ").trim();
    if (!clean) return 0;
    return clean.split(/\s+/).length;
  });

  const getEffectiveTheme = () => {
    if (state.readerSettings.theme === "sepia") return "sepia";
    return isDark() ? "dark" : "light";
  };

  const cssVarsString = createMemo(() => {
    const vars = readerSettingsToCssVariables(state.readerSettings, getEffectiveTheme());
    return Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");
  });

  const discardedImageStyles = createMemo(() => {
    const discarded = state.images.filter((img) => img.isDiscarded);
    if (!discarded.length) return "";
    const selectors: string[] = [];
    for (const img of discarded) {
      if (img.url) {
        selectors.push(`img[src="${img.url.replace(/"/g, '\\"')}"]`);
      }
      if (img.name) {
        selectors.push(`img[src*="${img.name.replace(/"/g, '\\"')}"]`);
      }
    }
    if (!selectors.length) return "";
    return `${selectors.join(",\n")} { display: none !important; margin: 0 !important; height: 0 !important; max-height: 0 !important; padding: 0 !important; border: none !important; pointer-events: none !important; }`;
  });

  const getFallbackContent = () => `
    <div style="text-align: center; padding: 4rem 1rem; color: var(--reader-muted);">
      <p>${state.isProcessing ? t("stepFiles.parsingBackground") : t("reader.noChapterLoadedTitle")}</p>
      <p style="font-size: 0.85em;">${state.isProcessing ? t("editor.extractingChaptersReader") : t("reader.noChapterLoadedDesc")}</p>
    </div>
  `;

  const generateInitialHtml = (initialContent: string) => {
    const themeAttr = `data-theme="${getEffectiveTheme()}"`;
    return `<!DOCTYPE html>
<html lang="en" ${themeAttr}>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="/reader-stylesheet.css" />
  <style id="reader-dynamic-vars">
    :root {
      ${cssVarsString()}
    }
  </style>
  <style id="reader-discarded-images">
    ${discardedImageStyles()}
  </style>
  <style id="reader-search-styles">
    mark.reader-search-match {
      background-color: rgba(250, 204, 21, 0.4) !important;
      color: inherit !important;
      border-radius: 2px;
    }
    mark.reader-search-match-current {
      background-color: #facc15 !important;
      color: #000000 !important;
      outline: 2px solid #ca8a04 !important;
      border-radius: 2px;
    }
  </style>
</head>
<body class="reader-body">
  <article class="novel-container" id="novel-content">
    ${initialContent}
  </article>
  <div id="reader-footnote-tooltip" class="reader-footnote-tooltip" style="display: none;"></div>
  <script>
    let isSyncing = false;
    let lastSent = -1;
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        window.parent.postMessage({ type: 'EPUB_TRIGGER_SEARCH' }, '*');
      }
    });
    window.addEventListener('scroll', () => {
      if (tooltipEl) tooltipEl.style.display = 'none';
      if (isSyncing) return;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = total > 0 ? window.scrollY / total : 0;
      if (Math.abs(fraction - lastSent) < 0.002) return;
      lastSent = fraction;
      window.parent.postMessage({ type: 'READER_SCROLL', fraction }, '*');
    });

    const tooltipEl = document.getElementById('reader-footnote-tooltip');

    document.addEventListener('mouseover', (e) => {
      const noteref = e.target.closest('.noteref, [data-fn-id], a[href*="#fn-"]');
      if (noteref && tooltipEl) {
        const fnId =
          noteref.getAttribute('data-fn-id') ||
          (noteref.getAttribute('id') ? noteref.getAttribute('id').replace(/^fnref-/, 'fn-') : '') ||
          (noteref.getAttribute('href') || '').replace(/^#/, '');
        if (fnId) {
          const card = document.getElementById(fnId);
          if (card) {
            const bodyEl = card.querySelector('.footnote-card-body') || card;
            const tagEl = card.querySelector('.footnote-card-tag');
            const tagHtml = tagEl ? '<div class="tooltip-tag">' + (tagEl.textContent ? tagEl.textContent.trim() : '') + '</div>' : '';
            const bodyHtml = '<div>' + (bodyEl.textContent ? bodyEl.textContent.trim() : '') + '</div>';
            tooltipEl.innerHTML = tagHtml + bodyHtml;

            const rect = noteref.getBoundingClientRect();
            const showAbove = rect.bottom + 120 > window.innerHeight;
            tooltipEl.style.left = (rect.left + rect.width / 2) + 'px';
            tooltipEl.style.top = (showAbove ? Math.max(10, rect.top - 8) : rect.bottom + 8) + 'px';
            tooltipEl.style.transform = showAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)';
            tooltipEl.style.display = 'block';
          }
        }
        return;
      }

      const card = e.target.closest('aside.footnote-card, aside.footnote');
      if (card && card.id) {
        const rawId = card.id.replace(/^fn-/, '');
        const matchingRef = document.querySelector('.noteref[data-fn-id="' + card.id + '"], #fnref-' + rawId + ', a[href="#' + card.id + '"]');
        if (matchingRef) {
          matchingRef.classList.add('noteref-highlighted');
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      const related = e.relatedTarget;
      const noteref = e.target.closest('.noteref, [data-fn-id], a[href*="#fn-"]');
      if (noteref && tooltipEl && (!related || !noteref.contains(related))) {
        tooltipEl.style.display = 'none';
      }

      const card = e.target.closest('aside.footnote-card, aside.footnote');
      if (card && (!related || !card.contains(related))) {
        document.querySelectorAll('.noteref-highlighted').forEach((el) => el.classList.remove('noteref-highlighted'));
      }
    });

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_SCROLL_TO' && typeof event.data.fraction === 'number') {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const targetY = total * event.data.fraction;
        if (Math.abs(window.scrollY - targetY) > 2) {
          isSyncing = true;
          window.scrollTo({ top: targetY, behavior: 'auto' });
          requestAnimationFrame(() => {
            isSyncing = false;
          });
        }
      } else if (event.data?.type === 'UPDATE_CONTENT' && typeof event.data.html === 'string') {
        const el = document.getElementById('novel-content');
        if (el && el.innerHTML !== event.data.html) {
          el.innerHTML = event.data.html;
        }
        if (event.data.resetScroll) {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      }
    });
  </script>
</body>
</html>`;
  };

  const applyTheme = () => {
    if (!isIframeLoaded || !iframeRef?.contentDocument) return;
    try {
      iframeRef.contentDocument.documentElement.setAttribute("data-theme", getEffectiveTheme());
    } catch {}
  };

  const applyStyles = () => {
    if (!isIframeLoaded || !iframeRef?.contentDocument) return;
    try {
      const vars = readerSettingsToCssVariables(state.readerSettings, getEffectiveTheme());
      const root = iframeRef.contentDocument.documentElement;
      for (const [k, v] of Object.entries(vars)) {
        root.style.setProperty(k, v);
      }
      let styleTag = iframeRef.contentDocument.getElementById("reader-discarded-images");
      if (!styleTag) {
        styleTag = iframeRef.contentDocument.createElement("style");
        styleTag.id = "reader-discarded-images";
        iframeRef.contentDocument.head.appendChild(styleTag);
      }
      styleTag.textContent = discardedImageStyles();
    } catch {}
  };

  const applyContent = (html: string, resetScroll = false) => {
    if (!isIframeLoaded) return;
    try {
      const doc = iframeRef?.contentDocument;
      if (doc) {
        const el = doc.getElementById("novel-content");
        if (el) {
          if (el.innerHTML !== html) {
            el.innerHTML = html;
          }
          if (resetScroll && iframeRef?.contentWindow) {
            iframeRef.contentWindow.scrollTo({ top: 0, behavior: "auto" });
          }
          return;
        }
      }
    } catch {}
    iframeRef?.contentWindow?.postMessage({ type: "UPDATE_CONTENT", html, resetScroll }, "*");
  };

  onMount(() => {
    const updateTheme = () => {
      const dark =
        document.documentElement.classList.contains("dark") ||
        (!document.documentElement.classList.contains("light") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setIsDark(dark);
    };

    updateTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const mediaListener = () => updateTheme();
    mediaQuery.addEventListener("change", mediaListener);

    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === "READER_SCROLL" && typeof event.data.fraction === "number") {
        setScrollProgress(Math.round(event.data.fraction * 100));
        if (state.syncScroll && props.onScrollFraction) {
          props.onScrollFraction(event.data.fraction);
        }
      } else if (event.data?.type === "EPUB_TRIGGER_SEARCH") {
        openSearch();
      }
    };
    window.addEventListener("message", messageHandler);

    if (iframeRef) {
      const initialHtml = activeSection()?.htmlContent || getFallbackContent();
      lastSectionId = state.activeSectionId;
      iframeRef.srcdoc = generateInitialHtml(initialHtml);

      const onLoad = () => {
        isIframeLoaded = true;
        applyTheme();
        applyStyles();
        const content = activeSection()?.htmlContent || getFallbackContent();
        applyContent(content, false);
      };

      iframeRef.addEventListener("load", onLoad);
      onCleanup(() => {
        iframeRef?.removeEventListener("load", onLoad);
      });
    }

    onCleanup(() => {
      mediaQuery.removeEventListener("change", mediaListener);
      observer.disconnect();
      window.removeEventListener("message", messageHandler);
    });
  });

  createEffect(() => {
    getEffectiveTheme();
    if (isIframeLoaded) {
      applyTheme();
    }
  });

  createEffect(() => {
    cssVarsString();
    if (isIframeLoaded) {
      applyStyles();
    }
  });

  createEffect(() => {
    discardedImageStyles();
    if (isIframeLoaded) {
      applyStyles();
    }
  });

  let previewUpdateTimer: number | null = null;
  createEffect(() => {
    const sec = activeSection();
    const currentId = state.activeSectionId;
    const content = sec?.htmlContent || getFallbackContent();

    if (!isIframeLoaded) return;

    const sectionChanged = currentId !== lastSectionId;
    lastSectionId = currentId;

    if (sectionChanged) {
      if (previewUpdateTimer !== null) {
        window.clearTimeout(previewUpdateTimer);
        previewUpdateTimer = null;
      }
      applyContent(content, true);
    } else {
      if (previewUpdateTimer !== null) {
        window.clearTimeout(previewUpdateTimer);
      }
      previewUpdateTimer = window.setTimeout(() => {
        previewUpdateTimer = null;
        applyContent(content, false);
      }, 500);
    }
  });

  onCleanup(() => {
    if (previewUpdateTimer !== null) {
      window.clearTimeout(previewUpdateTimer);
    }
  });

  createEffect(() => {
    const fraction = props.scrollFraction;
    if (typeof fraction === "number" && state.syncScroll && iframeRef?.contentWindow) {
      iframeRef.contentWindow.postMessage(
        {
          type: "SYNC_SCROLL_TO",
          fraction,
        },
        "*"
      );
    }
  });

  const clearIframeMatches = () => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    const marks = Array.from(doc.querySelectorAll("mark.reader-search-match"));
    for (const mark of marks) {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    }
    matchElements = [];
    setTotalMatches(0);
    setCurrentMatchIndex(0);
  };

  const applyIframeSearch = (query: string, caseSens: boolean) => {
    clearIframeMatches();
    const doc = iframeRef?.contentDocument;
    const trimmed = query.trim();
    if (!doc || !trimmed) return;

    const article = doc.getElementById("novel-content") || doc.body;
    const treeWalker = doc.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (
          parent &&
          (parent.tagName === "SCRIPT" ||
            parent.tagName === "STYLE" ||
            parent.tagName === "MARK" ||
            parent.id === "reader-footnote-tooltip")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let curr = treeWalker.nextNode();
    while (curr) {
      textNodes.push(curr as Text);
      curr = treeWalker.nextNode();
    }

    const q = caseSens ? trimmed : trimmed.toLowerCase();
    const foundMarks: HTMLElement[] = [];

    for (const node of textNodes) {
      const originalText = node.textContent || "";
      const compareText = caseSens ? originalText : originalText.toLowerCase();

      let lastIndex = 0;
      let matchIndex = compareText.indexOf(q, lastIndex);
      if (matchIndex === -1) continue;

      const fragment = doc.createDocumentFragment();
      while (matchIndex !== -1) {
        if (matchIndex > lastIndex) {
          fragment.appendChild(doc.createTextNode(originalText.slice(lastIndex, matchIndex)));
        }
        const mark = doc.createElement("mark");
        mark.className = "reader-search-match";
        mark.textContent = originalText.slice(matchIndex, matchIndex + q.length);
        fragment.appendChild(mark);
        foundMarks.push(mark);

        lastIndex = matchIndex + q.length;
        matchIndex = compareText.indexOf(q, lastIndex);
      }

      if (lastIndex < originalText.length) {
        fragment.appendChild(doc.createTextNode(originalText.slice(lastIndex)));
      }

      node.replaceWith(fragment);
    }

    matchElements = foundMarks;
    setTotalMatches(foundMarks.length);
    if (foundMarks.length > 0) {
      setCurrentMatchIndex(0);
      highlightCurrentIframeMatch(0);
    }
  };

  const highlightCurrentIframeMatch = (idx: number) => {
    matchElements.forEach((el, i) => {
      if (i === idx) {
        el.classList.add("reader-search-match-current");
        try {
          const win = iframeRef?.contentWindow;
          if (win) {
            const rect = el.getBoundingClientRect();
            const winH = win.innerHeight;
            const deltaY = rect.top + rect.height / 2 - winH / 2;
            win.scrollBy({ top: deltaY, behavior: "smooth" });
          } else {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } catch {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        el.classList.remove("reader-search-match-current");
      }
    });
  };

  const goToNextMatch = () => {
    if (matchElements.length === 0) return;
    const nextIdx = (currentMatchIndex() + 1) % matchElements.length;
    setCurrentMatchIndex(nextIdx);
    highlightCurrentIframeMatch(nextIdx);
  };

  const goToPrevMatch = () => {
    if (matchElements.length === 0) return;
    const prevIdx = (currentMatchIndex() - 1 + matchElements.length) % matchElements.length;
    setCurrentMatchIndex(prevIdx);
    highlightCurrentIframeMatch(prevIdx);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    requestAnimationFrame(() => {
      searchInputRef?.focus();
      searchInputRef?.select();
    });
    if (searchQuery()) {
      applyIframeSearch(searchQuery(), caseSensitive());
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    clearIframeMatches();
    setSearchQuery("");
  };

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    applyIframeSearch(val, caseSensitive());
  };

  const toggleCaseSensitive = () => {
    const next = !caseSensitive();
    setCaseSensitive(next);
    applyIframeSearch(searchQuery(), next);
  };

  const handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      goToNextMatch();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      goToPrevMatch();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    }
  };

  createEffect(() => {
    const trigger = props.openSearchTrigger?.();
    if (trigger && trigger > 0) {
      openSearch();
    }
  });

  return (
    <div class="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div class="h-10 border-b border-border bg-card px-4 flex items-center justify-between text-xs text-muted-foreground shrink-0 relative">
        <div class="flex items-center gap-2">
          <BookOpen class="w-3.5 h-3.5 text-primary" />
          <span class="font-medium text-foreground hidden sm:inline">{t("reader.epubView")}</span>
        </div>

        <div class="absolute left-1/2 -translate-x-1/2">
          <RightPaneSwitcher />
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => (isSearchOpen() ? closeSearch() : openSearch())}
            class={`p-1 rounded transition-colors cursor-pointer ${
              isSearchOpen()
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title={t("editor.searchTitle")}
          >
            <Search class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div class="absolute top-12 right-4 z-30">
        <SearchBar
          isOpen={isSearchOpen()}
          query={searchQuery()}
          onQueryChange={handleSearchInput}
          onNext={goToNextMatch}
          onPrev={goToPrevMatch}
          onClose={closeSearch}
          currentIndex={currentMatchIndex()}
          totalMatches={totalMatches()}
          caseSensitive={caseSensitive()}
          onToggleCaseSensitive={toggleCaseSensitive}
          placeholder={t("search.originalPlaceholder")}
        />
      </div>

      <div class="flex-1 relative bg-background overflow-hidden">
        <iframe
          ref={iframeRef}
          title="EPUB Reader Preview"
          sandbox="allow-scripts allow-same-origin"
          class="w-full h-full border-0"
        />
      </div>

      <div class="h-8 border-t border-border bg-card px-4 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <span class="truncate max-w-[280px]">{activeSection()?.title || state.metadata.title}</span>
        <div class="flex items-center gap-2 font-mono text-[11px]">
          <span>
            {wordCount()} {t("common.words")}
          </span>
          <span>•</span>
          <span>
            {scrollProgress()}% {t("common.read")}
          </span>
        </div>
        <div class="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            class="h-full bg-primary transition-all duration-150"
            style={{ width: `${scrollProgress()}%` }}
          />
        </div>
      </div>
    </div>
  );
};
