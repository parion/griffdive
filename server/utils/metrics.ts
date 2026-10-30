import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from '@prometheus-io/client'
import { ENGINE_VERSION, MAX_DIFFICULTY, MIN_DIFFICULTY } from '~~/shared/engine/config'
import { activeDivers, diverOptions, diverRolledCeiling, diverValor, squadSize } from '~~/shared/engine/selectors'
import { topTierOf } from '~~/shared/engine/rewards'
import { tieredItem } from '~~/shared/engine/tierList'
import { DIVE_PHASES } from '~~/shared/engine/types'
import type { DivePhase, DiveState, EngineAction } from '~~/shared/engine/types'
import type { FeedbackCategory } from '~~/shared/types/feedback'
import { isPeerSilent } from './peer-presence'
import type { PeerDirectory, RoomCensusEntry } from './room-sync'

// Live signals the gauges snapshot at scrape time. Injected by the metrics
// plugin so this module stays Nitro-free and unit-testable.
export interface RoomMetricsSource {
  peers: PeerDirectory
}

export type HelloResult
  = | 'new'
    | 'rejoin'
    | 'reclaim'
    | 'room_not_found'
    | 'full'
    | 'locked'
    | 'bad_code'
    | 'rate_limited'
    | 'removed'

export type FeedbackRejection = 'rate_limited' | 'invalid' | 'too_large' | 'malformed'

export interface RoomMetrics {
  registry: Registry
  bind(source: RoomMetricsSource): void

  // Room lifecycle (HTTP + WS boundaries).
  recordRoomCreated(source: 'fresh' | 'resumed'): void
  recordRoomCreateRejected(reason: 'rate_limited' | 'cap' | 'invalid_save'): void
  recordRoomLookup(result: 'found' | 'missing'): void
  recordHttpRequest(path: string, status: number): void
  recordHello(result: HelloResult): void
  recordRejoin(gapMs: number): void
  recordJoin(kind: 'new' | 'mid_crusade' | 'reclaim'): void
  recordDeparture(kind: 'left' | 'kicked'): void
  recordPresence(direction: 'away' | 'returned'): void
  recordHostTransfer(reason: 'disconnect' | 'offline_host'): void
  recordDiveStarted(): void
  recordRoomsSwept(count: number): void
  recordPeersReaped(count: number): void
  recordSessionEnded(kind: 'lobby' | 'crusade', seconds: number): void

  // Feedback inbox (aggregate only: category and refusal reason, never text).
  recordFeedback(category: FeedbackCategory): void
  recordFeedbackRejected(reason: FeedbackRejection): void

  // Gameplay, derived at the action seam.
  recordAction(before: DiveState, after: DiveState, action: EngineAction): void
  recordDirectiveRefused(condition: string, difficulty: number): void

  // Room health.
  trackRoom(code: string, phase: DivePhase, now?: number): void
  observePhaseTransition(code: string, nextPhase: DivePhase, now?: number): void
  census(entries: readonly RoomCensusEntry[]): void
}

const DIFFICULTIES: readonly number[] = Array.from(
  { length: MAX_DIFFICULTY - MIN_DIFFICULTY + 1 },
  (_, index) => MIN_DIFFICULTY + index,
)

const PHASE_SECONDS_BUCKETS = [
  10, 30, 60, 120, 300, 900, 1800, 3600, 6 * 3600, 12 * 3600, 24 * 3600, 3 * 24 * 3600, 7 * 24 * 3600,
]
const VALOR_BUCKETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 16, 20, 25]
const PACT_PICK_BUCKETS = [0, 1, 2, 3]
const SQUAD_SIZE_BUCKETS = [1, 2, 3, 4]
const SAMPLE_BUCKETS = [0, 1, 2, 3, 5, 8, 12, 18, 25, 35, 50, 75, 100]
const TIME_PCT_BUCKETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const STAR_BUCKETS = [1, 2, 3, 4, 5]
const SESSION_SECONDS_BUCKETS = [
  60,
  5 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
  2 * 3600,
  4 * 3600,
  8 * 3600,
  12 * 3600,
  24 * 3600,
  2 * 24 * 3600,
  7 * 24 * 3600,
  14 * 24 * 3600,
  30 * 24 * 3600,
]

