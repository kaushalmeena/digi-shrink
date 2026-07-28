/// <reference lib="webworker" />

/**
 * ============================================================================
 *  The compression worker
 * ============================================================================
 *  Every byte of image processing happens in here, off the main thread, using
 *  WASM codecs bundled with the app. Nothing is uploaded; there is no network
 *  call in this file and no way to add one without it being obvious.
 *
 *  Pipeline
 *  --------
 *    decode → (resize) → encode candidates → pick winner → post back
 *
 *  Design notes worth knowing before editing:
 *
 *  - **Decoding uses the browser, not WASM.** `createImageBitmap` is hardware
 *    accelerated, handles EXIF orientation, and supports formats we have no
 *    decoder for (HEIC on Safari, GIF, BMP, SVG). WASM decoders are only a
 *    fallback for the rare blob the browser refuses.
 *
 *  - **Codecs are imported lazily.** The AVIF encoder alone is several MB of
 *    WASM. Loading it only when someone actually picks AVIF keeps first paint
 *    fast, and the service worker still precaches everything for offline use.
 *
 *  - **Metadata is dropped by construction.** Because we go through raw
 *    `ImageData`, EXIF, GPS coordinates and colour profiles cannot survive the
 *    round trip. That is a privacy feature, so it is not configurable.
 *
 *  - **Buffers are transferred, never copied.** Both directions use the
 *    structured-clone transfer list, so a 40MP image costs no memcpy.
 */

import type {
  CompressionResult,
  CompressionSettings,
  FormatCandidate,
  OutputFormat,
  WorkerRequest,
  WorkerResponse,
} from '~/lib/types'
import {
  FORMAT_META,
  MAX_PIXELS,
  MAX_TARGET_SIZE_ATTEMPTS,
  TARGET_SIZE_TOLERANCE,
} from '~/lib/constants'
import { computeTargetDimensions, resolveCandidateFormats } from '~/lib/image'

/* -------------------------------------------------------------------------- */
/*  Messaging                                                                  */
/* -------------------------------------------------------------------------- */

function post(message: WorkerResponse, transfer: Transferable[] = []): void {
  self.postMessage(message, transfer)
}

function reportProgress(id: string, progress: number, stage: string): void {
  post({ kind: 'progress', id, progress, stage })
}

/* -------------------------------------------------------------------------- */
/*  Decoding                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Reusable scratch canvas. Allocating an `OffscreenCanvas` per image is
 * measurably slower across a large batch, so we keep one and resize it.
 */
let scratchCanvas: OffscreenCanvas | null = null

function getScratchContext(width: number, height: number): OffscreenCanvasRenderingContext2D {
  if (!scratchCanvas) {
    scratchCanvas = new OffscreenCanvas(width, height)
  } else {
    scratchCanvas.width = width
    scratchCanvas.height = height
  }

  // `willReadFrequently` steers the browser to a CPU-backed surface, which is
  // what we want because the very next thing we do is `getImageData`.
  const context = scratchCanvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Could not get a 2D drawing context.')

  return context
}

function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const context = getScratchContext(bitmap.width, bitmap.height)
  context.clearRect(0, 0, bitmap.width, bitmap.height)
  context.drawImage(bitmap, 0, 0)
  return context.getImageData(0, 0, bitmap.width, bitmap.height)
}

/** Last-resort decoders for blobs `createImageBitmap` rejects. */
async function decodeWithWasm(buffer: ArrayBuffer, mimeType: string): Promise<ImageData> {
  switch (mimeType) {
    case 'image/jpeg': {
      const { default: decode } = await import('@jsquash/jpeg/decode')
      return decode(buffer)
    }
    case 'image/png': {
      const { default: decode } = await import('@jsquash/png/decode')
      return decode(buffer)
    }
    case 'image/webp': {
      const { default: decode } = await import('@jsquash/webp/decode')
      return decode(buffer)
    }
    case 'image/avif': {
      const { default: decode } = await import('@jsquash/avif/decode')
      // Unlike the others, the AVIF decoder returns null on a malformed file
      // rather than throwing.
      const decoded = await decode(buffer)
      if (!decoded) throw new Error('That AVIF file could not be decoded.')
      return decoded
    }
    default:
      throw new Error(`This browser can't decode ${mimeType || 'that file type'}.`)
  }
}

