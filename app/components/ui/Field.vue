<script setup lang="ts">
/**
 * Label + control + hint, with an optional live value on the right of the label.
 */
import { computed } from 'vue'

const props = defineProps<{
  label: string
  hint?: string
  value?: string | number
  for?: string
}>()

const hintId = computed(() => (props.hint && props.for ? `${props.for}-hint` : undefined))
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <label :for="props.for" class="text-xs font-medium text-ink">{{ label }}</label>
      <span v-if="value !== undefined" data-numeric class="text-xs text-ink-soft">
        {{ value }}
      </span>
    </div>

    <slot :hint-id="hintId" />

    <p v-if="hint" :id="hintId" class="text-xs/snug text-ink-soft">
      {{ hint }}
    </p>
  </div>
</template>
