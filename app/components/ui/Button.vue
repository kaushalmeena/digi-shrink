<script setup lang="ts">
/**
 * The one button.
 *
 * `primary` is reserved for the single next step on screen (Compress, Download);
 * everything else is `secondary` or `ghost`, so the eye always knows where to go.
 */
import { computed } from 'vue'

import type { Component } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    as?: string | Component
    disabled?: boolean
    loading?: boolean
    iconOnly?: boolean
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
  primary: 'bg-accent text-on-accent hover:brightness-110',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  danger: 'text-danger hover:bg-danger-wash',
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-1.5',
  lg: 'h-10 px-4 text-sm gap-2',
}

const ICON_SIZES: Record<Size, string> = {
  sm: 'size-7',
  md: 'size-8',
  lg: 'size-10',
}

const isInert = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'relative inline-flex shrink-0 items-center justify-center rounded-md font-medium',
  'select-none whitespace-nowrap transition-[background-color,color,filter] duration-150',
  VARIANTS[props.variant],
  props.iconOnly ? ICON_SIZES[props.size] : SIZES[props.size],
  props.block && 'w-full',
  isInert.value && 'pointer-events-none opacity-50',
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
      <span
        class="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
      />
    </span>

    <span
      class="inline-flex items-center justify-center"
      :class="[loading && 'invisible', !iconOnly && 'gap-1.5']"
    >
      <slot />
    </span>
  </component>
</template>
