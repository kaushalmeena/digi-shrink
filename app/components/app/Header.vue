<script setup lang="ts">
/**
 * Sticky header. Carries the privacy claim — the single most important thing to
 * tell someone about this app — plus the theme toggle and the settings trigger.
 */
import { ShieldCheck, Sliders, WifiOff } from '@lucide/vue'
import { useSettings } from '~/composables/useSettings'

defineProps<{ offline: boolean }>()
const emit = defineEmits<{ openSettings: [] }>()

const { summary } = useSettings()
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b-2 border-(--color-outline) bg-canvas/90 backdrop-blur-md"
  >
    <div class="shell flex h-16 items-center gap-3">
      <NuxtLink to="/" class="group shrink-0 rounded-lg" aria-label="DigiCompress home">
        <AppLogo />
      </NuxtLink>

      <!-- The privacy guarantee, stated up front rather than buried in a footer. -->
      <UiBadge tone="mint" outlined class="ml-1 hidden md:inline-flex">
        <ShieldCheck class="h-3 w-3 stroke-3" />
        100% on-device
      </UiBadge>

      <Transition name="pop">
        <UiBadge v-if="offline" tone="sun" outlined class="hidden sm:inline-flex">
          <WifiOff class="h-3 w-3 stroke-3" />
          Offline — still works
        </UiBadge>
      </Transition>

      <div class="ml-auto flex items-center gap-2">
        <span class="mr-1 hidden text-2xs font-semibold text-ink-soft lg:inline" data-numeric>
          {{ summary }}
        </span>

        <UiButton variant="secondary" size="sm" @click="emit('openSettings')">
          <Sliders class="h-4 w-4" />
          <span class="hidden sm:inline">Settings</span>
        </UiButton>

        <AppThemeToggle />
      </div>
    </div>
  </header>
</template>
