<script setup lang="ts">
/**
 * The batch action bar: run, cancel, export, clear.
 *
 * Export offers a folder picker where the browser supports one, because saving
 * 40 images into a chosen folder beats 40 separate downloads or an unzip step.
 * A ZIP is always offered too, since that's the only option in Safari and
 * Firefox.
 */
import {
  Download,
  FolderDown,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from '@lucide/vue'
import { createZip } from '~/lib/zip'
import { downloadBlob, saveAllToDirectory, supportsDirectorySave } from '~/lib/download'
import { formatEta } from '~/lib/format'

const {
  items,
  isRunning,
  pending,
  completed,
  canCompress,
  overallProgress,
  msPerItem,
  compressAll,
  cancel,
  clear,
  clearCompleted,
  requeueAll,
  collectOutputs,
} = useCompressor()

const toasts = useToasts()

const isExporting = ref(false)
const canSaveToFolder = ref(false)
onMounted(() => {
  canSaveToFolder.value = supportsDirectorySave()
})

const eta = computed(() =>
  isRunning.value ? formatEta(pending.value.length, msPerItem.value) : '',
)

async function downloadZip(): Promise<void> {
  const entries = collectOutputs()
  if (entries.length === 0) return

  isExporting.value = true
  try {
    const stamp = new Date().toISOString().slice(0, 10)
    const zip = await createZip(entries)
    downloadBlob(zip, `digicompress-${stamp}.zip`)
    toasts.success(`Zipped ${entries.length} image${entries.length === 1 ? '' : 's'}.`)
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
  <div class="sticky bottom-4 z-30">
    <UiCard tone="ink" :depth="3" flush class="overflow-hidden">
      <!-- Progress rail sits flush against the card's top edge while running. -->
      <Transition name="collapse">
        <div v-if="isRunning" class="border-b-2 border-[var(--color-outline)]">
          <UiProgressBar
            :value="overallProgress"
            size="sm"
            label="Overall compression progress"
            class="!rounded-none !border-0"
          />
        </div>
      </Transition>

      <div class="flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <UiButton
          v-if="!isRunning"
          size="md"
          :disabled="!canCompress"
          @click="compressAll"
        >
          <Play class="h-4 w-4 stroke-[2.5]" />
          Compress
          <template v-if="pending.length > 0">
            <span data-numeric>{{ pending.length }}</span>
          </template>
        </UiButton>

        <UiButton v-else variant="danger" size="md" @click="cancel">
          <X class="h-4 w-4 stroke-[2.5]" />
          Stop
        </UiButton>

        <span
          v-if="isRunning"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft"
        >
          <Loader2 class="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
          <span data-numeric>{{ completed.length }} / {{ items.length }}</span>
          <span v-if="eta" data-numeric>· {{ eta }}</span>
        </span>

        <div class="mx-auto" />

        <template v-if="completed.length > 0">
          <UiButton
            v-if="canSaveToFolder"
            variant="secondary"
            size="md"
            :loading="isExporting"
            @click="saveToFolder"
          >
            <FolderDown class="h-4 w-4 stroke-[2.5]" />
            Save to folder
          </UiButton>

          <UiButton variant="sun" size="md" :loading="isExporting" @click="downloadZip">
            <Download class="h-4 w-4 stroke-[2.5]" />
            <span class="hidden sm:inline">Download</span> ZIP
            <span data-numeric>({{ completed.length }})</span>
          </UiButton>
        </template>

        <UiButton
          v-if="completed.length > 0 && !isRunning"
          variant="ghost"
          size="md"
          title="Compress everything again with the current settings"
          @click="requeueAll"
        >
          <Sparkles class="h-4 w-4 stroke-[2.5]" />
          <span class="hidden md:inline">Re-run</span>
        </UiButton>

        <UiButton
          v-if="completed.length > 0"
          variant="ghost"
          size="md"
          icon-only
          aria-label="Clear finished images from the queue"
          title="Clear finished"
          @click="clearCompleted"
        >
          <RotateCcw class="h-4 w-4 stroke-[2.5]" />
        </UiButton>

        <UiButton
          variant="ghost"
          size="md"
          icon-only
          aria-label="Remove all images from the queue"
          title="Clear everything"
          @click="clear"
        >
          <Trash2 class="h-4 w-4 stroke-[2.5]" />
        </UiButton>
      </div>
    </UiCard>
  </div>
</template>
