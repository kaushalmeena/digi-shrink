<script setup lang="ts">
/**
 * One image in the queue.
 *
 * Shows the whole lifecycle in place — queued, working with a live stage label,
 * done with the size delta, or failed with the reason — so nothing about a batch
 * is hidden behind a separate view.
 *
 * The row also carries a per-image quality override, because in practice one
 * photo in a batch always needs different treatment from the rest.
 */
import { computed, ref } from 'vue'

import { ChevronDown, Columns2, Download, ImageOff, Loader2, RotateCw, X } from '@lucide/vue'
import { formatBytes, formatDimensions, formatPercent, savingsPercent } from '~/lib/format'
import { FORMAT_META } from '~/lib/constants'
import { saveBlob } from '~/lib/download'
import { useCompressor } from '~/composables/useCompressor'
import { useSettings } from '~/composables/useSettings'
import type { QueueItem } from '~/lib/types'

const props = defineProps<{ item: QueueItem }>()
const emit = defineEmits<{ compare: [id: string] }>()

const { removeItem, setDimensions, setQualityOverride, compressOne, outputBlob, outputNameFor } =
  useCompressor()
const { settings } = useSettings()

const isExpanded = ref(false)
/** Set when the preview `<img>` fails — e.g. HEIC in a browser that can't show it. */
const previewFailed = ref(false)

const savings = computed(() =>
  props.item.result ? savingsPercent(props.item.originalSize, props.item.result.size) : 0,
)

/** Positive savings are the happy path; a grown file is flagged. */
const savingsTone = computed(() => {
  if (!props.item.result || props.item.result.usedOriginal) return 'text-ink-soft'
  return savings.value > 0 ? 'text-success' : 'text-danger'
})

const savingsLabel = computed(() => {
  const result = props.item.result
  if (!result) return ''
  if (result.usedOriginal) return 'Kept original'
  return savings.value > 0
    ? `−${formatPercent(savings.value, 0)}`
    : `+${formatPercent(-savings.value, 0)}`
})

/**
 * The effective quality for this row, whether overridden or inherited.
 *
 * Writes go through the composable rather than mutating the `item` prop, so the
 * queue remains the only owner of item state.
 */
const effectiveQuality = computed({
  get: () => props.item.qualityOverride ?? settings.value.quality,
  set: (value: number) => setQualityOverride(props.item.id, value),
})

function onPreviewLoad(event: Event): void {
  const img = event.target as HTMLImageElement
  setDimensions(props.item.id, img.naturalWidth, img.naturalHeight)
}

async function download(): Promise<void> {
  const blob = outputBlob(props.item.id)
  if (!blob || !props.item.result) return
  await saveBlob(blob, outputNameFor(props.item), props.item.result.mimeType)
}

function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value
}

function compare(): void {
  emit('compare', props.item.id)
}

function remove(): void {
  removeItem(props.item.id)
}

function resetQuality(): void {
  setQualityOverride(props.item.id, null)
}

function onPreviewError(): void {
  previewFailed.value = true
}

async function rerun(): Promise<void> {
  await compressOne(props.item.id)
}
</script>