// The census map is best-effort bookkeeping, not state: bound it so a flood of
// short-lived rooms can never grow the process.
const MAX_TRACKED_ROOMS = 5000

export function statusClass(status: number): string {
  if (status >= 500) {
    return '5xx'
  }
  if (status >= 400) {
    return '4xx'
  }
  if (status >= 300) {
    return '3xx'
  }
  if (status >= 200) {
    return '2xx'
  }
  return 'other'
}

// Bounded route buckets for cold HTTP hits. Client-side navigation and the PWA
// service worker never reach the server, so this reads as arrivals, not views.
export function routeKey(path: string): string {
  if (path === '/') {
    return 'bridge'
  }
  if (path === '/dive' || path.startsWith('/dive/')) {
    return 'dive'
  }
  if (path === '/codex') {
    return 'codex'
  }
  if (path === '/kit') {
    return 'kit'
  }
  if (path === '/api/rooms') {
    return 'api_rooms'
  }
  if (path.startsWith('/api/rooms/')) {
    return 'api_room'
  }
  if (path.startsWith('/api/')) {
    return 'api_war'
  }
  // A final segment with a dot is a file: hashed bundles, fonts, icons, images,
  // the service worker. Anything else is an unknown path — typos, probes, stale
  // links — which is worth its own bucket rather than hiding among assets.
  const lastSegment = path.slice(path.lastIndexOf('/') + 1)
  return lastSegment.includes('.') ? 'assets' : 'other'
}

export function gapBucket(gapMs: number): string {
  if (gapMs < 60 * 60 * 1000) {
    return '<1h'
  }
  if (gapMs < 6 * 60 * 60 * 1000) {
    return '1-6h'
  }
  if (gapMs < 24 * 60 * 60 * 1000) {
    return '6-24h'
  }
  return '>1d'
}

// Labelled with the tier the item was played at: a custom tier list re-tiers
// the economy, and the counters track the economy, not the catalog.
function itemLabels(itemId: string | null | undefined, state: DiveState): { tier: string, category: string } | null {
  if (!itemId) {
    return null
  }
  const item = tieredItem(itemId, state.tierList)
  return item ? { tier: item.tier, category: item.category } : null
}

