<script setup lang="ts">
/**
 * The app. One page, because the whole product is one task.
 *
 * The layout has two states, driven by whether the queue is empty:
 *  - **Empty** — a full hero: headline, a large dropzone, presets, and the
 *    reassurance content that explains why an on-device compressor is worth
 *    trusting.
 *  - **Working** — the hero collapses to a slim dropzone and the stats, queue
 *    and action bar take over. Nothing is hidden behind a navigation step.
 */
import { Cpu, Gauge, Lock, ShieldCheck, WifiOff, Zap } from '@lucide/vue'
import type { ConfettiShape } from '~/components/decor/Confetti.vue'

const { hasItems, items, compressAll, canCompress } = useCompressor()
const { attach } = useFileIntake()

const settingsOpen = ref(false)
const compareOpen = ref(false)
const compareId = ref<string | null>(null)

/** VueUse's reactive `navigator.onLine`, used to advertise offline support. */
const isOnline = useOnline()
const isOffline = computed(() => !isOnline.value)

onMounted(attach)

function openCompare(id: string): void {
  compareId.value = id
  compareOpen.value = true
}

/*
 * Keyboard shortcuts. Guarded against firing while the user is typing in a
 * field or has a drawer open, so they never hijack normal input.
 */
function isTyping(): boolean {
  const active = document.activeElement
  if (!active) return false
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active as HTMLElement).isContentEditable
  )
}

onKeyStroke(['c', 'C'], (event) => {
  if (isTyping() || settingsOpen.value || compareOpen.value) return
  if (!canCompress.value) return
  event.preventDefault()
  void compressAll()
})

onKeyStroke(['s', 'S'], (event) => {
  if (isTyping() || compareOpen.value) return
  event.preventDefault()
  settingsOpen.value = !settingsOpen.value
})

const HERO_SHAPES: ConfettiShape[] = [
  { kind: 'circle', tone: 'sun', top: '-14%', left: '-4%', size: 190, opacity: 0.35 },
  { kind: 'ring', tone: 'berry', top: '38%', right: '-3%', size: 130, opacity: 0.45, delay: 1.4 },
  {
    kind: 'triangle',
    tone: 'mint',
    bottom: '4%',
    left: '46%',
    size: 40,
    rotate: -20,
    opacity: 0.7,
    delay: 2.1,
  },
]

const TRUST_POINTS = [
  {
    icon: Lock,
    tone: 'mint' as const,
    title: 'Nothing is uploaded',
    body: 'There is no server to upload to. Your images are read, re-encoded and written back without ever leaving this tab — check the network panel if you like.',
  },
  {
    icon: Cpu,
    tone: 'accent' as const,
    title: 'The same codecs the pros use',
    body: 'MozJPEG, OxiPNG, libwebp and libavif, compiled to WebAssembly. These are the real encoders, not a canvas re-save, and it shows in the file sizes.',
  },
  {
    icon: WifiOff,
    tone: 'sun' as const,
    title: 'Works with the wifi off',
    body: 'Install it once and the whole app — interface, codecs and all — is cached on your device. Useful on a plane, essential if the files are sensitive.',
  },
]

