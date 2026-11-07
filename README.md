<div align="center">

<img src="public/favicon.svg" alt="DigiShrink logo" width="96" height="96" />

# Digi-Shrink

[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?logo=opensourceinitiative&logoColor=white)](LICENSE) [![Nuxt](https://img.shields.io/badge/Nuxt-4-00875A?logo=nuxt&logoColor=white)](https://nuxt.com) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-0E7490?logo=tailwindcss&logoColor=white)](https://tailwindcss.com) [![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**Shrink images without giving them away.**

A batch image compressor that runs **entirely on your own device** — no uploads, no accounts, no server. It uses the same WebAssembly codecs the pros do, reports honestly what you traded, and keeps working with the network switched off.

[**Try it live**](https://kaushalmeena.github.io/digi-shrink/)

</div>

---

## Features

- **Real codecs** — MozJPEG, OxiPNG, libwebp and libavif compiled to
  WebAssembly, not a canvas re-save. It shows in the file sizes.
- **Auto format** — encodes several formats and keeps whichever came out
  smallest, so you never have to guess which one wins for a given image.
- **Target size** — name a byte budget and quality is binary-searched until the
  output fits.
- **Lossless mode** — not a single pixel changes; savings come from better
  compression alone.
- **Batch everything** — drag and drop whole folders, paste from the clipboard,
  then export as a ZIP or straight into a folder you pick once.
- **Before/after slider** — a draggable divider, side-by-side view and zoom to
  400%, because most artefacts are invisible at "fit".
- **Format lab** — encode one image to all four formats and compare real sizes
  and timings instead of trusting rules of thumb.
- **Honest reporting** — if a re-encode would come out _bigger_, the original
  file is kept and the app tells you so.
- **Metadata stripped** — EXIF, GPS coordinates and camera details cannot
  survive the round trip.
- **Offline-first PWA** — installable, works with the wifi off, and registers as
  a handler so the OS can offer it under "Open with…".

## How It Works

1. **Decode** — the browser decodes your file with `createImageBitmap`, which
   handles EXIF orientation and formats we ship no decoder for, like HEIC.
2. **Resize** — optional resampling in linear light, which avoids the dark halos
   that plague naive downscaling.
3. **Encode** — one or more WebAssembly encoders run inside a pool of web
   workers, sized to your CPU so the interface never freezes.
4. **Pick** — the smallest result wins; if every candidate is larger than the
   input, the original bytes are handed back untouched.

> Everything happens **in this browser tab**. There is no server to upload to and
> no network call in the compression path — open the network panel and check.

## Tech Stack

| Area          | Tools                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Framework** | [Nuxt 4](https://nuxt.com) · [Vue 3](https://vuejs.org) · [TypeScript](https://www.typescriptlang.org)                          |
| **Styling**   | [Tailwind CSS 4](https://tailwindcss.com) · [Lucide](https://lucide.dev)                                                        |
| **Codecs**    | [jSquash](https://github.com/jamsinclair/jSquash) — MozJPEG · OxiPNG · libwebp · libavif                                        |
| **Offline**   | [Vite PWA](https://vite-pwa-org.netlify.app) · [Workbox](https://developer.chrome.com/docs/workbox)                             |
| **Utilities** | [VueUse](https://vueuse.org) · [vue-sonner](https://vue-sonner.vercel.app)                                                      |
| **Tooling**   | [pnpm](https://pnpm.io) · [Oxlint](https://oxc.rs/docs/guide/usage/linter) · [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) |
| **Hosting**   | [GitHub Pages](https://pages.github.com)                                                                                        |

## Getting Started

These instructions will get you a copy of the project up and running on your
local machine for development purposes.

### Requirements

To install and run this project you need:

- [Node.js](https://nodejs.org/) `>=24` (an `.nvmrc` is included — run `nvm use` if you use [nvm](https://github.com/nvm-sh/nvm))
- [pnpm](https://pnpm.io/installation)
- [git](https://git-scm.com/downloads) (only to clone this repository)

### Installation

To set up everything on your local machine, follow these steps:

1. Clone this repo and then change directory to the `digi-shrink` folder:

```bash
git clone https://github.com/kaushalmeena/digi-shrink.git
cd digi-shrink
```

2. Install project dependencies using pnpm:

```bash
pnpm install
```

### Running

To run the project simply run:

```bash
pnpm dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).

### Testing

There is no unit-test suite yet. To run the same checks CI runs — lint,
formatting and a typecheck across every Nuxt environment:

```bash
pnpm check
```

### Building

To create a production build:

```bash
pnpm build
```

The build output is written to the `.output` folder. To produce a fully static
site instead, run `pnpm generate` — that output lands in `.output/public`.

## Deployment

Every push to `main` is linted, typechecked, built and deployed to GitHub Pages
automatically by the [deploy workflow](.github/workflows/deploy.yml). One-time
setup: in the repository's **Settings → Pages**, set **Source** to **GitHub
Actions**.

GitHub Pages cannot send the cross-origin-isolation headers that the
multi-threaded AVIF and PNG encoders need, so on the hosted build those codecs
fall back to their single-threaded variants. Compression is unaffected; AVIF and
PNG are just slower than on a self-hosted deployment.

## Credits

- Image codecs by **jSquash** / the Squoosh project, licensed under
  [Apache-2.0](https://github.com/jamsinclair/jSquash/blob/main/LICENSE).
- [Inter](https://fonts.google.com/specimen/Inter) typeface, licensed under the
  [SIL Open Font License](https://openfontlicense.org/).

## Documentation

Full documentation is available in the [`/docs`](./docs) directory.

**Core Concepts:**

- [Overview](./docs/overview.md) — the two constraints that shape every decision, and the directory layout.
- [The Compression Pipeline](./docs/pipeline.md) — how an image becomes a smaller image, and how the worker pool is sized.
- [State and Image I/O](./docs/state.md) — who owns what state, and how images get in and back out.

**Design System:**

- [Foundations](./docs/foundations.md) — the Quiet Utility principles, and the colour, type and motion tokens.
- [Visual Primitives](./docs/primitives.md) — the UI components and shared CSS utilities.
- [Transitions and Iconography](./docs/motion.md) — what animates, and the icon set.
- [Accessibility](./docs/accessibility.md) — the commitments, and how they are wired.

**Advanced:**

- [Offline and Cross-Origin Isolation](./docs/offline.md) — the PWA setup, and the headers the codecs require.
- [Deployment and Browser Support](./docs/deployment.md) — how it ships, and where it works.
- [Gotchas](./docs/gotchas.md) — what to know before editing.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please
[open an issue](https://github.com/kaushalmeena/digi-shrink/issues/new/choose)
first to discuss it. For code changes, fork the repository, create a branch, and
open a pull request.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE)
file for details.
