<script setup lang="ts">
/**
 * The app. One page, because the whole product is one task:
 * pick settings → drop images → download.
 *
 * - **Empty** — the settings bar and a large drop target. Nothing else
 *   competes for attention.
 * - **Working** — the drop target gives way to a summary (with the next action)
 *   and the file list. Dropping more anywhere on the window adds to the batch;
 *   compression starts by itself.
 */
import { computed, onMounted, ref } from 'vue'
import { onKeyStroke, useOnline } from '@vueuse/core'

import { useCompressor } from '~/composables/useCompressor'
import { useFileIntake } from '~/composables/useFileIntake'

const { hasItems, items } = useCompressor()
const { attach } = useFileIntake()

const settingsOpen = ref(false)
const compareOpen = ref(false)
const compareId = ref<string | null>(null)

const isOnline = useOnline()
const isOffline = computed(() => !isOnline.value)

onMounted(attach)

function openCompare(id: string): void {
  compareId.value = id
  compareOpen.value = true
}

function openSettings(): void {
  settingsOpen.value = true
}

/* Keyboard: `S` toggles the advanced settings, unless the user is typing. */
function isTyping(): boolean {
  const active = document.activeElement
  if (!active) return false
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active as HTMLElement).isContentEditable
  )
}

onKeyStroke(['s', 'S'], (event) => {
  if (isTyping() || compareOpen.value || event.metaKey || event.ctrlKey) return
  event.preventDefault()
  settingsOpen.value = !settingsOpen.value
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader :offline="isOffline" />

    <main class="shell flex-1 py-6 sm:py-10">
      <!--
        Title only in the empty state; once there's work, the work is the title.
        It collapses (rather than vanishing) so the settings bar glides up into
        its place instead of jumping.
      -->
      <div class="disclose" :data-open="!hasItems" :inert="hasItems">
        <div>
          <div class="pb-7">
            <h1 class="text-2xl">Compress images</h1>
            <p class="mt-2 max-w-[65ch] text-base text-ink-soft">
              Choose your settings, then drop images. They're compressed right here in your browser
              with real codecs — MozJPEG, OxiPNG, WebP and AVIF.
            </p>
          </div>
        </div>
      </div>

      <CompressSettingsBar @open-advanced="openSettings" />

      <!--
        Drop zone ↔ working view is a cross-fade in place (`swap`): the leaving
        view is lifted out of flow while it fades, so the incoming one appears
        immediately where it was, with no empty frame between them.
      -->
      <div class="relative mt-3">
        <Transition name="swap">
          <CompressDropZone v-if="!hasItems" />

          <div v-else class="space-y-3">
            <CompressSummary />
            <CompressQueue @compare="openCompare" />
          </div>
        </Transition>
      </div>
    </main>

    <AppFooter />

    <!-- Offcanvas panels live at the page root so their teleport target and
         focus management are never nested inside a transitioning subtree. -->
    <CompressSettingsDrawer v-model:open="settingsOpen" />
    <CompressCompareDrawer v-model:open="compareOpen" :item-id="compareId" />

    <CompressDropOverlay :count="items.length" />
  </div>
</template>
