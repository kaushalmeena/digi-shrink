<script setup lang="ts">
/**
 * The savings dashboard.
 *
 * The hero figure is bytes saved, not percentage — "you saved 14.2 MB" means
 * something concrete, where "62%" needs mental arithmetic. The percentage is
 * still shown, as a ring, because it's the better measure of how hard the
 * settings are working.
 */
import { computed } from 'vue'

import { Clock, FileDown, FileUp, Gauge, PiggyBank, ShieldCheck } from '@lucide/vue'
import { formatBytes, formatDuration, formatPercent } from '~/lib/format'
import { useCompressor } from '~/composables/useCompressor'

const { stats, items } = useCompressor()

/** Circumference of the r=42 ring, for the stroke-dash trick. */
const RING = 2 * Math.PI * 42

const ringOffset = computed(() => {
  const fraction = Math.min(1, Math.max(0, stats.value.savedPercent / 100))
  return RING * (1 - fraction)
})

const averagePerImage = computed(() =>
  stats.value.count > 0 ? stats.value.savedBytes / stats.value.count : 0,
)

const TILES = computed(() => [
  {
    key: 'before',
    label: 'Before',
    icon: FileUp,
    tone: 'neutral' as const,
    value: formatBytes(stats.value.originalBytes),
    note: `${stats.value.count} image${stats.value.count === 1 ? '' : 's'}`,
  },
  {
    key: 'after',
    label: 'After',
    icon: FileDown,
    tone: 'mint' as const,
    value: formatBytes(stats.value.outputBytes),
    note: `avg ${formatBytes(averagePerImage.value)} saved each`,
  },
  {
    key: 'rate',
    label: 'Reduction',
    icon: Gauge,
    tone: 'accent' as const,
    value: formatPercent(stats.value.savedPercent, 1),
    note: 'smaller than the originals',
  },
  {
    key: 'time',
    label: 'Encode time',
    icon: Clock,
    tone: 'sun' as const,
    value: formatDuration(stats.value.durationMs),
    note: 'all on your own CPU',
  },
])
</script>

<template>
  <section aria-labelledby="stats-heading" class="relative">
    <h2 id="stats-heading" class="sr-only">Compression results</h2>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <!-- Hero: bytes saved, with the reduction ring. -->
      <UiCard tone="mint" :depth="4" class="relative overflow-hidden">
        <div class="decor-layer pattern-dots opacity-50" aria-hidden="true" />

        <div class="relative z-10 flex items-center gap-5">
          <div class="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--color-surface-2)"
                stroke-width="10"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--color-mint)"
                stroke-width="10"
                stroke-linecap="round"
                :stroke-dasharray="RING"
                :stroke-dashoffset="ringOffset"
                class="transition-[stroke-dashoffset] duration-700 ease-(--ease-out-soft)"
              />
            </svg>

            <span class="absolute inset-0 grid place-items-center">
              <UiCountUp
                :value="stats.savedPercent"
                :format="(value) => formatPercent(value, 0)"
                class="font-display text-lg font-extrabold text-ink"
              />
            </span>
          </div>

          <div class="min-w-0">
            <span class="eyebrow flex items-center gap-1.5 text-ink-soft">
              <PiggyBank class="h-3.5 w-3.5" />
              Total saved
            </span>

            <p class="mt-1.5 font-display text-3xl leading-none font-extrabold sm:text-4xl">
              <UiCountUp :value="stats.savedBytes" :format="formatBytes" />
            </p>

            <p class="mt-2 text-xs leading-snug text-ink-soft">
              from {{ formatBytes(stats.originalBytes) }} down to
              {{ formatBytes(stats.outputBytes) }}
            </p>
          </div>
        </div>

        <!-- Honesty note: already-optimal images are reported, not hidden. -->
        <Transition name="collapse">
          <p
            v-if="stats.unchanged > 0"
            class="relative z-10 mt-4 flex items-start gap-2 rounded-lg bg-sun-wash p-2.5 text-2xs leading-snug font-semibold text-ink"
          >
            <ShieldCheck class="mt-px h-3.5 w-3.5 shrink-0" />
            {{ stats.unchanged }} image{{ stats.unchanged === 1 ? ' was' : 's were' }} already
            optimal — the original file was kept instead of a bigger re-encode.
          </p>
        </Transition>
      </UiCard>

      <!-- Supporting tiles. -->
      <div class="stagger grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <UiCard
          v-for="(tile, index) in TILES"
          :key="tile.key"
          :depth="2"
          tone="soft"
          class="!p-4"
          :style="{ '--stagger-index': index }"
        >
          <UiIconBadge :tone="tile.tone" size="sm" shape="squircle">
            <component :is="tile.icon" />
          </UiIconBadge>

          <p class="mt-3 eyebrow text-ink-soft">{{ tile.label }}</p>
          <p class="mt-1 font-display text-xl leading-none font-extrabold" data-numeric>
            {{ tile.value }}
          </p>
          <p class="mt-1.5 text-2xs leading-snug text-ink-soft">{{ tile.note }}</p>
        </UiCard>
      </div>
    </div>

    <p v-if="items.length > stats.count" class="mt-3 text-2xs text-ink-soft" data-numeric>
      {{ items.length - stats.count }} of {{ items.length }} still to go.
    </p>
  </section>
</template>
