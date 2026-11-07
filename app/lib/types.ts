/**
 * Shared vocabulary for the whole app.
 *
 * These types are imported by both the UI thread and the compression worker, so
 * they must stay free of DOM-only or Vue-only concerns.
 */

/** Formats we can *write*. Decoding accepts far more (whatever the browser can). */
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'

/**
 * What the user picked as a target.
 * - `original` keeps the input format.
 * - `auto` encodes several candidates and keeps whichever came out smallest.
 */
export type TargetFormat = OutputFormat | 'original' | 'auto'

/**
 * How aggressively to compress.
 * - `quality`     — a fixed quality value (the normal case).
 * - `target-size` — binary-search quality until the output fits a byte budget.
 * - `lossless`    — no pixel loss; only meaningful for PNG and WebP.
 */
export type CompressionMode = 'quality' | 'target-size' | 'lossless'

/** Resampling kernels exposed by the WASM resizer, cheapest → sharpest. */
export type ResizeFilter = 'triangle' | 'catrom' | 'mitchell' | 'lanczos3'

export type ResizeMode = 'fit' | 'width' | 'height' | 'percent'

export interface ResizeSettings {
  enabled: boolean
  mode: ResizeMode
  /** Bounding box for `fit`, exact edge for `width` / `height`. */
  width: number
  height: number
  percent: number
  /** Off by default: enlarging an image can only ever add bytes. */
  allowUpscale: boolean
  filter: ResizeFilter
}

export interface JpegSettings {
  /** Progressive scans usually win 2–5% for free. */
  progressive: boolean
  optimizeCoding: boolean
  /** Trellis quantisation: slower, meaningfully smaller. */
  trellis: boolean
  /** 3 = 4:4:4 (no chroma loss), 2 = 4:2:2, 1 = 4:2:0 (smallest). */
  chromaSubsample: 1 | 2 | 3
  /** 0–100; a little smoothing helps noisy photos compress. */
  smoothing: number
  grayscale: boolean
}

export interface WebpSettings {
  /** 0 (fast) … 6 (slowest, smallest). */
  method: number
  /** Quality of the alpha channel, independent of colour. */
  alphaQuality: number
  /** 0 = off, else 0–100; keeps edges crisp at low quality. */
  nearLossless: number
  /** Better chroma reconstruction on hard edges, slightly slower. */
  sharpYuv: boolean
}

export interface AvifSettings {
  /** 0 (slowest, smallest) … 10 (fastest). */
  speed: number
  /** 3 = 4:4:4, 2 = 4:2:2, 1 = 4:2:0. */
  subsample: 1 | 2 | 3
  chromaDeltaQ: boolean
  sharpness: number
  tune: 'auto' | 'psnr' | 'ssim'
}

export interface PngSettings {
  /** oxipng optimisation level, 0–6. Higher costs time, not quality. */
  level: number
  interlace: boolean
  /** Rewrites fully-transparent pixels so they compress better. */
  optimiseAlpha: boolean
}

export interface CompressionSettings {
  format: TargetFormat
  mode: CompressionMode
  /** 1–100. Ignored in `lossless` mode. */
  quality: number
  /** Byte budget for `target-size` mode, in kilobytes. */
  targetSizeKb: number
  /** Candidate formats considered when `format === 'auto'`. */
  autoFormats: OutputFormat[]
  /** If the re-encode came out bigger, hand back the original file instead. */
  keepIfLarger: boolean
  resize: ResizeSettings
  jpeg: JpegSettings
  webp: WebpSettings
  avif: AvifSettings
  png: PngSettings
}

/**
 * One choice in a `UiSegmented` control.
 *
 * Lives here rather than in the component so the many callers that build option
 * arrays can import a type from a module instead of from a `.vue` file.
 */
export interface SegmentOption<T extends string | number> {
  value: T
  label: string
  /** Optional tooltip / longer explanation. */
  title?: string
  disabled?: boolean
}

/** A named bundle of settings, surfaced as one-click chips in the UI. */
export interface Preset {
  id: string
  label: string
  blurb: string
  settings: Partial<CompressionSettings>
}

export type ItemStatus = 'queued' | 'working' | 'done' | 'skipped' | 'error'

export interface CompressionResult {
  size: number
  format: OutputFormat
  mimeType: string
  extension: string
  width: number
  height: number
  /** Human-readable codec name, e.g. `MozJPEG`. */
  encoder: string
  /**
   * True when every candidate came out larger than the input and we returned
   * the original bytes untouched. An honest "already optimal" signal.
   */
  usedOriginal: boolean
  /** Encode passes spent — >1 only in `target-size` mode. */
  attempts: number
  /** Wall-clock time inside the worker. */
  durationMs: number
}

/** One row of the "try every format" comparison table. */
export interface FormatCandidate {
  format: OutputFormat
  size: number
  encoder: string
  durationMs: number
}

export interface QueueItem {
  id: string
  /** Held with `markRaw` — Vue must never try to make a File reactive. */
  file: File
  name: string
  originalSize: number
  originalType: string
  /** Intrinsic dimensions, filled in once the preview decodes. */
  width: number
  height: number
  status: ItemStatus
  /** 0–1. */
  progress: number
  stage: string
  error: string
  /** Object URLs — both must be revoked when the item leaves the queue. */
  previewUrl: string
  outputUrl: string
  result: CompressionResult | null
  /** Per-image quality escape hatch; `null` means "follow global settings". */
  qualityOverride: number | null
  candidates: FormatCandidate[]
  /** Serialised settings the current `result` was produced with, for staleness. */
  settingsKey: string
}

/* -------------------------------------------------------------------------- */
/*  Worker protocol                                                            */
/* -------------------------------------------------------------------------- */

export interface CompressRequest {
  kind: 'compress'
  id: string
  /** Transferred, not copied. */
  buffer: ArrayBuffer
  mimeType: string
  fileName: string
  settings: CompressionSettings
}

export interface ProbeRequest {
  kind: 'probe'
  id: string
  buffer: ArrayBuffer
  mimeType: string
  settings: CompressionSettings
  formats: OutputFormat[]
}

export type WorkerRequest = CompressRequest | ProbeRequest

export interface ProgressMessage {
  kind: 'progress'
  id: string
  progress: number
  stage: string
}

export interface CompressDoneMessage {
  kind: 'done'
  id: string
  buffer: ArrayBuffer
  result: CompressionResult
}

export interface ProbeDoneMessage {
  kind: 'probed'
  id: string
  candidates: FormatCandidate[]
}

export interface ErrorMessage {
  kind: 'error'
  id: string
  message: string
}

export type WorkerResponse = ProgressMessage | CompressDoneMessage | ProbeDoneMessage | ErrorMessage
