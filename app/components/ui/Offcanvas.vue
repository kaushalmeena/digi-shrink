<script setup lang="ts">
/**
 * A sliding offcanvas panel — the app's container for advanced settings and the
 * before/after comparison.
 *
 * Accessibility is the bulk of this component, and it's all hand-wired because
 * `<dialog>` can't be styled or animated the way this design system needs:
 *  - focus moves into the panel on open and returns to the trigger on close;
 *  - Tab is trapped inside the panel while it's open;
 *  - Escape closes it;
 *  - the page behind it is scroll-locked and hidden from assistive tech.
 *
 * Motion comes from the shared `drawer-*` / `backdrop` transitions so it matches
 * every other appearance in the app.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { onKeyStroke, useEventListener, useScrollLock } from '@vueuse/core'

import { X } from '@lucide/vue'

const open = defineModel<boolean>('open', { required: true })

const props = withDefaults(
  defineProps<{
    title: string
    /** Sub-heading under the title. */
    subtitle?: string
    side?: 'right' | 'left' | 'bottom'
    /** Tailwind max-width class for the panel. */
    width?: string
  }>(),
  { side: 'right', width: 'max-w-md' },
)

const panel = ref<HTMLElement | null>(null)
/** The element focus should return to once the panel closes. */
let restoreFocusTo: HTMLElement | null = null

const isScrollLocked = useScrollLock(import.meta.client ? document.body : null)

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function focusableItems(): HTMLElement[] {
  if (!panel.value) return []
  return Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  )
}

/** Keep Tab cycling inside the panel rather than escaping to the page behind. */
function trapTab(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || !open.value) return

  const items = focusableItems()
  if (items.length === 0) {
    event.preventDefault()
    return
  }

  const first = items[0]!
  const last = items[items.length - 1]!
  const active = document.activeElement

  if (event.shiftKey && (active === first || !panel.value?.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onKeyStroke('Escape', () => {
  if (open.value) open.value = false
})

useEventListener(import.meta.client ? document : null, 'keydown', trapTab)

watch(open, async (isOpen) => {
  isScrollLocked.value = isOpen

  if (isOpen) {
    restoreFocusTo = document.activeElement as HTMLElement | null
    // Wait for the panel to exist before moving focus into it.
    await nextTick()
    ;(focusableItems()[0] ?? panel.value)?.focus()
  } else {
    restoreFocusTo?.focus()
    restoreFocusTo = null
  }
})

// A panel left open when its host unmounts would strand the scroll lock.
onBeforeUnmount(() => {
  isScrollLocked.value = false
})

const titleId = useId()

const POSITION = {
  right: 'inset-y-0 right-0 h-full border-l-2',
  left: 'inset-y-0 left-0 h-full border-r-2',
  bottom: 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl border-t-2',
} as const

const SIZE = computed(() => (props.side === 'bottom' ? 'w-full' : `w-full ${props.width}`))
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <Transition name="backdrop" appear>
          <div
            v-if="open"
            class="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
            @click="open = false"
          />
        </Transition>

        <Transition :name="`drawer-${side}`" appear>
          <div
            v-if="open"
            ref="panel"
            tabindex="-1"
            class="absolute flex flex-col bg-canvas border-(--color-outline) shadow-[-8px_0_0_0_var(--color-shade-soft)] outline-none"
            :class="[POSITION[side], SIZE]"
          >
            <!-- Header: stays put while the body scrolls. -->
            <header
              class="relative flex shrink-0 items-start gap-3 border-b-2 border-(--color-outline) bg-surface px-5 py-4"
            >
              <div class="min-w-0 flex-1">
                <h2 :id="titleId" class="text-xl">{{ title }}</h2>
                <p v-if="subtitle" class="mt-1 text-xs text-ink-soft">{{ subtitle }}</p>
              </div>

              <UiButton
                variant="secondary"
                size="sm"
                icon-only
                aria-label="Close panel"
                @click="open = false"
              >
                <X class="h-4 w-4 stroke-3" />
              </UiButton>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <slot />
            </div>

            <footer
              v-if="$slots.footer"
              class="shrink-0 border-t-2 border-(--color-outline) bg-surface px-5 py-4"
            >
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Teleport>
  </ClientOnly>
</template>
