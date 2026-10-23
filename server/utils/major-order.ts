import type { FrontId } from '~~/shared/data/fronts'
import type { MajorOrderPlanet, MajorOrderSelection } from '~~/shared/engine/types'

// Live Major Order proxy. The engine never fetches (invariant 1); this server
// util normalizes the community war API into the same MajorOrderSelection the
// manual picker produces, so the client only ever hands the engine a front list.
//
// Sources (all unofficial, unauthenticated, and best-effort):
//  - assignments: api.helldivers2.dev — active MO, tasks carry target planets
//  - campaign: helldiverstrainingmanual.com — active planet index → faction + %
//  - planets: api.helldivers2.dev — current owner + warp links, for availability
// The three are joined on the planet index; an MO that names no resolvable
// planet or faction resolves to no front and degrades to the manual picker.

const ASSIGNMENTS_URL = 'https://api.helldivers2.dev/api/v1/assignments'
const CAMPAIGN_URL = 'https://helldiverstrainingmanual.com/api/v1/war/campaign'
const PLANETS_URL = 'https://api.helldivers2.dev/api/v1/planets'
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
  defense?: boolean
}

interface PlanetInfo {
  index: number
  name: string
  front: FrontId
  liberation: number
  defense: boolean
}

interface RawWarPlanet {
  index?: number
  currentOwner?: string
  waypoints?: number[]
  disabled?: boolean
}

interface WarPlanet {
  owner: string | null
  waypoints: number[]
  disabled: boolean
}

const FRIENDLY_OWNERS = new Set(['humans', 'super earth'])

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
      map.set(raw.planetIndex, { index: raw.planetIndex, name: raw.name, front, liberation, defense: raw.defense === true })
    }
  }
  return map
}

// The war roster is wider than the campaign: it keeps every planet in the
// season, including ones not under attack. Owner plus warp links is what tells
// us whether a target can be liberated right now.
function warPlanetIndex(planets: unknown): Map<number, WarPlanet> | null {
  if (!Array.isArray(planets)) {
    return null
  }
  const map = new Map<number, WarPlanet>()
  for (const raw of planets as RawWarPlanet[]) {
    if (typeof raw.index !== 'number' || !Number.isInteger(raw.index)) {
      continue
    }
    map.set(raw.index, {
      owner: typeof raw.currentOwner === 'string' ? raw.currentOwner.toLowerCase() : null,
      waypoints: Array.isArray(raw.waypoints)
        ? raw.waypoints.filter(index => typeof index === 'number' && Number.isInteger(index))
        : [],
      disabled: raw.disabled === true,
    })
  }
  return map.size > 0 ? map : null
}

// A planet is open for liberation when a warp link on the target itself comes
// from a Super Earth world (the game exposes the attack route on the target,
// not only on the source). A defense is playable even while the target is still
// Human-held. Unknown roster data stays undefined so callers can keep the
// unfiltered draw rather than silently drop the order.
function planetAvailability(info: PlanetInfo, war: Map<number, WarPlanet> | null): boolean | undefined {
  if (info.defense) {
    return true
  }
  if (!war) {
    return undefined
  }
  const target = war.get(info.index)
  if (!target) {
    return undefined
  }
  if (target.disabled) {
    return false
  }
  if (target.owner && FRIENDLY_OWNERS.has(target.owner)) {
    return false
  }
  return target.waypoints.some((index) => {
    const neighbour = war.get(index)
    return Boolean(neighbour && !neighbour.disabled && neighbour.owner && FRIENDLY_OWNERS.has(neighbour.owner))
  })
}

function planetComplete(info: PlanetInfo): boolean {
  return !info.defense && info.liberation >= 100
}

interface ResolvedTask {
  front?: FrontId
  planet?: MajorOrderPlanet
}

