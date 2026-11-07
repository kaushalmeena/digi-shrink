<script setup lang="ts">
/**
 * Light / dark / system, as a single cycling button.
 *
 * The icon cross-fades between modes. `aria-label` always
 * spells out what pressing it will do next, since the icon alone can't.
 *
 * The button is wrapped in `<ClientOnly>` because the stored theme only exists in
 * `localStorage`: the server always renders "system", the client may resolve to
 * "light", and Vue reports that as a hydration mismatch. A fixed-size fallback
 * holds the space so the header doesn't shift when the real button arrives.
 */
import { Monitor, Moon, Sun } from '@lucide/vue'
import { useThemeMode } from '~/composables/useThemeMode'

const { mode, cycle } = useThemeMode()

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const

const NEXT_LABEL = {
  light: 'Switch to dark theme',
  dark: 'Follow the system theme',
  system: 'Switch to light theme',
} as const
</script>

<template>
  <ClientOnly>
    <UiButton
      variant="ghost"
      size="md"
      icon-only
      :aria-label="NEXT_LABEL[mode]"
      :title="`Theme: ${mode}`"
      @click="cycle"
    >
      <span class="relative grid size-4 place-items-center overflow-hidden">
        <Transition name="fade" mode="out-in">
          <component :is="ICONS[mode]" :key="mode" class="size-4" />
        </Transition>
      </span>
    </UiButton>

    <template #fallback>
      <span class="size-8 shrink-0" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
