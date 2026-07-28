import tailwindcss from '@tailwindcss/vite'

/**
 * DigiCompress is a fully local, offline-capable image compressor.
 *
 * Two hard constraints shape this config:
 *  1. No image bytes may ever leave the device — there is no server runtime, no
 *     API routes, and every codec is a WASM binary shipped with the bundle.
 *  2. The app must work with the network switched off, so every asset (fonts,
 *     codecs, icons) is self-hosted and precached by the service worker.
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: ['@nuxt/eslint', '@nuxt/fonts', '@vueuse/nuxt', '@vite-pwa/nuxt', 'vue-sonner/nuxt'],

  css: ['~/assets/css/main.css'],

  // The shell is prerendered for a fast first paint; all compression work is
  // strictly client-side inside web workers.
  ssr: true,
  nitro: {
    prerender: { routes: ['/'], crawlLinks: false },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'color-scheme', content: 'light dark' },
      ],
    },
  },

  // Downloaded at build time and served from our own origin so the PWA keeps
  // its typography when offline.
  fonts: {
    families: [
      { name: 'Outfit', provider: 'google', weights: [600, 700, 800] },
      { name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  /**
   * Auto-imports are off on purpose.
   *
   * Every `ref`, `computed`, `useState` and project composable is imported
   * explicitly. It costs one line per file and buys a lot: you can see a
   * module's real dependencies without knowing Nuxt's magic, "go to definition"
   * always works, and forgetting an import is a build error rather than a
   * mystery global.
   *
   * Component auto-import is untouched — `<UiButton>` resolving by filename is
   * unambiguous, since the name maps directly to a path.
   */
  imports: { autoImport: false },

  eslint: {
    // Prettier owns formatting; ESLint only owns correctness.
    config: { stylistic: false },
  },

  vite: {
    plugins: [tailwindcss()],
    /*
     * Dev-server copies of the cross-origin-isolation headers below.
     *
     * These are not redundant: Vite's own middleware serves `/_nuxt/*` in dev and
     * never sees Nitro's `routeRules`. Without them the document is isolated but
     * the worker script is not, so the browser refuses to start the worker — and
     * a blocked worker *load* fires a bare `Event` with no message, which is
     * genuinely hard to trace back to a missing header.
     */
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    // The codecs are ES modules that dynamically import their own WASM. Keeping
    // them out of dep-prebundling avoids a broken dev server, and `format: 'es'`
    // lets the worker use those dynamic imports.
    worker: { format: 'es' },
    optimizeDeps: {
      exclude: [
        '@jsquash/avif',
        '@jsquash/jpeg',
        '@jsquash/oxipng',
        '@jsquash/png',
        '@jsquash/resize',
        '@jsquash/webp',
      ],
    },
  },

  /**
   * `oxipng` and the AVIF encoder ship multi-threaded WASM variants that need a
   * cross-origin-isolated context. These headers unlock them on any Nitro-served
   * deployment; on plain static hosting the codecs detect the missing
   * `SharedArrayBuffer` and transparently fall back to single-threaded builds.
   */
  routeRules: {
    '/**': {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      id: '/',
      name: 'DigiCompress — Local Image Compressor',
      short_name: 'DigiCompress',
      description:
        'Squeeze images down to size entirely on your own device. No uploads, no accounts, works offline.',
      lang: 'en',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: '#fffdf5',
      theme_color: '#8b5cf6',
      categories: ['utilities', 'photo', 'productivity'],
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      // Lets the OS offer DigiCompress in "Open with…" for image files.
      file_handlers: [
        {
          action: '/',
          accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
            'image/avif': ['.avif'],
            'image/gif': ['.gif'],
            'image/bmp': ['.bmp'],
          },
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2,wasm}'],
      // The AVIF and oxipng WASM binaries are multiple megabytes each and must
      // be precached for the app to compress while offline.
      maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
    },
    client: { installPrompt: true },
    devOptions: { enabled: false, suppressWarnings: true },
  },
})
