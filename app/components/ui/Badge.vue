<script setup lang="ts">
/**
 * A small status label. Colour is only ever a second signal: the text always
 * says what the colour means.
 */
type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'neutral' })

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-soft',
  accent: 'bg-accent-wash text-accent',
  success: 'bg-success-wash text-success',
  warning: 'bg-warning-wash text-warning',
  danger: 'bg-danger-wash text-danger',
}
</script>

<template>
  <span
    class="inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-2xs font-medium whitespace-nowrap"
    :class="TONES[tone]"
  >
    <slot />
  </span>
</template>
