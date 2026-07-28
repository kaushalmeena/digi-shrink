import { ACCEPTED_MIME_TYPES, FALLBACK_FORMAT, FORMAT_META, MIME_TO_FORMAT } from './constants'
import { baseName, sanitizeFileName } from './format'
import type { CompressionSettings, OutputFormat, ResizeSettings } from './types'

/** Extensions we accept even when the OS reports a blank or wrong MIME type. */
const ACCEPTED_EXTENSIONS = /\.(jpe?g|jfif|png|webp|avif|gif|bmp|tiff?|svg|heic|heif)$/i

export function isAcceptedImage(file: File): boolean {
  if ((ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) return true
  // Dragged HEICs and some ZIP-extracted files arrive with an empty `type`.
  return file.type === '' || file.type.startsWith('image/')
    ? ACCEPTED_EXTENSIONS.test(file.name)
    : false
}

/**
 * Work out which format we should actually write.
 *
 * `original` needs a fallback because plenty of inputs (GIF, BMP, SVG, HEIC)
 * have no encoder here — those become WebP, which is lossless-capable and
 * alpha-capable so nothing is ever silently lost.
 */
export function resolveOutputFormat(
  settings: CompressionSettings,
  inputMimeType: string,
): OutputFormat {
  if (settings.format === 'auto') {
    return settings.autoFormats[0] ?? FALLBACK_FORMAT
  }

  if (settings.format === 'original') {
    return MIME_TO_FORMAT[inputMimeType.toLowerCase()] ?? FALLBACK_FORMAT
  }

  return settings.format
}

/**
 * Which formats a run should actually attempt.
 *
 * In `auto` mode that's every candidate the user ticked; otherwise it's the one
 * resolved format. Lossless mode drops AVIF, which has no lossless path here.
 */
export function resolveCandidateFormats(
  settings: CompressionSettings,
  inputMimeType: string,
): OutputFormat[] {
  const candidates =
    settings.format === 'auto'
      ? settings.autoFormats
      : [resolveOutputFormat(settings, inputMimeType)]

  const usable =
    settings.mode === 'lossless'
      ? candidates.filter((format) => FORMAT_META[format].supportsLossless)
      : candidates

  // Never hand back an empty list — that would leave the user with no output.
  return usable.length > 0 ? [...new Set(usable)] : [FALLBACK_FORMAT]
}

/** `holiday-photo.HEIC` → `holiday-photo.webp` */
export function outputFileName(originalName: string, format: OutputFormat): string {
  return `${sanitizeFileName(baseName(originalName))}.${FORMAT_META[format].extension}`
}

/**
 * Resolve the requested resize into concrete pixel dimensions.
 *
 * Returns `null` when no resampling is needed, which lets callers skip the
 * resize pass entirely rather than doing a wasteful 1:1 resample.
 */
export function computeTargetDimensions(
  width: number,
  height: number,
  resize: ResizeSettings,
): { width: number; height: number } | null {
  if (!resize.enabled || width <= 0 || height <= 0) return null

  let scale: number

  switch (resize.mode) {
    case 'percent':
      scale = resize.percent / 100
      break
    case 'width':
      scale = resize.width / width
      break
    case 'height':
      scale = resize.height / height
      break
    case 'fit':
    default:
      // Fit inside the box without distorting the aspect ratio.
      scale = Math.min(resize.width / width, resize.height / height)
      break
  }

  if (!Number.isFinite(scale) || scale <= 0) return null
  if (scale > 1 && !resize.allowUpscale) return null

  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  if (targetWidth === width && targetHeight === height) return null

  return { width: targetWidth, height: targetHeight }
}

/**
 * Human-readable summary of the active settings, for the collapsed drawer header
 * and the queue rows.
 */
export function describeSettings(settings: CompressionSettings): string {
  const format =
    settings.format === 'auto'
      ? 'Auto'
      : settings.format === 'original'
        ? 'Same format'
        : FORMAT_META[settings.format].label

  const quality =
    settings.mode === 'lossless'
      ? 'lossless'
      : settings.mode === 'target-size'
        ? `≤ ${settings.targetSizeKb} KB`
        : `q${settings.quality}`

  const resize = settings.resize.enabled
    ? settings.resize.mode === 'percent'
      ? `${settings.resize.percent}%`
      : settings.resize.mode === 'fit'
        ? `fit ${settings.resize.width}×${settings.resize.height}`
        : settings.resize.mode === 'width'
          ? `${settings.resize.width}px wide`
          : `${settings.resize.height}px tall`
    : null

  return [format, quality, resize].filter(Boolean).join(' · ')
}
