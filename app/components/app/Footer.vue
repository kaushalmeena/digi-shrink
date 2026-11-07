<script setup lang="ts">
/**
 * One quiet line: the lifetime tally (the small reward for coming back) and
 * the project links.
 */
import { computed } from 'vue'

import { formatBytes } from '~/lib/format'
import { useLifetimeStats } from '~/composables/useLifetimeStats'

const { stats, savedBytes } = useLifetimeStats()

const LINKS = [
  { href: 'https://github.com/kaushalmeena/digi-shrink', label: 'Source' },
  { href: 'https://github.com/jamsinclair/jSquash', label: 'Codecs by jSquash' },
]

const since = computed(() => {
  if (!stats.value.since) return ''
  return new Date(stats.value.since).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })
})
</script>

<template>
  <footer class="border-t">
    <div
      class="shell flex flex-col gap-2 py-5 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between"
    >
      <!-- Client-only: the totals come from `localStorage`, so the server can't
           render them without a hydration mismatch. -->
      <ClientOnly>
        <p v-if="stats.images > 0" data-numeric>
          {{ formatBytes(savedBytes) }} saved across {{ stats.images.toLocaleString() }} image{{
            stats.images === 1 ? '' : 's'
          }}<template v-if="since"> since {{ since }}</template>
        </p>
        <p v-else>Works offline once loaded.</p>

        <template #fallback>
          <p>Works offline once loaded.</p>
        </template>
      </ClientOnly>

      <nav class="flex items-center gap-4" aria-label="Project links">
        <a
          v-for="link in LINKS"
          :key="link.href"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-colors hover:text-ink"
        >
          {{ link.label }}
        </a>
      </nav>
    </div>
  </footer>
</template>
