import type { FrontId } from '~~/shared/data/fronts'
import type { MajorOrderPlanet, MajorOrderSelection } from '~~/shared/engine/types'

// Live Major Order proxy. The engine never fetches (invariant 1); this server
// util normalizes the community war API into the same MajorOrderSelection the
// manual picker produces, so the client only ever hands the engine a front list.
//
// Sources (both unofficial, unauthenticated, and best-effort):
//  - assignments: api.helldivers2.dev — active MO, tasks carry target planets
//  - campaign: helldiverstrainingmanual.com — active planet index → faction + %
// The two are joined on the planet index; an MO that names no resolvable planet
// or faction resolves to no front and degrades to the manual picker.

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

// Task payloads are self-describing: `valueTypes[i]` labels `values[i]`, so slots
// are read by label rather than position. The labels are community
// reverse-engineered (hd2api.py), not official; an unlabelled or unknown task
// simply contributes no front and the order degrades to the manual picker.
const VALUE_TYPE_FACTION = 1
const VALUE_TYPE_PLANET = 12
const LIBERATION_TASK_TYPE = 11
const FACTION_ID_TO_FRONT: Readonly<Record<number, FrontId>> = {
  2: 'terminids',
  3: 'automatons',
  4: 'illuminate',
}

function labelled(task: RawTask, valueType: number): number | undefined {
  const slot = task.valueTypes?.indexOf(valueType) ?? -1
  return slot >= 0 ? task.values?.[slot] : undefined
}

// A task names a planet (liberation, defense) or a bare faction (kill orders).
// Planet-less liberation tasks from older payloads fall back to values[2].
function taskTarget(task: RawTask): { planet?: number, front?: FrontId } {
  const planet = labelled(task, VALUE_TYPE_PLANET)
    ?? (task.valueTypes === undefined && task.type === LIBERATION_TASK_TYPE ? task.values?.[2] : undefined)
  if (typeof planet === 'number' && Number.isInteger(planet) && planet > 0) {
    return { planet }
  }
  const faction = labelled(task, VALUE_TYPE_FACTION)
  return { front: typeof faction === 'number' ? FACTION_ID_TO_FRONT[faction] : undefined }
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

interface ResolvedTask {
  front?: FrontId
  planet?: MajorOrderPlanet
}

function resolveTask(task: RawTask, planets: Map<number, PlanetInfo>): ResolvedTask {
  const target = taskTarget(task)
  if (target.planet === undefined) {
    return { front: target.front }
  }
  const info = planets.get(target.planet)
  return info
    ? { front: info.front, planet: { index: target.planet, ...info } }
    : {}
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
  const tasks = Array.isArray(assignment.tasks) ? assignment.tasks : []
  for (const task of tasks) {
    const { front, planet } = resolveTask(task, planets)
    if (front && !fronts.includes(front)) {
      fronts.push(front)
    }
    if (planet && !ordered.some(entry => entry.index === planet.index)) {
      ordered.push(planet)
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
    live: true,
    title: title.slice(0, 120),
    planets: ordered.slice(0, 8),
    expiresAt: typeof assignment.expiration === 'string' ? assignment.expiration : undefined,
  }
}

// Tasks of the active order that name no front — the shapes worth a human look
// when the decoder meets a new order type. Pure; the logging sits in the caller.
export function unresolvedTasks(assignments: unknown, campaign: unknown): RawTask[] {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return []
  }
  const planets = planetIndex(campaign)
  const tasks = (assignments[0] as RawAssignment).tasks
  return (Array.isArray(tasks) ? tasks : []).filter(task => !resolveTask(task, planets).front)
}

// One warning per task shape per process (the fetch reruns every ~10 minutes),
// so a stuck order can't flood the Fly log stream. The planet and count slots
// are left out of the key: they change every order without changing the shape.
const reportedShapes = new Set<string>()
const REPORTED_SHAPES_CAP = 100

function reportUnresolved(tasks: RawTask[]): void {
  for (const task of tasks) {
    const shape = `${task.type}:${JSON.stringify(task.valueTypes)}`
    if (reportedShapes.has(shape) || reportedShapes.size >= REPORTED_SHAPES_CAP) {
      continue
    }
    reportedShapes.add(shape)
    console.warn(`[major-order] task names no front: ${JSON.stringify(task)}`)
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

// The outcomes the picker needs to tell apart: a live order, a clean "no
// active order" (the API answered with an empty list), an order that exists but
// names no front we can resolve (`no-front`), or a failed/garbled response. Kept separate from normalizeMajorOrder so the distinction is
// testable without a network call.
export type MajorOrderFetch
  = | { status: 'active', order: MajorOrderSelection }
    | { status: 'none', order: null }
    | { status: 'no-front', order: null }
    | { status: 'unavailable', order: null }

export function resolveMajorOrder(assignments: unknown, campaign: unknown): MajorOrderFetch {
  if (!Array.isArray(assignments)) {
    return { status: 'unavailable', order: null }
  }
  if (assignments.length === 0) {
    return { status: 'none', order: null }
  }
  const order = normalizeMajorOrder(assignments, campaign)
  return order ? { status: 'active', order } : { status: 'no-front', order: null }
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
  reportUnresolved(unresolvedTasks(assignments, campaign))
  return resolveMajorOrder(assignments, campaign)
}
