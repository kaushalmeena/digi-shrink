<script setup lang="ts">
/**
 * Before/after comparison with a draggable divider.
 *
 * Interaction model, chosen so that dragging and zooming don't fight:
 *  - The **handle** is what you drag to move the divider. It has a 44px hit area
 *    and uses pointer capture, so the drag survives leaving the element.
 *  - A real `<input type="range">` sits under the image as the keyboard and
 *    coarse-control path. Arrow keys, Home/End and screen readers all work
 *    through it for free.
 *  - When zoomed past "fit", the image area becomes a scroll container, so
 *    panning is native scrolling rather than a second drag gesture.
 *
 * The clip is `inset()` on the *before* layer rather than a width change, which
 * means neither image ever reflows or re-decodes while you drag.
 */
import { computed, ref } from 'vue'

import { Columns2, Maximize2, SplitSquareHorizontal } from '@lucide/vue'
import type { SegmentOption } from '~/lib/types'

const props = defineProps<{
  beforeSrc: string
  afterSrc: string
  beforeLabel: string
  afterLabel: string
  alt: string
  /** Intrinsic size, used to lay out the zoomed view. */
  width: number
  height: number
}>()

type ViewMode = 'split' | 'sideBySide'
type Zoom = 'fit' | '1' | '2' | '4'

/** Divider position, 0–100. */
const position = ref(50)
const view = ref<ViewMode>('split')
const zoom = ref<Zoom>('fit')

const frame = ref<HTMLElement | null>(null)

const VIEWS: SegmentOption<ViewMode>[] = [
  { value: 'split', label: 'Slider' },
  { value: 'sideBySide', label: 'Side by side' },
]

const ZOOMS: SegmentOption<Zoom>[] = [
  { value: 'fit', label: 'Fit' },
  { value: '1', label: '100%' },
  { value: '2', label: '200%' },
  { value: '4', label: '400%' },
]

const scale = computed(() => (zoom.value === 'fit' ? 0 : Number(zoom.value)))

/** Explicit pixel size when zoomed; `null` means "fit the container". */
const zoomedSize = computed(() => {
  if (scale.value === 0 || !props.width) return null
  return { width: `${props.width * scale.value}px`, height: `${props.height * scale.value}px` }
})

const aspect = computed(() =>
  props.width && props.height ? `${props.width} / ${props.height}` : '4 / 3',
)

/* ---------------------------------------------------------------- dragging */

function moveTo(clientX: number): void {
  const bounds = frame.value?.getBoundingClientRect()
  if (!bounds || bounds.width === 0) return
  position.value = Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100))
}

