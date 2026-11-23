import cliManifest from "~/generated/cli-manifest.json";
import { ENGINE_MANIFEST } from "~/generated/engine-contracts";
import { getSiteUrl } from "~/lib/env";

interface CliArg {
  id: string;
  long: string | null;
  short: string | null;
  required: boolean;
  takesValue: boolean;
  defaultValues: string[];
}

interface CliCommand {
  path: string[];
  name: string;
  about: string | null;
  args: CliArg[];
  subcommands: CliCommand[];
}

function flattenCommands(commands: CliCommand[]): string[] {
  const lines: string[] = [];
  for (const cmd of commands) {
    if (cmd.subcommands.length > 0) {
      lines.push(...flattenCommands(cmd.subcommands));
      continue;
    }
    const flags = cmd.args
      .map((arg) => {
        const flagName = arg.long ? `--${arg.long}` : `<${arg.id}>`;
        if (arg.long && arg.takesValue) {
          const def = arg.defaultValues[0] ? ` (default: ${arg.defaultValues[0]})` : "";
          return `${flagName} <${arg.id}>${def}`;
        }
        return flagName;
      })
      .join(" ");
    const suffix = flags.length > 0 ? ` ${flags}` : "";
    lines.push(`- \`npx -y ${cliManifest.name} ${cmd.path.join(" ")}${suffix} --json\``);
  }
  return lines;
}

export function GET(): Response {
  const siteUrl = getSiteUrl();
  const mcpJson = JSON.stringify(cliManifest.mcpConfig, null, 2);
  const profiles = cliManifest.supportedProfiles.map((p) => `\`${p}\``).join(", ");
  const langs = cliManifest.supportedLangs.map((l) => `\`${l}\``).join(", ");
  const commandLines = flattenCommands(cliManifest.commands as CliCommand[]).join("\n");
  const mcpToolLines = cliManifest.mcpTools
    .map((tool) => `- \`${tool.name}\`: ${tool.description}`)
    .join("\n");

  const text = `# EditNovel (v${cliManifest.version})

> ${cliManifest.description}

Repository: ${cliManifest.repository}

## Quick Start for AI Agents & Humans

### Zero-Install CLI
\`\`\`bash
npx -y ${cliManifest.name} --help
\`\`\`

### Connect via MCP (\`stdio\`)
\`\`\`json
${mcpJson}
\`\`\`

### Install the Agent Skill
\`\`\`bash
${cliManifest.skillsInstallCommand}
\`\`\`

## Supported Profiles & Languages

- Profiles: ${profiles}
- Languages: ${langs}

## Generated CLI Commands

${commandLines}

## Generated MCP Tools

${mcpToolLines}

## Canonical Agent Workflow (\`SKILL.md\`)

${cliManifest.skillMarkdown}

## Engine & Portable Archive (\`.editnovel\` v${ENGINE_MANIFEST.archiveSchemaVersion})

- Engine Version: \`v${ENGINE_MANIFEST.engineVersion}\`
- Web Presets: ${ENGINE_MANIFEST.presets.map((p) => `\`${p.id}\``).join(", ")}
- Dictionaries: ${ENGINE_MANIFEST.dictionaries.map((d) => `\`${d.brFileName}\``).join(", ")}

## Optional Visual Web Inspector

- Web Portal: ${siteUrl}/ (with [Home](${siteUrl}/home), [Features](${siteUrl}/features), [FAQ](${siteUrl}/faq), and [About](${siteUrl}/about))
`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
