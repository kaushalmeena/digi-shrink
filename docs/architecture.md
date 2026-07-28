# Architecture

How DigiShrink is put together, and why it is put together that way.

## Constraints

Two rules shape every decision below:

1. **No image bytes leave the device.** There is no server runtime, no API
   routes, and no analytics. The codecs are WebAssembly binaries shipped with the
   bundle.
2. **It must work offline.** Every asset — fonts, codecs, icons — is self-hosted
   and precached by a service worker.

## Directory layout

```
app/
├── assets/css/
│   ├── main.css           Design tokens, base styles, keyframes
│   ├── patterns.css       Visual primitives as Tailwind utilities
│   └── transitions.css    Shared <Transition> vocabulary
├── components/
│   ├── ui/                Design-system primitives (Button, Card, Segmented, …)
│   ├── decor/             Purely decorative shapes (Confetti, Squiggle)
│   ├── app/               Shell: Header, Footer, Logo, ThemeToggle
│   └── compress/          Feature components: DropZone, Queue, drawers, slider
├── composables/           Queue, settings, theme, file intake, lifetime stats
├── lib/                   Framework-free logic
├── plugins/               localStorage hydration and persistence
├── pages/                 The single page
└── workers/               The compression worker
```

The load-bearing boundary is `lib/` and `workers/`: **neither imports Vue.**
`lib/` holds types, formatting, the ZIP writer and the worker pool; `workers/` is
the only place pixels are touched. Both are plain TypeScript, so they can be
reasoned about — and tested — without a component tree.

## The compression pipeline

Everything happens inside `app/workers/compress.worker.ts`:

```
decode → (resize) → encode candidates → pick winner → transfer back
```

### Decoding uses the browser, not WASM

`createImageBitmap` is hardware accelerated, handles EXIF orientation for free,
and supports formats we ship no decoder for (HEIC on Safari, GIF, BMP, SVG). The
bitmap is drawn to a reusable `OffscreenCanvas` and read back as `ImageData`.

WASM decoders (`@jsquash/*/decode`) are only a fallback for blobs the browser
refuses. Inputs above 100 megapixels are rejected rather than allowed to take the
tab down with a failed allocation.

Two details that are easy to get wrong:

- `premultiplyAlpha: 'none'` — encoders expect straight alpha, and premultiplied
  edges show up as dark fringing on transparent PNGs.
- `ImageBitmap.close()` — bitmaps hold GPU memory until explicitly closed.

### Resizing

`@jsquash/resize` in `linearRGB` mode. Resampling in linear light avoids the dark
halos that plague naive downscaling of high-contrast images. `fitMethod` is
always `stretch`, because `computeTargetDimensions` has already resolved the
aspect ratio — letting the resizer fit again would apply it twice.

The resize pass is skipped entirely when it would be a 1:1 resample, and
upscaling is refused unless explicitly enabled, since enlarging can only add
bytes without adding detail.

### Encoding

| Format | Encoder               | Notes                                                                                                                             |
| ------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| JPEG   | MozJPEG               | Progressive + trellis quantisation by default. Alpha is flattened onto white first, since JPEG has no alpha channel.              |
| PNG    | Rust encoder → OxiPNG | Two passes: encode valid PNG bytes, then rewrite them losslessly with better filtering. The second pass is where the savings are. |
| WebP   | libwebp               | Lossless and near-lossless modes; separate alpha quality.                                                                         |
| AVIF   | libavif               | Smallest output, by far the slowest.                                                                                              |

Codecs are imported lazily. The AVIF encoder alone is several megabytes of WASM,
so loading it only when someone picks AVIF keeps first paint fast — the service
worker still precaches everything for offline use.

### Format selection

- **A named format** encodes just that one.
- **`original`** maps the input MIME type back to a writable format, falling back
  to WebP for inputs with no encoder here (GIF, BMP, SVG, HEIC). WebP is the right
  fallback because it is both lossless-capable and alpha-capable, so nothing is
  silently lost.
- **`auto`** encodes every ticked candidate and keeps whichever came out
  smallest.
- **Lossless mode** filters candidates to formats that actually support it, and
  never returns an empty list.

### Target-size mode

Binary-searches quality until the output fits a byte budget, capped at 8 passes.
It keeps the best _passing_ result rather than the last one, so a search that
runs out of attempts still returns something under budget. If nothing fits even at
the quality floor, the smallest attempt wins — undershooting the user's intent
beats handing back a file that is too big.