export function createRoomMetrics(): RoomMetrics {
  const registry = new Registry()
  collectDefaultMetrics({ register: registry })

  // -- room lifecycle --------------------------------------------------------

  const divesStarted = new Counter({
    name: 'griffdive_dives_started_total',
    help: 'Crusades launched (START_DIVE) since process start',
    registers: [registry],
  })

  const roomsCreated = new Counter({
    name: 'griffdive_rooms_created_total',
    help: 'Rooms created (fresh lobbies vs sessions resumed from a save)',
    labelNames: ['source'],
    registers: [registry],
  })

  const roomCreateRejected = new Counter({
    name: 'griffdive_room_create_rejected_total',
    help: 'Room creations refused, by reason',
    labelNames: ['reason'],
    registers: [registry],
  })

  const roomLookups = new Counter({
    name: 'griffdive_room_lookups_total',
    help: 'GET /api/rooms/:code lookups, found vs missing (dead invite links)',
    labelNames: ['result'],
    registers: [registry],
  })

  const httpRequests = new Counter({
    name: 'griffdive_http_requests_total',
    help: 'Cold HTTP hits by route bucket (client-side navigation and the PWA cache are invisible)',
    labelNames: ['route', 'status'],
    registers: [registry],
  })

  const hello = new Counter({
    name: 'griffdive_ws_hello_total',
    help: 'WebSocket join attempts, by result',
    labelNames: ['result'],
    registers: [registry],
  })

  const rejoins = new Counter({
    name: 'griffdive_rejoins_total',
    help: 'Returning divers (a known seat or a reclaimed cache), by silence gap',
    labelNames: ['gap'],
    registers: [registry],
  })

  const joins = new Counter({
    name: 'griffdive_divers_joined_total',
    help: 'New seats taken, by kind',
    labelNames: ['kind'],
    registers: [registry],
  })

  const departures = new Counter({
    name: 'griffdive_divers_departed_total',
    help: 'Divers who left their seat, by kind',
    labelNames: ['kind'],
    registers: [registry],
  })

  const presenceChanges = new Counter({
    name: 'griffdive_presence_changes_total',
    help: 'Divers stepping away mid-crusade and coming back',
    labelNames: ['direction'],
    registers: [registry],
  })

  const hostTransfers = new Counter({
    name: 'griffdive_host_transfers_total',
    help: 'Host migrations, by cause',
    labelNames: ['reason'],
    registers: [registry],
  })

  const roomsSwept = new Counter({
    name: 'griffdive_rooms_swept_total',
    help: 'Rooms reaped by the idle-TTL sweeper (their squad never saved them)',
    registers: [registry],
  })

  const peersReaped = new Counter({
    name: 'griffdive_presence_reaped_total',
    help: 'Silent connections dropped by the presence sweeper (they would otherwise count as online)',
    registers: [registry],
  })

  const sessionDuration = new Histogram({
    name: 'griffdive_session_duration_seconds',
    help: 'How long a room stayed active from creation to its last event, observed when it ages out',
    labelNames: ['kind'],
    buckets: SESSION_SECONDS_BUCKETS,
    registers: [registry],
  })

  // -- feedback inbox -------------------------------------------------------

  const feedback = new Counter({
    name: 'griffdive_feedback_total',
    help: 'Feedback notes stored, by category (never by content)',
    labelNames: ['category'],
    registers: [registry],
  })

  const feedbackRejected = new Counter({
    name: 'griffdive_feedback_rejected_total',
    help: 'Feedback submissions refused, by reason',
    labelNames: ['reason'],
    registers: [registry],
  })

  // -- gameplay, at the action seam -----------------------------------------

  const missionsStarted = new Counter({
    name: 'griffdive_missions_started_total',
    help: 'Missions begun (crusade launch plus every advance), by difficulty',
    labelNames: ['difficulty'],
    registers: [registry],
  })

  const operationRestarts = new Counter({
    name: 'griffdive_operation_restarts_total',
    help: 'Operations restarted after a failed mission, by difficulty',
    labelNames: ['difficulty'],
    registers: [registry],
  })

  const operationsCompleted = new Counter({
    name: 'griffdive_operations_completed_total',
    help: 'Operations completed (difficulty ladder climbed), by difficulty completed',
    labelNames: ['difficulty'],
    registers: [registry],
  })

  const crusadesAchieved = new Counter({
    name: 'griffdive_crusades_achieved_total',
    help: 'Crusades that reached difficulty 10 and completed',
    registers: [registry],
  })

  const crusadesEnded = new Counter({
    name: 'griffdive_crusades_ended_total',
    help: 'Crusades closed with END_DIVE before achieving',
    registers: [registry],
  })

  const reports = new Counter({
    name: 'griffdive_reports_total',
    help: 'Mission reports filed (honor-system), by outcome and difficulty',
    labelNames: ['outcome', 'difficulty'],
    registers: [registry],
  })

  const directiveDecisions = new Counter({
    name: 'griffdive_directive_decisions_total',
    help: 'Squad directive calls, by decision, rule and difficulty (flips count again)',
    labelNames: ['decision', 'condition', 'difficulty'],
    registers: [registry],
  })

  const directiveRefusals = new Counter({
    name: 'griffdive_directive_refusals_total',
    help: 'Accepted directives the engine refused because a diver could not field them',
    labelNames: ['condition', 'difficulty'],
    registers: [registry],
  })

  const strainDecisions = new Counter({
    name: 'griffdive_strain_decisions_total',
    help: 'Strain calls, by decision and subfaction',
    labelNames: ['decision', 'strain'],
    registers: [registry],
  })

  const majorOrders = new Counter({
    name: 'griffdive_major_order_total',
    help: 'Crusade front plans chosen at setup (live order, manual lock, rolled)',
    labelNames: ['kind'],
    registers: [registry],
  })

  const wheelRerolls = new Counter({
    name: 'griffdive_wheel_rerolls_total',
    help: 'Wheel rerolls, by wheel turned',
    labelNames: ['kind'],
    registers: [registry],
  })

  const pactPicksTotal = new Counter({
    name: 'griffdive_pacts_picked_total',
    help: 'Pacts newly sworn, by rule',
    labelNames: ['condition'],
    registers: [registry],
  })

  const pactFailures = new Counter({
    name: 'griffdive_pacts_failed_total',
    help: 'Pacts marked failed in the field, by rule',
    labelNames: ['condition'],
    registers: [registry],
  })

  const directiveFailures = new Counter({
    name: 'griffdive_directives_failed_total',
    help: 'Squad directives marked failed in the field, by rule',
    labelNames: ['condition'],
    registers: [registry],
  })

  const rewardsPicked = new Counter({
    name: 'griffdive_rewards_picked_total',
    help: 'Reward drafts settled, by item tier and category',
    labelNames: ['tier', 'category'],
    registers: [registry],
  })

  const purchases = new Counter({
    name: 'griffdive_purchases_total',
    help: 'Requisition purchases, by item tier and category',
    labelNames: ['tier', 'category'],
    registers: [registry],
  })

  const armorPacksOpened = new Counter({
    name: 'griffdive_armor_packs_opened_total',
    help: 'Brasch Armor Packs opened, by difficulty',
    labelNames: ['difficulty'],
    registers: [registry],
  })

  const armorPackPulls = new Counter({
    name: 'griffdive_armor_pack_pulls_total',
    help: 'Armor Pack cards dealt, by tier',
    labelNames: ['tier'],
    registers: [registry],
  })

  const forfeits = new Counter({
    name: 'griffdive_forfeits_total',
    help: 'Items surrendered after a failed mission, by tier and category',
    labelNames: ['tier', 'category'],
    registers: [registry],
  })

  const rewardRerolls = new Counter({
    name: 'griffdive_reward_rerolls_total',
    help: 'Reward tokens spent redrawing a draft',
    registers: [registry],
  })

  const rewardBans = new Counter({
    name: 'griffdive_reward_bans_total',
    help: 'Reward tokens spent banning offered items',
    registers: [registry],
  })

  const honorsSpun = new Counter({
    name: 'griffdive_honors_spun_total',
    help: 'Bonus honors ceremonies spun',
    registers: [registry],
  })

  const honorsAwarded = new Counter({
    name: 'griffdive_honors_awarded_total',
    help: 'Bonus honors ceremonies resolved to a winner',
    registers: [registry],
  })

  const warbondEdits = new Counter({
    name: 'griffdive_warbond_edits_total',
    help: 'Explicit warbond declarations (the default is everyone-owns-everything, so only edits carry signal)',
    registers: [registry],
  })

  const ceilingRolled = new Counter({
    name: 'griffdive_ceiling_total',
    help: 'Top rolled loot tier per diver at report, by tier — the risk economy realized',
    labelNames: ['tier'],
    registers: [registry],
  })

  // -- distributions ---------------------------------------------------------

  const phaseDwell = new Histogram({
    name: 'griffdive_phase_dwell_seconds',
    help: 'Seconds a room spent in a phase before leaving it (best-effort across boots)',
    labelNames: ['phase'],
    buckets: PHASE_SECONDS_BUCKETS,
    registers: [registry],
  })

  const valorAtReport = new Histogram({
    name: 'griffdive_valor_at_report',
    help: 'Valor staked by each diving diver at report time (0 = base tier only)',
    buckets: VALOR_BUCKETS,
    registers: [registry],
  })

  const pactPicks = new Histogram({
    name: 'griffdive_pact_picks',
    help: 'Pacts locked per present diver per mission',
    buckets: PACT_PICK_BUCKETS,
    registers: [registry],
  })

  const squadSizes = new Histogram({
    name: 'griffdive_squad_size',
    help: 'Present divers when a mission begins',
    buckets: SQUAD_SIZE_BUCKETS,
    registers: [registry],
  })

  const samplesHaul = new Histogram({
    name: 'griffdive_samples_haul',
    help: 'Samples reported per rarity on a successful mission',
    labelNames: ['rarity'],
    buckets: SAMPLE_BUCKETS,
    registers: [registry],
  })

  const reportTimePct = new Histogram({
    name: 'griffdive_report_time_pct',
    help: 'Reported time remaining at extraction, 0–100',
    buckets: TIME_PCT_BUCKETS,
    registers: [registry],
  })

  const missionStars = new Histogram({
    name: 'griffdive_mission_stars',
    help: 'Stars on a successful report, by difficulty (failures award none)',
    labelNames: ['difficulty'],
    buckets: STAR_BUCKETS,
    registers: [registry],
  })

  // -- scrape-time state -----------------------------------------------------

  let censusEntries: readonly RoomCensusEntry[] = []

  new Gauge({
    name: 'griffdive_online_players',
    help: 'Divers with a live, seated connection across all rooms',
    registers: [registry],
    collect() {
      this.set(presence().players)
    },
  })

  new Gauge({
    name: 'griffdive_active_rooms',
    help: 'Rooms with at least one seated diver connected',
    registers: [registry],
    collect() {
      this.set(presence().rooms)
    },
  })

  // Gauges are registry-owned: the registry keeps them alive and invokes
  // their collect() at scrape time, so no handles are kept. Every label is
  // preset so a phase or difficulty at zero still renders as a zero series
  // instead of vanishing from the graph.
  new Gauge({
    name: 'griffdive_rooms_by_phase',
    help: 'Stored rooms in each phase, from the last census pass',
    labelNames: ['phase'],
    registers: [registry],
    collect() {
      this.reset()
      const counts = new Map<string, number>()
      for (const entry of censusEntries) {
        counts.set(entry.phase, (counts.get(entry.phase) ?? 0) + 1)
      }
      for (const phase of DIVE_PHASES) {
        this.set({ phase }, counts.get(phase) ?? 0)
      }
    },
  })

  new Gauge({
    name: 'griffdive_room_difficulty',
    help: 'Stored rooms by their current difficulty, from the last census pass',
    labelNames: ['difficulty'],
    registers: [registry],
    collect() {
      this.reset()
      const counts = new Map<number, number>()
      for (const entry of censusEntries) {
        counts.set(entry.difficulty, (counts.get(entry.difficulty) ?? 0) + 1)
      }
      for (const difficulty of DIFFICULTIES) {
        this.set({ difficulty: String(difficulty) }, counts.get(difficulty) ?? 0)
      }
    },
  })

  new Gauge({
    name: 'griffdive_saved_dives',
    help: 'Rooms pinned as saved dives (cap is 500)',
    registers: [registry],
    collect() {
      this.set(censusEntries.filter(entry => entry.saved).length)
    },
  })

  const buildInfo = new Gauge({
    name: 'griffdive_build_info',
    help: 'Always 1 — the labels carry the running build, so deploys annotate every other series',
    labelNames: ['engine', 'image'],
    registers: [registry],
  })
  buildInfo.set({
    engine: String(ENGINE_VERSION),
    image: (process.env.FLY_IMAGE_REF ?? process.env.FLY_MACHINE_VERSION ?? 'dev').slice(0, 80),
  }, 1)

  // -- phase dwell bookkeeping ----------------------------------------------

  const trackedPhases = new Map<string, { phase: DivePhase, at: number }>()

  function trackRoom(code: string, phase: DivePhase, at: number = Date.now()): void {
    if (trackedPhases.size > MAX_TRACKED_ROOMS) {
      trackedPhases.clear()
    }
    trackedPhases.set(code, { phase, at })
  }

  function observePhaseTransition(code: string, nextPhase: DivePhase, now: number = Date.now()): void {
    const seen = trackedPhases.get(code)
    if (!seen) {
      trackRoom(code, nextPhase, now)
      return
    }
    if (seen.phase === nextPhase) {
      return
    }
    phaseDwell.observe({ phase: seen.phase }, Math.max(0, (now - seen.at) / 1000))
    trackRoom(code, nextPhase, now)
  }

  // -- presence --------------------------------------------------------------

  // PlayerIds are unique per room, so a Set across rooms counts distinct
  // divers. Pre-hello sockets are not divers, and a silent socket stops
  // counting at the same threshold the sweeper uses even before it is reaped.
  function presence(): { players: number, rooms: number } {
    const directory = source?.peers
    if (!directory) {
      return { players: 0, rooms: 0 }
    }
    const now = Date.now()
    const players = new Set<string>()
    let rooms = 0
    for (const roomCode of directory.rooms()) {
      let seated = false
      for (const peer of directory.list(roomCode)) {
        const playerId = peer.context.playerId
        if (typeof playerId !== 'string' || isPeerSilent(peer.context.lastSeenAt, now)) {
          continue
        }
        players.add(playerId)
        seated = true
      }
      if (seated) {
        rooms += 1
      }
    }
    return { players: players.size, rooms }
  }

  let source: RoomMetricsSource | null = null

  // Every gameplay counter is derived from a (before, after) pair the server
  // already holds: the reducer is the single source of truth for the rules, so
  // the observability layer only reads the two states it produced.
  function recordAction(before: DiveState, after: DiveState, action: EngineAction): void {
    if (before.phase === 'pacts' && after.phase !== 'pacts') {
      for (const diver of activeDivers(after)) {
        pactPicks.observe(diver.pactIds.length)
      }
    }
    // A forfeit that no longer waits on anyone restarts the operation at the
    // spin — from FORFEIT_ITEM, but also from a leave/kick/step-away.
    if (before.phase === 'forfeit' && after.phase === 'spin') {
      operationRestarts.inc({ difficulty: String(after.difficulty) })
    }
    if (after.achieved && !before.achieved) {
      crusadesAchieved.inc()
    }

    const condition = after.wheel?.misfortuneId ?? 'unknown'

    switch (action.type) {
      case 'START_DIVE': {
        missionsStarted.inc({ difficulty: String(after.difficulty) })
        squadSizes.observe(squadSize(after))
        majorOrders.inc({ kind: after.majorOrder?.live ? 'live' : after.majorOrder ? 'manual' : 'rolled' })
        break
      }
      case 'ACCEPT_MISFORTUNE': {
        directiveDecisions.inc({
          decision: action.accepted ? 'accepted' : 'declined',
          condition,
          difficulty: String(after.difficulty),
        })
        break
      }
      case 'ACCEPT_STRAIN': {
        strainDecisions.inc({
          decision: action.accepted ? 'accepted' : 'declined',
          strain: after.strainId ?? 'unknown',
        })
        break
      }
      case 'REROLL_WHEEL': {
        wheelRerolls.inc({ kind: action.wheel })
        break
      }
      case 'SET_PACTS': {
        const prior = new Set(before.divers.find(diver => diver.id === action.playerId)?.pactIds ?? [])
        for (const pactId of after.divers.find(diver => diver.id === action.playerId)?.pactIds ?? []) {
          if (!prior.has(pactId)) {
            pactPicksTotal.inc({ condition: pactId })
          }
        }
        break
      }
      case 'FAIL_PACT': {
        pactFailures.inc({ condition: action.pactId })
        break
      }
      case 'FAIL_MISFORTUNE': {
        directiveFailures.inc({ condition })
        break
      }
      case 'REPORT_RESULT': {
        const difficulty = String(before.difficulty)
        reports.inc({ outcome: action.outcome, difficulty })
        if (action.outcome === 'success') {
          missionStars.observe({ difficulty }, action.stars)
        }
        if (action.samples) {
          samplesHaul.observe({ rarity: 'common' }, action.samples.common)
          samplesHaul.observe({ rarity: 'rare' }, action.samples.rare)
          samplesHaul.observe({ rarity: 'super' }, action.samples.super)
        }
        if (typeof action.timePct === 'number') {
          reportTimePct.observe(Math.min(Math.max(action.timePct, 0), 100))
        }
        // Valor and the top rolled loot tier are read at the report: offerSeed
        // lands there, no pact can change anymore, and this is the risk the
        // mission actually ran on.
        for (const diver of activeDivers(after)) {
          valorAtReport.observe(diverValor(after, diver))
          // A failure has no loot offer; its forfeit still rolls the same
          // Valor-capped ceiling, so keep the risk signal comparable.
          const top = topTierOf(diverOptions(after, diver)) ?? diverRolledCeiling(after, diver)
          ceilingRolled.inc({ tier: top.toLowerCase() })
        }
        break
      }
      case 'PICK_REWARD': {
        const picked = after.divers.find(diver => diver.id === action.playerId)?.pickedOptionId
        const labels = itemLabels(picked, after)
        if (labels) {
          rewardsPicked.inc(labels)
        }
        break
      }
      case 'BUY_ITEM': {
        const labels = itemLabels(action.itemId, after)
        if (labels) {
          purchases.inc(labels)
        }
        break
      }
      case 'BUY_ARMOR_PACK': {
        const diver = after.divers.find(entry => entry.id === action.playerId)
        const pack = diver?.bargain?.pack
        if (pack) {
          armorPacksOpened.inc({ difficulty: String(after.difficulty) })
          for (const itemId of pack.itemIds) {
            const labels = itemLabels(itemId, after)
            if (labels) {
              armorPackPulls.inc({ tier: labels.tier })
            }
          }
        }
        break
      }
      case 'FORFEIT_ITEM': {
        const labels = itemLabels(action.itemId, after)
        if (labels) {
          forfeits.inc(labels)
        }
        break
      }
      case 'REROLL_REWARDS': {
        rewardRerolls.inc()
        break
      }
      case 'BAN_REWARDS': {
        rewardBans.inc()
        break
      }
      case 'SPIN_BONUS': {
        honorsSpun.inc()
        break
      }
      case 'AWARD_BONUS': {
        honorsAwarded.inc()
        break
      }
      case 'SET_WARBONDS': {
        warbondEdits.inc()
        break
      }
      case 'LEAVE_DIVE': {
        departures.inc({ kind: 'left' })
        break
      }
      case 'KICK_DIVER': {
        departures.inc({ kind: 'kicked' })
        break
      }
      case 'ADVANCE': {
        // The operation closed when the ladder stepped up, or when the final
        // operation ended the crusade (difficulty stays pinned at 10 there).
        if (after.difficulty === before.difficulty + 1 || (after.achieved && !before.achieved)) {
          operationsCompleted.inc({ difficulty: String(before.difficulty) })
        }
        if (after.phase === 'spin') {
          missionsStarted.inc({ difficulty: String(after.difficulty) })
          squadSizes.observe(squadSize(after))
        }
        break
      }
      case 'END_DIVE': {
        if (before.phase !== 'complete') {
          crusadesEnded.inc()
        }
        break
      }
      default:
        break
    }
  }

  return {
    registry,
    bind(next: RoomMetricsSource) {
      source = next
    },
    recordRoomCreated(createdSource) {
      roomsCreated.inc({ source: createdSource })
    },
    recordRoomCreateRejected(reason) {
      roomCreateRejected.inc({ reason })
    },
    recordRoomLookup(result) {
      roomLookups.inc({ result })
    },
    recordHttpRequest(path, status) {
      httpRequests.inc({ route: routeKey(path), status: statusClass(status) })
    },
    recordHello(result) {
      hello.inc({ result })
    },
    recordRejoin(gapMs) {
      rejoins.inc({ gap: gapBucket(gapMs) })
    },
    recordJoin(kind) {
      joins.inc({ kind })
    },
    recordDeparture(kind) {
      departures.inc({ kind })
    },
    recordPresence(direction) {
      presenceChanges.inc({ direction })
    },
    recordHostTransfer(reason) {
      hostTransfers.inc({ reason })
    },
    recordDiveStarted() {
      divesStarted.inc()
    },
    recordRoomsSwept(count) {
      if (count > 0) {
        roomsSwept.inc(count)
      }
    },
    recordPeersReaped(count) {
      if (count > 0) {
        peersReaped.inc(count)
      }
    },
    recordSessionEnded(kind, seconds) {
      if (Number.isFinite(seconds) && seconds >= 0) {
        sessionDuration.observe({ kind }, seconds)
      }
    },
    recordFeedback(category) {
      feedback.inc({ category })
    },
    recordFeedbackRejected(reason) {
      feedbackRejected.inc({ reason })
    },
    recordDirectiveRefused(condition, difficulty) {
      directiveRefusals.inc({ condition, difficulty: String(difficulty) })
    },
    trackRoom(code, phase, now) {
      trackRoom(code, phase, now)
    },
    observePhaseTransition(code, nextPhase, now) {
      observePhaseTransition(code, nextPhase, now)
    },
    census(entries) {
      censusEntries = entries
      const live = new Set(entries.map(entry => entry.code))
      for (const code of trackedPhases.keys()) {
        if (!live.has(code)) {
          trackedPhases.delete(code)
        }
      }
    },
    recordAction(before, after, action) {
      recordAction(before, after, action)
    },
  }
}

// One registry per process, shared by the sync core and the scrape plugin.
export const roomMetrics = createRoomMetrics()
