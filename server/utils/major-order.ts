import type { FrontId } from '~~/shared/data/fronts'
import type { MajorOrderPlanet, MajorOrderSelection } from '~~/shared/engine/types'

// Live Major Order proxy. The engine never fetches (invariant 1); this server
// util normalizes the community war API into the same MajorOrderSelection the
// manual picker produces, so the client only ever hands the engine a front list.
//
// Sources (both unofficial, unauthenticated, and best-effort):
//  - assignments: api.helldivers2.dev — active MO, tasks carry target planets
//  - campaign: helldiverstrainingmanual.com — active planet index → faction + %
// The two are joined on the planet index; an MO whose planets aren't active
// resolves to no front and degrades to the manual picker.

const ASSIGNMENTS_URL = 'https://api.helldivers2.dev/api/v1/assignments'
const CAMPAIGN_URL = 'https://helldiverstrainingmanual.com/api/v1/war/campaign'
const FETCH_TIMEOUT_MS = 6000
const FETCH_ATTEMPTS = 2

interface RawTask {
  type?: number
  values?: number[]
  valueTypes?: number[]
}

interface RawAssignment {
  title?: string
  briefing?: string | null
  expiration?: string
  tasks?: RawTask[]
}

interface RawCampaignPlanet {
  planetIndex?: number
  name?: string
  faction?: string
  percentage?: number
}

interface PlanetInfo {
  name: string
  front: FrontId
  liberation: number
}

const FACTION_TO_FRONT: Readonly<Record<string, FrontId>> = {
  terminids: 'terminids',
  automatons: 'automatons',
  illuminates: 'illuminate',
  illuminate: 'illuminate',
}

// The MO's target planets: task values[2] is the planet index (valueTypes[2]
// === 12 marks it on current assignments). Older/other task shapes fall back to
// the liberation task type. The task schema can shift between orders, so both
// paths are best-effort and an unresolved index is simply skipped.
function targetPlanetIndices(assignment: RawAssignment): number[] {
  const tasks = Array.isArray(assignment.tasks) ? assignment.tasks : []
  const marked = tasks
    .filter(task => task.valueTypes?.[2] === 12)
    .map(task => task.values?.[2])
  const liberation = tasks
    .filter(task => task.type === 11)
    .map(task => task.values?.[2])
  const source = marked.length > 0 ? marked : liberation
  return [...new Set(source.filter(
    (value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0,
  ))]
}

function planetIndex(campaign: unknown): Map<number, PlanetInfo> {
  const map = new Map<number, PlanetInfo>()
  if (!Array.isArray(campaign)) {
    return map
  }
  for (const raw of campaign as RawCampaignPlanet[]) {
    const front = FACTION_TO_FRONT[raw.faction?.toLowerCase() ?? '']
    if (typeof raw.planetIndex === 'number' && typeof raw.name === 'string' && front) {
      const liberation = typeof raw.percentage === 'number' && Number.isFinite(raw.percentage)
        ? Math.min(100, Math.max(0, raw.percentage))
        : 0
      map.set(raw.planetIndex, { name: raw.name, front, liberation })
    }
  }
  return map
}

// Pure: normalizes raw API payloads into the selection the host's picker
// offers. Exported for tests. Returns null when no front resolves.
export function normalizeMajorOrder(assignments: unknown, campaign: unknown): MajorOrderSelection | null {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return null
  }
  const assignment = assignments[0] as RawAssignment
  const planets = planetIndex(campaign)
  const fronts: FrontId[] = []
  const ordered: MajorOrderPlanet[] = []
  for (const index of targetPlanetIndices(assignment)) {
    const planet = planets.get(index)
    if (!planet || ordered.some(entry => entry.index === index)) {
      continue
    }
    if (!fronts.includes(planet.front)) {
      fronts.push(planet.front)
    }
    ordered.push({
      index,
      name: planet.name,
      front: planet.front,
      liberation: planet.liberation,
    })
  }
  if (fronts.length === 0) {
    return null
  }
  const title = (typeof assignment.briefing === 'string' && assignment.briefing.trim())
    || (typeof assignment.title === 'string' && assignment.title.trim())
    || 'Major Order'
  return {
    fronts,
    live: true,
    title: title.slice(0, 120),
    planets: ordered.slice(0, 8),
    expiresAt: typeof assignment.expiration === 'string' ? assignment.expiration : undefined,
  }
}

// One JSON fetch with a bounded timeout and a single retry. Throws on failure so
// the caller can serve its last good snapshot instead of blanking the panel.
async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    try {
      return await $fetch<unknown>(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    }
    catch (error) {
      lastError = error
    }
  }
  throw lastError
}

// The three outcomes the picker needs to tell apart: a live order, a clean "no
// active order" (the API answered with an empty list), or a failed/garbled
// response. Kept separate from normalizeMajorOrder so the distinction is
// testable without a network call.
export type MajorOrderFetch
  = | { status: 'active', order: MajorOrderSelection }
    | { status: 'none', order: null }
    | { status: 'unavailable', order: null }

export function resolveMajorOrder(assignments: unknown, campaign: unknown): MajorOrderFetch {
  if (!Array.isArray(assignments)) {
    return { status: 'unavailable', order: null }
  }
  if (assignments.length === 0) {
    return { status: 'none', order: null }
  }
  const order = normalizeMajorOrder(assignments, campaign)
  return order ? { status: 'active', order } : { status: 'unavailable', order: null }
}

// Best-effort live fetch. A kill switch (`GRIFFDIVE_DISABLE_MO_API=1`) reads as
// unavailable; a transport failure throws so the route can fall back to cache.
export async function fetchMajorOrder(): Promise<MajorOrderFetch> {
  if (process.env.GRIFFDIVE_DISABLE_MO_API === '1') {
    return { status: 'unavailable', order: null }
  }
  const headers = {
    'X-Super-Client': 'griffdive',
    'X-Super-Contact': process.env.GRIFFDIVE_MO_CONTACT ?? 'https://github.com/anomalyco/opencode',
    'Accept': 'application/json',
  }
  const [assignments, campaign] = await Promise.all([
    fetchJson(ASSIGNMENTS_URL, headers),
    fetchJson(CAMPAIGN_URL, { Accept: 'application/json' }),
  ])
  return resolveMajorOrder(assignments, campaign)
}
