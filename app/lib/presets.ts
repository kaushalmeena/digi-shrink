import type { CompressionSettings, Preset } from './types'

/**
 * The baseline every preset and every user tweak starts from.
 *
 * Chosen to be a genuinely good default rather than a neutral one: WebP at
 * quality 78 with method 4 beats a source JPEG by a wide margin on almost every
 * real photo while staying visually indistinguishable at 100% zoom.
 */
export const DEFAULT_SETTINGS: CompressionSettings = {
  format: 'webp',
  mode: 'quality',
  quality: 78,
  targetSizeKb: 200,
  autoFormats: ['webp', 'avif', 'jpeg'],
  keepIfLarger: true,

  resize: {
    enabled: false,
    mode: 'fit',
    width: 2048,
    height: 2048,
    percent: 50,
    allowUpscale: false,
    filter: 'lanczos3',
  },

  jpeg: {
    progressive: true,
    optimizeCoding: true,
    trellis: true,
    chromaSubsample: 2,
    smoothing: 0,
    grayscale: false,
  },

  webp: {
    method: 4,
    alphaQuality: 100,
    nearLossless: 0,
    sharpYuv: false,
  },

  avif: {
    speed: 6,
    subsample: 1,
    chromaDeltaQ: false,
    sharpness: 0,
    tune: 'auto',
  },

  png: {
    level: 3,
    interlace: false,
    optimiseAlpha: true,
  },
}

/**
 * One-click starting points. These cover the cases people actually have, so most
 * users never need to open the advanced panel at all.
 */
export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    blurb: 'WebP at q78. Looks identical, roughly half the bytes.',
    accent: 'accent',
    settings: {
      format: 'webp',
      mode: 'quality',
      quality: 78,
      resize: { ...DEFAULT_SETTINGS.resize, enabled: false },
    },
  },
  {
    id: 'web',
    label: 'Web ready',
    blurb: 'Caps the long edge at 1920px — right for any page or post.',
    accent: 'mint',
    settings: {
      format: 'webp',
      mode: 'quality',
      quality: 74,
      resize: { ...DEFAULT_SETTINGS.resize, enabled: true, mode: 'fit', width: 1920, height: 1920 },
    },
  },
  {
    id: 'tiny',
    label: 'Max shrink',
    blurb: 'AVIF, tuned hard. Smallest possible file, slowest to encode.',
    accent: 'berry',
    settings: {
      format: 'avif',
      mode: 'quality',
      quality: 52,
      avif: { ...DEFAULT_SETTINGS.avif, speed: 4, chromaDeltaQ: true },
    },
  },
  {
    id: 'lossless',
    label: 'Lossless',
    blurb: 'Not a single pixel changes. Shrinks PNGs and screenshots.',
    accent: 'sun',
    settings: {
      format: 'png',
      mode: 'lossless',
      png: { ...DEFAULT_SETTINGS.png, level: 5 },
    },
  },
  {
    id: 'auto',
    label: 'Pick for me',
    blurb: 'Encodes WebP, AVIF and JPEG, then keeps whichever won.',
    accent: 'accent',
    settings: {
      format: 'auto',
      mode: 'quality',
      quality: 76,
      autoFormats: ['webp', 'avif', 'jpeg'],
    },
  },
  {
    id: 'thumbnail',
    label: 'Thumbnail',
    blurb: '512px square-fit WebP for avatars, cards and previews.',
    accent: 'mint',
    settings: {
      format: 'webp',
      mode: 'quality',
      quality: 72,
      resize: { ...DEFAULT_SETTINGS.resize, enabled: true, mode: 'fit', width: 512, height: 512 },
    },
  },
  {
    id: 'email',
    label: 'Under 200 KB',
    blurb: 'Hits a hard byte budget by hunting for the right quality.',
    accent: 'sun',
    settings: {
      format: 'webp',
      mode: 'target-size',
      targetSizeKb: 200,
      resize: { ...DEFAULT_SETTINGS.resize, enabled: true, mode: 'fit', width: 1600, height: 1600 },
    },
  },
]

/**
 * Deep-merge a preset's partial settings over the current ones.
 *
 * Written explicitly rather than with a generic deep-merge because the shape is
 * fixed and known — this keeps the types exact and avoids surprising behaviour
 * on the array-valued `autoFormats`.
 */
export function applyPreset(
  current: CompressionSettings,
  patch: Partial<CompressionSettings>,
): CompressionSettings {
  return {
    ...current,
    ...patch,
    autoFormats: patch.autoFormats ? [...patch.autoFormats] : current.autoFormats,
    resize: { ...current.resize, ...patch.resize },
    jpeg: { ...current.jpeg, ...patch.jpeg },
    webp: { ...current.webp, ...patch.webp },
    avif: { ...current.avif, ...patch.avif },
    png: { ...current.png, ...patch.png },
  }
}

/**
 * Reconcile persisted settings with the current schema.
 *
 * Stored settings can be from an older version of the app, so unknown keys are
 * dropped and missing keys fall back to defaults. This is why a shipped schema
 * change can never brick someone's saved preferences.
 */
export function hydrateSettings(stored: unknown): CompressionSettings {
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS }
  return applyPreset(DEFAULT_SETTINGS, stored as Partial<CompressionSettings>)
}
