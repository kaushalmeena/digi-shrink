<script setup lang="ts">
/**
 * The primary drop target.
 *
 * Drag events are bound at the *window* level (see `useFileIntake`), not here —
 * dropping anywhere on the page works, which is what people actually try. This
 * component is the visible affordance for that, and it also handles the two
 * other paths in: the file picker and a paste hint.
 */
import { onMounted, ref } from 'vue'

import { ClipboardPaste, FolderOpen, ImagePlus, Layers } from '@lucide/vue'
import { ACCEPT_ATTRIBUTE } from '~/lib/constants'
import { useFileIntake } from '~/composables/useFileIntake'
import type { ConfettiShape } from '~/components/decor/Confetti.vue'

defineProps<{ compact: boolean }>()

const { isDraggingOver, pickFiles } = useFileIntake()

/** ⌘ on Apple platforms, Ctrl everywhere else. */
const pasteKey = ref('Ctrl')
onMounted(() => {
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) pasteKey.value = '⌘'
})

const SHAPES: ConfettiShape[] = [
  { kind: 'ring', tone: 'berry', top: '-8%', left: '4%', size: 78, opacity: 0.55 },
  { kind: 'triangle', tone: 'sun', bottom: '6%', left: '9%', size: 34, rotate: 18, delay: 1.2 },
  { kind: 'squiggle', tone: 'mint', top: '14%', right: '6%', size: 62, delay: 0.5 },
  {
    kind: 'square',
    tone: 'accent',
    bottom: '-6%',
    right: '12%',
    size: 44,
    rotate: -12,
    opacity: 0.5,
    delay: 1.8,
  },
  { kind: 'plus', tone: 'berry', top: '52%', right: '3%', size: 26, delay: 2.4 },
]
</script>

<template>
  <div
    class="relative overflow-hidden rounded-3xl edge bg-surface transition-[background-color,box-shadow,transform] duration-300 ease-(--ease-bounce)"
    :class="
      isDraggingOver
        ? 'scale-101 bg-accent-wash pop-4 pop-accent'
        : 'pop-4 pop-soft hover:pop-berry'
    "
  >
    <!-- Dot grid, per the design system's "spacious but filled with pattern". -->
    <div class="decor-layer pattern-dots opacity-70" aria-hidden="true" />
    <DecorConfetti :shapes="SHAPES" />

    <!-- Dashed inner rule reads as "put something here" without a second border. -->
    <div
      class="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed transition-colors duration-300"
      :class="isDraggingOver ? 'border-accent' : 'border-(--color-line)'"
      aria-hidden="true"
    />

    <div
      class="relative z-10 flex flex-col items-center text-center transition-[padding] duration-300"
      :class="compact ? 'px-6 py-8' : 'px-6 py-14 sm:py-20'"
    >
      <UiIconBadge
        :tone="isDraggingOver ? 'accent' : 'sun'"
        :size="compact ? 'md' : 'lg'"
        shape="squircle"
        outlined
        wiggle
        class="transition-transform duration-300 ease-(--ease-bounce)"
        :class="isDraggingOver && 'scale-110 -rotate-6'"
      >
        <Layers v-if="isDraggingOver" />
        <ImagePlus v-else />
      </UiIconBadge>

      <h2 class="mt-5" :class="compact ? 'text-xl' : 'text-2xl sm:text-4xl'">
        <template v-if="isDraggingOver">Let go — we've got it</template>
        <template v-else>
          Drop images to
          <span class="marker-underline">squeeze</span>
        </template>
      </h2>

      <p v-if="!compact" class="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        JPEG, PNG, WebP, AVIF, GIF, BMP and HEIC. Drop a whole folder if you like — everything is
        processed right here in your browser.
      </p>

      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <UiButton :size="compact ? 'md' : 'lg'" @click="pickFiles(ACCEPT_ATTRIBUTE)">
          <FolderOpen class="h-4 w-4" />
          Choose images
        </UiButton>

        <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          <ClipboardPaste class="h-3.5 w-3.5" />
          or press
          <kbd
            class="rounded-md border-2 border-(--color-line) bg-surface-2 px-1.5 py-0.5 font-mono text-2xs font-bold text-ink"
          >
            {{ pasteKey }}V
          </kbd>
          to paste
        </span>
      </div>
    </div>
  </div>
</template>
