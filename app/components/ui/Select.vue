<script setup lang="ts" generic="T extends string | number">
/**
 * A single-choice dropdown: a button that opens a listbox.
 *
 * Replaces the native `<select>`, whose arrow and popup placement differ per
 * browser and can't be themed. Follows the WAI-ARIA "select-only combobox"
 * keyboard model:
 *  - on the button: ↓ / ↑ / Enter / Space open the list;
 *  - in the list: ↑ ↓ Home End move, Enter / Space choose, Escape / Tab close,
 *    and typing a letter jumps to the next matching option.
 *
 * The list is teleported to `<body>` and positioned `fixed` against the button,
 * so a clipping ancestor (the file list's `overflow-hidden` card) can't cut it
 * off. It opens below, or above when there isn't room.
 */
import { computed, nextTick, ref, useId, watch } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'

import { Check, ChevronDown } from '@lucide/vue'
import type { SelectOption } from '~/lib/types'

const model = defineModel<T>({ required: true })

const props = withDefaults(
  defineProps<{
    options: SelectOption<T>[]
    /** Shown on the button when the value matches no option, e.g. "Custom". */
    placeholder?: string
    ariaLabel?: string
    /** `outline` is a bordered control; `ghost` is borderless, for toolbars. */
    variant?: 'outline' | 'ghost'
    /** Align the list's edge to the button's left or right edge. */
    align?: 'start' | 'end'
  }>(),
  { placeholder: 'Select…', variant: 'outline', align: 'start' },
)

const emit = defineEmits<{ change: [value: T] }>()

const id = useId()
const listId = `${id}-list`
const optionId = (index: number) => `${id}-opt-${index}`

const trigger = ref<HTMLButtonElement | null>(null)
const list = ref<HTMLUListElement | null>(null)
const isOpen = ref(false)
const activeIndex = ref(-1)
const placement = ref<{
  top?: number
  bottom?: number
  left?: number
  right?: number
  minWidth: number
}>({ top: 0, minWidth: 0 })

const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === model.value),
)
const selectedLabel = computed(() => props.options[selectedIndex.value]?.label ?? props.placeholder)

const TRIGGER = {
  outline:
    'h-7 border border-line-strong bg-surface pr-1.5 pl-2.5 text-ink hover:bg-surface-2 pointer-coarse:h-9',
  ghost: 'h-7 px-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink pointer-coarse:h-9',
} as const

/** The gap between button and list, and the minimum room kept from the viewport edge. */
const GAP = 4
const EDGE = 8
const MAX_HEIGHT = 288

function place(): void {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const below = window.innerHeight - rect.bottom - EDGE
  const above = rect.top - EDGE
  const height = Math.min(list.value?.scrollHeight ?? MAX_HEIGHT, MAX_HEIGHT)
  const width = list.value?.offsetWidth ?? rect.width
  const up = below < height && above > below

  placement.value = {
    // Anchored by `bottom` when opening upward, so no transform is needed and
    // the `rise` transition keeps its own.
    ...(up ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    minWidth: rect.width,
    ...(props.align === 'end'
      ? { right: Math.max(EDGE, window.innerWidth - rect.right) }
      : // Shift left if the list is wider than the room to the button's right.
        { left: Math.max(EDGE, Math.min(rect.left, window.innerWidth - EDGE - width)) }),
  }
}

const px = (value: number | undefined) => (value === undefined ? undefined : `${value}px`)

const panelStyle = computed(() => ({
  top: px(placement.value.top),
  bottom: px(placement.value.bottom),
  left: px(placement.value.left),
  right: px(placement.value.right),
  minWidth: px(placement.value.minWidth),
  maxWidth: `calc(100vw - ${EDGE * 2}px)`,
  maxHeight: `${MAX_HEIGHT}px`,
}))

function firstEnabled(from: number, step: 1 | -1): number {
  const total = props.options.length
  for (let offset = 0; offset < total; offset += 1) {
    const index = (from + step * offset + total) % total
    if (!props.options[index]?.disabled) return index
  }
  return -1
}

async function open(): Promise<void> {
  if (isOpen.value) return
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : firstEnabled(0, 1)
  isOpen.value = true
  place()
  await nextTick()
  place() // again, now the list's real height is known
  list.value?.focus()
  scrollActiveIntoView()
}

function close(restoreFocus = true): void {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) trigger.value?.focus()
}

function choose(index: number): void {
  const option = props.options[index]
  if (!option || option.disabled) return
  if (option.value !== model.value) {
    model.value = option.value
    emit('change', option.value)
  }
  close()
}

function toggle(): void {
  if (isOpen.value) close()
  else void open()
}

function scrollActiveIntoView(): void {
  if (activeIndex.value < 0) return
  list.value
    ?.querySelector<HTMLElement>(`#${CSS.escape(optionId(activeIndex.value))}`)
    ?.scrollIntoView({ block: 'nearest' })
}

