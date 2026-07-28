<script setup lang="ts">
/**
 * Label + control + hint wrapper.
 *
 * Labels in this system are bold, uppercase and wide-tracked. Centralising that
 * here keeps every form row identical and guarantees the `for`/`id` pairing that
 * screen readers need.
 */
import { computed } from 'vue'

const props = defineProps<{
  label: string
  /** Explanatory text under the control. Wired up via `aria-describedby`. */
  hint?: string
  /** Right-aligned live value, e.g. the current quality number. */
  value?: string | number
  /** Pass the control's `id` so the label points at it. */
  for?: string
}>()

const hintId = computed(() => (props.hint && props.for ? `${props.for}-hint` : undefined))
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-baseline justify-between gap-3">
      <label :for="props.for" class="eyebrow text-ink-soft">{{ label }}</label>
      <span
        v-if="value !== undefined"
        data-numeric
        class="font-display text-sm font-bold text-accent"
      >
        {{ value }}
      </span>
    </div>

    <slot :hint-id="hintId" />

    <p v-if="hint" :id="hintId" class="text-xs leading-snug text-ink-soft">
      {{ hint }}
    </p>
  </div>
</template>
