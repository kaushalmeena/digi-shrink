<script setup lang="ts">
/**
 * A chunky bordered progress bar.
 *
 * When `indeterminate`, a striped pattern scrolls instead of the bar filling —
 * useful while a WASM codec is loading and we genuinely can't report progress.
 */
withDefaults(
  defineProps<{
    /** 0–1. */
    value: number
    indeterminate?: boolean
    tone?: 'accent' | 'mint' | 'sun'
    size?: 'sm' | 'md'
    label?: string
  }>(),
  { tone: 'accent', size: 'md' },
)

const TONES = {
  accent: 'bg-accent',
  mint: 'bg-mint',
  sun: 'bg-sun',
} as const
</script>

<template>
  <div
    class="w-full overflow-hidden rounded-full edge bg-surface-2"
    :class="size === 'sm' ? 'h-2' : 'h-3.5'"
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="indeterminate ? undefined : Math.round(value * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      v-if="indeterminate"
      class="h-full w-full pattern-stripes opacity-70"
      :class="TONES[tone]"
      style="background-size: 200% 100%; animation: var(--animate-shimmer)"
    />
    <div
      v-else
      class="h-full rounded-full transition-[width] duration-300 ease-out"
      :class="TONES[tone]"
      :style="{ width: `${Math.min(100, Math.max(0, value * 100))}%` }"
    />
  </div>
</template>
