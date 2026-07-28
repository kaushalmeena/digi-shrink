<script setup lang="ts">
/**
 * An icon enclosed in a coloured shape.
 *
 * A rule of this design system: icons are never left floating on their own. A
 * checkmark isn't a checkmark, it's a checkmark inside a mint circle. This
 * component is the single place that rule is enforced.
 */
type Tone = 'accent' | 'berry' | 'sun' | 'mint' | 'ink' | 'danger' | 'neutral'
type Shape = 'circle' | 'squircle' | 'leaf'

withDefaults(
  defineProps<{
    tone?: Tone
    shape?: Shape
    size?: 'sm' | 'md' | 'lg'
    /** Chunky border, for badges that sit half-in/half-out of a card edge. */
    outlined?: boolean
    /** Rotates on hover — pairs well with `outlined` on feature cards. */
    wiggle?: boolean
  }>(),
  { tone: 'accent', shape: 'circle', size: 'md' },
)

const TONES: Record<Tone, string> = {
  accent: 'bg-accent text-on-accent',
  berry: 'bg-berry text-[#1e293b]',
  sun: 'bg-sun text-[#1e293b]',
  mint: 'bg-mint text-[#1e293b]',
  ink: 'bg-ink text-canvas',
  danger: 'bg-danger text-white',
  neutral: 'bg-surface-2 text-ink-soft',
}

const SIZES = {
  sm: 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
  lg: 'h-14 w-14 [&_svg]:h-7 [&_svg]:w-7',
} as const

const SHAPES: Record<Shape, string> = {
  circle: 'rounded-full',
  squircle: 'rounded-xl',
  leaf: 'blob-leaf',
}
</script>

<template>
  <span
    class="grid shrink-0 place-items-center"
    :class="[
      TONES[tone],
      SIZES[size],
      SHAPES[shape],
      outlined && 'edge',
      wiggle && 'hover:animate-wiggle',
    ]"
  >
    <slot />
  </span>
</template>
