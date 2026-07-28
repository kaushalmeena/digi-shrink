<script setup lang="ts">
/**
 * Full-window drop confirmation.
 *
 * Because drop handling is bound to the window, a user can release files over
 * the header, the footer, or a settings panel and it still works. Without a
 * window-wide affordance that behaviour is invisible, and people carefully aim
 * for the dropzone instead. This is the affordance.
 */
import { Download } from '@lucide/vue'
import { useFileIntake } from '~/composables/useFileIntake'

defineProps<{ count: number }>()

const { isDraggingOver } = useFileIntake()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isDraggingOver"
      class="pointer-events-none fixed inset-0 z-55 grid place-items-center bg-accent/15 p-6 backdrop-blur-sm"
      aria-hidden="true"
    >
      <div
        class="flex flex-col items-center gap-4 rounded-3xl border-4 border-dashed border-accent bg-surface/95 px-10 py-8 text-center pop-4 pop-accent"
      >
        <UiIconBadge tone="accent" size="lg" shape="squircle" outlined class="animate-wiggle">
          <Download />
        </UiIconBadge>

        <p class="font-display text-2xl font-extrabold">Drop anywhere</p>
        <p class="max-w-xs text-sm text-ink-soft">
          <template v-if="count > 0">They'll be added to your queue of {{ count }}.</template>
          <template v-else>Folders are fine — we'll dig the images out.</template>
        </p>
      </div>
    </div>
  </Transition>
</template>
