<script setup lang="ts">
/**
 * A chunky toggle. The knob slides on the bouncy easing so it overshoots
 * slightly before settling — the same motion language as the buttons.
 */
const model = defineModel<boolean>({ required: true })

defineProps<{
  label: string
  /** Secondary line under the label. */
  hint?: string
  disabled?: boolean
}>()
</script>

<template>
  <label
    class="group flex cursor-pointer items-start gap-3"
    :class="disabled && 'cursor-not-allowed opacity-45'"
  >
    <!-- A real checkbox stays in the accessibility tree and handles keyboard
         activation; the visual switch is painted from its :checked state. -->
    <input v-model="model" type="checkbox" :disabled="disabled" class="peer sr-only" />

    <span
      class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full edge bg-surface-2 transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      aria-hidden="true"
    >
      <span
        class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-surface shadow-[1px_1px_0_0_var(--color-shade)] transition-transform duration-300 ease-(--ease-bounce) peer-checked:translate-x-5 group-hover:scale-110"
        :class="model && 'translate-x-5'"
      />
    </span>

    <span class="min-w-0 flex-1">
      <span class="block text-sm font-semibold text-ink">{{ label }}</span>
      <span v-if="hint" class="mt-0.5 block text-xs leading-snug text-ink-soft">{{ hint }}</span>
    </span>
  </label>
</template>
