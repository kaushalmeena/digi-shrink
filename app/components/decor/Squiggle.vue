<script setup lang="ts">
/**
 * A hand-drawn wave, used as a section divider and as heading emphasis.
 *
 * On narrow screens the design system calls for horizontal squiggles to become
 * vertical dividers; here the simpler and calmer answer is to shorten the wave
 * and let it stay horizontal, which reads better than a rotated one.
 */
withDefaults(
  defineProps<{
    tone?: 'accent' | 'berry' | 'sun' | 'mint' | 'line'
    /** Stroke width in SVG units. */
    weight?: number
  }>(),
  { tone: 'accent', weight: 4 },
)

const TONE_CLASS = {
  accent: 'text-accent',
  berry: 'text-berry',
  sun: 'text-sun',
  mint: 'text-mint',
  line: 'text-(--color-line)',
} as const
</script>

<template>
  <svg
    viewBox="0 0 240 16"
    preserveAspectRatio="none"
    class="h-3 w-full"
    :class="TONE_CLASS[tone]"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M0 8c15-10 30 10 45 0s30 10 45 0 30 10 45 0 30 10 45 0 30 10 45 0"
      stroke="currentColor"
      :stroke-width="weight"
      stroke-linecap="round"
    />
  </svg>
</template>
