<script setup lang="ts">
/** A thin determinate progress rail. */
defineProps<{ value: number; label?: string }>()
</script>

<template>
  <div
    class="h-1 w-full overflow-hidden rounded-full bg-surface-3"
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="Math.round(value * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
      :style="{ width: `${Math.min(100, Math.max(0, value * 100))}%` }"
    />
  </div>
</template>
