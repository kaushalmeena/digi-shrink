<script setup lang="ts">
/**
 * A toggle backed by a real checkbox, so keyboard and assistive tech get native
 * behaviour; the track is painted from its `:checked` state.
 */
const model = defineModel<boolean>({ required: true })

defineProps<{
  label: string
  hint?: string
  disabled?: boolean
}>()
</script>

<template>
  <label
    class="flex items-start gap-3"
    :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
  >
    <input v-model="model" type="checkbox" :disabled="disabled" class="peer sr-only" />

    <span
      class="relative mt-px h-4.5 w-8 shrink-0 rounded-full bg-surface-3 transition-colors duration-150 peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      aria-hidden="true"
    >
      <span
        class="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white shadow-sm transition-transform duration-150"
        :class="model && 'translate-x-3.5'"
      />
    </span>

    <span class="min-w-0 flex-1">
      <span class="block text-sm text-ink">{{ label }}</span>
      <span v-if="hint" class="mt-0.5 block text-xs/snug text-ink-soft">{{ hint }}</span>
    </span>
  </label>
</template>
