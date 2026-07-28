/**
 * A minimal, dependency-free ZIP writer.
 *
 * Why hand-rolled instead of JSZip/fflate:
 *  - Compressed images are incompressible, so we only ever need the `store`
 *    method. Everything DEFLATE-related in a general-purpose library is dead
 *    weight for this app.
 *  - Zero third-party bytes keeps the offline bundle small and the privacy story
 *    airtight — nothing here can phone home.
 *
 * Memory behaviour matters for a 200-image batch: CRC32 is computed by streaming
 * each blob in chunks, and the final archive is assembled from *references* to
 * the source blobs rather than one giant concatenated buffer. Peak usage stays
 * around the size of a single image, not the whole batch.
 */

const LOCAL_HEADER_SIG = 0x04034b50
const CENTRAL_HEADER_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50
const UTF8_FLAG = 0x0800
const STORE_METHOD = 0
const VERSION = 20

/** ZIP32 caps every size field at 4 GiB; we refuse rather than emit a bad file. */
const MAX_ZIP32_SIZE = 0xffffffff

const CRC_TABLE = /* @__PURE__ */ (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let bit = 0; bit < 8; bit += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32Update(crc: number, bytes: Uint8Array): number {
  let value = crc
  for (let i = 0; i < bytes.length; i += 1) {
    value = CRC_TABLE[(value ^ bytes[i]!) & 0xff]! ^ (value >>> 8)
  }
  return value
}

/** Stream a blob through CRC32 without ever holding it all in memory. */
async function crc32OfBlob(blob: Blob): Promise<number> {
  const reader = blob.stream().getReader()
  let crc = 0xffffffff

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    crc = crc32Update(crc, value)
  }

  return (crc ^ 0xffffffff) >>> 0
}

/** Encode a JS Date into the packed MS-DOS date/time pair ZIP expects. */
function toDosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear())
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/** Little-endian writer over a fixed-size buffer. */
class ByteWriter {
  private readonly view: DataView
  /**
   * Explicitly `Uint8Array<ArrayBuffer>` rather than the default
   * `Uint8Array<ArrayBufferLike>`: only the non-shared form is a valid
   * `BlobPart`, and the `Blob` we ultimately hand back is built from these.
   */
  private readonly bytes: Uint8Array<ArrayBuffer>
  private offset = 0

  constructor(size: number) {
    this.bytes = new Uint8Array(size)
    this.view = new DataView(this.bytes.buffer)
  }

  u16(value: number): this {
    this.view.setUint16(this.offset, value, true)
    this.offset += 2
    return this
  }

  u32(value: number): this {
    this.view.setUint32(this.offset, value >>> 0, true)
    this.offset += 4
    return this
  }

  raw(value: Uint8Array): this {
    this.bytes.set(value, this.offset)
    this.offset += value.length
    return this
  }

  done(): Uint8Array<ArrayBuffer> {
    return this.bytes
  }
}

export interface ZipEntry {
  /** Path inside the archive. Forward slashes create folders. */
  name: string
  blob: Blob
}

export interface ZipProgress {
  /** Entries finished so far. */
  completed: number
  total: number
}

/**
 * Build a `.zip` from a list of blobs.
 *
 * @param entries Files to include. Names should already be unique — see
 *                `uniqueFileName` in `lib/format`.
 * @param onProgress Called after each entry so long batches can show a bar.
 */
export async function createZip(
  entries: ZipEntry[],
  onProgress?: (progress: ZipProgress) => void,
): Promise<Blob> {
  const encoder = new TextEncoder()
  const { time, date } = toDosDateTime(new Date())

  /** Local header + payload, in archive order. */
  const parts: BlobPart[] = []
  /** Central directory records, written after all payloads. */
  const centralRecords: Uint8Array<ArrayBuffer>[] = []

  let offset = 0

  for (const [index, entry] of entries.entries()) {
    const nameBytes = encoder.encode(entry.name)
    const size = entry.blob.size

    if (size > MAX_ZIP32_SIZE) {
      throw new Error(`"${entry.name}" is too large to place in a ZIP archive.`)
    }

    const crc = await crc32OfBlob(entry.blob)

    const localHeader = new ByteWriter(30 + nameBytes.length)
      .u32(LOCAL_HEADER_SIG)
      .u16(VERSION)
      .u16(UTF8_FLAG)
      .u16(STORE_METHOD)
      .u16(time)
      .u16(date)
      .u32(crc)
      .u32(size) // compressed === uncompressed for `store`
      .u32(size)
      .u16(nameBytes.length)
      .u16(0) // no extra field
      .raw(nameBytes)
      .done()

    parts.push(localHeader, entry.blob)

    centralRecords.push(
      new ByteWriter(46 + nameBytes.length)
        .u32(CENTRAL_HEADER_SIG)
        .u16(VERSION)
        .u16(VERSION)
        .u16(UTF8_FLAG)
        .u16(STORE_METHOD)
        .u16(time)
        .u16(date)
        .u32(crc)
        .u32(size)
        .u32(size)
        .u16(nameBytes.length)
        .u16(0) // extra
        .u16(0) // comment
        .u16(0) // disk number
        .u16(0) // internal attributes
        .u32(0) // external attributes
        .u32(offset) // where this entry's local header lives
        .raw(nameBytes)
        .done(),
    )

    offset += localHeader.length + size
    onProgress?.({ completed: index + 1, total: entries.length })
  }

  const centralSize = centralRecords.reduce((sum, record) => sum + record.length, 0)

  if (offset + centralSize > MAX_ZIP32_SIZE) {
    throw new Error('This batch is too large for a single ZIP. Try downloading it in parts.')
  }

  const eocd = new ByteWriter(22)
    .u32(EOCD_SIG)
    .u16(0) // this disk
    .u16(0) // disk with central directory
    .u16(entries.length)
    .u16(entries.length)
    .u32(centralSize)
    .u32(offset)
    .u16(0) // no archive comment
    .done()

  return new Blob([...parts, ...centralRecords, eocd], { type: 'application/zip' })
}
