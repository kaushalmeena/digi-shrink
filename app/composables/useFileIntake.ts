/**
 * Every way an image can get into the app.
 *
 * There are four, and all of them land in the same `addFiles` call:
 *  1. Drag and drop, anywhere on the window — not just onto the dropzone.
 *  2. Paste from the clipboard (⌘V / Ctrl+V).
 *  3. The file picker.
 *  4. The OS "Open with…" handoff, when installed as a PWA.
 */
import { ref } from 'vue'

import { useEventListener } from '@vueuse/core'
import { useState } from '#imports'
import { useCompressor } from '~/composables/useCompressor'
import { useToasts } from '~/composables/useToasts'

/** Minimal shape of the PWA launch-queue API, which TS's DOM lib omits. */
interface LaunchParams {
  files?: { getFile: () => Promise<File> }[]
}
interface LaunchQueue {
  setConsumer: (consumer: (params: LaunchParams) => void) => void
}

/** Recursively walk a dropped directory so folder drops work. */
async function readDirectory(entry: FileSystemDirectoryEntry): Promise<File[]> {
  const reader = entry.createReader()
  const files: File[] = []

  // `readEntries` returns at most 100 entries per call and signals completion
  // with an empty batch, so it has to be drained in a loop.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
    if (batch.length === 0) break

    for (const child of batch) {
      files.push(...(await readEntry(child)))
    }
  }

  return files
}

async function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => {
      ;(entry as FileSystemFileEntry).file(resolve, () => resolve(null))
    })
    return file ? [file] : []
  }

  if (entry.isDirectory) {
    return readDirectory(entry as FileSystemDirectoryEntry)
  }

  return []
}

/**
 * Pull files out of a drop event, descending into folders when the browser
 * exposes the entries API and falling back to the flat file list otherwise.
 */
async function filesFromDrop(transfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(transfer.items)
    .map((item) => (item.kind === 'file' ? item.webkitGetAsEntry?.() : null))
    .filter((entry): entry is FileSystemEntry => entry !== null && entry !== undefined)

  if (entries.length === 0) return Array.from(transfer.files)

  const nested = await Promise.all(entries.map((entry) => readEntry(entry)))
  return nested.flat()
}

export function useFileIntake() {
  const { addFiles } = useCompressor()
  const toasts = useToasts()

  /** True while a drag carrying files is over the window. */
  const isDraggingOver = useState<boolean>('intake:dragging', () => false)
  /** Nested dragenter/dragleave pairs need counting, not a boolean. */
  const dragDepth = ref(0)

  function ingest(files: File[] | FileList | null | undefined): number {
    if (!files) return 0
    const list = Array.from(files)
    if (list.length === 0) return 0

    const added = addFiles(list)
    if (added > 0) {
      toasts.success(`Added ${added} image${added === 1 ? '' : 's'}.`)
    }
    return added
  }

  /** Open the system file picker. */
  function pickFiles(accept: string): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = true
    input.addEventListener('change', () => {
      ingest(input.files)
      input.remove()
    })
    input.click()
  }

  function carriesFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files')
  }

  function onDragEnter(event: DragEvent): void {
    if (!carriesFiles(event)) return
    event.preventDefault()
    dragDepth.value += 1
    isDraggingOver.value = true
  }

  function onDragOver(event: DragEvent): void {
    if (!carriesFiles(event)) return
    // Without both of these the browser navigates away to the dropped file.
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave(event: DragEvent): void {
    if (!carriesFiles(event)) return
    dragDepth.value = Math.max(0, dragDepth.value - 1)
    if (dragDepth.value === 0) isDraggingOver.value = false
  }

  async function onDrop(event: DragEvent): Promise<void> {
    if (!event.dataTransfer) return
    event.preventDefault()
    dragDepth.value = 0
    isDraggingOver.value = false
    ingest(await filesFromDrop(event.dataTransfer))
  }

  function onPaste(event: ClipboardEvent): void {
    const files = Array.from(event.clipboardData?.files ?? [])
    if (files.length === 0) return
    event.preventDefault()
    ingest(files)
  }

  /**
   * Wire up the window-level listeners. Call once, from the page.
   *
   * `useEventListener` ties every listener to the calling component's scope, so
   * they clean themselves up without an explicit `onUnmounted`.
   */
  function attach(): void {
    useEventListener(window, 'dragenter', onDragEnter)
    useEventListener(window, 'dragover', onDragOver)
    useEventListener(window, 'dragleave', onDragLeave)
    useEventListener(window, 'drop', onDrop)
    useEventListener(window, 'paste', onPaste)

    // Installed-PWA handoff: the OS launched us with files to open.
    const queue = (window as { launchQueue?: LaunchQueue }).launchQueue
    queue?.setConsumer(async (params) => {
      if (!params.files?.length) return
      const files = await Promise.all(params.files.map((handle) => handle.getFile()))
      ingest(files)
    })
  }

  return { isDraggingOver, attach, ingest, pickFiles }
}
