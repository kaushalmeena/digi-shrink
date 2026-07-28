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
  cream: [255, 253, 245, 255],
  ink: [30, 41, 59, 255],
  violet: [124, 58, 237, 255],
  sun: [251, 191, 36, 255],
  berry: [244, 114, 182, 255],
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
 * Draw the icon.
 *
 * Anti-aliasing is done by supersampling: every output pixel is probed on a 4×4
 * subgrid and the coverage fraction becomes the alpha. That's why the shape
 * helpers below are simple boolean "is this point inside?" predicates.
 *
 * @param size    Output edge length in pixels.
 * @param padding Fraction of the edge kept clear, for maskable safe-area.
 */
function drawIcon(size, padding) {
  const buffer = Buffer.alloc(size * size * 4)

  // Maskable icons are cropped to a circle by the OS, so the background must
  // bleed to the very edge.
  for (let i = 0; i < size * size; i += 1) {
    blend(buffer, i * 4, PALETTE.cream)
  }

  const inset = size * padding
  const box = size - inset * 2
  const cx = size / 2
  const cy = size / 2

  /* The mark: a tilted rounded square, a violet disc inside it, and two ink
     bars closing in on the disc — the app squeezing an image. */
  const tilt = (-8 * Math.PI) / 180
  const half = box * 0.42
  const radius = box * 0.12

  const rotate = (x, y) => {
    const dx = x - cx
    const dy = y - cy
    return [
      dx * Math.cos(-tilt) - dy * Math.sin(-tilt),
      dx * Math.sin(-tilt) + dy * Math.cos(-tilt),
    ]
  }

  /** Rounded-square test in the rotated frame. */
  const inSquare = (x, y, shrink = 0) => {
    const [rx, ry] = rotate(x, y)
    const limit = half - shrink
    const ax = Math.abs(rx)
    const ay = Math.abs(ry)
    if (ax > limit || ay > limit) return false
    const corner = limit - radius
    if (ax <= corner || ay <= corner) return true
    return (ax - corner) ** 2 + (ay - corner) ** 2 <= radius ** 2
  }

  const inDisc = (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= (box * 0.23) ** 2

  const inBar = (x, y) => {
    const [rx, ry] = rotate(x, y)
    const thickness = box * 0.055
    const reach = half * 0.62
    if (Math.abs(rx) > reach) return false
    return Math.abs(Math.abs(ry) - half * 0.5) <= thickness / 2
  }

  const SUB = 4
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let border = 0
      let fill = 0
      let disc = 0
      let bar = 0

      for (let sy = 0; sy < SUB; sy += 1) {
        for (let sx = 0; sx < SUB; sx += 1) {
          const px = x + (sx + 0.5) / SUB
          const py = y + (sy + 0.5) / SUB

          if (inSquare(px, py)) {
            border += 1
            if (inSquare(px, py, box * 0.045)) fill += 1
          }
          if (inDisc(px, py)) disc += 1
          if (inBar(px, py)) bar += 1
        }
      }

      const total = SUB * SUB
      const index = (y * size + x) * 4

      // Painted back-to-front: ink border, amber face, violet disc, ink bars.
      if (border > 0) blend(buffer, index, [...PALETTE.ink.slice(0, 3), (border / total) * 255])
      if (fill > 0) blend(buffer, index, [...PALETTE.sun.slice(0, 3), (fill / total) * 255])
      if (disc > 0) blend(buffer, index, [...PALETTE.violet.slice(0, 3), (disc / total) * 255])
      if (bar > 0) blend(buffer, index, [...PALETTE.ink.slice(0, 3), (bar / total) * 255])
    }
  }

  return encodePng(size, size, buffer)
}

/* -------------------------------------------------------------------------- */

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="10" fill="${'#fffdf5'}"/>
  <g transform="rotate(-8 24 24)">
    <rect x="7" y="7" width="34" height="34" rx="8" fill="#fbbf24" stroke="#1e293b" stroke-width="3"/>
    <circle cx="24" cy="24" r="8" fill="#7c3aed"/>
    <path d="M13 15h22M13 33h22" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
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
