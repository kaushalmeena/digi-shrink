<script setup lang="ts">
/**
 * A clamped numeric input with stepper buttons.
 *
 * Values are clamped on `change` rather than on every keystroke, so typing
 * `1920` into a field that currently reads `5` isn't fought by a clamp firing
 * after the first character.
 */
import { Minus, Plus } from '@lucide/vue'

const model = defineModel<number>({ required: true })

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    /** Unit shown inside the field, e.g. `px`. */
    suffix?: string
    disabled?: boolean
    id?: string
    ariaLabel?: string
  }>(),
  { min: 1, max: 99_999, step: 1 },
)

const clamp = (value: number) => Math.min(props.max, Math.max(props.min, value))

function commit(raw: number): void {
  model.value = Number.isFinite(raw) ? clamp(Math.round(raw)) : props.min
}

function nudge(direction: 1 | -1): void {
  commit(model.value + direction * props.step)
}
</script>

<template>
  <div
    class="flex h-11 items-center gap-1 rounded-lg edge bg-surface px-1 transition-shadow duration-200 focus-within:shadow-[4px_4px_0_0_var(--color-accent)]"
    :class="disabled && 'pointer-events-none opacity-45'"
  >
    <button
      type="button"
      class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
      :disabled="model <= min"
      :aria-label="`Decrease ${ariaLabel ?? 'value'}`"
      @click="nudge(-1)"
    >
      <Minus class="h-4 w-4 stroke-3" />
    </button>

    <input
      :id="id"
      :value="model"
      type="number"
      inputmode="numeric"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="ariaLabel"
      data-numeric
      class="min-w-0 flex-1 border-0 bg-transparent text-center text-sm font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      @change="commit(Number(($event.target as HTMLInputElement).value))"
    />

    <span v-if="suffix" class="shrink-0 pr-0.5 text-2xs font-bold text-ink-soft">{{ suffix }}</span>

    <button
      type="button"
      class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
      :disabled="model >= max"
      :aria-label="`Increase ${ariaLabel ?? 'value'}`"
      @click="nudge(1)"
    >
      <Plus class="h-4 w-4 stroke-3" />
    </button>
  </div>
</template>
