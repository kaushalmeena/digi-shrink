<script setup lang="ts">
/**
 * A range input restyled to match the system: chunky track, hard-shadowed
 * circular thumb, violet fill behind the thumb.
 *
 * It stays a real `<input type="range">`, so keyboard support, arrow-key
 * stepping, screen-reader announcements and touch behaviour all come for free —
 * none of which a div-based slider would give us without a lot of work.
 */
import { computed } from 'vue'

const model = defineModel<number>({ required: true })

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    id?: string
    ariaLabel?: string
    describedBy?: string
  }>(),
  { min: 0, max: 100, step: 1 },
)

/** Fill percentage, used to paint the track behind the thumb. */
const fill = computed(() => {
  const span = props.max - props.min
  if (span <= 0) return 0
  return ((model.value - props.min) / span) * 100
})
</script>

<template>
  <input
    :id="id"
    v-model.number="model"
    type="range"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-describedby="describedBy"
    class="h-6 w-full cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45"
    :style="{ '--fill': `${fill}%` }"
    :class="[
      // Track — a bordered capsule filled up to the thumb.
      '[&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full',
      '[&::-webkit-slider-runnable-track]:border-2 [&::-webkit-slider-runnable-track]:border-[var(--color-outline)]',
      '[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--color-accent)_var(--fill),var(--color-surface-2)_var(--fill))]',
      '[&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-2',
      '[&::-moz-range-track]:border-[var(--color-outline)] [&::-moz-range-track]:bg-surface-2',
      '[&::-moz-range-progress]:h-3 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-accent',
      // Thumb — a sticker disc that lifts on hover, like every other control.
      '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6',
      '[&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:rounded-full',
      '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-outline)]',
      '[&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-[2px_2px_0_0_var(--color-shade)]',
      '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
      'hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95',
      '[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full',
      '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--color-outline)]',
      '[&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:shadow-[2px_2px_0_0_var(--color-shade)]',
    ]"
  />
</template>
