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
    <!--
      Client-only: the values come from `localStorage`, which the prerendered
      HTML can't know. Rendering defaults first and swapping in the saved ones
      would flash; rendering saved ones during hydration would mismatch. The
      fallback mirrors both rows so nothing shifts when the real bar arrives.
    -->
    <ClientOnly>
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
          <span id="format-label" class="label-caps max-sm:sr-only">Format</span>
          <UiSegmented
            v-model="settings.format"
            :options="FORMATS"
            aria-labelledby="format-label"
            size="sm"
          />
        </div>

        <div class="flex min-w-56 flex-1 items-center gap-2">
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

      <template #fallback>
        <div class="flex items-center gap-3 border-b px-4 py-2.5" aria-hidden="true">
          <span class="label-caps">Preset</span>
          <span class="h-7 w-32 rounded-md bg-surface-2" />
          <span class="ml-auto h-7 w-28 rounded-md bg-surface-2" />
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-2.5" aria-hidden="true">
          <div class="flex items-center gap-2">
            <span class="label-caps max-sm:sr-only">Format</span>
            <span class="h-7 w-64 rounded-lg bg-surface-2 sm:w-72" />
          </div>
          <div class="flex h-7 min-w-56 flex-1 items-center gap-2">
            <span class="label-caps">Quality</span>
            <span class="h-1 flex-1 rounded-full bg-surface-3" />
          </div>
        </div>
      </template>
    </ClientOnly>
  </section>
</template>
