<script setup lang="ts">
/**
 * Slim top bar: wordmark, the privacy guarantee in one line, and the theme
 * toggle. Settings live next to the work, not up here.
 */
import { Lock, WifiOff } from '@lucide/vue'

defineProps<{ offline: boolean }>()
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-canvas/85 backdrop-blur-md">
    <div class="shell flex h-12 items-center gap-4">
      <NuxtLink to="/" class="shrink-0 rounded-md" aria-label="DigiShrink home">
        <AppLogo />
      </NuxtLink>

      <span class="hidden items-center gap-1.5 text-xs text-ink-soft sm:inline-flex">
        <Lock class="size-3.5" />
        Runs on your device. Nothing is uploaded.
      </span>

      <div class="ml-auto flex items-center gap-2">
        <Transition name="fade">
          <span v-if="offline" class="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <WifiOff class="size-3.5" />
            Offline
          </span>
        </Transition>

        <AppThemeToggle />
      </div>
    </div>
  </header>
</template>
