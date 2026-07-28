<script setup lang="ts">
/**
 * One-click presets.
 *
 * These exist so the advanced panel is genuinely optional: the seven chips here
 * cover the cases people actually arrive with, and each one states its trade-off
 * in plain language rather than in codec jargon.
 */
import { Check } from '@lucide/vue'
import { useSettings } from '~/composables/useSettings'

const { presets, activePresetId, usePreset } = useSettings()

const TONE_RING = {
  accent: 'pop-accent',
  berry: 'pop-berry',
  sun: 'pop-sun',
  mint: 'pop-mint',
} as const
</script>

<template>
  <section aria-labelledby="presets-heading">
    <div class="mb-3 flex items-baseline gap-3">
      <h2 id="presets-heading" class="eyebrow text-ink-soft">Start from a preset</h2>
      <DecorSquiggle tone="line" class="hidden h-2 flex-1 sm:block" />
    </div>

    <div class="grid stagger grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <button
        v-for="(preset, index) in presets"
        :key="preset.id"
        type="button"
        :aria-pressed="activePresetId === preset.id"
        class="group relative flex sticker flex-col items-start gap-1 rounded-xl p-3 text-left edge"
        :class="[
          TONE_RING[preset.accent],
          // Both background states live here. Leaving a `bg-surface` in the
          // static class list would make this a coin-flip: competing Tailwind
          // utilities are resolved by stylesheet order, not attribute order.
          activePresetId === preset.id ? 'bg-accent-wash pop-2' : 'bg-surface pop-1',
        ]"
        :style="{ '--stagger-index': index }"
        @click="usePreset(preset.id)"
      >
        <!--
          Fixed to the badge's own height (h-7). Without it the row grows when the
          check appears and the whole card jumps, which reads as a glitch on what
          should be a calm toggle.
        -->
        <span class="flex h-7 w-full items-center gap-1.5">
          <span class="flex-1 font-display text-sm font-bold text-ink">{{ preset.label }}</span>

          <!-- Selection is marked by an icon as well as a colour shift, so it
               never depends on colour alone. -->
          <Transition name="pop">
            <UiIconBadge v-if="activePresetId === preset.id" tone="accent" size="sm">
              <Check />
            </UiIconBadge>
          </Transition>
        </span>

        <span class="text-2xs/snug text-ink-soft">{{ preset.blurb }}</span>
      </button>
    </div>
  </section>
</template>
