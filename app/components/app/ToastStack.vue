<script setup lang="ts">
/**
 * Bottom-right toast stack.
 *
 * `aria-live="polite"` announces messages without stealing focus, and the region
 * exists in the DOM even when empty so screen readers register it up front.
 */
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from '@lucide/vue'
import { useToasts } from '~/composables/useToasts'
import type { ToastTone } from '~/composables/useToasts'

const { toasts, dismiss } = useToasts()

const ICONS: Record<ToastTone, unknown> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const TONES: Record<ToastTone, string> = {
  info: 'pop-accent',
  success: 'pop-mint',
  warning: 'pop-sun',
  error: 'pop-berry',
}

const ICON_TONES: Record<ToastTone, 'accent' | 'mint' | 'sun' | 'danger'> = {
  info: 'accent',
  success: 'mint',
  warning: 'sun',
  error: 'danger',
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-end gap-2 p-4 sm:right-0 sm:left-auto sm:max-w-sm"
    role="region"
    aria-live="polite"
    aria-label="Notifications"
  >
    <TransitionGroup name="toast" tag="div" class="relative flex w-full flex-col items-end gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full items-start gap-3 rounded-xl edge bg-surface p-3 pop-2"
        :class="TONES[toast.tone]"
      >
        <UiIconBadge :tone="ICON_TONES[toast.tone]" size="sm">
          <component :is="ICONS[toast.tone]" />
        </UiIconBadge>

        <p class="min-w-0 flex-1 pt-1 text-xs leading-snug font-semibold text-ink">
          {{ toast.message }}
        </p>

        <button
          type="button"
          class="-m-1 shrink-0 rounded-md p-1 text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Dismiss notification"
          @click="dismiss(toast.id)"
        >
          <X class="h-3.5 w-3.5 stroke-[3]" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
