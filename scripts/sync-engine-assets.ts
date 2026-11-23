import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

interface EngineManifestShape {
  schemaVersion: number;
  archiveSchemaVersion: number;
  presets: unknown[];
  dictionaries: Array<{ brFileName?: string }>;
}

const RELEASE_BASE = "https://github.com/editnovel/engine/releases/latest/download";

function isValidEngineManifest(value: unknown): value is EngineManifestShape {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Partial<EngineManifestShape>;
  return (
    obj.schemaVersion === 1 &&
    obj.archiveSchemaVersion === 2 &&
    Array.isArray(obj.presets) &&
    Array.isArray(obj.dictionaries)
  );
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function syncFromLocalEngine(portalRoot: string): Promise<boolean> {
  const engineManifestPath = join(portalRoot, "..", "engine", "Cargo.toml");
  if (!existsSync(engineManifestPath)) return false;

  const engineDir = dirname(engineManifestPath);
  const manifestOut = join(portalRoot, "src", "generated", "engine-manifest.json");
  const tsOut = join(portalRoot, "src", "generated", "engine-contracts.ts");

  const proc = Bun.spawn(
    [
      "cargo",
      "run",
      "--quiet",
      "--example",
      "export_contracts",
      "--",
      "--manifest-out",
      manifestOut,
      "--ts-out",
      tsOut,
    ],
    {
      cwd: engineDir,
      stdout: "pipe",
      stderr: "pipe",
    }
  );
  if ((await proc.exited) !== 0) return false;

  const dictsSrcDir = join(engineDir, "data", "dicts_br");
  const dictsDstDir = join(portalRoot, "public", "dicts");
  if (existsSync(dictsSrcDir)) {
    await mkdir(dictsDstDir, { recursive: true });
    const entries = await readdir(dictsSrcDir);
    for (const entry of entries) {
      if (entry.endsWith(".br")) {
        await copyFile(join(dictsSrcDir, entry), join(dictsDstDir, entry));
      }
    }
  }
  return true;
}

async function syncFromRelease(portalRoot: string, baseUrl: string): Promise<boolean> {
  const manifestRes = await fetchWithTimeout(`${baseUrl}/engine-manifest.json`);
  const tsRes = await fetchWithTimeout(`${baseUrl}/engine-contracts.ts`);
  if (!manifestRes || !tsRes) return false;

  const rawManifest = await manifestRes.text();
  const parsed: unknown = JSON.parse(rawManifest);
  if (!isValidEngineManifest(parsed)) return false;

  const contractsTs = await tsRes.text();
  if (!contractsTs.includes("export const ENGINE_MANIFEST")) return false;

  const manifestOut = join(portalRoot, "src", "generated", "engine-manifest.json");
  const tsOut = join(portalRoot, "src", "generated", "engine-contracts.ts");
  await mkdir(dirname(manifestOut), { recursive: true });
  await writeFile(manifestOut, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  await writeFile(tsOut, contractsTs, "utf-8");
  return true;
}

async function main(): Promise<void> {
  const portalRoot = join(import.meta.dir, "..");
  const manifestOut = join(portalRoot, "src", "generated", "engine-manifest.json");
  const tsOut = join(portalRoot, "src", "generated", "engine-contracts.ts");
  const args = new Set(process.argv.slice(2));

  if (args.has("--local")) {
    const syncedLocal = await syncFromLocalEngine(portalRoot);
    if (syncedLocal) {
      process.stdout.write("Synced engine contracts and .br dicts from local ../engine\n");
      return;
    }
    process.stderr.write("Local ../engine repo unavailable or failed; keeping snapshot\n");
    return;
  }

  const envBase = process.env.EDITNOVEL_ENGINE_RELEASE_BASE;
  const baseUrl =
    typeof envBase === "string" && envBase.trim().length > 0
      ? envBase.trim().replace(/\/+$/, "")
      : RELEASE_BASE;

  if (await syncFromRelease(portalRoot, baseUrl)) {
    process.stdout.write(`Synced engine contracts from ${baseUrl}\n`);
    return;
  }

  if (existsSync(manifestOut) && existsSync(tsOut)) {
    process.stdout.write("Using committed engine contracts snapshot\n");
    return;
  }

  process.stderr.write("No engine contracts snapshot found and remote fetch failed\n");
  process.exit(1);
}

await main();
