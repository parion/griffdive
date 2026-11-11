const DAY_MS = 24 * 60 * 60 * 1000

// The Bridge's re-entry nudge: a room's last event, a session mirror's or a
// local slot's save time, always as a calendar-day gap rather than a clock.
export function lastPlayedLabel(value: number | string | null | undefined, now: number = Date.now()): string {
  if (value === null || value === undefined) {
    return ''
  }
  const at = typeof value === 'number' ? value : Date.parse(value)
  if (!Number.isFinite(at)) {
    return ''
  }
  const days = Math.floor(Math.max(0, now - at) / DAY_MS)
  if (days === 0) {
    return 'Last played today'
  }
  if (days === 1) {
    return 'Last played 1 day ago'
  }
  return `Last played ${days} days ago`
}
