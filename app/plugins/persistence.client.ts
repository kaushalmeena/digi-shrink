import { watch } from 'vue'

import { hydrateSettings } from '~/lib/presets'
import {
  emptyLifetimeStats,
  LIFETIME_STATS_KEY,
  useLifetimeStats,
} from '~/composables/useLifetimeStats'
import { SETTINGS_STORAGE_KEY, useSettings } from '~/composables/useSettings'
import { THEME_STORAGE_KEY, useThemeMode } from '~/composables/useThemeMode'
import { defineNuxtPlugin } from '#imports'
import type { LifetimeStats } from '~/composables/useLifetimeStats'
import type { ThemeMode } from '~/composables/useThemeMode'

/**
 * Centralised `localStorage` persistence.
 *
 * Doing this in one plugin rather than inside each composable means:
 *  - state is hydrated exactly once, before the app mounts, so no component
 *    ever renders with defaults and then flips;
 *  - the watchers live in the app's own effect scope instead of a component's,
 *    so they can't be torn down early or registered twice;
 *  - every composable stays free of storage and lifecycle concerns.
 *
 * All reads and writes are defensive: private browsing, a full quota, or a
 * corrupted value must never stop the app from working.
 */

function read<T>(key: string, fallback: T, revive?: (raw: unknown) => T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return revive ? revive(parsed) : (parsed as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage blocked. Preferences simply won't persist.
  }
}

export default defineNuxtPlugin(() => {
  const { settings } = useSettings()
  const { stats } = useLifetimeStats()
  const { mode, systemPrefersDark } = useThemeMode()

  /* ---- Hydrate ---------------------------------------------------------- */

  // `hydrateSettings` reconciles the stored object against the current schema,
  // so preferences saved by an older build can never break this one. Safe to
  // apply before hydration because everything that shows settings renders
  // client-only (the settings bar is wrapped in `<ClientOnly>`).
  settings.value = read(SETTINGS_STORAGE_KEY, settings.value, hydrateSettings)
  stats.value = read<LifetimeStats>(LIFETIME_STATS_KEY, emptyLifetimeStats(), (raw) => ({
    ...emptyLifetimeStats(),
    ...(raw as Partial<LifetimeStats>),
  }))

  const storedTheme = read<ThemeMode>(THEME_STORAGE_KEY, 'system')
  mode.value = ['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'system'

  /* ---- Theme: track the OS preference live ------------------------------ */

  const query = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = query.matches
  query.addEventListener('change', (event) => {
    systemPrefersDark.value = event.matches
  })

  const { resolved } = useThemeMode()
  watch(
    resolved,
    (theme) => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      // Keeps the mobile browser chrome in step with the app's background.
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#0c0c0d' : '#fafafa')
    },
    { immediate: true },
  )

  /* ---- Persist ---------------------------------------------------------- */

  watch(mode, (value) => write(THEME_STORAGE_KEY, value))
  watch(settings, (value) => write(SETTINGS_STORAGE_KEY, value), { deep: true })
  watch(stats, (value) => write(LIFETIME_STATS_KEY, value), { deep: true })
})
