import { computed } from 'vue'

import { PRESETS, applyPreset, DEFAULT_SETTINGS } from '~/lib/presets'
import { describeSettings } from '~/lib/image'
import { FORMAT_META } from '~/lib/constants'
import { useState } from '#imports'
import type { CompressionSettings, OutputFormat } from '~/lib/types'

export const SETTINGS_STORAGE_KEY = 'digishrink:settings'

/**
 * The active compression settings.
 *
 * Shared through `useState` so the offcanvas panel, the queue rows and the
 * compare view all read and write one object. Persistence is handled centrally
 * by the `persistence` client plugin, which keeps this composable free of
 * storage and lifecycle concerns.
 */
export function useSettings() {
  const settings = useState<CompressionSettings>(SETTINGS_STORAGE_KEY, () => ({
    ...DEFAULT_SETTINGS,
  }))

  /** Which preset (if any) the current settings still match exactly. */
  const activePresetId = computed(() => {
    const match = PRESETS.find((preset) => {
      const candidate = applyPreset(settings.value, preset.settings)
      return JSON.stringify(candidate) === JSON.stringify(settings.value)
    })
    return match?.id ?? null
  })

  /** One-line summary for collapsed UI, e.g. `WebP · q78 · fit 1920×1920`. */
  const summary = computed(() => describeSettings(settings.value))

  /**
   * The format whose advanced options the panel should show. In `auto` mode
   * there is no single answer, so we show the first candidate's options.
   */
  const focusedFormat = computed<OutputFormat>(() => {
    if (settings.value.format === 'auto') return settings.value.autoFormats[0] ?? 'webp'
    if (settings.value.format === 'original') return 'webp'
    return settings.value.format
  })

  /** Lossless is only meaningful where the codec actually supports it. */
  const losslessAvailable = computed(() => {
    if (settings.value.format === 'original') return true
    if (settings.value.format === 'auto') {
      return settings.value.autoFormats.some((format) => FORMAT_META[format].supportsLossless)
    }
    return FORMAT_META[settings.value.format].supportsLossless
  })

  function usePreset(presetId: string): void {
    const preset = PRESETS.find((candidate) => candidate.id === presetId)
    if (!preset) return
    settings.value = applyPreset(settings.value, preset.settings)
  }

  function reset(): void {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  /** Toggle a candidate format for `auto` mode, keeping at least one selected. */
  function toggleAutoFormat(format: OutputFormat): void {
    const current = settings.value.autoFormats
    if (current.includes(format)) {
      if (current.length === 1) return
      settings.value.autoFormats = current.filter((candidate) => candidate !== format)
    } else {
      settings.value.autoFormats = [...current, format]
    }
  }

  return {
    settings,
    presets: PRESETS,
    activePresetId,
    summary,
    focusedFormat,
    losslessAvailable,
    usePreset,
    reset,
    toggleAutoFormat,
  }
}
