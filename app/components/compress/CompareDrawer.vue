<script setup lang="ts">
/**
 * The before/after offcanvas.
 *
 * Wide on desktop so the comparison has room to breathe, full-width on mobile.
 * Holds three things: the numbers, the visual comparison, and the format lab.
 */
import { computed, ref, watch } from 'vue'

import { Download, ImageOff } from '@lucide/vue'
import {
  formatBytes,
  formatDimensions,
  formatMegapixels,
  formatPercent,
  savingsPercent,
} from '~/lib/format'
import { FORMAT_META } from '~/lib/constants'
import { saveBlob } from '~/lib/download'
import { useCompressor } from '~/composables/useCompressor'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ itemId: string | null }>()

const { byId, outputBlob, outputNameFor } = useCompressor()

const item = computed(() => (props.itemId ? (byId(props.itemId) ?? null) : null))

const savings = computed(() => {
  if (!item.value?.result) return 0
  return savingsPercent(item.value.originalSize, item.value.result.size)
})

/**
 * The original can only be shown if the browser can render it. HEIC in Chrome
 * decodes fine in the worker (via the WASM fallback) but has no `<img>` support,
 * so the comparison degrades to showing just the result.
 */
const canShowOriginal = ref(true)
watch(item, () => {
  canShowOriginal.value = true
})

const STAT_ROWS = computed(() => {
  const current = item.value
  if (!current?.result) return []

  return [
    {
      label: 'Original',
      value: formatBytes(current.originalSize),
      note: current.originalType.replace('image/', '').toUpperCase(),
    },
    {
      label: 'Compressed',
      value: formatBytes(current.result.size),
      note: FORMAT_META[current.result.format].label,
    },
    {
      label: 'Saved',
      value: `${savings.value > 0 ? '−' : '+'}${formatPercent(Math.abs(savings.value), 1)}`,
      note: formatBytes(Math.abs(current.originalSize - current.result.size)),
      highlight: true,
    },
    {
      label: 'Dimensions',
      value: formatDimensions(current.result.width, current.result.height),
      note: formatMegapixels(current.result.width, current.result.height),
    },
  ]
})

async function download(): Promise<void> {
  const current = item.value
  if (!current?.result) return
  const blob = outputBlob(current.id)
  if (!blob) return
  await saveBlob(blob, outputNameFor(current), current.result.mimeType)
}
</script>

<template>
  <UiOffcanvas
    v-model:open="open"
    :title="item?.name ?? 'Comparison'"
    :subtitle="
      item?.result
        ? `${FORMAT_META[item.result.format].encoder} · ${item.result.attempts} pass${item.result.attempts === 1 ? '' : 'es'}`
        : undefined
    "
    width="max-w-3xl"
  >
    <div v-if="item?.result" class="space-y-7">
      <!-- Numbers first: it's the question people actually opened this to answer. -->
      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="row in STAT_ROWS" :key="row.label" class="rounded-lg border p-3">
          <dt class="text-xs text-ink-soft">{{ row.label }}</dt>
          <dd
            class="mt-1 text-base/none font-semibold"
            :class="row.highlight ? 'text-success' : 'text-ink'"
            data-numeric
          >
            {{ row.value }}
          </dd>
          <dd class="mt-1 text-2xs text-ink-soft" data-numeric>{{ row.note }}</dd>
        </div>
      </dl>

      <CompressCompareSlider
        v-if="canShowOriginal && item.previewUrl"
        :before-src="item.previewUrl"
        :after-src="item.outputUrl"
        before-label="Original"
        :after-label="FORMAT_META[item.result.format].label"
        :alt="item.name"
        :width="item.result.width"
        :height="item.result.height"
      />

      <!-- Honest fallback rather than a broken image frame. -->
      <div v-else class="flex items-start gap-3 rounded-lg bg-warning-wash p-4 text-xs/snug">
        <ImageOff class="mt-0.5 size-4 shrink-0" />
        <p>
          This browser can't display the original
          <strong>{{ item.originalType.replace('image/', '').toUpperCase() }}</strong>
          file, so there's nothing to compare against. The compressed result is still correct — it
          was decoded by the WebAssembly decoder, not the browser.
        </p>
      </div>

      <div class="border-t pt-6">
        <CompressFormatLab :item="item" />
      </div>
    </div>

    <p v-else class="py-12 text-center text-sm text-ink-soft">
      Compress an image first to compare it.
    </p>

    <template #footer>
      <div class="flex items-center gap-3">
        <p v-if="item?.result" class="flex-1 text-2xs text-ink-soft">
          {{ outputNameFor(item) }}
        </p>

        <UiButton v-if="item?.result" size="sm" @click="download">
          <Download class="size-3.5" />
          Download
        </UiButton>
      </div>
    </template>
  </UiOffcanvas>
</template>
