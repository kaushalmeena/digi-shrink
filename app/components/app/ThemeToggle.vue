<script setup lang="ts">
/**
 * Light / dark / system, as a single cycling button.
 *
 * The icon swap is animated with the shared `roll` transition so the change
 * registers as a deliberate flip rather than a jump cut. `aria-label` always
 * spells out what pressing it will do next, since the icon alone can't.
 */
import { Monitor, Moon, Sun } from '@lucide/vue'

const { mode, cycle } = useThemeMode()

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const

const NEXT_LABEL = {
  light: 'Switch to dark theme',
  dark: 'Follow the system theme',
  system: 'Switch to light theme',
} as const
</script>

<template>
  <UiButton
    variant="secondary"
    size="sm"
    icon-only
    :aria-label="NEXT_LABEL[mode]"
    :title="`Theme: ${mode}`"
    @click="cycle"
  >
    <span class="relative grid h-4 w-4 place-items-center overflow-hidden">
      <Transition name="roll" mode="out-in">
        <component :is="ICONS[mode]" :key="mode" class="h-4 w-4 stroke-[2.5]" />
      </Transition>
    </span>
  </UiButton>
</template>
