<script setup lang="ts">
/**
 * A native range input with a filled track. Native, so every keyboard and
 * assistive-tech behaviour comes for free.
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
    class="h-4 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    :style="{ '--fill': `${fill}%` }"
    :class="[
      '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full',
      '[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--color-accent)_var(--fill),var(--color-surface-3)_var(--fill))]',
      '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-surface-3',
      '[&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-accent',
      '[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none',
      '[&::-webkit-slider-thumb]:-mt-1.25 [&::-webkit-slider-thumb]:rounded-full',
      '[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-line-strong',
      '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm',
      '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full',
      '[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-line-strong',
      '[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm',
    ]"
  />
</template>
