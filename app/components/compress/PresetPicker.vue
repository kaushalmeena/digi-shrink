<script setup lang="ts">
/**
 * One-click presets.
 *
 * These exist so the advanced panel is genuinely optional: the seven chips here
 * cover the cases people actually arrive with, and each one states its trade-off
 * in plain language rather than in codec jargon.
 */
import { Check } from '@lucide/vue'

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

    <div class="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <button
        v-for="(preset, index) in presets"
        :key="preset.id"
        type="button"
        :aria-pressed="activePresetId === preset.id"
        class="group relative flex flex-col items-start gap-1 rounded-xl edge bg-surface p-3 text-left sticker"
        :class="[
          TONE_RING[preset.accent],
          activePresetId === preset.id ? 'bg-accent-wash pop-2' : 'pop-1',
        ]"
        :style="{ '--stagger-index': index }"
        @click="usePreset(preset.id)"
      >
        <span class="flex w-full items-center gap-1.5">
          <span class="flex-1 font-display text-sm font-bold text-ink">{{ preset.label }}</span>

          <!-- Selection is marked by an icon as well as a colour shift, so it
               never depends on colour alone. -->
          <Transition name="pop">
            <UiIconBadge v-if="activePresetId === preset.id" tone="accent" size="sm">
              <Check />
            </UiIconBadge>
          </Transition>
        </span>

        <span class="text-2xs leading-snug text-ink-soft">{{ preset.blurb }}</span>
      </button>
    </div>
  </section>
</template>
