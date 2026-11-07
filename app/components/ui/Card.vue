<script setup lang="ts">
/**
 * A bordered surface. No shadow, no tone — grouping is done with a hairline.
 */
withDefaults(defineProps<{ flush?: boolean; as?: string }>(), { as: 'div' })
</script>

<template>
  <component :is="as" class="rounded-xl border bg-surface" :class="!flush && 'p-4 sm:p-5'">
    <slot />
  </component>
</template>
