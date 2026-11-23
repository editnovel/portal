import { afterEach, describe, expect, it } from "bun:test";
import cliManifest from "~/generated/cli-manifest.json";
import { GET } from "~/routes/llms.txt";

const ORIGINAL_PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL;

describe("llms.txt injected from cli-manifest.json", () => {
  afterEach(() => {
    if (ORIGINAL_PUBLIC_SITE_URL === undefined) {
      delete process.env.PUBLIC_SITE_URL;
    } else {
      process.env.PUBLIC_SITE_URL = ORIGINAL_PUBLIC_SITE_URL;
    }
  });

  it("renders CLI version, profiles, commands, MCP tools, and dynamic site URL", async () => {
    process.env.PUBLIC_SITE_URL = "https://preview.editnovel.test/";

    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(body).toContain(`# EditNovel (v${cliManifest.version})`);
    expect(body).toContain(cliManifest.skillsInstallCommand);
    expect(body).toContain("https://preview.editnovel.test/home");

    for (const profile of cliManifest.supportedProfiles) {
      expect(body).toContain(profile);
    }

    for (const tool of cliManifest.mcpTools) {
      expect(body).toContain(tool.name);
    }

    expect(body).toContain("npx -y editnovel ingest");
    expect(body).toContain("npx -y editnovel verify");
  });
});
