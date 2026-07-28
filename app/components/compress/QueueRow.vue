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

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Columns2,
  Download,
  ImageOff,
  Loader2,
  RotateCw,
  Sliders,
  X,
} from '@lucide/vue'
import { formatBytes, formatDimensions, formatPercent, savingsPercent } from '~/lib/format'
import { FORMAT_META } from '~/lib/constants'
import { saveBlob } from '~/lib/download'
import { useCompressor } from '~/composables/useCompressor'
import { useSettings } from '~/composables/useSettings'
import { useToasts } from '~/composables/useToasts'
import type { QueueItem } from '~/lib/types'

const props = defineProps<{ item: QueueItem; index: number }>()
const emit = defineEmits<{ compare: [id: string] }>()

const { removeItem, setDimensions, setQualityOverride, compressOne, outputBlob, outputNameFor } =
  useCompressor()
const { settings } = useSettings()
const toasts = useToasts()

const isExpanded = ref(false)
/** Set when the preview `<img>` fails — e.g. HEIC in a browser that can't show it. */
const previewFailed = ref(false)

const savings = computed(() =>
  props.item.result ? savingsPercent(props.item.originalSize, props.item.result.size) : 0,
)

/** Positive savings are the happy path; a grown file is worth flagging in berry. */
const savingsTone = computed(() => {
  if (!props.item.result) return 'neutral' as const
  if (props.item.result.usedOriginal) return 'sun' as const
  return savings.value > 0 ? ('mint' as const) : ('berry' as const)
})

const STATUS_TONE = {
  queued: 'neutral',
  working: 'accent',
  done: 'mint',
  skipped: 'sun',
  error: 'danger',
} as const

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

async function rerun(): Promise<void> {
  await compressOne(props.item.id)
  if (props.item.status === 'done') toasts.success(`Re-compressed ${props.item.name}.`)
}
</script>

