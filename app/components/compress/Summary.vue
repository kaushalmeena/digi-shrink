<script setup lang="ts">
/**
 * The batch at a glance, plus the one thing to do next.
 *
 * The primary action follows the batch through its life: nothing while it
 * runs (just Stop), then Download. Downloading one image saves the file itself
 * rather than a one-entry ZIP.
 */
import { computed, onMounted, ref } from 'vue'

import { Download, FolderDown, Plus, RefreshCw, Trash2 } from '@lucide/vue'
import { ACCEPT_ATTRIBUTE } from '~/lib/constants'
import { downloadBlob, saveAllToDirectory, saveBlob, supportsDirectorySave } from '~/lib/download'
import { formatBytes, formatEta, formatPercent } from '~/lib/format'
import { useCompressor } from '~/composables/useCompressor'
import { useFileIntake } from '~/composables/useFileIntake'
import { useToasts } from '~/composables/useToasts'

const {
  items,
  isRunning,
  pending,
  completed,
  failed,
  stale,
  stats,
  overallProgress,
  msPerItem,
  compressAll,
  cancel,
  clear,
  requeue,
  collectOutputs,
  outputBlob,
  outputNameFor,
} = useCompressor()
const { pickFiles } = useFileIntake()
const toasts = useToasts()

const isExporting = ref(false)
const canSaveToFolder = ref(false)
onMounted(() => {
  canSaveToFolder.value = supportsDirectorySave()
})

const eta = computed(() =>
  isRunning.value ? formatEta(pending.value.length, msPerItem.value) : '',
)

const headline = computed(() => {
  if (stats.value.count === 0) return isRunning.value ? 'Compressing…' : 'Paused'
  if (stats.value.savedBytes <= 0) return 'No savings'
  return `${formatPercent(stats.value.savedPercent, 0)} smaller`
})

const detail = computed(() => {
  const parts = [`${items.value.length} image${items.value.length === 1 ? '' : 's'}`]
  if (stats.value.count > 0) {
    parts.push(
      `${formatBytes(stats.value.originalBytes)} → ${formatBytes(stats.value.outputBytes)}`,
    )
    if (stats.value.savedBytes > 0) parts.push(`${formatBytes(stats.value.savedBytes)} saved`)
  }
  if (stats.value.unchanged > 0) parts.push(`${stats.value.unchanged} already optimal`)
  if (failed.value.length > 0) parts.push(`${failed.value.length} failed`)
  if (!isRunning.value && pending.value.length > 0) parts.push(`${pending.value.length} waiting`)
  return parts.join(' · ')
})

const downloadLabel = computed(() =>
  completed.value.length === 1 ? 'Download' : `Download all (${completed.value.length})`,
)

function addMore(): void {
  pickFiles(ACCEPT_ATTRIBUTE)
}

function resume(): void {
  void compressAll()
}

function recompressStale(): void {
  for (const item of stale.value) requeue(item.id)
  void compressAll()
}

async function download(): Promise<void> {
  if (completed.value.length === 1) {
    const item = completed.value[0]!
    const blob = outputBlob(item.id)
    if (blob && item.result) await saveBlob(blob, outputNameFor(item), item.result.mimeType)
    return
  }

  const entries = collectOutputs()
  if (entries.length === 0) return

  isExporting.value = true
  try {
    // Loaded on demand: most visits never build a ZIP.
    const { createZip } = await import('~/lib/zip')
    const stamp = new Date().toISOString().slice(0, 10)
    downloadBlob(await createZip(entries), `digishrink-${stamp}.zip`)
  } catch (error) {
    toasts.error(error instanceof Error ? error.message : 'Could not build the ZIP.')
  } finally {
    isExporting.value = false
  }
}

async function saveToFolder(): Promise<void> {
  const entries = collectOutputs()
  if (entries.length === 0) return

  isExporting.value = true
  try {
    const written = await saveAllToDirectory(entries)
    // `null` means the user closed the picker, which needs no feedback.
    if (written !== null) {
      toasts.success(`Saved ${written} image${written === 1 ? '' : 's'} to your folder.`)
    }
  } catch (error) {
    toasts.error(error instanceof Error ? error.message : 'Could not write to that folder.')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <section
    aria-labelledby="summary-heading"
    class="sticky top-14 z-30 overflow-hidden rounded-xl border bg-surface/95 backdrop-blur-md"
  >
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
      <div class="min-w-56 flex-1" aria-live="polite">
        <h2
          id="summary-heading"
          class="text-lg"
          :class="stats.savedBytes > 0 ? 'text-success' : 'text-ink'"
          data-numeric
        >
          {{ headline }}
        </h2>
        <p class="mt-0.5 text-xs text-ink-soft" data-numeric>{{ detail }}</p>
      </div>

      <div class="flex items-center gap-1.5">
        <UiButton
          variant="ghost"
          size="md"
          icon-only
          aria-label="Add more images"
          title="Add more"
          @click="addMore"
        >
          <Plus class="size-4" />
        </UiButton>

        <UiButton
          variant="ghost"
          size="md"
          icon-only
          aria-label="Remove all images"
          title="Clear all"
          @click="clear"
        >
          <Trash2 class="size-4" />
        </UiButton>

        <UiButton v-if="isRunning" variant="secondary" size="md" @click="cancel">Stop</UiButton>

        <UiButton v-else-if="pending.length > 0" size="md" @click="resume">
          Compress {{ pending.length }}
        </UiButton>

        <template v-else-if="completed.length > 0">
          <UiButton
            v-if="canSaveToFolder && completed.length > 1"
            variant="secondary"
            size="md"
            :loading="isExporting"
            @click="saveToFolder"
          >
            <FolderDown class="size-4" />
            <span class="hidden sm:inline">Save to folder</span>
          </UiButton>

          <UiButton size="md" :loading="isExporting" @click="download">
            <Download class="size-4" />
            {{ downloadLabel }}
          </UiButton>
        </template>
      </div>
    </div>

    <!-- Progress, only while running. -->
    <div class="disclose" :data-open="isRunning">
      <div>
        <div class="flex items-center gap-3 px-4 pb-3">
          <UiProgressBar :value="overallProgress" label="Overall progress" class="flex-1" />
          <span class="shrink-0 text-xs text-ink-soft" data-numeric>
            {{ completed.length }} / {{ items.length }}<template v-if="eta"> · {{ eta }}</template>
          </span>
        </div>
      </div>
    </div>

    <!-- Settings changed after compressing: offer to bring results up to date. -->
    <div
      class="disclose"
      :data-open="!isRunning && stale.length > 0"
      :inert="isRunning || stale.length === 0"
    >
      <div>
        <div
          class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t bg-accent-wash px-4 py-2 text-xs text-ink"
        >
          <span class="flex-1">
            Settings changed — {{ stale.length }} result{{ stale.length === 1 ? ' is' : 's are' }}
            out of date.
          </span>
          <UiButton variant="secondary" size="sm" @click="recompressStale">
            <RefreshCw class="size-3.5" />
            Re-compress
          </UiButton>
        </div>
      </div>
    </div>
  </section>
</template>