A result within 4% of the budget ends the search early; more passes would not be
worth the time.

### The "already optimal" guard

Re-encoding a well-optimised image often makes it **bigger**. When every
candidate comes out larger than the input, the original bytes are returned
untouched and the UI says so explicitly. Quietly shipping a worse file would be
the easy behaviour and the wrong one.

### Metadata

Because every image goes through raw `ImageData`, EXIF, GPS coordinates and
colour profiles cannot survive the round trip. This is a property of the
pipeline, not a setting, which is why there is no toggle for it.

## The worker pool

`lib/workerPool.ts` dispatches requests across N workers, one task per worker.

Sizing is `clamp(cores / 2, 1, 4)`, not `cores`. The codecs are CPU-bound, and
OxiPNG and the AVIF encoder already spawn their own internal threads when the
page is cross-origin isolated. Saturating every core with _outer_ workers on top
of that makes a batch slower, not faster, and starves the main thread so the UI
stops feeling responsive.

Cancellation terminates workers rather than signalling them, because that is the
only reliable way to interrupt a WASM encode mid-pass. Terminated workers are
rebuilt on the next task. A worker that crashes is replaced rather than reused.

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

## PWA and offline

`@vite-pwa/nuxt` with `registerType: 'autoUpdate'`. The precache manifest
includes `wasm`, and `maximumFileSizeToCacheInBytes` is raised to 16 MiB because
the AVIF and OxiPNG binaries are multiple megabytes each — without that they
would be skipped and the app would only work online.

The manifest also declares `file_handlers`, so the OS can offer DigiShrink under
"Open with…" for image files.

## Cross-origin isolation

OxiPNG and the AVIF encoder ship multi-threaded WASM variants that need
`SharedArrayBuffer`, which needs a cross-origin-isolated document. The COOP/COEP
headers are set in **two** places:

- `routeRules` for Nitro-served deployments.
- `vite.server.headers` for the dev server — Vite's own middleware serves
  `/_nuxt/*` and never sees `routeRules`.

Both are required. With the document isolated but the worker script served
without COEP, the browser refuses to start the worker, and a blocked worker
_load_ fires a bare `Event` with no message — which is genuinely hard to trace
back to a missing header.

On static hosting that cannot set headers (**including GitHub Pages**), the
codecs detect the missing `SharedArrayBuffer` and fall back to single-threaded
builds. Compression still works; AVIF and PNG are just slower.

## Deployment

`pnpm generate` with `NITRO_PRESET=github_pages` produces a fully static
`.output/public`, including the `.nojekyll` file that stops GitHub treating
`_nuxt/` as a Jekyll partial.

A GitHub Pages _project_ site is served from `/<repo>/`. Nuxt rewrites its own
bundled asset URLs from `app.baseURL`, but hand-written literal paths — favicons,
manifest icons, the service worker's navigation fallback — are not touched.
`nuxt.config.ts` threads `NUXT_APP_BASE_URL` through all of them via a `withBase`
helper, and normalises the value because `actions/configure-pages` reports the
path without a trailing slash.

## Browser support

Needs `OffscreenCanvas` and WebAssembly: Chrome/Edge 94+, Firefox 105+, Safari
16.4+.

Some capabilities degrade rather than break:

| Capability            | Requirement                       | Fallback                             |
| --------------------- | --------------------------------- | ------------------------------------ |
| Folder export         | File System Access API (Chromium) | ZIP download                         |
| HEIC preview          | OS decoder (Safari)               | Placeholder; output is still correct |
| Multi-threaded codecs | Cross-origin isolation            | Single-threaded WASM                 |
| Native save dialog    | `showSaveFilePicker`              | Anchor-click download                |

## Gotchas worth knowing before editing

- **The worker import must be a relative path**
  (`../workers/compress.worker?worker`). With the `~/` alias, Vite emits a
  malformed `@fs/app/...` URL and the worker fails to load with an empty error
  event.
- **Client-only state needs `<ClientOnly>`.** Theme comes from `localStorage`, so
  SSR cannot know it; rendering it directly causes hydration mismatches.
- **Never put two competing Tailwind utilities on one element.** Which one wins is
  decided by stylesheet order, not attribute order, so it breaks silently. Put
  every branch of a conditional style in the same expression.
- **`stroke-<number>` only accepts integers.** The system-wide 2.5px icon stroke
  is a base rule on `svg.lucide`, not a per-icon utility.
