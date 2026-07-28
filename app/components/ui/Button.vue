<script setup lang="ts">
/**
 * The "candy button" — the most recognisable element in this design system.
 *
 * A pill with a chunky dark border and a hard offset shadow. On hover it lifts
 * toward the cursor and the shadow grows; on press it sinks and the shadow
 * shrinks. That lift/sink pairing is what makes it feel physical, and it all
 * comes from the shared `sticker` utility so every control behaves identically.
 */
import { computed } from 'vue'

import type { Component } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'sun'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    /** Renders as this element/component instead of `<button>`. */
    as?: string | Component
    disabled?: boolean
    /** Shows a spinner and blocks interaction. */
    loading?: boolean
    /** Square button sized for a single icon. */
    iconOnly?: boolean
    /** Stretch to the container's width. */
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    as: 'button',
    type: 'button',
  },
)

const VARIANTS: Record<Variant, string> = {
  // Violet fill, white (or dark, in dark mode) text, hard shadow.
  primary: 'bg-accent text-on-accent edge pop-2',
  // Transparent until hovered, when it floods with optimism-yellow.
  secondary: 'bg-surface text-ink edge pop-0 hover:bg-sun hover:pop-2',
  // No chrome at all — for tertiary actions inside dense rows.
  ghost:
    'bg-transparent text-ink-soft border-2 border-transparent hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white edge pop-2',
  sun: 'bg-sun text-[#1e293b] edge pop-2',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  // Tall enough to stay a comfortable tap target on mobile.
  lg: 'h-14 px-7 text-base gap-2.5',
}

const ICON_SIZES: Record<Size, string> = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-14',
}

const isInert = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'relative inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold',
  'select-none whitespace-nowrap sticker',
  VARIANTS[props.variant],
  props.iconOnly ? ICON_SIZES[props.size] : SIZES[props.size],
  props.block && 'w-full',
  isInert.value && 'pointer-events-none opacity-45 saturate-50',
])
</script>

<template>
  <component
    :is="as"
    :class="classes"
    :type="as === 'button' ? type : undefined"
    :disabled="as === 'button' ? isInert : undefined"
    :aria-disabled="as === 'button' ? undefined : isInert"
    :aria-busy="loading || undefined"
  >
    <!-- The spinner replaces the label rather than sitting beside it, so the
         button never changes width mid-action. -->
    <span v-if="loading" class="absolute inset-0 grid place-items-center" aria-hidden="true">
      <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </span>

    <span
      class="inline-flex items-center justify-center"
      :class="[loading && 'invisible', !iconOnly && 'gap-2']"
    >
      <slot />
    </span>
  </component>
</template>
