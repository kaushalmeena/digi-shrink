# Gotchas worth knowing before editing

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
