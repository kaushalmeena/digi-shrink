<script setup lang="ts">
/**
 * The "sticker card" — a white panel with a chunky border and a hard offset
 * shadow, so it reads as paper laid on top of the page rather than a region of it.
 *
 * The shadow colour is the main expressive dial: `soft` for ordinary content,
 * and a saturated `berry`/`sun`/`mint` for anything featured.
 */
type Tone = 'soft' | 'ink' | 'accent' | 'berry' | 'sun' | 'mint'
type Depth = 0 | 1 | 2 | 3 | 4

withDefaults(
  defineProps<{
    tone?: Tone
    depth?: Depth
    /** Wiggles slightly on hover. Reserve it for interactive cards. */
    interactive?: boolean
    /** Speech-bubble corners instead of an even radius. */
    bubble?: boolean
    /** Removes the default inner padding for edge-to-edge content. */
    flush?: boolean
    as?: string
  }>(),
  { tone: 'soft', depth: 4, as: 'div' },
)

const TONES: Record<Tone, string> = {
  soft: 'pop-soft',
  ink: 'pop-ink',
  accent: 'pop-accent',
  berry: 'pop-berry',
  sun: 'pop-sun',
  mint: 'pop-mint',
}

const DEPTHS: Record<Depth, string> = {
  0: 'pop-0',
  1: 'pop-1',
  2: 'pop-2',
  3: 'pop-3',
  4: 'pop-4',
}
</script>

<template>
  <component
    :is="as"
    class="relative bg-surface edge"
    :class="[
      TONES[tone],
      DEPTHS[depth],
      bubble ? 'blob-bubble' : 'rounded-2xl',
      interactive && 'sticker-tilt',
      !flush && 'p-5 sm:p-6',
    ]"
  >
    <slot />
  </component>
</template>