watch(activeIndex, () => nextTick(scrollActiveIntoView))

function onTriggerKeydown(event: KeyboardEvent): void {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
    event.preventDefault()
    void open()
  }
}

/* Typeahead: letters typed within 600ms build a prefix to jump to. */
let typed = ''
let typedTimer: ReturnType<typeof setTimeout> | undefined

function typeahead(key: string): void {
  clearTimeout(typedTimer)
  typed += key.toLowerCase()
  typedTimer = setTimeout(() => (typed = ''), 600)
  const total = props.options.length
  for (let offset = 1; offset <= total; offset += 1) {
    const index = (activeIndex.value + offset) % total
    const option = props.options[index]!
    if (!option.disabled && option.label.toLowerCase().startsWith(typed)) {
      activeIndex.value = index
      return
    }
  }
}

function onListKeydown(event: KeyboardEvent): void {
  // Every key the list handles stays inside it, so page shortcuts (e.g. `S`
  // for settings) don't fire while choosing.
  const total = props.options.length
  const handled = (fn: () => void) => {
    event.preventDefault()
    event.stopPropagation()
    fn()
  }

  switch (event.key) {
    case 'ArrowDown':
      return handled(() => (activeIndex.value = firstEnabled(activeIndex.value + 1, 1)))
    case 'ArrowUp':
      return handled(() => (activeIndex.value = firstEnabled(activeIndex.value - 1 + total, -1)))
    case 'Home':
      return handled(() => (activeIndex.value = firstEnabled(0, 1)))
    case 'End':
      return handled(() => (activeIndex.value = firstEnabled(total - 1, -1)))
    case 'Enter':
    case ' ':
      return handled(() => choose(activeIndex.value))
    case 'Escape':
      return handled(() => close())
    case 'Tab':
      // Let focus move on naturally; just close.
      close(false)
      return
    default:
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        handled(() => typeahead(event.key))
      }
  }
}

onClickOutside(list, close.bind(null, false), { ignore: [trigger] })

// Keep the list pinned to its button while the page scrolls or resizes.
useEventListener(import.meta.client ? window : null, 'resize', () => isOpen.value && place())
useEventListener(import.meta.client ? window : null, 'scroll', () => isOpen.value && place(), {
  capture: true,
  passive: true,
})

function onOptionHover(index: number): void {
  if (!props.options[index]?.disabled) activeIndex.value = index
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="inline-flex max-w-full items-center gap-1.5 rounded-md text-sm transition-colors duration-150"
    :class="TRIGGER[variant]"
    aria-haspopup="listbox"
    :aria-expanded="isOpen"
    :aria-controls="listId"
    :aria-label="ariaLabel ? `${ariaLabel}: ${selectedLabel}` : undefined"
    @click="toggle"
    @keydown="onTriggerKeydown"
  >
    <span class="truncate" :class="selectedIndex < 0 && 'text-ink-soft'">{{ selectedLabel }}</span>
    <ChevronDown
      class="size-3.5 shrink-0 text-ink-faint transition-transform duration-150"
      :class="isOpen && 'rotate-180'"
      aria-hidden="true"
    />
  </button>

  <Teleport to="body">
    <Transition name="rise">
      <ul
        v-if="isOpen"
        :id="listId"
        ref="list"
        role="listbox"
        tabindex="-1"
        :aria-label="ariaLabel"
        :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
        class="fixed z-60 w-max overflow-y-auto overscroll-contain rounded-lg border bg-surface p-1 shadow-lg outline-none"
        :style="panelStyle"
        @keydown="onListKeydown"
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="option.value"
          role="option"
          :aria-selected="option.value === model"
          :aria-disabled="option.disabled || undefined"
          class="flex cursor-default items-start gap-2 rounded-md py-1.5 pr-2 pl-2.5 text-sm select-none pointer-coarse:py-2.5"
          :class="[
            option.disabled
              ? 'text-ink-faint'
              : index === activeIndex
                ? 'bg-surface-2 text-ink'
                : 'text-ink',
          ]"
          @pointermove="onOptionHover(index)"
          @click="choose(index)"
        >
          <span class="min-w-0 flex-1">
            <span class="block whitespace-nowrap">{{ option.label }}</span>
            <span
              v-if="option.description"
              class="mt-0.5 block max-w-64 text-xs/snug whitespace-normal text-ink-soft"
            >
              {{ option.description }}
            </span>
          </span>
          <Check
            class="mt-0.5 size-3.5 shrink-0 text-accent"
            :class="option.value === model ? 'opacity-100' : 'opacity-0'"
            aria-hidden="true"
          />
        </li>
      </ul>
    </Transition>
  </Teleport>
</template>
