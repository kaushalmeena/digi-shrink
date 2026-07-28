<script setup lang="ts">
/**
 * Floating primitive shapes scattered behind content.
 *
 * This is the "wild decoration" half of the system's stable-grid-wild-decoration
 * idea. Every shape is `aria-hidden`, purely positional, and hidden below the
 * `sm` breakpoint — on a narrow screen these would sit under the text and hurt
 * legibility, which the design system explicitly calls out.
 *
 * The float animation is disabled wholesale by the global reduced-motion rule.
 */
type ShapeKind = 'circle' | 'ring' | 'triangle' | 'square' | 'squiggle' | 'plus'
type Tone = 'accent' | 'berry' | 'sun' | 'mint'

export interface ConfettiShape {
  kind: ShapeKind
  tone: Tone
  /** CSS length or percentage, e.g. `12%` or `-2rem`. */
  top?: string
  left?: string
  right?: string
  bottom?: string
  /** Pixel size of the shape's bounding box. */
  size?: number
  rotate?: number
  /** Staggers the float animation so shapes don't move in lockstep. */
  delay?: number
  opacity?: number
}

withDefaults(defineProps<{ shapes: ConfettiShape[]; animate?: boolean }>(), { animate: true })

const TONE_CLASS: Record<Tone, string> = {
  accent: 'text-accent-bright',
  berry: 'text-berry',
  sun: 'text-sun',
  mint: 'text-mint',
}
</script>

<template>
  <div class="decor-layer hidden sm:block" aria-hidden="true">
    <div
      v-for="(shape, index) in shapes"
      :key="index"
      class="absolute"
      :class="[TONE_CLASS[shape.tone], animate && 'animate-float']"
      :style="{
        top: shape.top,
        left: shape.left,
        right: shape.right,
        bottom: shape.bottom,
        width: `${shape.size ?? 48}px`,
        height: `${shape.size ?? 48}px`,
        opacity: shape.opacity ?? 1,
        transform: `rotate(${shape.rotate ?? 0}deg)`,
        animationDelay: `${shape.delay ?? index * 0.7}s`,
      }"
    >
      <svg
        viewBox="0 0 48 48"
        class="h-full w-full"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle
          v-if="shape.kind === 'circle'"
          cx="24"
          cy="24"
          r="20"
          fill="currentColor"
          stroke="none"
        />
        <circle v-else-if="shape.kind === 'ring'" cx="24" cy="24" r="19" />
        <path
          v-else-if="shape.kind === 'triangle'"
          d="M24 5 44 41H4Z"
          fill="currentColor"
          stroke="none"
        />
        <rect
          v-else-if="shape.kind === 'square'"
          x="5"
          y="5"
          width="38"
          height="38"
          rx="8"
          fill="currentColor"
          stroke="none"
        />
        <path v-else-if="shape.kind === 'squiggle'" d="M3 30c6-14 12 14 18 0s12 14 18 0" />
        <path v-else-if="shape.kind === 'plus'" d="M24 8v32M8 24h32" />
      </svg>
    </div>
  </div>
</template>
