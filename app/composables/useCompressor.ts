import { computed, markRaw } from 'vue'

import { CompressionPool } from '~/lib/workerPool'
import { MAX_QUEUE_SIZE } from '~/lib/constants'
import { isAcceptedImage, outputFileName } from '~/lib/image'
import { sanitizeFileName, uniqueFileName } from '~/lib/format'
import { useState } from '#imports'
import { useLifetimeStats } from '~/composables/useLifetimeStats'
import { useSettings } from '~/composables/useSettings'
import { useToasts } from '~/composables/useToasts'
import type {
  CompressionSettings,
  FormatCandidate,
  OutputFormat,
  QueueItem,
  WorkerResponse,
} from '~/lib/types'

/*
 * Module-level, non-reactive storage.
 *
 * Workers and Blobs must never be wrapped in a Vue proxy — reactivity buys us
 * nothing here and a deep proxy over an ArrayBuffer-backed Blob is a real cost.
 * Keeping them outside the reactive tree also means the queue array stays cheap
 * to diff when a batch of 200 rows updates its progress.
 */
let pool: CompressionPool | null = null
const outputBlobs = new Map<string, Blob>()

/** Fingerprint used to reject the same file being added twice. */
const fingerprintOf = (file: File) => `${file.name}:${file.size}:${file.lastModified}`

async function ensurePool(): Promise<CompressionPool> {
  if (pool) return pool

  /*
   * Dynamically imported so the worker chunk (and the WASM it pulls in) never
   * blocks first paint, and so this module stays importable during SSR.
   *
   * The path must be *relative*. With the `~/` alias, Vite's worker plugin emits
   * a malformed `/_nuxt/@fs/app/workers/…` URL — `@fs/` expects an absolute
   * filesystem path — and the worker then fails to load with an empty error
   * event, which is near-impossible to diagnose from the outside.
   */
  const { default: CompressWorker } = await import('../workers/compress.worker?worker')
  pool = new CompressionPool(() => new CompressWorker())
  return pool
}

function createQueueItem(file: File): QueueItem {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    file: markRaw(file),
    name: file.name,
    originalSize: file.size,
    originalType: file.type || 'image/*',
    width: 0,
    height: 0,
    status: 'queued',
    progress: 0,
    stage: '',
    error: '',
    previewUrl: '',
    outputUrl: '',
    result: null,
    qualityOverride: null,
    candidates: [],
    settingsKey: '',
  }
}

/**
 * Owns the image queue and drives the worker pool.
 *
 * Everything is client-only by construction: the pool is created lazily on first
 * use, so importing this composable during SSR is safe and free.
 */