const STEPS = [
  {
    title: 'Drop them in',
    body: 'Drag a folder, paste from the clipboard, or pick files. Up to 250 at a time.',
  },
  {
    title: 'Pick a preset',
    body: 'Or open the advanced panel and tune the encoder yourself. Every knob explains itself.',
  },
  {
    title: 'Check and save',
    body: 'Compare before and after with the slider, then export as a ZIP or straight into a folder.',
  },
]
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader :offline="isOffline" @open-settings="settingsOpen = true" />

    <main class="shell flex-1 pb-8">
      <!-- ------------------------------------------------------------- Hero -->
      <section class="relative py-10 sm:py-14">
        <DecorConfetti :shapes="HERO_SHAPES" />

        <div class="relative z-10 mx-auto max-w-2xl text-center">
          <!-- Tilted sticker banner, straight out of the design system. -->
          <p
            class="eyebrow inline-block -rotate-1 rounded-lg edge bg-sun px-3 py-1.5 text-[#1e293b] pop-1"
          >
            No uploads · No accounts · No limits
          </p>

          <h1 class="mt-5 text-4xl sm:text-5xl lg:text-6xl">
            Squeeze images without
            <span class="marker-underline [--mark-c:var(--color-berry)]">giving them away</span>
          </h1>

          <p class="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
            A batch image compressor that runs entirely on your own device. Real WebAssembly codecs,
            an honest report of what you saved, and a before/after slider so you can see exactly
            what you traded.
          </p>

          <DecorSquiggle tone="accent" class="mx-auto mt-6 h-3 max-w-xs" />
        </div>
      </section>

      <!-- -------------------------------------------------------- Workspace -->
      <div class="space-y-6">
        <CompressDropZone :compact="hasItems" />

        <CompressPresetPicker />

        <!-- Stats, queue and actions appear together once there's work to show. -->
        <Transition name="pop">
          <div v-if="hasItems" class="space-y-6">
            <CompressStatsBar />
            <CompressQueue @compare="openCompare" />
            <CompressToolbar />
          </div>
        </Transition>
      </div>

      <!-- ------------------------------------- Reassurance (empty state only) -->
      <Transition name="fade">
        <div v-if="!hasItems" class="mt-20 space-y-16">
          <section aria-labelledby="trust-heading">
            <div class="mx-auto max-w-xl text-center">
              <h2 id="trust-heading" class="text-2xl sm:text-3xl">
                Private by architecture, not by promise
              </h2>
              <p class="mt-3 text-sm leading-relaxed text-ink-soft">
                Most online compressors ask you to upload your photos to someone else's computer.
                This one can't, because it has nowhere to send them.
              </p>
            </div>

            <div class="stagger mt-8 grid gap-5 md:grid-cols-3">
              <UiCard
                v-for="(point, index) in TRUST_POINTS"
                :key="point.title"
                :tone="point.tone"
                :depth="4"
                interactive
                class="pt-8"
                :style="{ '--stagger-index': index }"
              >
                <!-- Icon sits half-in/half-out of the card's top border. -->
                <UiIconBadge
                  :tone="point.tone"
                  size="md"
                  shape="squircle"
                  outlined
                  wiggle
                  class="absolute -top-5 left-5"
                >
                  <component :is="point.icon" />
                </UiIconBadge>

                <h3 class="font-display text-lg font-bold">{{ point.title }}</h3>
                <p class="mt-2 text-sm leading-relaxed text-ink-soft">{{ point.body }}</p>
              </UiCard>
            </div>
          </section>

          <section aria-labelledby="steps-heading" class="relative">
            <div class="mx-auto max-w-xl text-center">
              <h2 id="steps-heading" class="text-2xl sm:text-3xl">Three steps, no sign-up</h2>
            </div>

            <ol class="stagger mt-8 grid gap-5 md:grid-cols-3">
              <li
                v-for="(step, index) in STEPS"
                :key="step.title"
                class="relative rounded-2xl edge bg-surface p-5 pop-2 pop-soft"
                :style="{ '--stagger-index': index }"
              >
                <span
                  class="grid h-10 w-10 place-items-center rounded-full edge bg-accent font-display text-base font-extrabold text-on-accent pop-1"
                  aria-hidden="true"
                >
                  {{ index + 1 }}
                </span>
                <h3 class="mt-4 font-display text-base font-bold">{{ step.title }}</h3>
                <p class="mt-1.5 text-sm leading-relaxed text-ink-soft">{{ step.body }}</p>
              </li>
            </ol>
          </section>

          <!-- Feature strip: the things that make this more than a re-save. -->
          <section aria-labelledby="extras-heading">
            <h2 id="extras-heading" class="sr-only">Additional features</h2>

            <UiCard tone="berry" :depth="4" class="relative overflow-hidden">
              <div class="decor-layer pattern-dots opacity-60" aria-hidden="true" />

              <dl class="relative z-10 grid gap-6 sm:grid-cols-3">
                <div
                  v-for="extra in [
                    {
                      icon: Zap,
                      label: 'Parallel encoding',
                      body: 'A pool of workers keeps every core busy without freezing the interface.',
                    },
                    {
                      icon: Gauge,
                      label: 'Hit a byte budget',
                      body: 'Name a target size and the quality is searched for you, pass by pass.',
                    },
                    {
                      icon: ShieldCheck,
                      label: 'Metadata stripped',
                      body: 'EXIF, GPS and camera details cannot survive a re-encode. That is the point.',
                    },
                  ]"
                  :key="extra.label"
                  class="flex gap-3"
                >
                  <UiIconBadge tone="berry" size="sm" shape="circle">
                    <component :is="extra.icon" />
                  </UiIconBadge>

                  <div class="min-w-0">
                    <dt class="font-display text-sm font-bold">{{ extra.label }}</dt>
                    <dd class="mt-1 text-xs leading-relaxed text-ink-soft">{{ extra.body }}</dd>
                  </div>
                </div>
              </dl>
            </UiCard>
          </section>
        </div>
      </Transition>
    </main>

    <AppFooter />

    <!-- Offcanvas panels live at the page root so their teleport target and
         focus management are never nested inside a transitioning subtree. -->
    <CompressSettingsDrawer v-model:open="settingsOpen" />
    <CompressCompareDrawer v-model:open="compareOpen" :item-id="compareId" />

    <!-- Full-window drop affordance: dropping works anywhere, so say so. -->
    <CompressDropOverlay :count="items.length" />
  </div>
</template>
