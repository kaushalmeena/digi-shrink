<script setup lang="ts">
/**
 * Tweens a number toward its target instead of snapping to it.
 *
 * Used for the savings figures, where watching the number climb is most of the
 * satisfaction. Deliberately hand-rolled on `requestAnimationFrame`:
 *  - it retargets mid-flight, so a fast batch produces one continuous climb
 *    rather than a stack of competing animations;
 *  - it respects `prefers-reduced-motion` by jumping straight to the value,
 *    which a CSS-only approach can't do for text content;
 *  - the rendered text is always the formatted *current* value, so screen
 *    readers and copy/paste both see a real number.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    value: number
    /** Turns the tweened number into display text (e.g. `formatBytes`). */
    format?: (value: number) => string
    /** Tween length in ms. */
    duration?: number
  }>(),
  { duration: 650 },
)

const displayed = ref(props.value)
let frame: number | null = null

/** Ease-out cubic: fast start, gentle landing. */
const ease = (t: number) => 1 - (1 - t) ** 3

function tweenTo(target: number): void {
  if (frame !== null) cancelAnimationFrame(frame)

  const prefersReduced =
    import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /*
   * Skip the animation when the document is hidden.
   *
   * Browsers pause `requestAnimationFrame` in background tabs, so a tween
   * started there never advances and the element is left showing the *previous*
   * value — a stat reading "0 B saved" after a batch that saved megabytes. The
   * animation is decoration; the number is information, so the number wins.
   */
  if (prefersReduced || props.duration <= 0 || (import.meta.client && document.hidden)) {
    displayed.value = target
    return
  }

  const from = displayed.value
  const delta = target - from
  if (delta === 0) return

  const startedAt = performance.now()

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / props.duration)
    displayed.value = from + delta * ease(progress)

    if (progress < 1) {
      frame = requestAnimationFrame(step)
    } else {
      // Land exactly on the target so rounding never leaves it a hair short.
      displayed.value = target
      frame = null
    }
  }

  frame = requestAnimationFrame(step)
}

watch(() => props.value, tweenTo)

/*
 * A tween already in flight when the tab is backgrounded freezes partway,
 * leaving a number that is neither the old value nor the new one. Snap to the
 * target instead so the figure is correct the moment the user looks again.
 */
useEventListener(import.meta.client ? document : null, 'visibilitychange', () => {
  if (!document.hidden) return
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
  displayed.value = props.value
})

onBeforeUnmount(() => {
  if (frame !== null) cancelAnimationFrame(frame)
})

const text = computed(() =>
  props.format ? props.format(displayed.value) : Math.round(displayed.value).toLocaleString(),
)
</script>

<template>
  <span data-numeric>{{ text }}</span>
</template>
