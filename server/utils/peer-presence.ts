// The client heartbeats every 25s; a hidden tab is throttled to roughly one
// timer a minute, so five silent minutes mean the connection is gone. Dead
// sockets never send a close (sleeping phone, Wi-Fi handover, frozen tab), so
// both the reaper and the scrape-time gauges share this threshold.
export const PEER_SILENCE_MS = 5 * 60 * 1000

// A peer with no stamp yet (a test double, a transport without an open hook)
// starts its silence window at the first sweep instead of being cut off.
export function isPeerSilent(
  lastSeenAt: number | undefined,
  now: number,
  graceMs: number = PEER_SILENCE_MS,
): boolean {
  return typeof lastSeenAt === 'number' && now - lastSeenAt >= graceMs
}
