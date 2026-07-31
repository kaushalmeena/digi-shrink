# State and image I/O

## State management

`app/composables/useCompressor.ts` owns the queue and is the only thing that
mutates queue items.

- **Components read state, never mutate it.** A component that needs to change an
  item calls a function on the composable (`setQualityOverride`, `requeue`).
- **Blobs and Workers stay out of the reactive tree.** `File` objects are held
  with `markRaw`; output blobs live in a module-level `Map` keyed by item id.
  Reactivity buys nothing for binary data and a deep proxy over it is a real cost.
- **Object URLs are revoked.** Every `createObjectURL` has a matching revoke in
  `releaseItem` or `requeue`. Leaking them leaks the whole decoded image.
- **Worker messages carry plain objects.** `postMessage` cannot
  structured-clone a Vue reactive Proxy, and `toRaw` is not enough because the
  nested settings objects are proxies of their own. `settingsFor()` does a JSON
  round-trip; settings are pure JSON data by construction, so this is safe.

Buffers are transferred in both directions via the structured-clone transfer
list, so a 40-megapixel image costs no memcpy.

### Persistence

`app/plugins/persistence.client.ts` hydrates settings, lifetime stats and theme
from `localStorage` once, before the app mounts, then watches them to persist.
Centralising it there rather than inside each composable means state is never
rendered with defaults and then flipped, and the watchers live in the app's own
effect scope instead of a component's.

Stored settings are reconciled against the current schema by `hydrateSettings`,
so a shipped schema change can never brick someone's saved preferences.

## Getting images in

Four paths, all landing in the same `addFiles` call:

1. **Drag and drop**, bound at the _window_ level so dropping anywhere works —
   which is what people actually try. Directories are walked recursively via the
   entries API (`readEntries` returns at most 100 per call and must be drained in
   a loop).
2. **Paste** from the clipboard.
3. **The file picker.**
4. **The OS handoff** — when installed as a PWA, `launchQueue` delivers files
   the user opened with the app.

Duplicates are rejected by a `name:size:lastModified` fingerprint, and the queue
is capped at 250 items so a stray folder drop cannot take the tab down.

## Getting images out

- **A folder picker** (`showDirectoryPicker`) where available, because saving 40
  images into a folder chosen once beats 40 separate downloads.
- **A ZIP**, always available — the only option in Safari and Firefox.

`lib/zip.ts` is a hand-rolled, dependency-free ZIP writer. Compressed images are
incompressible, so only the `store` method is ever needed; everything
DEFLATE-related in a general-purpose library would be dead weight, and zero
third-party bytes keeps the privacy story airtight.

Memory behaviour matters for a 200-image batch: CRC32 is computed by streaming
each blob in chunks, and the archive is assembled from _references_ to the source
blobs rather than one concatenated buffer. Peak usage stays around one image.
Sizes above the ZIP32 4 GiB ceiling are refused with a clear error rather than
producing a corrupt archive.
