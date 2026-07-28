/**
 * Getting bytes out of the app and onto disk.
 *
 * Where the File System Access API exists we use it, because saving 40 images
 * into a folder the user picked once beats 40 separate browser downloads by a
 * wide margin. Everywhere else we fall back to anchor clicks and a ZIP.
 */

/** Minimal structural types — TS's DOM lib still ships these as `any`-ish. */
interface FileSystemWritable {
  write: (data: BlobPart) => Promise<void>
  close: () => Promise<void>
}
interface FileSystemFileHandleLike {
  createWritable: () => Promise<FileSystemWritable>
}
interface FileSystemDirectoryHandleLike {
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<FileSystemFileHandleLike>
}

type SaveFilePicker = (options: {
  suggestedName?: string
  types?: { description: string; accept: Record<string, string[]> }[]
}) => Promise<FileSystemFileHandleLike>

type DirectoryPicker = (options?: {
  mode?: 'read' | 'readwrite'
  id?: string
}) => Promise<FileSystemDirectoryHandleLike>

function getSaveFilePicker(): SaveFilePicker | null {
  const fn = (globalThis as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  return typeof fn === 'function' ? fn : null
}

function getDirectoryPicker(): DirectoryPicker | null {
  const fn = (globalThis as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker
  return typeof fn === 'function' ? fn : null
}

export function supportsDirectorySave(): boolean {
  return getDirectoryPicker() !== null
}

/**
 * `AbortError` means the user closed the picker. That is a normal outcome, not a
 * failure, so callers need to tell it apart from a real error.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** Classic anchor-click download. Works everywhere. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  // Revoking synchronously can cancel the download in some browsers, so give
  // the navigation a beat to start first.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Save one file, using a native "Save as…" dialog when the browser has one.
 *
 * @returns `true` if saved, `false` if the user cancelled.
 */
export async function saveBlob(blob: Blob, fileName: string, mimeType: string): Promise<boolean> {
  const picker = getSaveFilePicker()

  if (!picker) {
    downloadBlob(blob, fileName)
    return true
  }

  try {
    const handle = await picker({
      suggestedName: fileName,
      types: [{ description: 'Image', accept: { [mimeType]: [`.${fileName.split('.').pop()}`] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (error) {
    if (isAbortError(error)) return false
    // A blocked or unsupported picker shouldn't cost the user their file.
    downloadBlob(blob, fileName)
    return true
  }
}

export interface DirectorySaveEntry {
  name: string
  blob: Blob
}

/**
 * Write a whole batch into a directory the user chooses once.
 *
 * @returns The number of files written, or `null` if the user cancelled.
 */
export async function saveAllToDirectory(
  entries: DirectorySaveEntry[],
  onProgress?: (completed: number, total: number) => void,
): Promise<number | null> {
  const picker = getDirectoryPicker()
  if (!picker) return null

  let directory: FileSystemDirectoryHandleLike
  try {
    directory = await picker({ mode: 'readwrite', id: 'digicompress-output' })
  } catch (error) {
    if (isAbortError(error)) return null
    throw error
  }

  let written = 0
  for (const entry of entries) {
    const handle = await directory.getFileHandle(entry.name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(entry.blob)
    await writable.close()
    written += 1
    onProgress?.(written, entries.length)
  }

  return written
}
