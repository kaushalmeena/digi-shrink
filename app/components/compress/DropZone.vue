<script setup lang="ts">
/**
 * The empty-state drop target.
 *
 * Drag events are bound at the *window* level (see `useFileIntake`), so this is
 * only the visible affordance — the whole box is also a button that opens the
 * file picker, which is the path people take when they don't have files to drag.
 */
import { onMounted, ref } from 'vue'

import { ImageUp } from '@lucide/vue'
import { ACCEPT_ATTRIBUTE } from '~/lib/constants'
import { useFileIntake } from '~/composables/useFileIntake'

const { isDraggingOver, pickFiles } = useFileIntake()

/** ⌘ on Apple platforms, Ctrl everywhere else. */
const pasteKey = ref('Ctrl+')
onMounted(() => {
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) pasteKey.value = '⌘'
})

function choose(): void {
  pickFiles(ACCEPT_ATTRIBUTE)
}
</script>

<template>
  <button
    type="button"
    class="group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors duration-150 sm:py-24"
    :class="
      isDraggingOver
        ? 'border-accent bg-accent-wash'
        : 'border-line-strong bg-surface hover:border-ink-faint hover:bg-surface-2/50'
    "
    @click="choose"
  >
    <ImageUp class="size-7 text-ink-faint transition-colors group-hover:text-ink-soft" />

    <span class="mt-4 text-base font-medium text-ink"> Drop images or a folder here </span>

    <span class="mt-1 text-sm text-ink-soft">
      or <span class="text-accent underline-offset-2 group-hover:underline">browse files</span>
      · paste with
      <kbd class="rounded-sm border bg-surface-2 px-1 font-sans text-xs text-ink"
        >{{ pasteKey }}V</kbd
      >
    </span>

    <span class="mt-6 text-xs text-ink-faint">
      JPEG · PNG · WebP · AVIF · GIF · BMP · HEIC — up to 250 at once
    </span>
  </button>
</template>