async function decode(buffer: ArrayBuffer, mimeType: string): Promise<ImageData> {
  const blob = new Blob([buffer], { type: mimeType })

  try {
    // `premultiplyAlpha: 'none'` matters: the encoders expect straight alpha, and
    // premultiplied edges show up as dark fringing on transparent PNGs.
    const bitmap = await createImageBitmap(blob, {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'default',
    })

    if (bitmap.width * bitmap.height > MAX_PIXELS) {
      bitmap.close()
      throw new Error('That image is larger than 100 megapixels.')
    }

    try {
      return bitmapToImageData(bitmap)
    } finally {
      // Bitmaps hold GPU memory until explicitly closed.
      bitmap.close()
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('megapixels')) throw error
    return decodeWithWasm(buffer, mimeType)
  }
}

/* -------------------------------------------------------------------------- */
/*  Resizing                                                                   */
/* -------------------------------------------------------------------------- */

async function resize(
  image: ImageData,
  target: { width: number; height: number },
  filter: CompressionSettings['resize']['filter'],
): Promise<ImageData> {
  const { default: resizeImage } = await import('@jsquash/resize')

  return resizeImage(image, {
    width: target.width,
    height: target.height,
    method: filter,
    // The aspect ratio was already resolved by `computeTargetDimensions`, so the
    // resizer should hit these exact numbers rather than fitting again.
    fitMethod: 'stretch',
    // Resampling in linear light avoids the dark halos that plague naive
    // downscaling of high-contrast images.
    linearRGB: true,
    premultiply: true,
  })
}

/* -------------------------------------------------------------------------- */
/*  Encoding                                                                   */
/* -------------------------------------------------------------------------- */

/** Strip alpha onto white — JPEG has no alpha channel to write it into. */
function flattenAlpha(image: ImageData): ImageData {
  const context = getScratchContext(image.width, image.height)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, image.width, image.height)
  context.putImageData(image, 0, 0)
  return context.getImageData(0, 0, image.width, image.height)
}

function hasTransparency(image: ImageData): boolean {
  const { data } = image
  // Sampling every 40th pixel finds real transparency reliably and is ~40x
  // cheaper than a full scan on a large image.
  for (let i = 3; i < data.length; i += 160) {
    if (data[i]! < 255) return true
  }
  return false
}

async function encodeJpeg(
  image: ImageData,
  quality: number,
  settings: CompressionSettings,
): Promise<ArrayBuffer> {
  const { default: encode } = await import('@jsquash/jpeg/encode')
  const source = hasTransparency(image) ? flattenAlpha(image) : image

  return encode(source, {
    quality,
    progressive: settings.jpeg.progressive,
    optimize_coding: settings.jpeg.optimizeCoding,
    trellis_multipass: settings.jpeg.trellis,
    trellis_opt_zero: settings.jpeg.trellis,
    trellis_opt_table: settings.jpeg.trellis,
    smoothing: settings.jpeg.smoothing,
    // 1 = grayscale, 3 = YCbCr in MozJPEG's colour-space enum.
    color_space: settings.jpeg.grayscale ? 1 : 3,
    auto_subsample: false,
    chroma_subsample: settings.jpeg.chromaSubsample,
  })
}

async function encodeWebp(
  image: ImageData,
  quality: number,
  settings: CompressionSettings,
  lossless: boolean,
): Promise<ArrayBuffer> {
  const { default: encode } = await import('@jsquash/webp/encode')

  return encode(image, {
    quality,
    lossless: lossless ? 1 : 0,
    // In lossless mode libwebp reads `quality` as an effort/size trade-off,
    // where 100 means "try hardest". Anything lower just wastes the mode.
    ...(lossless ? { quality: 100, exact: 1 } : {}),
    method: settings.webp.method,
    alpha_quality: settings.webp.alphaQuality,
    near_lossless: settings.webp.nearLossless > 0 ? settings.webp.nearLossless : 100,
    use_sharp_yuv: settings.webp.sharpYuv ? 1 : 0,
  })
}

