export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'digicompress:theme'

/**
 * Light / dark / follow-the-OS.
 *
 * The class is applied to `<html>` by an inline script in `app.vue` *before*
 * first paint, so there is never a flash of the wrong theme on a prerendered
 * page. This composable owns everything after that: the user's choice, the
 * live OS preference, and keeping the class in sync.
 */
export function useThemeMode() {
  const mode = useState<ThemeMode>(THEME_STORAGE_KEY, () => 'system')
  /** The OS preference, tracked live so `system` reacts without a reload. */
  const systemPrefersDark = useState<boolean>(`${THEME_STORAGE_KEY}:system`, () => false)

  const resolved = computed<'light' | 'dark'>(() => {
    if (mode.value === 'system') return systemPrefersDark.value ? 'dark' : 'light'
    return mode.value
  })

  const isDark = computed(() => resolved.value === 'dark')

  function setMode(next: ThemeMode): void {
    mode.value = next
  }

  /** Cycles light → dark → system, which is what a single toggle button needs. */
  function cycle(): void {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const index = order.indexOf(mode.value)
    mode.value = order[(index + 1) % order.length]!
  }

  return { mode, resolved, isDark, systemPrefersDark, setMode, cycle }
}
