import type { WorkerRequest, WorkerResponse } from './types'

/**
 * A small pool of compression workers.
 *
 * Sizing: the WASM codecs are CPU-bound, and oxipng/AVIF already spawn their own
 * internal threads when the page is cross-origin isolated. Saturating every core
 * with *outer* workers on top of that makes a batch slower, not faster, and
 * starves the main thread so the UI stops feeling responsive. Half the reported
 * cores, capped at four, is the sweet spot in practice.
 */
function defaultPoolSize(): number {
  const cores = globalThis.navigator?.hardwareConcurrency ?? 4
  return Math.max(1, Math.min(4, Math.floor(cores / 2)))
}

type WorkerFactory = () => Worker

interface PendingTask {
  request: WorkerRequest
  transfer: Transferable[]
  onProgress?: (progress: number, stage: string) => void
  resolve: (response: WorkerResponse) => void
  reject: (error: Error) => void
}

interface PoolWorker {
  worker: Worker
  task: PendingTask | null
}

/**
 * Dispatches `WorkerRequest`s across N workers, one task per worker at a time.
 *
 * Each task resolves with the terminal `WorkerResponse` (`done` / `probed`) or
 * rejects on `error`. Progress messages are forwarded to the task's callback.
 */
export class CompressionPool {
  private readonly createWorker: WorkerFactory
  private readonly size: number
  private readonly workers: PoolWorker[] = []
  private readonly queue: PendingTask[] = []
  private disposed = false

  constructor(createWorker: WorkerFactory, size = defaultPoolSize()) {
    this.createWorker = createWorker
    this.size = size
  }

  get concurrency(): number {
    return this.size
  }

  /** Queue a request. Resolves with the worker's terminal response. */
  run(
    request: WorkerRequest,
    transfer: Transferable[] = [],
    onProgress?: (progress: number, stage: string) => void,
  ): Promise<WorkerResponse> {
    if (this.disposed) {
      return Promise.reject(new Error('The compression pool has been shut down.'))
    }

    return new Promise<WorkerResponse>((resolve, reject) => {
      this.queue.push({ request, transfer, onProgress, resolve, reject })
      this.drain()
    })
  }

  /**
   * Drop everything not yet started and hard-stop everything in flight.
   *
   * Terminating is the only reliable way to interrupt a WASM encode mid-pass, so
   * workers are killed and rebuilt on the next task rather than reused.
   */
  cancelAll(reason = 'Cancelled.'): void {
    for (const task of this.queue.splice(0)) {
      task.reject(new Error(reason))
    }

    for (const slot of this.workers) {
      if (!slot.task) continue
      slot.task.reject(new Error(reason))
      slot.task = null
      slot.worker.terminate()
    }

    this.workers.length = 0
  }

  dispose(): void {
    this.cancelAll('The compression pool has been shut down.')
    this.disposed = true
  }

  /** Assign queued tasks to free workers, spinning up new ones as needed. */
  private drain(): void {
    while (this.queue.length > 0) {
      const slot = this.acquire()
      if (!slot) return

      const task = this.queue.shift()!
      slot.task = task
      slot.worker.postMessage(task.request, task.transfer)
    }
  }

  private acquire(): PoolWorker | null {
    const idle = this.workers.find((slot) => slot.task === null)
    if (idle) return idle
    if (this.workers.length >= this.size) return null

    const slot: PoolWorker = { worker: this.createWorker(), task: null }

    slot.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      this.handleMessage(slot, event.data)
    })

    // Fires for uncaught worker errors — a WASM OOM, or a codec failing to load
    // because the network died before it was cached.
    slot.worker.addEventListener('error', (event) => {
      this.settleWithError(slot, event.message || 'The compression worker crashed.')
    })

    this.workers.push(slot)
    return slot
  }

  private handleMessage(slot: PoolWorker, response: WorkerResponse): void {
    const task = slot.task
    // A late message from a task we already cancelled.
    if (!task || task.request.id !== response.id) return

    if (response.kind === 'progress') {
      task.onProgress?.(response.progress, response.stage)
      return
    }

    slot.task = null

    if (response.kind === 'error') {
      task.reject(new Error(response.message))
    } else {
      task.resolve(response)
    }

    this.drain()
  }

  private settleWithError(slot: PoolWorker, message: string): void {
    slot.task?.reject(new Error(message))
    slot.task = null

    // A crashed worker is not trustworthy; replace it rather than reuse it.
    slot.worker.terminate()
    const index = this.workers.indexOf(slot)
    if (index !== -1) this.workers.splice(index, 1)

    this.drain()
  }
}
