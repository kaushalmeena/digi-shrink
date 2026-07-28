import type { OutputFormat } from './types'

/**
 * Formats the browser can reliably hand us as an `ImageBitmap`. We deliberately
 * accept more than we can write (HEIC on Safari, GIF, BMP, SVG) because
 * transcoding *into* a modern format is exactly the point.
 */
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/heic',
  'image/heif',
] as const

/** Used for the file-picker `accept` attribute. */
export const ACCEPT_ATTRIBUTE = [...ACCEPTED_MIME_TYPES, '.heic', '.heif', '.jfif'].join(',')

interface FormatMeta {
  label: string
  mimeType: string
  extension: string
  encoder: string
  supportsAlpha: boolean
  supportsLossless: boolean
  blurb: string
}

export const FORMAT_META: Record<OutputFormat, FormatMeta> = {
  jpeg: {
    label: 'JPEG',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    encoder: 'MozJPEG',
    supportsAlpha: false,
    supportsLossless: false,
    blurb: 'Universal. Best for photos without transparency.',
  },
  png: {
    label: 'PNG',
    mimeType: 'image/png',
    extension: 'png',
    encoder: 'OxiPNG',
    supportsAlpha: true,
    supportsLossless: true,
    blurb: 'Lossless. Best for screenshots, logos and flat colour.',
  },
  webp: {
    label: 'WebP',
    mimeType: 'image/webp',
    extension: 'webp',
    encoder: 'libwebp',
    supportsAlpha: true,
    supportsLossless: true,
    blurb: 'Great all-rounder. ~30% smaller than JPEG, alpha included.',
  },
  avif: {
    label: 'AVIF',
    mimeType: 'image/avif',
    extension: 'avif',
    encoder: 'libavif',
    supportsAlpha: true,
    supportsLossless: false,
    blurb: 'Smallest files by far, but the slowest to encode.',
  },
}

/** Reverse lookup so an input MIME type can map back to an output format. */
export const MIME_TO_FORMAT: Record<string, OutputFormat> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/jfif': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

/**
 * Anything without a writable equivalent (GIF, BMP, SVG, HEIC…) becomes WebP,
 * which is lossless-capable, alpha-capable and universally supported.
 */
export const FALLBACK_FORMAT: OutputFormat = 'webp'

/**
 * Refuse absurd inputs rather than letting a 1GB allocation take down the tab.
 * 100 megapixels is comfortably above any real camera or screenshot.
 */
export const MAX_PIXELS = 100_000_000

/** Guard against someone dropping a folder of 10k files into the browser. */
export const MAX_QUEUE_SIZE = 250

/** `target-size` mode gives up after this many encode passes. */
export const MAX_TARGET_SIZE_ATTEMPTS = 8

/** Accept anything within this fraction under the byte budget as "close enough". */
export const TARGET_SIZE_TOLERANCE = 0.04

/** Decorative shape colours, rotated through for the confetti effect. */
export const CONFETTI_COLORS = ['accent', 'berry', 'sun', 'mint'] as const
