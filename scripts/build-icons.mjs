/**
 * Generates the PWA icon set and favicon.
 *
 * Written from scratch against `node:zlib` rather than pulling in `sharp` or
 * `canvas`, for two reasons: the icon is simple geometry that's trivial to
 * rasterise by hand, and a native image dependency in devDependencies is a lot
 * of install weight and platform risk for four PNGs that change approximately
 * never.
 *
 * Run with:  node scripts/build-icons.mjs
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ICON_DIR = join(ROOT, 'public', 'icons')

/* -------------------------------------------------------------------------- */
/*  PNG encoding                                                               */
/* -------------------------------------------------------------------------- */

const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i += 1) {
  let c = i
  for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[i] = c >>> 0
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** A PNG chunk is length + type + data + CRC(type + data). */
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBytes, data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** Encode straight RGBA pixels as a non-interlaced 8-bit PNG. */
function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type: RGBA
  // bytes 10–12 stay zero: deflate, no filtering, no interlace

  // Each scanline is prefixed with its filter type. Filter 0 (none) keeps this
  // encoder simple; zlib still compresses the flat colour regions well.
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* -------------------------------------------------------------------------- */
/*  Rasterising                                                                */
/* -------------------------------------------------------------------------- */

const PALETTE = {
  ink: [24, 24, 27, 255],
  paper: [250, 250, 250, 255],
}

/** Source-over alpha composite of `rgba` onto the buffer at `index`. */
function blend(buffer, index, [r, g, b, a]) {
  const alpha = a / 255
  if (alpha >= 1) {
    buffer[index] = r
    buffer[index + 1] = g
    buffer[index + 2] = b
    buffer[index + 3] = 255
    return
  }
  buffer[index] = Math.round(buffer[index] * (1 - alpha) + r * alpha)
  buffer[index + 1] = Math.round(buffer[index + 1] * (1 - alpha) + g * alpha)
  buffer[index + 2] = Math.round(buffer[index + 2] * (1 - alpha) + b * alpha)
  buffer[index + 3] = 255
}

/**
 * Draw the icon: Lucide's `Minimize` glyph in paper on an ink square.
 *
 * Anti-aliasing is done by supersampling: every output pixel is probed on a 4×4
 * subgrid and the coverage fraction becomes the alpha, so the glyph is a
 * boolean "is this point on a stroke?" test.
 *
 * @param size    Output edge length in pixels.
 * @param padding Fraction of the edge kept clear, for maskable safe-area.
 */
function drawIcon(size, padding) {
  const buffer = Buffer.alloc(size * size * 4)

  // Maskable icons are cropped by the OS, so the background bleeds to the edge.
  for (let i = 0; i < size * size; i += 1) {
    blend(buffer, i * 4, PALETTE.ink)
  }

  const box = size - size * padding * 2
  /** Glyph units (Lucide's 24-unit grid) → pixels. The glyph spans 18 units. */
  const unit = (box * 0.56) / 18
  const half = 1.1 // stroke half-width in glyph units (Lucide's 2, a touch bolder)

  /** Distance from point to segment, in glyph units. */
  const toSegment = (x, y, x1, y1, x2, y2) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
  }

  /*
   * The glyph is four identical corners mirrored about the centre (12, 12), so
   * fold every point into the top-left quadrant and test that corner only:
   * `M8 3v3a2 2 0 0 1-2 2H3`.
   */
  const onStroke = (px, py) => {
    let gx = 12 + (px - size / 2) / unit
    let gy = 12 + (py - size / 2) / unit
    if (gx > 12) gx = 24 - gx
    if (gy > 12) gy = 24 - gy

    if (toSegment(gx, gy, 8, 3, 8, 6) <= half) return true
    if (toSegment(gx, gy, 6, 8, 3, 8) <= half) return true
    if (gx >= 6 && gy >= 6) return Math.abs(Math.hypot(gx - 6, gy - 6) - 2) <= half
    return false
  }

  const SUB = 4
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0
      for (let sy = 0; sy < SUB; sy += 1) {
        for (let sx = 0; sx < SUB; sx += 1) {
          if (onStroke(x + (sx + 0.5) / SUB, y + (sy + 0.5) / SUB)) hits += 1
        }
      }
      if (hits > 0) {
        blend(buffer, (y * size + x) * 4, [
          ...PALETTE.paper.slice(0, 3),
          (hits / (SUB * SUB)) * 255,
        ])
      }
    }
  }

  return encodePng(size, size, buffer)
}

/* -------------------------------------------------------------------------- */

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="10" fill="#18181b"/>
  <g transform="translate(9 9) scale(1.25)" fill="none" stroke="#fafafa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
    <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
    <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
    <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
  </g>
</svg>
`

mkdirSync(ICON_DIR, { recursive: true })

const OUTPUTS = [
  { file: join(ICON_DIR, 'icon-192.png'), size: 192, padding: 0.08 },
  { file: join(ICON_DIR, 'icon-512.png'), size: 512, padding: 0.08 },
  // Maskable icons get a much larger safe area because the OS crops them.
  { file: join(ICON_DIR, 'icon-maskable-512.png'), size: 512, padding: 0.2 },
  { file: join(ICON_DIR, 'apple-touch-icon.png'), size: 180, padding: 0.08 },
]

for (const { file, size, padding } of OUTPUTS) {
  writeFileSync(file, drawIcon(size, padding))
  console.log(`wrote ${file.replace(ROOT + '/', '')} (${size}×${size})`)
}

writeFileSync(join(ROOT, 'public', 'favicon.svg'), FAVICON_SVG)
console.log('wrote public/favicon.svg')
