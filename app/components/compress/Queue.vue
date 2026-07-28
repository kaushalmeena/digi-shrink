<script setup lang="ts">
/**
 * The image list.
 *
 * `TransitionGroup` with a `queue-move` class is what makes removals feel
 * considered — the rows below slide up into the gap (Vue's FLIP) instead of
 * snapping. The wrapper is `relative` because leaving rows are taken out of
 * flow so the survivors can close the gap smoothly.
 *
 * Sorting is applied to a copy, never in place, so the underlying queue order
 * (and therefore the order results are exported in) stays stable.
 */
import { computed, ref, watch } from 'vue'

import { ArrowDownWideNarrow } from '@lucide/vue'
import { savingsPercent } from '~/lib/format'
import { useCompressor } from '~/composables/useCompressor'
import type { ItemStatus, SegmentOption } from '~/lib/types'

const emit = defineEmits<{ compare: [id: string] }>()

const { items, completed, failed, pending } = useCompressor()

type Filter = 'all' | 'queued' | 'done' | 'error'
type Sort = 'added' | 'savings' | 'size'

const filter = ref<Filter>('all')
const sort = ref<Sort>('added')

const FILTERS = computed<SegmentOption<Filter>[]>(() => [
  { value: 'all', label: `All ${items.value.length}` },
  {
    value: 'queued',
    label: `Queued ${pending.value.length}`,
    disabled: pending.value.length === 0,
  },
  {
    value: 'done',
    label: `Done ${completed.value.length}`,
    disabled: completed.value.length === 0,
  },
  { value: 'error', label: `Failed ${failed.value.length}`, disabled: failed.value.length === 0 },
])

const SORTS: SegmentOption<Sort>[] = [
  { value: 'added', label: 'Added', title: 'Keep the order images were added' },
  { value: 'savings', label: 'Savings', title: 'Biggest reduction first' },
  { value: 'size', label: 'Size', title: 'Largest original first' },
]

const MATCHES: Record<Filter, (status: ItemStatus) => boolean> = {
  all: () => true,
  queued: (status) => status === 'queued' || status === 'working',
  done: (status) => status === 'done',
  error: (status) => status === 'error',
}

const visible = computed(() => {
  const filtered = items.value.filter((item) => MATCHES[filter.value](item.status))
  if (sort.value === 'added') return filtered

  return [...filtered].sort((a, b) => {
    if (sort.value === 'size') return b.originalSize - a.originalSize
    // Unfinished items sort last rather than being treated as zero savings.
    const aSaved = a.result ? savingsPercent(a.originalSize, a.result.size) : -Infinity
    const bSaved = b.result ? savingsPercent(b.originalSize, b.result.size) : -Infinity
    return bSaved - aSaved
  })
})

// A filter that empties out (e.g. "Failed" after a retry succeeds) would leave
// the user staring at nothing, so fall back to showing everything.
watch(visible, (rows) => {
  if (rows.length === 0 && filter.value !== 'all' && items.value.length > 0) {
    filter.value = 'all'
  }
})
</script>

<template>
  <section aria-labelledby="queue-heading" class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <h2 id="queue-heading" class="eyebrow text-ink-soft">Your images</h2>

      <UiSegmented
        v-model="filter"
        :options="FILTERS"
        aria-label="Filter images by status"
        size="sm"
      />

      <div class="ml-auto flex items-center gap-2">
        <ArrowDownWideNarrow class="h-3.5 w-3.5 text-ink-soft" aria-hidden="true" />
        <UiSegmented v-model="sort" :options="SORTS" aria-label="Sort images" size="sm" />
      </div>
    </div>

    <TransitionGroup name="queue" tag="div" class="relative space-y-3">
      <CompressQueueRow
        v-for="(item, index) in visible"
        :key="item.id"
        :item="item"
        :index="index"
        @compare="emit('compare', $event)"
      />
    </TransitionGroup>
  </section>
</template>
