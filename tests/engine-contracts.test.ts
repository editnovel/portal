import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ENGINE_MANIFEST } from "~/generated/engine-contracts";
import engineManifestJson from "~/generated/engine-manifest.json";
import { INITIAL_EDITORIAL_RULES } from "~/lib/store/templates";

describe("generated engine contracts and manifest", () => {
  it("keeps engine-contracts.ts and engine-manifest.json synchronized", () => {
    expect(ENGINE_MANIFEST).toEqual(engineManifestJson);
    expect(ENGINE_MANIFEST.archiveFormat).toBe("editnovel");
    expect(ENGINE_MANIFEST.archiveSchemaVersion).toBe(2);
  });

  it("maps CLI profile aliases and UI presets consistently", () => {
    expect(ENGINE_MANIFEST.presets.map((p) => p.id)).toEqual([
      "visual-novel",
      "generic",
      "webnovel",
      "readme",
      "paper",
    ]);
    expect(ENGINE_MANIFEST.presetAliases["en-light-novel"]).toBe("visual-novel");
    expect(ENGINE_MANIFEST.presetAliases["es-editorial"]).toBe("visual-novel");
    expect(ENGINE_MANIFEST.presetAliases["en-litrpg"]).toBe("webnovel");
    expect(ENGINE_MANIFEST.presetAliases["en-fiction"]).toBe("generic");
  });

  it("exposes all Brotli dictionaries that exist in public/dicts", () => {
    expect(ENGINE_MANIFEST.dictionaries.length).toBeGreaterThanOrEqual(3);
    for (const dict of ENGINE_MANIFEST.dictionaries) {
      const diskPath = join(import.meta.dir, "..", "public", "dicts", dict.brFileName);
      expect(existsSync(diskPath)).toBe(true);
    }
  });

  it("derives initial editorial rules directly from ENGINE_MANIFEST", () => {
    expect(INITIAL_EDITORIAL_RULES).toEqual(ENGINE_MANIFEST.defaultEditorialRules);
    expect(INITIAL_EDITORIAL_RULES.map((r) => r.id)).toContain("rule-dialogue-dashes");
  });
});
