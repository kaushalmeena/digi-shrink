<script setup lang="ts" generic="T extends string | number">
/**
 * A segmented control — the primary way to pick between a handful of named
 * options in this app (format, resize mode, compression mode).
 *
 * The active segment is marked by a single sliding pill rendered *behind* the
 * labels. Animating one element's transform is both smoother and cheaper than
 * cross-fading backgrounds on every segment, and it makes the selection feel
 * like a physical object being moved.
 *
 * Implemented as an ARIA radio group so arrow keys work as users expect.
 *
 * Callers label it by putting `aria-label` directly on the component; Vue's
 * fallthrough attributes land it on the `role="radiogroup"` root, so there's no
 * need for a prop that just forwards a string.
 */
import { computed } from 'vue'

import type { SegmentOption } from '~/lib/types'

const model = defineModel<T>({ required: true })

const props = withDefaults(
  defineProps<{
    options: SegmentOption<T>[]
    size?: 'sm' | 'md'
    /** Wrap into a grid instead of one row — for 4+ options in a narrow panel. */
    columns?: number
  }>(),
  { size: 'md' },
)

const activeIndex = computed(() =>
  props.options.findIndex((option) => option.value === model.value),
)

/** Arrow keys move to the next/previous enabled option, wrapping around. */
function onKeydown(event: KeyboardEvent): void {
  const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
  const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
  if (!forward && !back) return

  event.preventDefault()
  const total = props.options.length
  const step = forward ? 1 : -1

  for (let offset = 1; offset <= total; offset += 1) {
    const next = props.options[(activeIndex.value + step * offset + total * total) % total]
    if (next && !next.disabled) {
      model.value = next.value
      return
    }
  }
}
</script>

<template>
  <div
    role="radiogroup"
    class="relative rounded-full edge bg-surface-2 p-1"
    :class="columns ? 'grid gap-1' : 'inline-flex'"
    :style="columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined"
    @keydown="onKeydown"
  >
    <!-- The sliding indicator. Only rendered in row mode, where a single
         translate can track the selection; the grid layout uses per-cell fills. -->
    <span
      v-if="!columns && activeIndex >= 0"
      class="absolute top-1 bottom-1 left-1 rounded-full bg-accent transition-transform duration-300 ease-(--ease-bounce)"
      :style="{
        width: `calc((100% - 0.5rem) / ${options.length})`,
        transform: `translateX(${activeIndex * 100}%)`,
      }"
      aria-hidden="true"
    />

    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      :title="option.title"
      :disabled="option.disabled"
      class="relative z-10 rounded-full font-display font-bold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40"
      :class="[
        size === 'sm' ? 'h-7 px-3 text-2xs' : 'h-9 px-4 text-xs',
        model === option.value
          ? 'text-on-accent'
          : 'text-ink-soft hover:text-ink not-disabled:hover:bg-surface',
        columns && model === option.value && 'bg-accent',
      ]"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
