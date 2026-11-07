<script setup lang="ts">
/**
 * The settings people actually change, always on screen: preset, format and
 * quality. Everything else is one click away in the advanced panel.
 *
 * Because adding files starts compression immediately, this sits *above* the
 * drop zone — the decision is made before the drop, not after.
 */
import { computed } from 'vue'

import { SlidersHorizontal } from '@lucide/vue'
import { useSettings } from '~/composables/useSettings'
import type { SegmentOption, TargetFormat } from '~/lib/types'

const emit = defineEmits<{ openAdvanced: [] }>()

const { settings, presets, activePresetId, summary, usePreset } = useSettings()

const FORMATS: SegmentOption<TargetFormat>[] = [
  { value: 'auto', label: 'Auto', title: 'Try several formats and keep the smallest' },
  { value: 'original', label: 'Same', title: 'Keep each file in its own format' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
]

const presetId = computed({
  get: () => activePresetId.value ?? 'custom',
  set: (id: string) => {
    if (id !== 'custom') usePreset(id)
  },
})

const presetBlurb = computed(
  () => presets.find((preset) => preset.id === activePresetId.value)?.blurb ?? null,
)

/** One line describing the current choice: the preset's own blurb, or a recap. */
const note = computed(() => presetBlurb.value ?? `Custom settings: ${summary.value}`)

/** What to show in place of the slider when quality isn't the active knob. */
const modeNote = computed(() => {
  if (settings.value.mode === 'lossless') return 'Lossless'
  if (settings.value.mode === 'target-size') return `Target ≤ ${settings.value.targetSizeKb} KB`
  return null
})

function openAdvanced(): void {
  emit('openAdvanced')
}
</script>

<template>
  <section aria-label="Compression settings" class="rounded-xl border bg-surface">
    <!-- Row 1: what you're getting. -->
    <div class="flex items-center gap-3 border-b px-4 py-2.5">
      <label class="flex shrink-0 items-center gap-2">
        <span class="label-caps">Preset</span>
        <select
          v-model="presetId"
          class="h-7 rounded-md border border-line-strong bg-surface pr-7 pl-2 text-sm text-ink"
        >
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.label }}
          </option>
          <option value="custom" disabled>Custom</option>
        </select>
      </label>

      <p class="hidden min-w-0 flex-1 truncate text-xs text-ink-soft sm:block" :title="note">
        {{ note }}
      </p>

      <UiButton variant="ghost" size="sm" class="-mr-1.5 ml-auto" @click="openAdvanced">
        <SlidersHorizontal class="size-3.5" />
        More options
      </UiButton>
    </div>

    <!-- Row 2: the two knobs people actually turn. -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-2.5">
      <div class="flex items-center gap-2">
        <span id="format-label" class="label-caps">Format</span>
        <UiSegmented
          v-model="settings.format"
          :options="FORMATS"
          aria-labelledby="format-label"
          size="sm"
        />
      </div>

      <div class="flex min-w-48 flex-1 items-center gap-2">
        <template v-if="!modeNote">
          <label for="quick-quality" class="label-caps">Quality</label>
          <UiSlider id="quick-quality" v-model="settings.quality" :min="1" :max="100" />
          <span class="w-6 text-right text-sm text-ink" data-numeric>{{ settings.quality }}</span>
        </template>
        <template v-else>
          <span class="label-caps">Mode</span>
          <span class="text-sm text-ink">{{ modeNote }}</span>
        </template>
      </div>
    </div>
  </section>
</template>