async function encodeAvif(
  image: ImageData,
  quality: number,
  settings: CompressionSettings,
): Promise<ArrayBuffer> {
  const { default: encode } = await import('@jsquash/avif/encode')
  const tuneMap = { auto: 0, psnr: 1, ssim: 2 } as const

  return encode(image, {
    quality,
    qualityAlpha: -1, // -1 tracks the colour quality
    speed: settings.avif.speed,
    subsample: settings.avif.subsample,
    chromaDeltaQ: settings.avif.chromaDeltaQ,
    sharpness: settings.avif.sharpness,
    tune: tuneMap[settings.avif.tune],
  })
}

/**
 * PNG is a two-step encode: a fast Rust encoder produces valid PNG bytes, then
 * oxipng rewrites them losslessly with better filtering and a smaller palette.
 * The second pass is where the real savings are.
 */
async function encodePng(image: ImageData, settings: CompressionSettings): Promise<ArrayBuffer> {
  const [{ default: encode }, { default: optimise }] = await Promise.all([
    import('@jsquash/png/encode'),
    import('@jsquash/oxipng/optimise'),
  ])

  const encoded = await encode(image)

  return optimise(encoded, {
    level: settings.png.level,
    interlace: settings.png.interlace,
    optimiseAlpha: settings.png.optimiseAlpha,
  })
}

async function encodeAs(
  format: OutputFormat,
  image: ImageData,
  quality: number,
  settings: CompressionSettings,
): Promise<ArrayBuffer> {
  const lossless = settings.mode === 'lossless'

  switch (format) {
    case 'jpeg':
      return encodeJpeg(image, quality, settings)
    case 'png':
      return encodePng(image, settings)
    case 'webp':
      return encodeWebp(image, quality, settings, lossless)
    case 'avif':
      return encodeAvif(image, quality, settings)
  }
}

/* -------------------------------------------------------------------------- */
/*  Target-size search                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Binary-search quality until the encoded size lands just under a byte budget.
 *
 * We keep the best *passing* result rather than the last one, so a search that
 * runs out of attempts still returns something that fits. If nothing fits even
 * at the floor, the smallest attempt wins — undershooting the user's intent
 * beats handing back a file that's too big.
 */
async function encodeToTargetSize(
  format: OutputFormat,
  image: ImageData,
  settings: CompressionSettings,
  onAttempt: (attempt: number) => void,
): Promise<{ buffer: ArrayBuffer; attempts: number }> {
  const budget = settings.targetSizeKb * 1024

  let low = 5
  let high = 97
  let attempts = 0
  let best: ArrayBuffer | null = null
  let smallest: ArrayBuffer | null = null

  while (attempts < MAX_TARGET_SIZE_ATTEMPTS && low <= high) {
    const quality = Math.round((low + high) / 2)
    attempts += 1
    onAttempt(attempts)

    const buffer = await encodeAs(format, image, quality, settings)

    if (!smallest || buffer.byteLength < smallest.byteLength) {
      smallest = buffer
    }

    if (buffer.byteLength <= budget) {
      best = buffer
      // Close enough to the budget that more passes aren't worth the time.
      if (buffer.byteLength >= budget * (1 - TARGET_SIZE_TOLERANCE)) break
      low = quality + 1
    } else {
      high = quality - 1
    }
  }

  return { buffer: best ?? smallest!, attempts }
}

/* -------------------------------------------------------------------------- */
/*  Orchestration                                                              */
/* -------------------------------------------------------------------------- */

/** Decode and optionally resize — the shared front half of both request kinds. */
async function prepare(
  buffer: ArrayBuffer,
  mimeType: string,
  settings: CompressionSettings,
  report: (progress: number, stage: string) => void,
): Promise<ImageData> {
  report(0.1, 'Decoding')
  const decoded = await decode(buffer, mimeType)

  const target = computeTargetDimensions(decoded.width, decoded.height, settings.resize)
  if (!target) return decoded

  report(0.3, `Resizing to ${target.width}×${target.height}`)
  return resize(decoded, target, settings.resize.filter)
}

