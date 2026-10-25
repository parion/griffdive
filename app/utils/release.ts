// The release channel the app ships under. The header chip and the changelog
// dialog both read this, so promoting the next channel is a one-entry edit:
// add it at the top of RELEASE_CHANNELS with the date it opens.

export interface ReleaseChannel {
  id: string
  label: string
  name: string
  summary: string
  highlights: readonly string[]
  // First day (ISO) a deployment belongs to this channel; null = the oldest.
  since: string | null
}

// Newest first.
export const RELEASE_CHANNELS: readonly ReleaseChannel[] = [
  {
    id: 'beta',
    label: 'Beta',
    name: 'Griffdive Beta',
    summary: 'The whole loop is playable end to end, solo or with a squad of up to four: spin the Wheel of Adversity, swear pacts, dive in Helldivers 2, then draft loot and climb the ladder to Helldive. Balance is still moving, so expect number tweaks between releases, but saves are frozen and migrate, so your crusade survives updates.',
    highlights: [
      'Realtime squads over an invite link, with host handover, reconnection and mid-crusade joining.',
      'Wheel of Adversity, personal pacts and a Valor odds line that shows exactly what your chosen risk buys.',
      'Brasch\'s Bargains opens once your first operation is complete, with a re-tuned price curve (35 / 100 / 280 / 450 credits).',
      'Saved dives, personal session saves and JSON export, plus an installable offline-ready app.',
    ],
    since: '2026-10-25',
  },
  {
    id: 'alpha',
    label: 'Alpha',
    name: 'Griffdive Alpha',
    summary: 'The first public build: the core loop and realtime squads, while the rules were still settling.',
    highlights: [],
    since: null,
  },
]

export const CURRENT_RELEASE: ReleaseChannel = RELEASE_CHANNELS[0]!

// A deployment belongs to the newest channel that had opened by its date.
// Commits not yet deployed (no date) are the next thing to ship, so they ride
// the current channel.
export function channelFor(
  createdAt: string | null,
  channels: readonly ReleaseChannel[] = RELEASE_CHANNELS,
): ReleaseChannel {
  if (createdAt === null) {
    return channels[0]!
  }
  const time = Date.parse(createdAt)
  return channels.find(channel => channel.since === null || time >= Date.parse(channel.since)) ?? channels[channels.length - 1]!
}