export function useCompressor() {
  const items = useState<QueueItem[]>('compressor:items', () => [])
  const isRunning = useState<boolean>('compressor:running', () => false)
  /** Rolling average encode time, used for the ETA label. */
  const msPerItem = useState<number>('compressor:rate', () => 0)

  const { settings } = useSettings()
  const { record } = useLifetimeStats()
  const toasts = useToasts()

  /* ---------------------------------------------------------------- queries */

  const byId = (id: string) => items.value.find((item) => item.id === id)

  const pending = computed(() => items.value.filter((item) => item.status === 'queued'))
  const completed = computed(() =>
    items.value.filter((item) => item.status === 'done' && item.result !== null),
  )
  const failed = computed(() => items.value.filter((item) => item.status === 'error'))
  const hasItems = computed(() => items.value.length > 0)
  const canCompress = computed(() => pending.value.length > 0 && !isRunning.value)

  /** Aggregate savings across everything finished in this session. */
  const stats = computed(() => {
    let originalBytes = 0
    let outputBytes = 0
    let durationMs = 0

    for (const item of completed.value) {
      originalBytes += item.originalSize
      outputBytes += item.result!.size
      durationMs += item.result!.durationMs
    }

    const savedBytes = originalBytes - outputBytes

    return {
      count: completed.value.length,
      originalBytes,
      outputBytes,
      savedBytes,
      savedPercent: originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0,
      durationMs,
      /** How many came back as "already optimal". */
      unchanged: completed.value.filter((item) => item.result!.usedOriginal).length,
    }
  })

  /** Overall progress bar: finished items count as 1, the in-flight one partially. */
  const overallProgress = computed(() => {
    if (items.value.length === 0) return 0
    const total = items.value.reduce((sum, item) => {
      if (item.status === 'done' || item.status === 'skipped' || item.status === 'error')
        return sum + 1
      return sum + item.progress
    }, 0)
    return total / items.value.length
  })

  /* ------------------------------------------------------------ queue edits */

  function releaseItem(item: QueueItem): void {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
    outputBlobs.delete(item.id)
  }

  function addFiles(files: File[] | FileList): number {
    const incoming = Array.from(files)
    const accepted: File[] = []
    let rejected = 0
    let duplicates = 0

    const existing = new Set(items.value.map((item) => fingerprintOf(item.file)))

    for (const file of incoming) {
      if (!isAcceptedImage(file)) {
        rejected += 1
        continue
      }
      const fingerprint = fingerprintOf(file)
      if (existing.has(fingerprint)) {
        duplicates += 1
        continue
      }
      existing.add(fingerprint)
      accepted.push(file)
    }

    const room = MAX_QUEUE_SIZE - items.value.length
    const overflow = Math.max(0, accepted.length - room)
    const admitted = overflow > 0 ? accepted.slice(0, room) : accepted

    const created = admitted.map(createQueueItem)
    for (const item of created) {
      item.previewUrl = URL.createObjectURL(item.file)
    }
    items.value.push(...created)

    if (rejected > 0) {
      toasts.warning(
        `Skipped ${rejected} file${rejected === 1 ? '' : 's'} that ${rejected === 1 ? 'is not an image' : 'are not images'}.`,
      )
    }
    if (duplicates > 0) {
      toasts.info(`${duplicates} duplicate${duplicates === 1 ? '' : 's'} already in the queue.`)
    }
    if (overflow > 0) {
      toasts.warning(`Queue is capped at ${MAX_QUEUE_SIZE} images — ${overflow} didn't fit.`)
    }

    return created.length
  }

  function removeItem(id: string): void {
    const index = items.value.findIndex((item) => item.id === id)
    if (index === -1) return
    releaseItem(items.value[index]!)
    items.value.splice(index, 1)
  }

  function clear(): void {
    pool?.cancelAll('Queue cleared.')
    for (const item of items.value) releaseItem(item)
    items.value = []
    isRunning.value = false
  }

  /** Drop finished rows but keep anything still queued or failed. */
  function clearCompleted(): void {
    const keep: QueueItem[] = []
    for (const item of items.value) {
      if (item.status === 'done') releaseItem(item)
      else keep.push(item)
    }
    items.value = keep
  }

  /** Record intrinsic dimensions once the preview `<img>` has decoded. */
  function setDimensions(id: string, width: number, height: number): void {
    const item = byId(id)
    if (!item) return
    item.width = width
    item.height = height
  }

  /**
   * Set (or clear, with `null`) a per-image quality override.
   *
   * Lives here rather than in the row component so the queue stays the single
   * owner of item state — components read items, they never mutate them.
   */
  function setQualityOverride(id: string, quality: number | null): void {
    const item = byId(id)
    if (item) item.qualityOverride = quality
  }

  /** Queue an already-processed item to run again (e.g. after changing quality). */
  function requeue(id: string): void {
    const item = byId(id)
    if (!item) return
    if (item.outputUrl) {
      URL.revokeObjectURL(item.outputUrl)
      item.outputUrl = ''
    }
    outputBlobs.delete(id)
    item.result = null
    item.candidates = []
    item.settingsKey = ''
    item.error = ''
    item.progress = 0
    item.stage = ''
    item.status = 'queued'
  }

  function requeueAll(): void {
    for (const item of items.value) {
      if (item.status === 'done' || item.status === 'error') requeue(item.id)
    }
  }

  /* -------------------------------------------------------------- execution */

  /**
   * Merge a per-item override into the global settings, as a plain object.
   *
   * The JSON round-trip is load-bearing, not defensive copying: `settings` is a
   * Vue reactive Proxy, and `postMessage` cannot structured-clone a Proxy — it
   * throws "could not be cloned". `toRaw` wouldn't be enough either, because the
   * nested `resize`/`jpeg`/`webp`/… objects are proxies of their own. Settings
   * are pure JSON data by construction (see `CompressionSettings`), so this is
   * both safe and cheap.
   */
  function settingsFor(item: QueueItem): CompressionSettings {
    const plain = JSON.parse(JSON.stringify(settings.value)) as CompressionSettings
    if (item.qualityOverride !== null) plain.quality = item.qualityOverride
    return plain
  }

  async function runItem(item: QueueItem): Promise<void> {
    item.status = 'working'
    item.progress = 0.02
    item.stage = 'Reading'
    item.error = ''

    try {
      const activePool = await ensurePool()
      const buffer = await item.file.arrayBuffer()

      const itemSettings = settingsFor(item)
      const response = await activePool.run(
        {
          kind: 'compress',
          id: item.id,
          buffer,
          mimeType: item.originalType,
          fileName: item.name,
          settings: itemSettings,
        },
        [buffer],
        (progress, stage) => {
          item.progress = progress
          item.stage = stage
        },
      )

      if (response.kind !== 'done') throw new Error('Unexpected worker response.')

      const blob = new Blob([response.buffer], { type: response.result.mimeType })
      outputBlobs.set(item.id, blob)

      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
      item.outputUrl = URL.createObjectURL(blob)
      item.result = response.result
      item.settingsKey = JSON.stringify(itemSettings)
      item.progress = 1
      item.stage = ''
      item.status = 'done'

      // Smooth the rate estimate rather than trusting the last sample.
      msPerItem.value = msPerItem.value
        ? msPerItem.value * 0.7 + response.result.durationMs * 0.3
        : response.result.durationMs

      record(item.originalSize, response.result.size)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Compression failed.'
      // A cancellation isn't a failure — put the item back so it can be retried.
      if (message.toLowerCase().includes('cancel') || message.includes('shut down')) {
        item.status = 'queued'
        item.progress = 0
        item.stage = ''
      } else {
        item.status = 'error'
        item.error = message
        item.progress = 0
      }
    }
  }

  /**
   * Compress everything still queued.
   *
   * All items are handed to the pool at once; the pool decides how many run in
   * parallel, so this stays a single `await` rather than a hand-rolled scheduler.
   */
  async function compressAll(): Promise<void> {
    if (isRunning.value || pending.value.length === 0) return

    isRunning.value = true
    try {
      // Loop rather than run once: files dropped mid-batch join the queue as
      // `queued` and are picked up by the next pass. `cancel()` clears
      // `isRunning`, which is what ends the loop.
      while (isRunning.value && pending.value.length > 0) {
        const queue = pending.value.slice()
        await Promise.allSettled(queue.map((item) => runItem(item)))
      }
    } finally {
      isRunning.value = false
    }

    const errors = failed.value.length
    if (errors > 0) {
      toasts.error(`${errors} image${errors === 1 ? '' : 's'} couldn't be compressed.`)
    }
  }

  /**
   * Finished items whose result was made with different settings from the
   * current ones — i.e. the settings were changed after compressing.
   */
  const stale = computed(() =>
    completed.value.filter((item) => item.settingsKey !== JSON.stringify(settingsFor(item))),
  )

  async function compressOne(id: string): Promise<void> {
    const item = byId(id)
    if (!item || item.status === 'working') return
    if (item.status !== 'queued') requeue(id)
    await runItem(item)
  }

  function cancel(): void {
    pool?.cancelAll('Cancelled by you.')
    isRunning.value = false
  }

  /**
   * Encode one image to several formats purely to compare sizes. Feeds the
   * "format lab" table in the compare drawer.
   */
  async function probeFormats(id: string, formats: OutputFormat[]): Promise<FormatCandidate[]> {
    const item = byId(id)
    if (!item) return []

    const activePool = await ensurePool()
    const buffer = await item.file.arrayBuffer()

    item.stage = 'Comparing formats'
    try {
      const response: WorkerResponse = await activePool.run(
        {
          kind: 'probe',
          id: item.id,
          buffer,
          mimeType: item.originalType,
          settings: settingsFor(item),
          formats,
        },
        [buffer],
        (progress, stage) => {
          item.progress = progress
          item.stage = stage
        },
      )

      if (response.kind !== 'probed') return []
      item.candidates = response.candidates
      return response.candidates
    } catch (error) {
      toasts.error(error instanceof Error ? error.message : 'Format comparison failed.')
      return []
    } finally {
      item.stage = ''
      item.progress = item.result ? 1 : 0
    }
  }

  /* --------------------------------------------------------------- outputs */

  function outputBlob(id: string): Blob | null {
    return outputBlobs.get(id) ?? null
  }

  function outputNameFor(item: QueueItem): string {
    if (!item.result) return sanitizeFileName(item.name)
    return outputFileName(item.name, item.result.format)
  }

  /** Ready-to-save entries for the whole finished batch, with unique names. */
  function collectOutputs(): { name: string; blob: Blob }[] {
    const seen = new Set<string>()
    const entries: { name: string; blob: Blob }[] = []

    for (const item of completed.value) {
      const blob = outputBlobs.get(item.id)
      if (!blob) continue
      entries.push({ name: uniqueFileName(outputNameFor(item), seen), blob })
    }

    return entries
  }

  return {
    items,
    isRunning,
    msPerItem,
    pending,
    completed,
    failed,
    hasItems,
    canCompress,
    stale,
    stats,
    overallProgress,
    byId,
    addFiles,
    removeItem,
    clear,
    clearCompleted,
    setDimensions,
    setQualityOverride,
    requeue,
    requeueAll,
    compressAll,
    compressOne,
    cancel,
    probeFormats,
    outputBlob,
    outputNameFor,
    collectOutputs,
  }
}
