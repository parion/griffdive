import type { FrontId } from '~~/shared/data/fronts'
import type { MajorOrderSelection } from '~~/shared/engine/types'

// Live Major Order proxy. The engine never fetches (invariant 1); this server
// util normalizes the community war API into the same MajorOrderSelection the
// manual picker produces, so the client only ever hands the engine a front list.
//
// Sources (both unofficial, unauthenticated, and best-effort):
//  - assignments: api.helldivers2.dev — active MO, tasks carry target planets
//  - campaign: helldiverstrainingmanual.com — active planet index → faction
// The two are joined on the planet index; an MO whose planets aren't active
// resolves to no front and degrades to the manual picker.

const ASSIGNMENTS_URL = 'https://api.helldivers2.dev/api/v1/assignments'
const CAMPAIGN_URL = 'https://helldiverstrainingmanual.com/api/v1/war/campaign'
const FETCH_TIMEOUT_MS = 4000

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

function planetIndex(campaign: unknown): Map<number, { name: string, front: FrontId }> {
  const map = new Map<number, { name: string, front: FrontId }>()
  if (!Array.isArray(campaign)) {
    return map
  }
  for (const raw of campaign as RawCampaignPlanet[]) {
    const front = FACTION_TO_FRONT[raw.faction?.toLowerCase() ?? '']
    if (typeof raw.planetIndex === 'number' && typeof raw.name === 'string' && front) {
      map.set(raw.planetIndex, { name: raw.name, front })
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
  const planetNames: string[] = []
  for (const index of targetPlanetIndices(assignment)) {
    const planet = planets.get(index)
    if (!planet) {
      continue
    }
    if (!fronts.includes(planet.front)) {
      fronts.push(planet.front)
    }
    if (!planetNames.includes(planet.name)) {
      planetNames.push(planet.name)
    }
  }
  if (fronts.length === 0) {
    return null
  }
  const title = (typeof assignment.briefing === 'string' && assignment.briefing.trim())
    || (typeof assignment.title === 'string' && assignment.title.trim())
    || 'Major Order'
  return {
    fronts,
    title: title.slice(0, 120),
    planetNames: planetNames.slice(0, 8),
    expiresAt: typeof assignment.expiration === 'string' ? assignment.expiration : undefined,
  }
}

// Best-effort live fetch. A kill switch (`GRIFFDIVE_DISABLE_MO_API=1`) and a
// failure both resolve to null so the manual picker always remains available.
export async function fetchMajorOrder(): Promise<MajorOrderSelection | null> {
  if (process.env.GRIFFDIVE_DISABLE_MO_API === '1') {
    return null
  }
  const headers = {
    'X-Super-Client': 'griffdive',
    'X-Super-Contact': process.env.GRIFFDIVE_MO_CONTACT ?? 'https://github.com/anomalyco/opencode',
    'Accept': 'application/json',
  }
  const [assignments, campaign] = await Promise.all([
    $fetch<unknown>(ASSIGNMENTS_URL, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
    $fetch<unknown>(CAMPAIGN_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }).catch(() => null),
  ])
  return normalizeMajorOrder(assignments, campaign)
}
