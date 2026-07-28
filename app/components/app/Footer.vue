<script setup lang="ts">
/**
 * Footer. Doubles as the lifetime-savings display, which is the small reward
 * that makes the tool feel worth coming back to.
 */
import { computed } from 'vue'

import { Code2, ExternalLink, HardDrive, Sparkles } from '@lucide/vue'
import { formatBytes } from '~/lib/format'
import { useLifetimeStats } from '~/composables/useLifetimeStats'

const { stats, savedBytes, savedPercent } = useLifetimeStats()

/**
 * Lucide dropped its brand icons, so the repo link uses a generic code glyph
 * rather than reintroducing an icon set for one mark.
 */
const LINKS = [
  { href: 'https://github.com/kaushalmeena/digi-shrink', label: 'Source', icon: Code2 },
  { href: 'https://github.com/jamsinclair/jSquash', label: 'jSquash codecs', icon: ExternalLink },
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
  <!-- A straight 2px rule, not a squiggle: the wave sat directly on top of the
       border and read as a rendering artefact rather than decoration. -->
  <footer class="mt-20 border-t-2 border-(--color-outline) bg-surface">
    <div class="shell py-10">
      <div class="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-sm space-y-3">
          <AppLogo size="sm" />
          <p class="text-xs/relaxed text-ink-soft">
            A local image compressor. Your files are decoded, resized and re-encoded by WebAssembly
            running in this tab — there is no server, no upload and no account.
          </p>
          <p class="flex items-center gap-1.5 text-2xs font-semibold text-ink-soft">
            <HardDrive class="size-3.5" />
            Works fully offline once installed
          </p>
        </div>

        <!-- Lifetime tally. Hidden until there's something to celebrate. -->
        <UiCard v-if="stats.images > 0" tone="mint" :depth="3" class="w-full sm:max-w-xs">
          <div class="flex items-center gap-2">
            <UiIconBadge tone="mint" size="sm">
              <Sparkles />
            </UiIconBadge>
            <span class="eyebrow text-ink-soft">Your running total</span>
          </div>

          <p class="mt-3 font-display text-3xl font-extrabold" data-numeric>
            {{ formatBytes(savedBytes) }}
          </p>
          <p class="mt-1 text-xs text-ink-soft" data-numeric>
            saved across {{ stats.images.toLocaleString() }} image{{
              stats.images === 1 ? '' : 's'
            }}
            <template v-if="since"> since {{ since }}</template>
            · {{ savedPercent.toFixed(0) }}% smaller
          </p>
        </UiCard>
      </div>

      <div
        class="mt-8 flex flex-col gap-3 border-t-2 border-line pt-6 text-2xs text-ink-soft sm:flex-row sm:items-center sm:justify-between"
      >
        <p>Built with Nuxt, Tailwind and WebAssembly codecs from the Squoosh project.</p>

        <nav class="flex items-center gap-4" aria-label="Project links">
          <a
            v-for="link in LINKS"
            :key="link.href"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 font-bold transition-colors hover:text-accent"
          >
            <component :is="link.icon" class="size-3.5" />
            {{ link.label }}
          </a>
        </nav>
      </div>
    </div>
  </footer>
</template>
