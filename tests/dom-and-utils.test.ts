import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { safeRevokeBlobUrl } from "~/lib/blob-utils";
import {
  AVAILABLE_FONTS,
  DEFAULT_READER_SETTINGS,
  getAppTheme,
  readerSettingsToCssVariables,
} from "~/lib/reader-settings";
import {
  applyDialogueUnification,
  applyEllipsisUnification,
  applyQuotesUnification,
  formatDialogueWithSymbol,
} from "~/lib/store/slices/rules.slice";

describe("reader-settings utilities", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark", "light");
    mock.restore();
  });

  it("exposes default settings and available font options", () => {
    expect(DEFAULT_READER_SETTINGS.fontFamily).toBe("libron");
    expect(DEFAULT_READER_SETTINGS.scrollMode).toBe("continuous");
    expect(AVAILABLE_FONTS.map((f) => f.id)).toEqual([
      "libron",
      "literata",
      "merriweather",
      "atkinson",
    ]);
  });

  it("resolves app theme from document classList and sepia override", () => {
    expect(getAppTheme("sepia")).toBe("sepia");

    document.documentElement.classList.add("dark");
    expect(getAppTheme("light")).toBe("dark");

    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    expect(getAppTheme("light")).toBe("light");
  });

  it("maps reader settings to CSS custom properties", () => {
    const vars = readerSettingsToCssVariables(
      {
        ...DEFAULT_READER_SETTINGS,
        fontFamily: "atkinson",
        fontSize: 20,
        lineHeight: 1.9,
        margin: "spacious",
        textAlign: "left",
        hyphenation: false,
        hangingPunctuation: false,
        theme: "sepia",
      },
      "sepia"
    );

    expect(vars["--reader-font"]).toContain("Atkinson Hyperlegible");
    expect(vars["--reader-font-size"]).toBe("20px");
    expect(vars["--reader-line-height"]).toBe("1.9");
    expect(vars["--reader-max-width"]).toBe("34rem");
    expect(vars["--reader-padding-x"]).toBe("4rem");
    expect(vars["--reader-text-align"]).toBe("left");
    expect(vars["--reader-hyphens"]).toBe("none");
    expect(vars["--reader-hanging-punctuation"]).toBe("none");
    expect(vars["--reader-bg"]).toBe("#fbf0d9");
  });
});

describe("blob-utils", () => {
  afterEach(() => {
    mock.restore();
  });

  it("revokes only valid blob: URLs safely", () => {
    const revokeSpy = spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    safeRevokeBlobUrl("blob:https://localhost/1234-5678");
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:https://localhost/1234-5678");

    safeRevokeBlobUrl("https://example.com/file.pdf");
    safeRevokeBlobUrl(null);
    safeRevokeBlobUrl(undefined);
    expect(revokeSpy).toHaveBeenCalledTimes(1);
  });
});

describe("pure HTML editorial transformations", () => {
  it("formats and unifies dialogue paragraphs in HTML", () => {
    expect(formatDialogueWithSymbol("Hola", "「 」")).toBe("「Hola」");
    expect(formatDialogueWithSymbol("Hello", "—")).toBe("— Hello");

    const rawHtml = '<p class="line">— Buenos días.</p><p>Texto narrativo.</p>';
    const unified = applyDialogueUnification(rawHtml, "「 」");

    const container = document.createElement("div");
    container.innerHTML = unified;
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent).toBe("「Buenos días.」");
    expect(paragraphs[1]?.textContent).toBe("Texto narrativo.");
  });

  it("unifies quotation marks and ellipses in HTML", () => {
    const rawHtml = '<p>El sistema mostró "Alerta crítica"...</p>';
    const withQuotes = applyQuotesUnification(rawHtml, "« »");
    const withEllipsis = applyEllipsisUnification(withQuotes, "…");

    const container = document.createElement("div");
    container.innerHTML = withEllipsis;
    expect(container.querySelector("p")?.textContent).toBe("El sistema mostró «Alerta crítica»…");
  });
});
