import { computed } from 'vue'
import { useState } from '#imports'

export const LIFETIME_STATS_KEY = 'digicompress:lifetime'

export interface LifetimeStats {
  /** Images successfully compressed, ever. */
  images: number
  /** Total input bytes seen. */
  originalBytes: number
  /** Total output bytes produced. */
  outputBytes: number
  /** ISO date of the first recorded run, for the "since …" label. */
  since: string
}

export function emptyLifetimeStats(): LifetimeStats {
  return { images: 0, originalBytes: 0, outputBytes: 0, since: '' }
}

/**
 * A running total across every session, kept in `localStorage`.
 *
 * Purely a bit of delight — "you've saved 1.4 GB so far" makes the tool feel
 * worth returning to. It stores three integers and a date, and nothing about it
 * ever leaves the browser.
 */
export function useLifetimeStats() {
  const stats = useState<LifetimeStats>(LIFETIME_STATS_KEY, emptyLifetimeStats)

  const savedBytes = computed(() =>
    Math.max(0, stats.value.originalBytes - stats.value.outputBytes),
  )

  const savedPercent = computed(() => {
    if (stats.value.originalBytes <= 0) return 0
    return (savedBytes.value / stats.value.originalBytes) * 100
  })

  function record(originalSize: number, outputSize: number): void {
    if (!stats.value.since) {
      stats.value.since = new Date().toISOString()
    }
    stats.value.images += 1
    stats.value.originalBytes += originalSize
    stats.value.outputBytes += outputSize
  }

  function reset(): void {
    stats.value = emptyLifetimeStats()
  }

  return { stats, savedBytes, savedPercent, record, reset }
}
