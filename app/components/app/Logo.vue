<script setup lang="ts">
/**
 * The wordmark: Lucide's `Minimize` glyph — corners pulling inward — on an ink
 * tile.
 */
import { Minimize } from '@lucide/vue'
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <span class="grid size-6 shrink-0 place-items-center rounded-md bg-ink text-canvas">
      <Minimize class="size-3.5 stroke-2" aria-hidden="true" />
    </span>
    <span class="text-sm font-semibold tracking-tight">DigiShrink</span>
  </span>
</template>
