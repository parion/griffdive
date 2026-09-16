export interface Toast {
  id: number
  message: string
  tone: 'info' | 'warn'
}

// Transient, app-wide notices (host handover, dropped connection). Module
// scope keeps one queue per tab; SPA mode means no SSR cross-request bleed.
// Auto-dismiss is Reka UI's ToastRoot (duration), not a timer here.
const toasts = ref<Toast[]>([])
let nextId = 0

export function useToasts() {
  function dismiss(id: number): void {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function push(message: string, tone: Toast['tone'] = 'info'): number {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, message, tone }]
    return id
  }

  return { toasts, push, dismiss }
}