function onHandleDown(event: PointerEvent): void {
  // Capture means we keep receiving moves even when the pointer leaves the
  // handle, which is the whole point of a drag.
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onHandleMove(event: PointerEvent): void {
  const target = event.currentTarget as HTMLElement
  if (!target.hasPointerCapture(event.pointerId)) return
  moveTo(event.clientX)
}

/** Clicking anywhere in the frame jumps the divider there. */
function onFrameClick(event: MouseEvent): void {
  if (view.value !== 'split') return
  moveTo(event.clientX)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-2">
      <UiSegmented v-model="view" :options="VIEWS" aria-label="Comparison layout" size="sm" />
      <div class="ml-auto flex items-center gap-2">
        <Maximize2 class="size-3.5 text-ink-soft" aria-hidden="true" />
        <UiSegmented v-model="zoom" :options="ZOOMS" aria-label="Zoom level" size="sm" />
      </div>
    </div>

    <Transition name="fade" mode="out-in">
      <!-- ------------------------------------------------------ Split view -->
      <div v-if="view === 'split'" key="split" class="space-y-3">
        <div
          class="relative overflow-auto overscroll-contain rounded-xl bg-surface-2 pop-2 edge pop-soft"
          :class="scale === 0 && 'overflow-hidden'"
        >
          <div
            ref="frame"
            class="relative mx-auto select-none"
            :style="
              zoomedSize
                ? { width: zoomedSize.width, height: zoomedSize.height }
                : { aspectRatio: aspect, width: '100%' }
            "
            @click="onFrameClick"
          >
            <!-- Checkerboard so transparency is visible rather than guessed at. -->
            <div class="absolute inset-0 pattern-grid opacity-40" aria-hidden="true" />

            <!-- After (compressed) sits underneath and is always fully visible. -->
            <img
              :src="afterSrc"
              :alt="`${alt} — ${afterLabel}`"
              class="absolute inset-0 size-full object-contain"
              draggable="false"
            />

            <!-- Before (original) is clipped to the left of the divider. -->
            <img
              :src="beforeSrc"
              :alt="`${alt} — ${beforeLabel}`"
              class="absolute inset-0 size-full object-contain"
              :style="{ clipPath: `inset(0 ${100 - position}% 0 0)` }"
              draggable="false"
            />

            <!-- Corner labels, each pinned to its own side. -->
            <span
              class="pointer-events-none absolute top-2 left-2 rounded-full bg-surface px-2.5 py-1 font-display text-2xs font-bold pop-1 edge"
            >
              {{ beforeLabel }}
            </span>
            <span
              class="pointer-events-none absolute top-2 right-2 rounded-full bg-accent px-2.5 py-1 font-display text-2xs font-bold text-on-accent pop-1 edge"
            >
              {{ afterLabel }}
            </span>

            <!-- Divider + grab handle -->
            <div
              class="pointer-events-none absolute inset-y-0 w-0.5 bg-(--color-outline)"
              :style="{ left: `${position}%` }"
              aria-hidden="true"
            />
            <button
              type="button"
              class="absolute top-1/2 grid size-11 -translate-1/2 cursor-ew-resize touch-none place-items-center rounded-full bg-surface pop-2 transition-transform duration-200 ease-bounce edge hover:scale-110 active:scale-95"
              :style="{ left: `${position}%` }"
              aria-label="Drag to move the comparison divider"
              @pointerdown="onHandleDown"
              @pointermove="onHandleMove"
              @click.stop
            >
              <SplitSquareHorizontal class="size-5 text-ink" />
            </button>
          </div>
        </div>

        <!-- The accessible control path: keyboard, screen reader, coarse drag. -->
        <UiField label="Divider" :value="`${Math.round(position)}%`" for="compare-position">
          <UiSlider
            id="compare-position"
            v-model="position"
            :min="0"
            :max="100"
            aria-label="Comparison divider position"
          />
        </UiField>
      </div>

      <!-- ----------------------------------------------- Side-by-side view -->
      <div v-else key="side" class="grid grid-cols-2 gap-3">
        <figure
          v-for="pane in [
            { src: beforeSrc, label: beforeLabel, tone: 'bg-surface' },
            { src: afterSrc, label: afterLabel, tone: 'bg-accent text-on-accent' },
          ]"
          :key="pane.label"
          class="space-y-2"
        >
          <div
            class="overflow-auto rounded-xl bg-surface-2 pop-2 edge pop-soft"
            :class="scale === 0 && 'overflow-hidden'"
          >
            <div
              class="relative mx-auto"
              :style="
                zoomedSize
                  ? { width: zoomedSize.width, height: zoomedSize.height }
                  : { aspectRatio: aspect, width: '100%' }
              "
            >
              <div class="absolute inset-0 pattern-grid opacity-40" aria-hidden="true" />
              <img
                :src="pane.src"
                :alt="`${alt} — ${pane.label}`"
                class="absolute inset-0 size-full object-contain"
                draggable="false"
              />
            </div>
          </div>

          <figcaption class="text-center">
            <span
              class="inline-block rounded-full px-2.5 py-1 font-display text-2xs font-bold pop-1 edge"
              :class="pane.tone"
            >
              {{ pane.label }}
            </span>
          </figcaption>
        </figure>
      </div>
    </Transition>

    <p class="flex items-center gap-1.5 text-2xs text-ink-soft">
      <Columns2 class="size-3.5 shrink-0" aria-hidden="true" />
      Zoom to 200% or more to judge fine detail — most compression artefacts are invisible at fit.
    </p>
  </div>
</template>
