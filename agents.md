# Guidelines for Autonomous Coding Agents

## Iconography and Visual Style
- **Strict Prohibition**: The use of sparks/sparkles icons (`Sparkles`, `Sparkle`, or any multi-point star icon that evokes generic AI assistant tropes) is strictly forbidden across the entire application.
- **Editorial Iconography**: Always select purposeful, literary, and domain-appropriate iconography:
  - Typography & rules: `Type`, `FileText`, `SlidersHorizontal`.
  - Books & structure: `BookOpen`, `BookMarked`, `Layers`, `ListTree`.
  - Literary craftsmanship: `Feather`, `PenTool`.
  - Operations & background tasks: `RefreshCw`, `Loader2`, `CheckCircle2`.

## Design Tokens & Styling
- Never use arbitrary or hardcoded palette colors (e.g. `bg-blue-600`, `text-slate-800`).
- Always use semantic CSS tokens defined in `src/app.css` (e.g. `bg-primary`, `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-secondary`).
- Maintain dark and light mode neutrality.

## Reading Customizer & View Synchronization
- All reading preferences configured in the reading customizer panel ("Personalizador de lectura") — such as font family, font size, line height, margins, max width, and color themes (sepia, dark, light) — must apply symmetrically to both the E-Reader preview (`EReaderPreview`) and the Editor (`TipTapEditor`).
- Maintain formatting and typographical parity between the reader and editor:
  - Headings (chapter title and subsection subtitle) must share proportional spacing and font colors.
  - Scene breaks (`* * *`, `◆ ◇ ◆ ◇ ◆`) and dialogue dashes must be rendered with consistent layout.
  - Narrative paragraph first-line indents and container padding must align across views.

## Media & Discarded Images Lifecycle
- When discarding or restoring media from the modal ("Medios") or toggling low-resolution filters:
  - **Editor (`TipTapEditor`)**: Never permanently strip `<img>` tags from raw section content upon discarding. Preserve node positions for seamless restoration in-place by hiding them reactively using scoped CSS (`display: none !important; margin: 0 !important; height: 0 !important; pointer-events: none !important;`).
  - **Reader (`EReaderPreview`)**: Sanitize rendered HTML reactively via `filterDiscardedImages`, removing `<img>` elements and surrounding wrappers (`div.full-illustration-wrap`, `div.inline-image`, `figure`, `p`).
  - **EPUB Export**: Strip discarded images from section XHTML, package manifest, and spine in both engine and store compilation, while remapping kept image blob URLs to canonical `../Images/${img.name}` relative paths.

## Metadata & Default Values
- Metadata fields such as `publisher` and `description` (synopsis) must default to empty strings when missing, never using hardcoded placeholder strings (e.g. "Agnostic EPUB Converter") or generic file names.
- When new files are imported, synopsis and metadata should update with the latest extracted values if present.

## Code Integrity & Comments
- Do not write code comments (`//` or `#`) in any language or configuration file unless explicitly instructed.
- Do not create README files unless explicitly requested.
- Maintain strict typing in TypeScript without relying on loose `any` types.

## Package Management
- Never manually edit configuration manifests (`package.json`, `Cargo.toml`, etc.) to add dependencies. Always execute or propose the respective terminal commands (`bun add <package>`, `cargo add <crate>`).

## Version Control
- All git commit messages must adhere to the Conventional Commits specification.
- Commit messages must be concise and strictly single-line, with no extended multi-line body descriptions unless requested otherwise.

## Environment Variables & URLs
- Public URLs and environment variables must never be written with fallback default literals (e.g. `process.env.VAR || "https://..."` is strictly forbidden).
- Environment variable retrieval must follow the typed pattern: retrieve `const url: string | null = ...` and throw an explicit error if the value is null or empty.
- Public variables exposed to client and server must use the `PUBLIC_` prefix (e.g. `PUBLIC_SITE_URL`).
- Actual `.env` files must be ignored in `.gitignore`, and a corresponding `.env.example` template must always be provided.