<template>
  <li class="group">
    <div class="flex items-center gap-3 px-4 py-2.5">
      <!-- Thumbnail. Doubles as the source of the intrinsic dimensions. -->
      <div
        class="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md checker"
      >
        <img
          v-if="item.previewUrl && !previewFailed"
          :src="item.outputUrl || item.previewUrl"
          :alt="`Preview of ${item.name}`"
          loading="lazy"
          decoding="async"
          class="size-full object-cover"
          @load="onPreviewLoad"
          @error="onPreviewError"
        />
        <ImageOff v-else class="size-4 text-ink-faint" />
      </div>

      <!-- Name + numbers -->
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm text-ink" :title="item.name">{{ item.name }}</p>

        <p class="mt-0.5 truncate text-xs text-ink-soft" data-numeric>
          <template v-if="item.status === 'error'">
            <span class="text-danger">{{ item.error }}</span>
          </template>
          <template v-else>
            {{ formatBytes(item.originalSize) }}
            <template v-if="item.result">
              → <span class="text-ink">{{ formatBytes(item.result.size) }}</span> ·
              {{ FORMAT_META[item.result.format].label }}
            </template>
            <template v-if="item.width">
              ·
              {{
                formatDimensions(
                  item.result?.width ?? item.width,
                  item.result?.height ?? item.height,
                )
              }}
            </template>
          </template>
        </p>
      </div>

      <!-- Status -->
      <div class="w-24 shrink-0 text-right text-sm" data-numeric>
        <span v-if="item.result" :class="savingsTone">{{ savingsLabel }}</span>
        <span
          v-else-if="item.status === 'working'"
          class="inline-flex items-center gap-1.5 text-xs text-ink-soft"
        >
          <Loader2 class="size-3.5 animate-spin" />
          {{ item.stage || 'Working' }}
        </span>
        <span v-else-if="item.status === 'error'" class="text-xs text-danger">Failed</span>
        <span v-else class="text-xs text-ink-faint">Queued</span>
      </div>

      <!-- Actions. Quiet until the row is hovered or focused; always shown on
           touch, where there is no hover. -->
      <div
        class="flex shrink-0 items-center transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0 [@media(hover:none)]:opacity-100"
      >
        <UiButton
          variant="ghost"
          size="sm"
          icon-only
          :disabled="!item.result"
          :aria-label="`Compare before and after for ${item.name}`"
          title="Compare"
          @click="compare"
        >
          <Columns2 class="size-4" />
        </UiButton>

        <UiButton
          variant="ghost"
          size="sm"
          icon-only
          :disabled="!item.result"
          :aria-label="`Download compressed ${item.name}`"
          title="Download"
          @click="download"
        >
          <Download class="size-4" />
        </UiButton>

        <UiButton
          variant="ghost"
          size="sm"
          icon-only
          :aria-label="`${isExpanded ? 'Hide' : 'Show'} options for ${item.name}`"
          :aria-expanded="isExpanded"
          title="Options"
          @click="toggleExpanded"
        >
          <ChevronDown
            class="size-4 transition-transform duration-200"
            :class="isExpanded && 'rotate-180'"
          />
        </UiButton>

        <UiButton
          variant="ghost"
          size="sm"
          icon-only
          :aria-label="`Remove ${item.name}`"
          title="Remove"
          @click="remove"
        >
          <X class="size-4" />
        </UiButton>
      </div>
    </div>

    <!--
      Per-image overrides. Always mounted and toggled by `data-open` so the
      height animation is symmetrical; `inert` keeps the collapsed controls out
      of the tab order.
    -->
    <div class="disclose" :data-open="isExpanded" :inert="!isExpanded">
      <div>
        <div class="bg-surface-2/60 px-4 py-3 sm:pl-17">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div class="flex-1">
              <UiField
                label="Quality for this image"
                :value="
                  item.qualityOverride === null ? `${effectiveQuality} (global)` : effectiveQuality
                "
                :hint="
                  settings.mode !== 'quality'
                    ? `Not used in ${settings.mode === 'lossless' ? 'lossless' : 'target size'} mode.`
                    : undefined
                "
                :for="`quality-${item.id}`"
              >
                <template #default="{ hintId }">
                  <UiSlider
                    :id="`quality-${item.id}`"
                    v-model="effectiveQuality"
                    :min="1"
                    :max="100"
                    :described-by="hintId"
                    :disabled="settings.mode !== 'quality'"
                  />
                </template>
              </UiField>
            </div>

            <div class="flex shrink-0 gap-1.5">
              <UiButton
                v-if="item.qualityOverride !== null"
                variant="ghost"
                size="sm"
                @click="resetQuality"
              >
                Reset
              </UiButton>

              <UiButton
                variant="secondary"
                size="sm"
                :loading="item.status === 'working'"
                @click="rerun"
              >
                <RotateCw class="size-3.5" />
                {{ item.result ? 'Re-compress' : 'Compress' }}
              </UiButton>
            </div>
          </div>

          <p v-if="item.result" class="mt-3 text-xs text-ink-soft" data-numeric>
            {{ item.result.encoder }} · {{ item.result.attempts }} pass{{
              item.result.attempts === 1 ? '' : 'es'
            }}
            · {{ Math.round(item.result.durationMs) }} ms
          </p>
        </div>
      </div>
    </div>
  </li>
</template>
