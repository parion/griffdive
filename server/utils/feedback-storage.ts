import type { FeedbackEntry, FeedbackKV } from './feedback'

const PREFIX = ''

// Adapts Nitro's `useStorage('feedback')` (fs-lite at `./.data/feedback`) to the
// narrow KV the inbox needs. Same shape as room-storage: the driver is config.
export function feedbackKV(): FeedbackKV {
  const storage = useStorage('feedback')
  return {
    async getItem(key: string) {
      return storage.getItem<FeedbackEntry[]>(`${PREFIX}${key}`)
    },
    async setItem(key, value) {
      await storage.setItem(`${PREFIX}${key}`, value)
    },
  }
}
