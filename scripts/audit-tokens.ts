import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN_COLOR_REGEX =
  /\b(?:bg|text|border|ring|stroke|fill)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g;

const FORBIDDEN_HEX_REGEX =
  /\b(?:bg|text|border|ring)-\[#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\]/g;

function collectFiles(dir: string, fileList: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry !== "node_modules" && entry !== ".output" && entry !== "wasm") {
        collectFiles(fullPath, fileList);
      }
    } else if (/\.(tsx|jsx|ts)$/.test(entry) && !entry.endsWith(".d.ts")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function runAudit(): void {
  const srcDir = join(import.meta.dir, "..", "src");
  const files = collectFiles(srcDir);
  let totalSmells = 0;

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const colorMatches = line.match(FORBIDDEN_COLOR_REGEX);
      const hexMatches = line.match(FORBIDDEN_HEX_REGEX);
      const allMatches = [...(colorMatches ?? []), ...(hexMatches ?? [])];

      if (allMatches.length > 0) {
        totalSmells += allMatches.length;
        for (const match of allMatches) {
          process.stdout.write(
            `\x1b[31m[Color Smell]\x1b[0m ${file}:${i + 1} -> "${match}" (usa tokens semánticos: bg-primary, text-muted-foreground, border-border, etc.)\n`
          );
        }
      }
    }
  }

  if (totalSmells > 0) {
    process.stderr.write(
      `\n\x1b[31mError:\x1b[0m Se encontraron ${totalSmells} colores arbitrarios hardcodeados.\n`
    );
    process.exit(1);
  }

  process.stdout.write(
    `\x1b[32m✓ 0 colores arbitrarios detectados en ${files.length} archivos.\x1b[0m\n`
  );
}

runAudit();
