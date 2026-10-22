import { describe, expect, it } from 'vitest'
import { createDiveState, reduce } from '~~/shared/engine/reducer'
import { createLobbyState, joinDiver } from '~~/shared/engine/room'
import { diverOptions, forfeitOptionsFor, pactOfferFor } from '~~/shared/engine/selectors'
import type { DiveState, EngineAction } from '~~/shared/engine/types'
import { createRoomMetrics, gapBucket, routeKey, statusClass } from './metrics'
import { createPeerDirectory } from './room-sync'
import type { PeerLike } from './room-sync'

function fakePeer(id: string, playerId?: string): PeerLike {
  return {
    id,
    context: playerId ? { playerId } : {},
    send: () => {},
  }
}

// The drive loop mirrors the server: the reducer decides, and the observability
// layer only ever sees the pairs it produced. A no-op reduction is not recorded.
function apply(metrics: ReturnType<typeof createRoomMetrics>, before: DiveState, action: EngineAction): DiveState {
  const after = reduce(before, action)
  if (after !== before) {
    metrics.recordAction(before, after, action)
  }
  return after
}

describe('room-metrics', () => {
  it('counts distinct seated players and active rooms', async () => {
    const peers = createPeerDirectory()
    peers.add('AB3C45', fakePeer('ws-1', 'p1'))
    peers.add('AB3C45', fakePeer('ws-2', 'p1')) // same diver, second tab
    peers.add('AB3C45', fakePeer('ws-3')) // connected, not yet seated
    peers.add('XY8Z90', fakePeer('ws-4', 'p2'))

    const metrics = createRoomMetrics()
    metrics.bind({ peers })
    metrics.recordDiveStarted()
    metrics.recordDiveStarted()

    const text = await metrics.registry.metrics()
    expect(text).toContain('griffdive_online_players 2')
    expect(text).toContain('griffdive_active_rooms 2')
    expect(text).toContain('griffdive_dives_started_total 2')
  })

  it('renders zeroes without throwing before the plugin binds a source', async () => {
    const metrics = createRoomMetrics()

    const text = await metrics.registry.metrics()
    expect(text).toContain('griffdive_online_players 0')
    expect(text).toContain('griffdive_active_rooms 0')
    expect(text).toContain('griffdive_dives_started_total 0')
  })

  it('buckets HTTP hits and arrival gaps', () => {
    expect(routeKey('/')).toBe('bridge')
    expect(routeKey('/dive/AB3C45')).toBe('dive')
    expect(routeKey('/codex')).toBe('codex')
    expect(routeKey('/api/rooms')).toBe('api_rooms')
    expect(routeKey('/api/rooms/AB3C45')).toBe('api_room')
    expect(routeKey('/api/war/major-order')).toBe('api_war')
    expect(routeKey('/_nuxt/entry.js')).toBe('assets')
    expect(routeKey('/icon.svg')).toBe('assets')
    expect(routeKey('/no-such-page')).toBe('other')

    expect(statusClass(204)).toBe('2xx')
    expect(statusClass(302)).toBe('3xx')
    expect(statusClass(404)).toBe('4xx')
    expect(statusClass(503)).toBe('5xx')

    expect(gapBucket(5 * 60_000)).toBe('<1h')
    expect(gapBucket(2 * 60 * 60_000)).toBe('1-6h')
    expect(gapBucket(10 * 60 * 60_000)).toBe('6-24h')
    expect(gapBucket(2 * 24 * 60 * 60_000)).toBe('>1d')
  })

  it('counts the room lifecycle at the HTTP and WS boundaries', async () => {
    const metrics = createRoomMetrics()
    metrics.recordRoomCreated('fresh')
    metrics.recordRoomCreated('resumed')
    metrics.recordRoomCreateRejected('cap')
    metrics.recordRoomCreateRejected('rate_limited')
    metrics.recordRoomLookup('found')
    metrics.recordRoomLookup('missing')
    metrics.recordRoomLookup('missing')
    metrics.recordHttpRequest('/dive/AB3C45', 200)
    metrics.recordHttpRequest('/dive/AB3C45', 404)
    metrics.recordHttpRequest('/', 200)
    metrics.recordHello('new')
    metrics.recordHello('rejoin')
    metrics.recordHello('reclaim')
    metrics.recordHello('locked')
    metrics.recordRejoin(2 * 24 * 60 * 60_000)
    metrics.recordJoin('mid_crusade')
    metrics.recordDeparture('kicked')
    metrics.recordPresence('away')
    metrics.recordPresence('returned')
    metrics.recordHostTransfer('disconnect')
    metrics.recordRoomsSwept(3)

    const text = await metrics.registry.metrics()
    expect(text).toMatch(/griffdive_rooms_created_total\{source="fresh"\} 1/)
    expect(text).toMatch(/griffdive_rooms_created_total\{source="resumed"\} 1/)
    expect(text).toMatch(/griffdive_room_create_rejected_total\{reason="cap"\} 1/)
    expect(text).toMatch(/griffdive_room_lookups_total\{result="missing"\} 2/)
    expect(text).toMatch(/griffdive_http_requests_total\{route="dive",status="2xx"\} 1/)
    expect(text).toMatch(/griffdive_http_requests_total\{route="dive",status="4xx"\} 1/)
    expect(text).toMatch(/griffdive_http_requests_total\{route="bridge",status="2xx"\} 1/)
    expect(text).toMatch(/griffdive_ws_hello_total\{result="locked"\} 1/)
    expect(text).toMatch(/griffdive_rejoins_total\{gap=">1d"\} 1/)
    expect(text).toMatch(/griffdive_divers_joined_total\{kind="mid_crusade"\} 1/)
    expect(text).toMatch(/griffdive_divers_departed_total\{kind="kicked"\} 1/)
    expect(text).toMatch(/griffdive_presence_changes_total\{direction="away"\} 1/)
    expect(text).toMatch(/griffdive_host_transfers_total\{reason="disconnect"\} 1/)
    expect(text).toContain('griffdive_rooms_swept_total 3')
  })

  it('census gauges preset every phase and difficulty', async () => {
    const metrics = createRoomMetrics()
    metrics.trackRoom('AAA111', 'lobby', 0)
    metrics.trackRoom('BBB222', 'lobby', 0)
    metrics.trackRoom('CCC333', 'diving', 0)
    metrics.census([
      { code: 'AAA111', phase: 'lobby', difficulty: 3, saved: false },
      { code: 'BBB222', phase: 'lobby', difficulty: 5, saved: true },
      { code: 'CCC333', phase: 'diving', difficulty: 7, saved: false },
    ])

    const text = await metrics.registry.metrics()
    expect(text).toMatch(/griffdive_rooms_by_phase\{phase="lobby"\} 2/)
    expect(text).toMatch(/griffdive_rooms_by_phase\{phase="diving"\} 1/)
    expect(text).toMatch(/griffdive_rooms_by_phase\{phase="rewards"\} 0/)
    expect(text).toMatch(/griffdive_rooms_by_phase\{phase="complete"\} 0/)
    expect(text).toMatch(/griffdive_room_difficulty\{difficulty="3"\} 1/)
    expect(text).toMatch(/griffdive_room_difficulty\{difficulty="7"\} 1/)
    expect(text).toMatch(/griffdive_room_difficulty\{difficulty="10"\} 0/)
    expect(text).toContain('griffdive_saved_dives 1')
    expect(text).toMatch(/griffdive_build_info\{engine="\d+",image="[^"]+"\} 1/)
  })

  it('observes phase dwell once per transition, seeding unknown rooms silently', async () => {
    const metrics = createRoomMetrics()
    metrics.observePhaseTransition('NEWROOM', 'lobby', 1_000) // seeds, no observation
    metrics.observePhaseTransition('NEWROOM', 'lobby', 2_000) // same phase, no observation
    metrics.trackRoom('AAA111', 'lobby', 1_000)
    metrics.observePhaseTransition('AAA111', 'decision', 1_000 + 3_600_000)

    const text = await metrics.registry.metrics()
    expect(text).toMatch(/griffdive_phase_dwell_seconds_count\{phase="lobby"\} 1/)
    expect(text).toMatch(/griffdive_phase_dwell_seconds_sum\{phase="lobby"\} 3600/)
  })

  it('derives the mission loop and the risk economy from real reducer pairs', async () => {
    const metrics = createRoomMetrics()
    let state = joinDiver(createLobbyState(), 'p1', 'Diver One')!
    expect(state.phase).toBe('lobby')
    state = apply(metrics, state, { type: 'START_DIVE', settings: { variant: 'medium' } })
    expect(state.phase).toBe('spin')

    // Mission 1: spin, decline, deal, swear one pact the reducer accepts.
    state = apply(metrics, state, { type: 'SPIN_WHEEL', seed: 7 })
    state = apply(metrics, state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    if (state.phase === 'strain') {
      state = apply(metrics, state, { type: 'ACCEPT_STRAIN', accepted: false })
    }
    state = apply(metrics, state, { type: 'DEAL_PACTS' })
    let sworn: string | null = null
    for (const candidate of pactOfferFor(state, 'p1')) {
      const next = apply(metrics, state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [candidate.id] })
      if (next !== state) {
        state = next
        sworn = candidate.id
        break
      }
    }
    expect(sworn).not.toBeNull()
    expect(state.phase).toBe('diving')

    // A success banks a reward, then advances into mission 2.
    state = apply(metrics, state, {
      type: 'REPORT_RESULT',
      outcome: 'success',
      stars: 3,
      timePct: 80,
      samples: { common: 12, rare: 3, super: 0 },
    })
    expect(state.phase).toBe('rewards')
    const option = diverOptions(state, state.divers[0]!)[0]!
    state = apply(metrics, state, { type: 'PICK_REWARD', playerId: 'p1', optionId: option.optionId })
    state = apply(metrics, state, { type: 'ADVANCE' })
    expect(state.phase).toBe('spin')

    // Mission 2 fails: the earned item deals a forfeit, and the choice restarts
    // the operation at the same difficulty.
    state = apply(metrics, state, { type: 'SPIN_WHEEL', seed: 11 })
    state = apply(metrics, state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    state = apply(metrics, state, { type: 'DEAL_PACTS' })
    state = apply(metrics, state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    state = apply(metrics, state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 0 })
    expect(state.phase).toBe('forfeit')
    const owed = forfeitOptionsFor(state, state.divers[0]!)[0]!
    state = apply(metrics, state, { type: 'FORFEIT_ITEM', playerId: 'p1', itemId: owed.id })
    expect(state.phase).toBe('spin')
    expect(state.missionInOperation).toBe(1)

    const text = await metrics.registry.metrics()
    // Crusade launch plus the mission-2 advance.
    expect(text).toMatch(/griffdive_missions_started_total\{difficulty="3"\} 2/)
    expect(text).toMatch(/griffdive_squad_size_count 2/)
    expect(text.match(/griffdive_directive_decisions_total\{decision="declined",condition="[^"]+",difficulty="3"\} 1/g)).toHaveLength(2)
    expect(text).toMatch(new RegExp(`griffdive_pacts_picked_total\\{condition="${sworn}"\\} 1`))
    expect(text).toContain('griffdive_pact_picks_count 2')
    expect(text).toContain('griffdive_pact_picks_sum 1')
    expect(text).toMatch(/griffdive_reports_total\{outcome="success",difficulty="3"\} 1/)
    expect(text).toMatch(/griffdive_reports_total\{outcome="failure",difficulty="3"\} 1/)
    expect(text).toMatch(/griffdive_mission_stars_count\{difficulty="3"\} 1/)
    expect(text).toContain('griffdive_report_time_pct_count 1')
    expect(text).toMatch(/griffdive_samples_haul_count\{rarity="common"\} 1/)
    expect(text).toMatch(/griffdive_samples_haul_sum\{rarity="common"\} 12/)
    expect(text).toMatch(/griffdive_samples_haul_count\{rarity="super"\} 1/)
    expect(text).toContain('griffdive_valor_at_report_count 2')
    // Each diver rolls their own loot tier, so the two reports can land on
    // different tiers (and S+ is a two-character label).
    expect(text.match(/griffdive_ceiling_total\{tier="[a-s]\+?"\} 1/g)).toHaveLength(2)
    expect(text).toMatch(/griffdive_rewards_picked_total\{tier="[cbas]\+?",category="[^"]+"\} 1/)
    expect(text).toMatch(/griffdive_forfeits_total\{tier="[cbas]\+?",category="[^"]+"\} 1/)
    expect(text).toMatch(/griffdive_operation_restarts_total\{difficulty="3"\} 1/)
  })

  it('counts refused directives, operations completed and achievements', async () => {
    const metrics = createRoomMetrics()
    metrics.recordDirectiveRefused('noStratagems', 3)

    // Operation completion and the final climb come straight off the ladder
    // steps the reducer takes: difficulty +1 into a fresh operation, then the
    // achieved flag on the last one.
    const before = createDiveState({ variant: 'medium' }, 'p1', 'Diver One')
    const nextOperation: DiveState = {
      ...before,
      phase: 'spin',
      difficulty: 4,
      missionInOperation: 1,
      achieved: false,
    }
    metrics.recordAction(before, nextOperation, { type: 'ADVANCE' })

    const finalMission: DiveState = { ...before, phase: 'rewards', difficulty: 10, missionInOperation: 3 }
    const achieved: DiveState = { ...finalMission, phase: 'complete', achieved: true }
    metrics.recordAction(finalMission, achieved, { type: 'ADVANCE' })

    const text = await metrics.registry.metrics()
    expect(text).toMatch(/griffdive_directive_refusals_total\{condition="noStratagems",difficulty="3"\} 1/)
    expect(text).toMatch(/griffdive_operations_completed_total\{difficulty="3"\} 1/)
    expect(text).toMatch(/griffdive_operations_completed_total\{difficulty="10"\} 1/)
    expect(text).toContain('griffdive_crusades_achieved_total 1')
    expect(text).toMatch(/griffdive_missions_started_total\{difficulty="4"\} 1/)
  })
})
