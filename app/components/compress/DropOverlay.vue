<script setup lang="ts">
/**
 * Full-window drop confirmation.
 *
 * Drop handling is bound to the window, so releasing files anywhere works.
 * This makes that visible, so nobody has to aim for a particular box.
 */
import { useFileIntake } from '~/composables/useFileIntake'

defineProps<{ count: number }>()

const { isDraggingOver } = useFileIntake()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isDraggingOver"
      class="pointer-events-none fixed inset-0 z-55 bg-canvas/70 p-3 backdrop-blur-[2px]"
      aria-hidden="true"
    >
      <div
        class="grid size-full place-items-center rounded-2xl border-2 border-dashed border-accent bg-accent-wash/60"
      >
        <div class="text-center">
          <p class="text-lg font-semibold">Drop to compress</p>
          <p class="mt-1 text-sm text-ink-soft">
            <template v-if="count > 0">Adds to the {{ count }} already here.</template>
            <template v-else>Files or whole folders.</template>
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
