<script setup lang="ts">
/**
 * App shell.
 *
 * The only notable thing here is the blocking inline theme script. Because the
 * page is prerendered, the server-rendered HTML can't know the visitor's theme,
 * so without this there would be a flash of light-mode paint before hydration.
 * The script is tiny, synchronous, and its own try/catch — a thrown error in
 * private-browsing mode must not stop the app from booting.
 */
import { useHead, useSeoMeta } from '#imports'
import { useThemeMode } from '~/composables/useThemeMode'

const { resolved } = useThemeMode()

useHead({
  titleTemplate: (title) => (title ? `${title} · DigiShrink` : 'DigiShrink'),
  script: [
    {
      tagPosition: 'head',
      innerHTML: `(function(){try{var s=localStorage.getItem('digishrink:theme');var m=s?JSON.parse(s):'system';var q=window.matchMedia('(prefers-color-scheme: dark)').matches;if(m==='dark'||(m!=='light'&&q)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
    },
  ],
})

useSeoMeta({
  title: 'Compress images locally',
  description:
    'A fast, private image compressor that runs entirely in your browser. Batch compress JPEG, PNG, WebP and AVIF with no uploads, no accounts and full offline support.',
  ogTitle: 'DigiShrink — local image compressor',
  ogDescription:
    'Shrink images down to size entirely on your own device. Nothing is ever uploaded.',
  ogType: 'website',
  themeColor: '#18181b',
})
</script>

<template>
  <div class="min-h-dvh">
    <NuxtPage />

    <!-- Toasts via vue-sonner, which brings stacking, swipe-to-dismiss and an
         `aria-live` region. `theme` follows the app, not the OS. -->
    <Toaster
      :theme="resolved"
      position="bottom-right"
      :offset="16"
      :gap="8"
      :visible-toasts="3"
      :toast-options="{
        classes: {
          toast: '!rounded-lg !border !border-line !bg-surface !text-ink !font-sans !shadow-lg',
          title: '!font-medium !text-sm !text-ink',
          description: '!text-xs !text-ink-soft',
        },
      }"
    />
  </div>
</template>
