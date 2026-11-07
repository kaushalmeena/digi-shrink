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
  right: 'inset-y-0 right-0 h-full border-l',
  left: 'inset-y-0 left-0 h-full border-r',
  bottom: 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t',
} as const

const SIZE = computed(() => (props.side === 'bottom' ? 'w-full' : `w-full ${props.width}`))
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <!--
        A single transition on the dialog root. The scrim and panel are animated
        by descendant selectors rather than owning `<Transition>`s of their own —
        nested inside a `v-if`-ed root, they were unmounted instantly on close
        and never played their exit.

        `:duration` is required because the root itself has no transition for Vue
        to measure; it must cover the longest child animation.
      -->
      <Transition name="offcanvas" appear :duration="{ enter: 260, leave: 190 }">
        <div
          v-if="open"
          class="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <div data-offcanvas="scrim" class="absolute inset-0 bg-black/30" @click="open = false" />

          <div
            ref="panel"
            data-offcanvas="panel"
            :data-side="side"
            tabindex="-1"
            class="absolute flex flex-col bg-surface shadow-2xl outline-none"
            :class="[POSITION[side], SIZE]"
          >
            <!-- Header: stays put while the body scrolls. -->
            <header class="relative flex shrink-0 items-start gap-3 border-b px-5 py-3.5">
              <div class="min-w-0 flex-1">
                <h2 :id="titleId" class="truncate text-base">{{ title }}</h2>
                <p v-if="subtitle" class="mt-0.5 text-xs text-ink-soft">{{ subtitle }}</p>
              </div>

              <UiButton
                variant="ghost"
                size="sm"
                icon-only
                aria-label="Close panel"
                @click="open = false"
              >
                <X class="size-4" />
              </UiButton>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
              <slot />
            </div>

            <footer v-if="$slots.footer" class="shrink-0 border-t px-5 py-3">
              <slot name="footer" />
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