async function handleCompress(
  id: string,
  buffer: ArrayBuffer,
  mimeType: string,
  settings: CompressionSettings,
): Promise<void> {
  const startedAt = performance.now()
  const originalSize = buffer.byteLength

  const report = (progress: number, stage: string) => reportProgress(id, progress, stage)
  const image = await prepare(buffer, mimeType, settings, report)

  const formats = resolveCandidateFormats(settings, mimeType)

  let winner: { buffer: ArrayBuffer; format: OutputFormat; attempts: number } | null = null

  for (const [index, format] of formats.entries()) {
    const label = FORMAT_META[format].label
    // Spread encode progress across 0.4 → 0.95 so the bar advances smoothly
    // regardless of how many candidates there are.
    const base = 0.4 + (index / formats.length) * 0.55

    report(base, formats.length > 1 ? `Trying ${label}` : `Encoding ${label}`)

    const encoded =
      settings.mode === 'target-size'
        ? await encodeToTargetSize(format, image, settings, (attempt) =>
            report(base, `${label} pass ${attempt}`),
          )
        : {
            buffer: await encodeAs(format, image, settings.quality, settings),
            attempts: 1,
          }

    if (!winner || encoded.buffer.byteLength < winner.buffer.byteLength) {
      winner = { buffer: encoded.buffer, format, attempts: encoded.attempts }
    }
  }

  if (!winner) throw new Error('No output format was available for this image.')

  report(0.98, 'Finishing')

  /*
   * Honesty guard: re-encoding an already-well-optimised image often makes it
   * bigger. When that happens we hand back the original bytes and say so,
   * rather than quietly shipping a worse file.
   */
  const grew = winner.buffer.byteLength >= originalSize
  const keepOriginal = grew && settings.keepIfLarger && settings.mode !== 'lossless'

  const outputBuffer = keepOriginal ? buffer : winner.buffer
  const format = keepOriginal
    ? ((Object.keys(FORMAT_META) as OutputFormat[]).find(
        (key) => FORMAT_META[key].mimeType === mimeType,
      ) ?? winner.format)
    : winner.format

  const result: CompressionResult = {
    size: outputBuffer.byteLength,
    format,
    mimeType: keepOriginal ? mimeType : FORMAT_META[format].mimeType,
    extension: FORMAT_META[format].extension,
    width: image.width,
    height: image.height,
    encoder: keepOriginal ? 'original' : FORMAT_META[format].encoder,
    usedOriginal: keepOriginal,
    attempts: winner.attempts,
    durationMs: performance.now() - startedAt,
  }

  post({ kind: 'done', id, buffer: outputBuffer, result }, [outputBuffer])
}

/**
 * Encode the same image to every requested format so the UI can show a real
 * side-by-side of what each one costs. Powers the "format lab" table.
 */
async function handleProbe(
  id: string,
  buffer: ArrayBuffer,
  mimeType: string,
  settings: CompressionSettings,
  formats: OutputFormat[],
): Promise<void> {
  const report = (progress: number, stage: string) => reportProgress(id, progress, stage)
  const image = await prepare(buffer, mimeType, settings, report)

  const candidates: FormatCandidate[] = []

  for (const [index, format] of formats.entries()) {
    report(0.4 + (index / formats.length) * 0.55, `Measuring ${FORMAT_META[format].label}`)

    const startedAt = performance.now()
    try {
      const encoded = await encodeAs(format, image, settings.quality, settings)
      candidates.push({
        format,
        size: encoded.byteLength,
        encoder: FORMAT_META[format].encoder,
        durationMs: performance.now() - startedAt,
      })
    } catch {
      // A single unsupported codec shouldn't invalidate the whole comparison.
    }
  }

  post({ kind: 'probed', id, candidates })
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data

  const run =
    request.kind === 'compress'
      ? handleCompress(request.id, request.buffer, request.mimeType, request.settings)
      : handleProbe(request.id, request.buffer, request.mimeType, request.settings, request.formats)

  run.catch((error: unknown) => {
    post({
      kind: 'error',
      id: request.id,
      message: error instanceof Error ? error.message : 'Compression failed unexpectedly.',
    })
  })
})
