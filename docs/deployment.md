# Deployment and browser support

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
