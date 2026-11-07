# DigiShrink — working notes

A fully local, offline-capable batch image compressor. Nuxt 4 + Tailwind v4 +
WebAssembly codecs. See `README.md` for what it does and why.

## Commands

```bash
pnpm dev          # dev server
pnpm lint         # ESLint; Prettier runs as the `prettier/prettier` rule
pnpm typecheck    # vue-tsc across all Nuxt environments
pnpm build        # production build
pnpm build:icons  # regenerate public/icons + favicon.svg
```

Run `pnpm lint && pnpm typecheck && pnpm build` before considering a change done.
`pnpm build` catches things the other two don't — prerender failures in
particular.

## Hard rules

**No auto-imports.** `imports.autoImport` is `false` in `nuxt.config.ts`. Import
everything by name:

```ts
import { computed, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useState } from '#imports' // Nuxt's own composables
import { useSettings } from '~/composables/useSettings'
```

Component auto-import is still on — `<UiButton>` maps unambiguously to
`app/components/ui/Button.vue`.

**No image bytes leave the device.** There is no server runtime, no API routes,
no analytics. Don't add a network call to the compression path; the privacy claim
in the header is the product.

**No hardcoded colours in components.** Use the semantic tokens from
`app/assets/css/main.css` (`bg-surface`, `text-ink-soft`, `border-(--color-line)`,
`text-success`, …). A hex value in a component means dark mode is now broken.

**Never put two competing Tailwind utilities on one element** — one in `class`
and one in `:class`, or a base class plus a conditional override for the same
property. Which one wins is decided by _stylesheet order_, not attribute order,
so it silently breaks. Put every branch of a conditional style in the same
expression:

```vue
<!-- wrong: bg-surface and bg-accent-wash fight -->
<button class="bg-surface" :class="active && 'bg-accent-wash'">
<!-- right -->
<button :class="active ? 'bg-accent-wash' : 'bg-surface'">
```

**Prefer canonical Tailwind class forms.** `border-(--color-outline)` not
`border-[var(--color-outline)]`; `size-4` not `h-4 w-4`; `text-xs/snug` not
`text-xs leading-snug`; `ease-bounce` not `ease-(--ease-bounce)`. Note that
`stroke-<number>` only accepts integers — the system-wide 2.5px icon stroke is
set once as a base rule on `svg.lucide`, not per-icon.

