export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

let nextId = 0

/** Auto-dismiss delays, in ms. Errors linger because they need reading. */
const LIFETIME: Record<ToastTone, number> = {
  info: 3200,
  success: 3200,
  warning: 5000,
  error: 7000,
}

/**
 * Transient, non-blocking messages.
 *
 * Deliberately tiny: this app has no notifications worth a dependency, and
 * anything important enough to interrupt the user belongs inline in the queue
 * row instead.
 */
export function useToasts() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number): void {
    const index = toasts.value.findIndex((toast) => toast.id === id)
    if (index !== -1) toasts.value.splice(index, 1)
  }

  function push(message: string, tone: ToastTone = 'info'): void {
    const id = (nextId += 1)
    toasts.value.push({ id, tone, message })

    // Cap the stack so a batch of failures can't fill the screen.
    if (toasts.value.length > 4) toasts.value.shift()

    if (import.meta.client) {
      setTimeout(() => dismiss(id), LIFETIME[tone])
    }
  }

  return {
    toasts: readonly(toasts),
    push,
    dismiss,
    info: (message: string) => push(message, 'info'),
    success: (message: string) => push(message, 'success'),
    warning: (message: string) => push(message, 'warning'),
    error: (message: string) => push(message, 'error'),
  }
}
