import { toast } from 'vue-sonner'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

/** Auto-dismiss delays, in ms. Errors linger because they need reading. */
const DURATION: Record<ToastTone, number> = {
  info: 3200,
  success: 3200,
  warning: 5000,
  error: 7000,
}

/**
 * Transient, non-blocking messages, backed by vue-sonner.
 *
 * This stays a thin adapter rather than components calling `toast()` directly,
 * for two reasons: the duration policy above lives in exactly one place, and no
 * feature code is coupled to a third-party toast API — swapping the library
 * again would touch this file and nothing else.
 */
export function useToasts() {
  function push(message: string, tone: ToastTone = 'info'): void {
    toast[tone](message, { duration: DURATION[tone] })
  }

  /**
   * A toast with an Undo action, for reversible removals. Exactly one of
   * `onUndo` / `onExpire` runs: Undo restores, anything else (timeout, swipe)
   * makes the removal final.
   */
  function undoable(message: string, onUndo: () => void, onExpire: () => void): void {
    let settled = false
    const settle = (fn: () => void) => () => {
      if (settled) return
      settled = true
      fn()
    }
    toast(message, {
      duration: 6000,
      action: { label: 'Undo', onClick: settle(onUndo) },
      onAutoClose: settle(onExpire),
      onDismiss: settle(onExpire),
    })
  }

  return {
    push,
    undoable,
    info: (message: string) => push(message, 'info'),
    success: (message: string) => push(message, 'success'),
    warning: (message: string) => push(message, 'warning'),
    error: (message: string) => push(message, 'error'),
    dismiss: (id?: number | string) => toast.dismiss(id),
  }
}