function resolveTask(
  task: RawTask,
  planets: Map<number, PlanetInfo>,
  war: Map<number, WarPlanet> | null,
): ResolvedTask {
  const target = taskTarget(task)
  if (target.planet === undefined) {
    return { front: target.front }
  }
  const info = planets.get(target.planet)
  if (!info) {
    return {}
  }
  const available = planetAvailability(info, war)
  return {
    front: planetComplete(info) || available === false ? undefined : info.front,
    planet: {
      index: target.planet,
      name: info.name,
      front: info.front,
      liberation: info.liberation,
      ...(available === undefined ? {} : { available }),
    },
  }
}

// Pure: normalizes raw API payloads into the selection the host's picker
// offers. Exported for tests. Returns null when no front is active. The fronts
// are the order's currently fightable planets only: a liberated target or one
// still gated behind another capture does not pin its faction yet. Kill orders
// name a faction directly and keep it without a planet.
export function normalizeMajorOrder(
  assignments: unknown,
  campaign: unknown,
  planets?: unknown,
): MajorOrderSelection | null {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return null
  }
  const assignment = assignments[0] as RawAssignment
  const campaignPlanets = planetIndex(campaign)
  const warPlanets = warPlanetIndex(planets)
  const fronts: FrontId[] = []
  const ordered: MajorOrderPlanet[] = []
  const tasks = Array.isArray(assignment.tasks) ? assignment.tasks : []
  for (const task of tasks) {
    const { front, planet } = resolveTask(task, campaignPlanets, warPlanets)
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
// A known planet is always resolved: it may be gated or already liberated, but
// that is an availability fact, not a decoding gap.
export function unresolvedTasks(assignments: unknown, campaign: unknown, planets?: unknown): RawTask[] {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return []
  }
  const campaignPlanets = planetIndex(campaign)
  const warPlanets = warPlanetIndex(planets)
  const tasks = (assignments[0] as RawAssignment).tasks
  return (Array.isArray(tasks) ? tasks : []).filter((task) => {
    const target = taskTarget(task)
    if (target.planet !== undefined) {
      return !campaignPlanets.has(target.planet) && !warPlanets?.has(target.planet)
    }
    return target.front === undefined
  })
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
// has no active front (`no-front`), or a failed/garbled response. Kept separate
// from normalizeMajorOrder so the distinction is testable without a network
// call.
export type MajorOrderFetch
  = | { status: 'active', order: MajorOrderSelection }
    | { status: 'none', order: null }
    | { status: 'no-front', order: null }
    | { status: 'unavailable', order: null }

export function resolveMajorOrder(
  assignments: unknown,
  campaign: unknown,
  planets?: unknown,
): MajorOrderFetch {
  if (!Array.isArray(assignments)) {
    return { status: 'unavailable', order: null }
  }
  if (assignments.length === 0) {
    return { status: 'none', order: null }
  }
  const order = normalizeMajorOrder(assignments, campaign, planets)
  return order ? { status: 'active', order } : { status: 'no-front', order: null }
}

// Best-effort live fetch. A kill switch (`GRIFFDIVE_DISABLE_MO_API=1`) reads as
// unavailable; a transport failure throws so the route can fall back to cache.
// The planet roster is optional: if it fails, fronts fall back to every
// incomplete target instead of blanking the order.
let warnedPlanets = false
export async function fetchMajorOrder(): Promise<MajorOrderFetch> {
  if (process.env.GRIFFDIVE_DISABLE_MO_API === '1') {
    return { status: 'unavailable', order: null }
  }
  const headers = {
    'X-Super-Client': 'griffdive',
    'X-Super-Contact': process.env.GRIFFDIVE_MO_CONTACT ?? 'https://github.com/anomalyco/opencode',
    'Accept': 'application/json',
  }
  const [assignments, campaign, planets] = await Promise.all([
    fetchJson(ASSIGNMENTS_URL, headers),
    fetchJson(CAMPAIGN_URL, { Accept: 'application/json' }),
    fetchJson(PLANETS_URL, headers).catch(() => {
      if (!warnedPlanets) {
        warnedPlanets = true
        console.warn('[major-order] planet roster unavailable; fronts not filtered by availability')
      }
      return null
    }),
  ])
  reportUnresolved(unresolvedTasks(assignments, campaign, planets))
  return resolveMajorOrder(assignments, campaign, planets)
}
