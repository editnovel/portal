import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

interface ManifestShape {
  schemaVersion: number;
  name: string;
  version: string;
  commands: unknown[];
  mcpTools: unknown[];
}

const RELEASE_MANIFEST_ASSET =
  "https://github.com/editnovel/editnovel/releases/latest/download/cli-manifest.json";

function isValidManifest(value: unknown): value is ManifestShape {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Partial<ManifestShape>;
  return (
    obj.schemaVersion === 1 &&
    typeof obj.name === "string" &&
    typeof obj.version === "string" &&
    Array.isArray(obj.commands) &&
    Array.isArray(obj.mcpTools)
  );
}

async function syncFromLocalCargo(targetPath: string): Promise<boolean> {
  const localCliManifest = join(import.meta.dir, "..", "..", "editnovel", "Cargo.toml");
  if (!existsSync(localCliManifest)) return false;

  const localCliDir = dirname(localCliManifest);
  const proc = Bun.spawn(["cargo", "run", "--quiet", "--", "docs", "--out", targetPath], {
    cwd: localCliDir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

async function syncFromRemoteUrl(url: string, targetPath: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const rawText = await response.text();
    const parsed: unknown = JSON.parse(rawText);
    if (!isValidManifest(parsed)) return false;
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const targetPath = join(import.meta.dir, "..", "src", "generated", "cli-manifest.json");
  const args = new Set(process.argv.slice(2));

  if (args.has("--local")) {
    const syncedLocal = await syncFromLocalCargo(targetPath);
    if (syncedLocal) {
      process.stdout.write("Synced cli-manifest.json from local ../editnovel CLI\n");
      return;
    }
    process.stderr.write("Local ../editnovel repo unavailable or failed; keeping snapshot\n");
    return;
  }

  const envUrl = process.env.EDITNOVEL_MANIFEST_URL;
  const targetUrl =
    typeof envUrl === "string" && envUrl.trim().length > 0 ? envUrl.trim() : RELEASE_MANIFEST_ASSET;

  const syncedRemote = await syncFromRemoteUrl(targetUrl, targetPath);
  if (syncedRemote) {
    process.stdout.write(`Synced cli-manifest.json from ${targetUrl}\n`);
    return;
  }

  if (existsSync(targetPath)) {
    process.stdout.write("Using committed cli-manifest.json snapshot\n");
    return;
  }

  process.stderr.write("No cli-manifest.json snapshot found and remote fetch failed\n");
  process.exit(1);
}

await main();
