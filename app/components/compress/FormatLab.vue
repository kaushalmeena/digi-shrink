<script setup lang="ts">
/**
 * The "format lab": encode one image to every format at the current quality and
 * show what each one actually costs.
 *
 * This exists because format advice on the web is all rules of thumb, and rules
 * of thumb are wrong often enough to matter — AVIF usually wins, but on flat
 * graphics and small images PNG or WebP frequently beat it. Measuring the real
 * image takes a few seconds and removes the guesswork.
 */
import { computed, ref } from 'vue'

import { FlaskConical, Trophy } from '@lucide/vue'
import { FORMAT_META } from '~/lib/constants'
import { formatBytes, formatDuration, formatPercent, savingsPercent } from '~/lib/format'
import { useCompressor } from '~/composables/useCompressor'
import { useSettings } from '~/composables/useSettings'
import type { OutputFormat, QueueItem } from '~/lib/types'

const props = defineProps<{ item: QueueItem }>()

const { probeFormats } = useCompressor()
const { settings } = useSettings()

const CANDIDATES: OutputFormat[] = ['webp', 'avif', 'jpeg', 'png']

const isRunning = ref(false)

/** Smallest first — the ranking is the whole point of the table. */
const ranked = computed(() => [...props.item.candidates].sort((a, b) => a.size - b.size))
const winner = computed(() => ranked.value[0] ?? null)

async function run(): Promise<void> {
  isRunning.value = true
  try {
    await probeFormats(props.item.id, CANDIDATES)
  } finally {
    isRunning.value = false
  }
}
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-start gap-3">
      <UiIconBadge tone="berry" size="sm" shape="squircle">
        <FlaskConical />
      </UiIconBadge>

      <div class="min-w-0 flex-1">
        <h3 class="font-display text-base font-bold">Format lab</h3>
        <p class="mt-0.5 text-xs/snug text-ink-soft">
          Encode this image to all four formats at
          {{ settings.mode === 'lossless' ? 'lossless' : `quality ${settings.quality}` }} and
          compare the real numbers.
        </p>
      </div>
    </div>

    <UiButton
      v-if="ranked.length === 0"
      variant="secondary"
      size="sm"
      :loading="isRunning"
      block
      @click="run"
    >
      <FlaskConical class="size-4" />
      Run the comparison
    </UiButton>

    <div class="disclose" :data-open="ranked.length > 0" :inert="!(ranked.length > 0)">
      <div>
        <div class="overflow-x-auto rounded-xl edge-soft">
          <table class="w-full min-w-104 border-collapse text-left text-xs">
            <thead>
              <tr class="bg-surface-2">
                <th scope="col" class="px-3 py-2.5 eyebrow text-ink-soft">Format</th>
                <th scope="col" class="px-3 py-2.5 text-right eyebrow text-ink-soft">Size</th>
                <th scope="col" class="px-3 py-2.5 text-right eyebrow text-ink-soft">
                  vs original
                </th>
                <th scope="col" class="px-3 py-2.5 text-right eyebrow text-ink-soft">Time</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="candidate in ranked"
                :key="candidate.format"
                class="border-t-2 border-line transition-colors"
                :class="candidate === winner ? 'bg-mint-wash' : 'bg-surface'"
              >
                <th scope="row" class="px-3 py-2.5 font-bold text-ink">
                  <span class="flex items-center gap-1.5">
                    <Trophy
                      v-if="candidate === winner"
                      class="size-3.5 shrink-0 text-mint-strong"
                      aria-label="Smallest"
                    />
                    {{ FORMAT_META[candidate.format].label }}
                  </span>
                </th>
                <td class="px-3 py-2.5 text-right font-bold text-ink" data-numeric>
                  {{ formatBytes(candidate.size) }}
                </td>
                <td class="px-3 py-2.5 text-right" data-numeric>
                  <span
                    :class="
                      savingsPercent(item.originalSize, candidate.size) > 0
                        ? 'font-bold text-mint-strong'
                        : 'text-danger-strong'
                    "
                  >
                    {{ savingsPercent(item.originalSize, candidate.size) > 0 ? '−' : '+'
                    }}{{
                      formatPercent(Math.abs(savingsPercent(item.originalSize, candidate.size)), 1)
                    }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-right text-ink-soft" data-numeric>
                  {{ formatDuration(candidate.durationMs) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="ranked.length > 0" class="flex items-center gap-2">
      <p v-if="winner" class="flex-1 text-2xs/snug text-ink-soft">
        <strong class="text-ink">{{ FORMAT_META[winner.format].label }}</strong> wins for this
        image.
        {{ FORMAT_META[winner.format].blurb }}
      </p>

      <UiButton variant="ghost" size="sm" :loading="isRunning" @click="run">Re-measure</UiButton>
    </div>
  </section>
</template>
