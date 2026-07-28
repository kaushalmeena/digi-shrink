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
  titleTemplate: (title) => (title ? `${title} · DigiCompress` : 'DigiCompress'),
  script: [
    {
      tagPosition: 'head',
      innerHTML: `(function(){try{var s=localStorage.getItem('digicompress:theme');var m=s?JSON.parse(s):'system';var q=window.matchMedia('(prefers-color-scheme: dark)').matches;if(m==='dark'||(m!=='light'&&q)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
    },
  ],
})

useSeoMeta({
  title: 'Compress images locally',
  description:
    'A fast, private image compressor that runs entirely in your browser. Batch compress JPEG, PNG, WebP and AVIF with no uploads, no accounts and full offline support.',
  ogTitle: 'DigiCompress — local image compressor',
  ogDescription:
    'Squeeze images down to size entirely on your own device. Nothing is ever uploaded.',
  ogType: 'website',
  themeColor: '#8b5cf6',
})
</script>

<template>
  <div class="min-h-dvh">
    <NuxtPage />

    <!--
      Toasts, via vue-sonner. It brings the parts that are tedious to get right —
      stacking, swipe-to-dismiss, hover-to-pause, an `aria-live` region and focus
      management — and we override only the visuals so they read as stickers
      rather than the default rounded cards.

      `theme` is bound to the resolved mode so sonner's own light/dark tokens
      follow the app instead of the OS.
    -->
    <Toaster
      :theme="resolved"
      position="bottom-right"
      :offset="16"
      :gap="10"
      :visible-toasts="4"
      close-button
      :toast-options="{
        classes: {
          // No shadow here on purpose: the per-type classes below own it. Two
          // competing `!shadow-*` utilities would be resolved by stylesheet
          // order rather than by which one is more specific.
          toast:
            '!rounded-xl !border-2 !border-(--color-outline) !bg-surface !text-ink !font-sans !gap-3',
          title: '!font-display !font-bold !text-xs !text-ink',
          description: '!text-2xs !text-ink-soft',
          icon: '!text-accent',
          closeButton:
            '!rounded-full !border-2 !border-(--color-outline) !bg-surface !text-ink hover:!bg-sun',
          success: '!shadow-[4px_4px_0_0_var(--color-mint)]',
          error: '!shadow-[4px_4px_0_0_var(--color-berry)]',
          warning: '!shadow-[4px_4px_0_0_var(--color-sun)]',
          info: '!shadow-[4px_4px_0_0_var(--color-accent)]',
        },
      }"
    />
  </div>
</template>
