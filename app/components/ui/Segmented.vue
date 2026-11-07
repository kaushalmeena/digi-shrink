<script setup lang="ts" generic="T extends string | number">
/**
 * A segmented control — the primary way to pick between a handful of named
 * options in this app (format, resize mode, compression mode).
 *
 * The active segment is marked by a single sliding pill rendered *behind* the
 * labels. Animating one element is both smoother and cheaper than cross-fading
 * backgrounds on every segment, and it makes the selection feel like a physical
 * object being moved.
 *
 * The pill's position and width are **measured** from the active button rather
 * than computed as `100% / count`. Segments are content-sized ("Slider" is much
 * narrower than "Side by side"), so an equal-split assumption makes the pill
 * overlap its neighbours — and it would also drift as soon as a webfont swaps in
 * and changes the label widths.
 *
 * Implemented as an ARIA radio group so arrow keys work as users expect.
 *
 * Callers label it by putting `aria-label` directly on the component; Vue's
 * fallthrough attributes land it on the `role="radiogroup"` root, so there's no
 * need for a prop that just forwards a string.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'

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

const root = ref<HTMLElement | null>(null)
const segments = ref<HTMLButtonElement[]>([])

const activeIndex = computed(() =>
  props.options.findIndex((option) => option.value === model.value),
)

/** Geometry of the sliding pill, in pixels relative to the container. */
const pill = ref({ left: 0, width: 0, ready: false })

function measure(): void {
  const button = segments.value[activeIndex.value]
  if (!button || props.columns) {
    pill.value = { ...pill.value, ready: false }
    return
  }
  // `offsetParent` is the `relative` container, so these already account for its
  // 4px padding — no need to add it back.
  pill.value = { left: button.offsetLeft, width: button.offsetWidth, ready: true }
}

onMounted(measure)
watch([activeIndex, () => props.options, () => props.size, () => props.columns], measure, {
  flush: 'post',
})
// Catches container resizes and, importantly, the reflow when a webfont loads.
useResizeObserver(root, measure)

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
    ref="root"
    role="radiogroup"
    class="relative rounded-lg bg-surface-2 p-0.5"
    :class="columns ? 'grid gap-0.5' : 'inline-flex'"
    :style="columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined"
    @keydown="onKeydown"
  >
    <!-- The sliding pill. Row mode only; the grid layout fills the active cell
         directly, because a pill can't travel sensibly across wrapped rows. -->
    <span
      v-if="pill.ready"
      class="absolute inset-y-0.5 left-0 rounded-md bg-surface shadow-sm ring-1 ring-line transition-[translate,width] duration-200 ease-out-soft"
      :style="{ translate: `${pill.left}px 0`, width: `${pill.width}px` }"
      aria-hidden="true"
    />

    <button
      v-for="option in options"
      ref="segments"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      :title="option.title"
      :disabled="option.disabled"
      class="relative z-10 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
      :class="[
        size === 'sm' ? 'h-6 px-2.5 text-xs' : 'h-7 px-3 text-sm',
        model === option.value ? 'text-ink' : 'text-ink-soft not-disabled:hover:text-ink',
        columns && model === option.value && 'bg-surface shadow-sm ring-1 ring-line',
      ]"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
