<script setup lang="ts">
/**
 * The wordmark: a frame with a smaller block inside it — the image, shrunk.
 */
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <span class="grid size-6 shrink-0 place-items-center rounded-md bg-ink text-canvas">
      <svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
        <rect
          x="2"
          y="2"
          width="12"
          height="12"
          rx="2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-dasharray="3 2"
        />
        <rect x="5.5" y="5.5" width="5" height="5" rx="1" fill="currentColor" />
      </svg>
    </span>
    <span class="text-sm font-semibold tracking-tight">DigiShrink</span>
  </span>
</template>
