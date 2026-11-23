import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  HardDrive,
  Loader2,
  ScanText,
  Trash2,
  X,
} from "lucide-solid";
import { type Component, Show } from "solid-js";
import type { OcrExecutionProvider } from "./types";

export type OcrBannerStatus =
  | "idle"
  | "downloading"
  | "initializing"
  | "recognizing"
  | "ready"
  | "error";

export interface OcrStatusCardLabels {
  title?: string;
  subtitle?: string;
  runButton?: string;
  retryButton?: string;
  downloadingLabel?: string;
  initializingLabel?: string;
  recognizingLabel?: string;
  readyLabel?: string;
  cachedOfflineBadge?: string;
  clearCacheTitle?: string;
  dismissAria?: string;
}

export interface OcrStatusCardProps {
  needsOcr: boolean;
  scannedPageNumbers: number[];
  status: OcrBannerStatus;
  progressPercent?: number;
  currentPage?: number;
  totalPages?: number;
  provider?: OcrExecutionProvider | null;
  cacheReady?: boolean;
  errorMessage?: string | null;
  onRunOcr: () => void;
  onClearCache?: () => void;
  onDismiss?: () => void;
  labels?: OcrStatusCardLabels;
}

export const OcrStatusCard: Component<OcrStatusCardProps> = (props) => {
  const isBusy = () =>
    props.status === "downloading" ||
    props.status === "initializing" ||
    props.status === "recognizing";

  const clampedPercent = () => Math.min(100, Math.max(0, props.progressPercent ?? 0));

  const titleText = () =>
    props.labels?.title ?? `Scanned pages detected (${props.scannedPageNumbers.length})`;

  const subtitleText = () =>
    props.labels?.subtitle ??
    "Run local WebGPU / WASM OCR in your browser to extract text layers without uploading files.";

  const busyLabel = () => {
    if (props.status === "downloading") {
      return props.labels?.downloadingLabel ?? `Downloading OCR models (${clampedPercent()}%)...`;
    }
    if (props.status === "initializing") {
      return props.labels?.initializingLabel ?? "Initializing ONNX Runtime...";
    }
    const page = props.currentPage ?? 0;
    const total = props.totalPages ?? props.scannedPageNumbers.length;
    return props.labels?.recognizingLabel ?? `Recognizing page ${page} of ${total}...`;
  };

  return (
    <Show when={props.needsOcr}>
      <div class="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-xs">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ScanText class="w-4 h-4" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-xs font-semibold text-foreground">{titleText()}</h4>
                <Show when={props.provider}>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium border border-border">
                    <Cpu class="w-3 h-3 text-primary" />
                    <span>{props.provider === "webgpu" ? "WebGPU" : "WASM SIMD"}</span>
                  </span>
                </Show>
                <Show when={props.cacheReady}>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-medium border border-border">
                    <HardDrive class="w-3 h-3" />
                    <span>{props.labels?.cachedOfflineBadge ?? "Offline ready"}</span>
                  </span>
                </Show>
              </div>
              <p class="text-[11px] text-muted-foreground leading-relaxed">{subtitleText()}</p>
            </div>
          </div>

          <Show when={props.onDismiss && !isBusy()}>
            <button
              type="button"
              onClick={props.onDismiss}
              aria-label={props.labels?.dismissAria ?? "Dismiss OCR prompt"}
              class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </Show>
        </div>

        <Show when={isBusy()}>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-[11px] text-muted-foreground">
              <span class="inline-flex items-center gap-1.5 text-foreground font-medium">
                <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
                <span>{busyLabel()}</span>
              </span>
              <span class="font-mono tabular-nums">{clampedPercent()}%</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-200"
                style={{ width: `${clampedPercent()}%` }}
              />
            </div>
          </div>
        </Show>

        <Show when={props.status === "error" && props.errorMessage}>
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[11px]">
            <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{props.errorMessage}</span>
          </div>
        </Show>

        <Show when={props.status === "ready"}>
          <div class="flex items-center gap-2 text-xs text-primary font-medium">
            <CheckCircle2 class="w-4 h-4 shrink-0" />
            <span>{props.labels?.readyLabel ?? "OCR text layer applied"}</span>
          </div>
        </Show>

        <div class="flex items-center justify-between gap-2 pt-1">
          <div class="flex items-center gap-2">
            <Show when={props.status !== "ready"}>
              <button
                type="button"
                onClick={props.onRunOcr}
                disabled={isBusy()}
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer shadow-xs"
              >
                <Show when={isBusy()} fallback={<Download class="w-3.5 h-3.5" />}>
                  <Loader2 class="w-3.5 h-3.5 animate-spin" />
                </Show>
                <span>
                  {props.status === "error"
                    ? (props.labels?.retryButton ?? "Retry OCR")
                    : (props.labels?.runButton ?? "Run local OCR")}
                </span>
              </button>
            </Show>
          </div>

          <Show when={props.cacheReady && props.onClearCache && !isBusy()}>
            <button
              type="button"
              onClick={props.onClearCache}
              title={props.labels?.clearCacheTitle ?? "Clear cached OCR models"}
              class="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </Show>
        </div>
      </div>
    </Show>
  );
};
