# DigiCompress

A batch image compressor that runs entirely on your own device. No uploads, no
accounts, no server — and it keeps working with the network switched off.

Drop in JPEG, PNG, WebP, AVIF, GIF, BMP or HEIC files and get back genuinely
smaller images, with an honest report of what you traded and a before/after
slider to check it.

## Why it exists

Most online compressors ask you to upload your photos to someone else's
computer. This one can't, because it has nowhere to send them: the codecs are
WebAssembly binaries shipped with the app and run in a Web Worker in your tab.
You can verify that in the network panel.

A useful side effect: because every image is decoded to raw pixels and
re-encoded, EXIF, GPS coordinates and camera details cannot survive the round
trip. Metadata removal isn't a setting — it's a property of the pipeline.

## Features

**Compression**

- Real encoders — MozJPEG, OxiPNG, libwebp and libavif — not a canvas re-save.
- **Auto format**: encodes several formats and keeps whichever came out smallest.
- **Target size**: name a byte budget and quality is binary-searched to fit it.
- **Lossless** mode for PNG and WebP, where not a single pixel changes.
- High-quality resizing (Lanczos3, Mitchell, Catmull-Rom, Triangle) in WASM.
- Per-image quality overrides, because one photo in a batch always needs
  different treatment.
- An "already optimal" guard: if a re-encode would come out _bigger_, the
  original bytes are returned and the UI says so.

**Getting images in and out**

- Drag and drop anywhere on the page, including whole folders.
- Paste from the clipboard, or use the file picker.
- Installed as a PWA, it registers as a handler for image files, so the OS can
  offer it under "Open with…".
- Export as a ZIP, or write the whole batch into a folder you pick once (where
  the File System Access API is available).

**Seeing what happened**

- Live savings dashboard: total saved, reduction percentage, encode time.
- Before/after comparison with a draggable divider, side-by-side mode and zoom
  to 400% — most artefacts are invisible at "fit".
- **Format lab**: encode one image to all four formats and compare real sizes
  and timings, instead of trusting rules of thumb.
- A lifetime tally of everything you've saved, kept in `localStorage`.

**The rest**

- Light and dark themes, following the OS by default.
- Full keyboard support, ARIA roles, focus trapping in panels, and
  `prefers-reduced-motion` honoured throughout.
- A worker pool sized to your CPU, so a large batch never freezes the interface.

## Getting started

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

### Scripts

| Command            | What it does                            |
| ------------------ | --------------------------------------- |
| `pnpm dev`         | Dev server with HMR                     |
| `pnpm build`       | Production build                        |
| `pnpm preview`     | Serve the production build              |
| `pnpm generate`    | Static prerender                        |
| `pnpm lint`        | ESLint (Prettier runs as a lint rule)   |
| `pnpm lint:fix`    | Fix what can be fixed automatically     |
| `pnpm typecheck`   | `vue-tsc` across every Nuxt environment |
| `pnpm build:icons` | Regenerate the PWA icons and favicon    |

## Architecture

```
app/
├── assets/css/        Design tokens, pattern utilities, transition vocabulary
├── components/
│   ├── ui/            Design-system primitives (Button, Card, Segmented, …)
│   ├── decor/         Purely decorative shapes (Confetti, Squiggle)
│   ├── app/           Shell: Header, Footer, Logo, ThemeToggle
│   └── compress/      Feature components: DropZone, Queue, drawers, slider
├── composables/       Queue, settings, theme, file intake, stats
├── lib/               Framework-free logic: types, formatting, ZIP, worker pool
├── plugins/           localStorage hydration and persistence
├── pages/             The single page
└── workers/           The compression worker — all image processing lives here
```

The important boundary is `lib/` and `workers/`: neither imports Vue. The worker
is the only place pixels are touched, and it communicates over a typed message
protocol (`lib/types.ts`) with buffers transferred rather than copied.

### Notable decisions

- **Decoding uses the browser, not WASM.** `createImageBitmap` is hardware
  accelerated, handles EXIF orientation, and supports formats we ship no decoder
  for (HEIC on Safari, GIF, BMP, SVG). WASM decoders are the fallback.
- **The ZIP writer is hand-rolled** (`lib/zip.ts`, ~180 lines). Compressed images
  are incompressible, so only the `store` method is needed; a general-purpose
  library would be dead weight. CRC32 is streamed and the archive references the
  source blobs, so peak memory is one image rather than the whole batch.
- **Auto-imports are disabled.** Every `ref`, `computed`, `useState` and project
  composable is imported by name. See `nuxt.config.ts` for the reasoning.
- **Cross-origin isolation headers are set** so `oxipng` and the AVIF encoder can
  use their multi-threaded WASM builds. On static hosting without those headers,
  the codecs detect the missing `SharedArrayBuffer` and fall back to
  single-threaded builds automatically.

## Design system

The UI implements **Playful Geometric**: chunky 2px borders, hard blur-free
offset shadows so elements read as stickers, primitive shapes and dot grids as
decoration, and bouncy overshooting motion.

Everything is driven by semantic tokens in `app/assets/css/main.css` — no
component hardcodes a hex value, which is what lets a single `.dark` class
re-skin the whole app. Dark mode is not an inversion: the paper becomes deep
ink-violet, surfaces sit _above_ the canvas in lightness, and accents brighten
and swap to dark text so contrast stays comfortable.

Reusable visual primitives live in `app/assets/css/patterns.css` (`pop-*`,
`sticker`, `edge`, `pattern-dots`, `blob-*`) and the shared motion vocabulary in
`transitions.css`.

## Browser support

Needs a modern browser with `OffscreenCanvas` and WASM: Chrome/Edge 94+,
Firefox 105+, Safari 16.4+.

Some things degrade rather than break:

- **Folder picker export** needs the File System Access API (Chromium). A ZIP
  download is always offered.
- **HEIC previews** only render where the OS can decode them (Safari). The
  compressed output is still correct — it goes through the WASM decoder.
- **Multi-threaded codecs** need cross-origin isolation, as described above.

## Licence

The jSquash codec bundles are Apache-2.0, from the Squoosh project.