Both of the rules above are now enforced by
[`eslint-plugin-better-tailwindcss`](https://github.com/schoero/eslint-plugin-better-tailwindcss)
(`no-conflicting-classes` and `enforce-canonical-classes`), and most of it is
auto-fixable with `pnpm lint:fix`. Two things to know about that setup:

- `settings["better-tailwindcss"].entryPoint` points at `app/assets/css/main.css`.
  Without it the plugin only knows stock Tailwind and reports every custom
  `@utility` (`shell`, `label-caps`, `checker`, …) as unknown.
- **It only lints template attributes, not `<script>` variables.** The class
  lookup maps the design-system components use (`VARIANTS`, `TONES`, `SIZES`, …)
  are invisible to it — the `variables` setting does not reach them inside a
  `.vue` script block. Keep those strings canonical by hand: `size-9`, not
  `h-9 w-9`.
- A new shared class therefore has to be declared with `@utility`, not as a plain
  CSS class, or `no-unknown-classes` will flag every use of it.
- **After adding a `@utility` to an imported partial, touch `main.css`.** The
  plugin caches the compiled Tailwind context and invalidates it on the mtime of
  `entryPoint` _alone_ — editing `patterns.css` or `transitions.css` leaves
  `main.css` untouched, so a long-lived ESLint process (your editor's server)
  keeps serving the old context and reports the new utility as unknown. The CLI
  is unaffected because each run is a fresh process. Either `touch
  app/assets/css/main.css` or restart the ESLint server.
- `enforce-consistent-line-wrapping` is off: Prettier owns formatting, and two
  tools rewriting the same bytes fight each other.

## Architecture

```
app/lib/        Framework-free. No Vue imports. Types, formatting, ZIP, pool.
app/workers/    The only place pixels are touched.
app/composables/  Shared state via useState; the queue owns all item mutation.
app/components/ui/   Design-system primitives. Feature code composes these.
```

- **Components read state, they never mutate it.** If a component needs to change
  a queue item, add a function to `useCompressor` (e.g. `setQualityOverride`).
  `vue/no-mutating-props` enforces the prop half of this.
- **Blobs and Workers stay out of the reactive tree.** `markRaw` for `File`,
  a module-level `Map` for output blobs.
- **Object URLs must be revoked.** Every `createObjectURL` in the queue has a
  matching revoke in `releaseItem`/`requeue`.
- **Worker messages carry plain objects.** `postMessage` cannot structured-clone
  a Vue reactive Proxy. `settingsFor()` does a JSON round-trip for this reason —
  don't "optimise" it away.

## Gotchas that cost real time

- **The worker import must be a relative path** (`../workers/compress.worker?worker`).
  With the `~/` alias, Vite emits a malformed `@fs/app/...` URL and the worker
  fails to load with an _empty_ error event.
- **Cross-origin isolation headers must be set on both Nitro and Vite.** Vite's
  dev middleware serves `/_nuxt/*` and never sees `routeRules`; without the
  duplicate in `vite.server.headers`, the isolated document refuses to start the
  worker — again with an empty error event.
- **Client-only state needs `<ClientOnly>`.** Theme comes from `localStorage`, so
  SSR can't know it; rendering it directly causes hydration mismatches.
- **A pill radius (`rounded-full`) on a multi-row grid** lets bottom-row children
  escape the corner curve. Use a fixed radius when the container can wrap.

## Design system

Quiet Utility: neutral surfaces, 1px hairline borders, one accent (blue), status
colours only where they carry meaning, Inter, short eased motion. The tool is
the whole page — no hero, no decoration.

- Tokens and base styles: `app/assets/css/main.css`
- Shared utilities: `app/assets/css/utilities.css` — `shell`, `label-caps`, `checker`
- Motion: `app/assets/css/transitions.css` — use these `<Transition>` names
  (`fade`, `rise`, `offcanvas`, `queue`) rather than writing one-off
  animations. Height disclosure is the `disclose` **utility**, not a transition:
  put it on an always-mounted element and toggle `data-open`, because a
  `v-if`-ed element has no resolved row track to animate from.
- Only one `primary` button on screen at a time — the next step.

## Deeper reference

Read these before a non-trivial change; they explain the _why_ behind the rules
above rather than repeating them.

| Working on                                 | Read                                      |
| ------------------------------------------ | ----------------------------------------- |
| Constraints, directory layout              | [overview.md](docs/overview.md)           |
| Codecs, encode/decode, worker pool sizing  | [pipeline.md](docs/pipeline.md)           |
| State ownership, getting images in and out | [state.md](docs/state.md)                 |
| PWA, base paths, cross-origin isolation    | [offline.md](docs/offline.md)             |
| Shipping, browser support                  | [deployment.md](docs/deployment.md)       |
| Token tables for both themes               | [foundations.md](docs/foundations.md)     |
| UI components, shared utilities            | [primitives.md](docs/primitives.md)       |
| Transitions, iconography                   | [motion.md](docs/motion.md)               |
| Accessibility commitments                  | [accessibility.md](docs/accessibility.md) |
| What bites when editing                    | [gotchas.md](docs/gotchas.md)             |

## Accessibility

Not optional here, and mostly already wired: ARIA radio groups for segmented
controls, focus trapping and restore in `UiOffcanvas`, real `<input>` elements
behind custom-looking controls (the compare slider keeps a range input as its
keyboard path), and status never conveyed by colour alone.

## Git commit messages

Conventional Commits, and strictly:

1. Format: `type(scope): description` — scope optional.
2. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`,
   `perf`, `ci`.
3. Subject line under 60 characters.
4. Lowercase subject, no trailing period.
5. Explain the _what_ and _why_, not the _how_.
6. No verbose bullet lists. A single-line body only when the change is
   non-obvious.
7. Imperative present tense — "add feature", not "added feature".
