# Offline and cross-origin isolation

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