<template>
  <UiCard
    :depth="2"
    :tone="item.status === 'error' ? 'berry' : 'soft'"
    flush
    class="overflow-hidden"
  >
    <div class="flex items-center gap-3 p-3">
      <!-- Thumbnail. Doubles as the source of the intrinsic dimensions, so the
           preview we already render pays for the metadata too. -->
      <div
        class="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg edge bg-surface-2 pattern-dots-dense sm:h-16 sm:w-16"
      >
        <img
          v-if="item.previewUrl && !previewFailed"
          :src="item.outputUrl || item.previewUrl"
          :alt="`Preview of ${item.name}`"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover"
          @load="onPreviewLoad"
          @error="previewFailed = true"
        />
        <ImageOff v-else class="h-5 w-5 text-ink-soft" />

        <!-- Working overlay: the bar lives on the thumbnail so the row height
             doesn't change when a batch starts. -->
        <Transition name="fade">
          <div
            v-if="item.status === 'working'"
            class="absolute inset-0 grid place-items-center bg-accent/80 backdrop-blur-[2px]"
          >
            <Loader2 class="h-5 w-5 animate-spin stroke-3 text-on-accent" />
          </div>
        </Transition>
      </div>

      <!-- Identity + numbers -->
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-bold text-ink" :title="item.name">{{ item.name }}</p>

        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-soft">
          <span data-numeric>{{ formatBytes(item.originalSize) }}</span>

          <template v-if="item.result">
            <span aria-hidden="true">→</span>
            <span class="font-bold text-ink" data-numeric>
              {{ formatBytes(item.result.size) }}
            </span>
          </template>

          <span v-if="item.width" data-numeric>
            ·
            {{
              formatDimensions(item.result?.width ?? item.width, item.result?.height ?? item.height)
            }}
          </span>

          <span v-if="item.result" class="font-semibold">· {{ item.result.encoder }}</span>
        </div>

        <!-- Live stage label while working, error text when failed. -->
        <Transition name="collapse">
          <p
            v-if="item.status === 'working' && item.stage"
            class="mt-1.5 text-2xs font-semibold text-accent"
          >
            {{ item.stage }}…
          </p>
          <p
            v-else-if="item.status === 'error'"
            class="mt-1.5 flex items-start gap-1 text-2xs leading-snug font-semibold text-danger"
          >
            <AlertTriangle class="mt-px h-3 w-3 shrink-0 stroke-3" />
            {{ item.error }}
          </p>
        </Transition>
      </div>

      <!-- Result badge -->
      <div class="hidden shrink-0 sm:block">
        <Transition name="pop" mode="out-in">
          <UiBadge
            v-if="item.result"
            :key="item.result.size"
            :tone="savingsTone"
            outlined
            size="md"
          >
            <Check v-if="!item.result.usedOriginal && savings > 0" class="h-3 w-3 stroke-3" />
            <span data-numeric>
              <template v-if="item.result.usedOriginal">already optimal</template>
              <template v-else-if="savings > 0">−{{ formatPercent(savings, 1) }}</template>
              <template v-else>+{{ formatPercent(-savings, 1) }}</template>
            </span>
          </UiBadge>

          <UiBadge v-else :tone="STATUS_TONE[item.status]" size="md">
            {{ item.status === 'working' ? 'compressing' : item.status }}
          </UiBadge>
        </Transition>
      </div>

      <!-- Actions -->
      <div class="flex shrink-0 items-center gap-1">
        <UiButton
          v-if="item.result"
          variant="ghost"
          size="sm"
          icon-only
          :aria-label="`Compare before and after for ${item.name}`"
          title="Before / after"
          @click="emit('compare', item.id)"
        >
          <Columns2 class="h-4 w-4" />
        </UiButton>

        <UiButton
          v-if="item.result"
          variant="ghost"
          size="sm"
          icon-only
          :aria-label="`Download compressed ${item.name}`"
          title="Download"
          @click="download"
        >
          <Download class="h-4 w-4" />
        </UiButton>

        <UiButton
          variant="ghost"
          size="sm"
          icon-only
          :aria-label="`${isExpanded ? 'Hide' : 'Show'} options for ${item.name}`"
          :aria-expanded="isExpanded"
          title="Per-image options"
          @click="isExpanded = !isExpanded"
        >
          <component
            :is="item.status === 'queued' ? Sliders : ChevronDown"
            class="h-4 w-4 transition-transform duration-300"
            :class="isExpanded && item.status !== 'queued' && 'rotate-180'"
          />
        </UiButton>

        <UiButton
          variant="ghost"
          size="sm"
          icon-only
          :aria-label="`Remove ${item.name} from the queue`"
          title="Remove"
          @click="removeItem(item.id)"
        >
          <X class="h-4 w-4" />
        </UiButton>
      </div>
    </div>

    <!-- Per-image overrides -->
    <Transition name="collapse">
      <div v-if="isExpanded" class="grid">
        <div class="border-t-2 border-(--color-line) bg-surface-2 p-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div class="flex-1">
              <UiField
                label="Quality for this image"
                :value="
                  item.qualityOverride === null
                    ? `${effectiveQuality} (inherited)`
                    : effectiveQuality
                "
                :hint="
                  item.qualityOverride === null
                    ? 'Following the global setting. Move the slider to override it.'
                    : 'Overriding the global setting for this image only.'
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

            <div class="flex shrink-0 gap-2">
              <UiButton
                v-if="item.qualityOverride !== null"
                variant="ghost"
                size="sm"
                @click="setQualityOverride(item.id, null)"
              >
                Reset
              </UiButton>

              <UiButton
                variant="secondary"
                size="sm"
                :loading="item.status === 'working'"
                @click="rerun"
              >
                <RotateCw class="h-4 w-4" />
                {{ item.result ? 'Re-compress' : 'Compress' }}
              </UiButton>
            </div>
          </div>

          <p v-if="settings.mode !== 'quality'" class="mt-3 text-2xs font-semibold text-ink-soft">
            Per-image quality is unavailable in
            {{ settings.mode === 'lossless' ? 'lossless' : 'target size' }} mode.
          </p>

          <dl
            v-if="item.result"
            class="mt-4 grid grid-cols-2 gap-3 border-t-2 border-(--color-line) pt-3 text-2xs sm:grid-cols-4"
          >
            <div>
              <dt class="eyebrow text-ink-soft">Format</dt>
              <dd class="mt-0.5 font-bold text-ink">{{ FORMAT_META[item.result.format].label }}</dd>
            </div>
            <div>
              <dt class="eyebrow text-ink-soft">Encoder</dt>
              <dd class="mt-0.5 font-bold text-ink">{{ item.result.encoder }}</dd>
            </div>
            <div>
              <dt class="eyebrow text-ink-soft">Passes</dt>
              <dd class="mt-0.5 font-bold text-ink" data-numeric>{{ item.result.attempts }}</dd>
            </div>
            <div>
              <dt class="eyebrow text-ink-soft">Took</dt>
              <dd class="mt-0.5 font-bold text-ink" data-numeric>
                {{ Math.round(item.result.durationMs) }}ms
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Transition>
  </UiCard>
</template>
