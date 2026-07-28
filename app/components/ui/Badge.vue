<script setup lang="ts">
/**
 * A small pill label. Used for statuses, formats and counts.
 *
 * Statuses never rely on colour alone — every tone is paired with text (and
 * usually an icon in the slot), so the meaning survives for colour-blind users
 * and in monochrome.
 */
type Tone = 'neutral' | 'accent' | 'berry' | 'sun' | 'mint' | 'danger'

withDefaults(
  defineProps<{
    tone?: Tone
    /** Adds the chunky 2px border for badges that need to stand off the page. */
    outlined?: boolean
    size?: 'sm' | 'md'
  }>(),
  { tone: 'neutral', size: 'sm' },
)

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-soft',
  accent: 'bg-accent-wash text-accent',
  berry: 'bg-berry-wash text-berry',
  sun: 'bg-sun-wash text-ink',
  mint: 'bg-mint-wash text-mint',
  danger: 'bg-danger-wash text-danger',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full font-display font-bold whitespace-nowrap"
    :class="[
      TONES[tone],
      outlined && 'edge',
      size === 'sm' ? 'h-6 px-2.5 text-2xs' : 'h-7 px-3 text-xs',
    ]"
  >
    <slot />
  </span>
</template>
