import { describe, expect, it } from 'vitest'
import { ALL_WARBOND_CODES, ITEMS_BY_ID } from '../data/catalog'
import { PACTS } from '../data/pacts'
import { SPECIALISTS, SPECIALIST_ROLES, specialistById } from '../data/specialists'
import { BONUS_STATS, SPECIALIST_RANK_MERITS, maxStarsFor } from './config'
import { startingItemIds } from './progression'
import { createDiveState, reduce } from './reducer'
import { createLobbyState, forkCrusade, joinDiver } from './room'
import { availableCaches, bargainShelfFor, diverOptions, earnedItemsOf, honorsDue, optionsLostFor, rewardPoolForDiver, statsPendingPactIds } from './selectors'
import { canEnlist, commissionAllows, commissionRankOf, issuedCategories, meritsToNextRank, ordersConflictFor, promotionsDue, specialistRankOf, standingOrdersFor } from './specialists'
import type { DiveState, DiverState } from './types'

const MEDIUM = { variant: 'medium' as const }
const HARD_SEAF = { variant: 'hard' as const, mode: 'seaf' as const }

function diver(state: DiveState, id = 'p1'): DiverState {
  const found = state.divers.find(candidate => candidate.id === id)
  if (!found) {
    throw new Error(`expected diver ${id}`)
  }
  return found
}

function soloSpecialist(specialistId: string, settings: Parameters<typeof createDiveState>[0] = MEDIUM): DiveState {
  return createDiveState(settings, 'p1', 'Griffin', [...ALL_WARBOND_CODES], 7, null, null, specialistId)
}

function lobbyOfTwo(): DiveState {
  const host = joinDiver(createLobbyState(), 'p1', 'Griffin', ALL_WARBOND_CODES)!
  return joinDiver(host, 'p2', 'Kestrel', ALL_WARBOND_CODES)!
}

// Spin, decline both calls, deal and swear nothing: the squad is diving.
function toDiving(state: DiveState, seed = 42): DiveState {
  let next = reduce(state, { type: 'SPIN_WHEEL', seed })
  next = reduce(next, { type: 'ACCEPT_MISFORTUNE', accepted: false })
  if (next.phase === 'strain') {
    next = reduce(next, { type: 'ACCEPT_STRAIN', accepted: false })
  }
  next = reduce(next, { type: 'DEAL_PACTS' })
  for (const entry of next.divers) {
    next = reduce(next, { type: 'SET_PACTS', playerId: entry.id, pactIds: [] })
  }
  return next
}

function toRewards(state: DiveState, stars?: number): DiveState {
  let next = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: stars ?? maxStarsFor(state.difficulty) })
  for (const entry of next.divers) {
    for (const pactId of statsPendingPactIds(next, entry)) {
      next = reduce(next, { type: 'HOLD_PACT', playerId: entry.id, pactId })
    }
  }
  if (honorsDue(next)) {
    next = reduce(next, { type: 'SPIN_BONUS', seed: 4242 })
    if (honorsDue(next)) {
      next = reduce(next, { type: 'AWARD_BONUS', playerIds: [next.divers[0]!.id] })
    }
  }
  return next
}

function pickAll(state: DiveState): DiveState {
  let next = state
  for (const entry of next.divers) {
    const option = diverOptions(next, entry).find(candidate => !candidate.choice)
    if (option) {
      next = reduce(next, { type: 'PICK_REWARD', playerId: entry.id, optionId: option.optionId })
    }
  }
  return next
}

function clearMission(state: DiveState, seed = 42): DiveState {
  return reduce(pickAll(toRewards(toDiving(state, seed))), { type: 'ADVANCE' })
}

describe('the specialist roster', () => {
  it('issues only catalog items, and calls on a stat the honors can roll', () => {
    const stats = new Set(BONUS_STATS.map(stat => stat.id))
    for (const specialist of SPECIALISTS) {
      expect(specialist.kit.length).toBeGreaterThan(0)
      for (const id of specialist.kit) {
        expect(ITEMS_BY_ID.has(id), `${specialist.id} issues ${id}`).toBe(true)
      }
      expect(stats.has(specialist.calling), specialist.id).toBe(true)
      expect(SPECIALIST_ROLES[specialist.role]).toBeTruthy()
    }
    expect(new Set(SPECIALISTS.map(specialist => specialist.id)).size).toBe(SPECIALISTS.length)
  })

  it('climbs a rank at each merit threshold', () => {
    expect(specialistRankOf(0)).toBe(0)
    expect(specialistRankOf(SPECIALIST_RANK_MERITS[0])).toBe(1)
    expect(specialistRankOf(SPECIALIST_RANK_MERITS[2])).toBe(3)
    expect(meritsToNextRank(SPECIALIST_RANK_MERITS[2])).toBeNull()
  })
})

describe('SET_SPECIALIST', () => {
  it('takes one commission per squad in the lobby', () => {
    let state = reduce(lobbyOfTwo(), { type: 'SET_SPECIALIST', playerId: 'p1', specialistId: 'fieldMedic' })
    expect(diver(state).commission?.specialistId).toBe('fieldMedic')
    const taken = reduce(state, { type: 'SET_SPECIALIST', playerId: 'p2', specialistId: 'fieldMedic' })
    expect(taken).toBe(state)
    state = reduce(state, { type: 'SET_SPECIALIST', playerId: 'p1', specialistId: null })
    expect(diver(state).commission).toBeNull()
    state = reduce(state, { type: 'SET_SPECIALIST', playerId: 'p2', specialistId: 'fieldMedic' })
    expect(diver(state, 'p2').commission?.specialistId).toBe('fieldMedic')
  })

  it('needs every warbond the kit comes from', () => {
    const lobby = joinDiver(createLobbyState(), 'p1', 'Griffin', [])!
    // The Field Medic's Stim Pistol is a warbond item.
    expect(reduce(lobby, { type: 'SET_SPECIALIST', playerId: 'p1', specialistId: 'fieldMedic' })).toBe(lobby)
    // The Eagle Ground Coordinator's strikes are warbond-free.
    const coordinator = reduce(lobby, { type: 'SET_SPECIALIST', playerId: 'p1', specialistId: 'eagleCoordinator' })
    expect(diver(coordinator).commission?.specialistId).toBe('eagleCoordinator')
  })

  it('is frozen once the crusade launches', () => {
    const state = soloSpecialist('marksman')
    expect(canEnlist(state, diver(state))).toBe(false)
    expect(reduce(state, { type: 'SET_SPECIALIST', playerId: 'p1', specialistId: 'juggernaut' })).toBe(state)
  })
})

describe('the issued kit', () => {
  it('replaces the SEAF pack: crate or commission', () => {
    const freelancer = createDiveState(HARD_SEAF, 'p1', 'Griffin', [...ALL_WARBOND_CODES], 7)
    expect(diver(freelancer).supportKit?.length).toBeGreaterThan(0)
    const medic = soloSpecialist('fieldMedic', HARD_SEAF)
    expect(diver(medic).supportKit).toEqual([])
    expect(diver(medic).commission?.issuedKit).toEqual(specialistById('fieldMedic')!.kit)
    expect(medic.personalInventories.p1).toEqual(expect.arrayContaining([...specialistById('fieldMedic')!.kit]))
  })

  it('is never at stake in a forfeit', () => {
    const state = soloSpecialist('juggernaut')
    const earned = earnedItemsOf(state, diver(state)).map(item => item.id)
    for (const id of specialistById('juggernaut')!.kit) {
      expect(earned).not.toContain(id)
    }
  })

  it('keeps issued kinds out of every reward pool', () => {
    const state = soloSpecialist('fieldMedic')
    const pool = rewardPoolForDiver(state, diver(state))
    expect(issuedCategories(diver(state))).toEqual(new Set(['secondary', 'booster', 'armorPassive']))
    expect(pool.some(item => item.category === 'secondary' || item.category === 'booster')).toBe(false)
    expect(pool.some(item => item.category === 'primary')).toBe(true)
  })

  it('marks issued kinds on Brasch\'s shelf instead of stocking them', () => {
    const state = soloSpecialist('exterminator')
    const shelf = bargainShelfFor(state, diver(state))
    expect(shelf.find(slot => slot.kind === 'throwable')?.status).toBe('issued')
    expect(shelf.find(slot => slot.kind === 'primary')?.status).not.toBe('issued')
  })
})

describe('doctrine', () => {
  it('limits stratagem rewards until Sergeant', () => {
    const state = soloSpecialist('eagleCoordinator')
    const recruit = diver(state)
    const orbital = ITEMS_BY_ID.get('orbitallaser')!
    const eagle = ITEMS_BY_ID.get('eagleclusterbomb') ?? ITEMS_BY_ID.get('eagleairstrike')!
    expect(commissionAllows(recruit, orbital)).toBe(false)
    expect(commissionAllows(recruit, eagle)).toBe(true)
    const sergeant: DiverState = { ...recruit, commission: { ...recruit.commission!, merits: SPECIALIST_RANK_MERITS[1] } }
    expect(commissionAllows(sergeant, orbital)).toBe(true)
  })
})

describe('standing orders', () => {
  it('costs the service tax until the diver is Commissioned', () => {
    const state = toRewards(toDiving(soloSpecialist('marksman')))
    const recruit = diver(state)
    expect(optionsLostFor(state, recruit)).toBe(1)
    const commissioned: DiverState = { ...recruit, commission: { ...recruit.commission!, merits: SPECIALIST_RANK_MERITS[2] } }
    expect(optionsLostFor(state, commissioned)).toBe(0)
  })

  it('breaks in the field for one more option and a dirty operation', () => {
    const diving = toDiving(soloSpecialist('marksman'))
    const broken = reduce(diving, { type: 'BREAK_ORDERS', playerId: 'p1' })
    expect(diver(broken).commission).toMatchObject({ ordersBroken: true, cleanOperation: false })
    expect(reduce(broken, { type: 'BREAK_ORDERS', playerId: 'p1' })).toBe(broken)
    const rewards = toRewards(broken)
    expect(optionsLostFor(rewards, diver(rewards))).toBe(2)
    expect(reduce(soloSpecialist('marksman'), { type: 'BREAK_ORDERS', playerId: 'p1' }).actionLog.at(-1)?.type).not.toBe('BREAK_ORDERS')
  })

  it('yields to a directive that bans an issued item', () => {
    const state = soloSpecialist('eagleCoordinator')
    const orders = standingOrdersFor('noEagles', diver(state))
    expect(orders.every(order => order.suspendedBy === 'noEagles')).toBe(true)
    expect(standingOrdersFor(null, diver(state)).every(order => order.suspendedBy === null)).toBe(true)
  })

  it('refuses a pact that would forbid the issued kit', () => {
    const state = soloSpecialist('eagleCoordinator')
    expect(ordersConflictFor('grounded', diver(state))?.id).toBe('eagleairstrike')
    expect(ordersConflictFor('shipSilent', diver(state))).toBeNull()
    const quartermaster = soloSpecialist('quartermaster')
    expect(ordersConflictFor('packLight', diver(quartermaster))?.id).toBe('b1supplypack')
    expect(ordersConflictFor('emptyPockets', diver(quartermaster))?.id).toBe('armedresupplypods')
    expect(PACTS.some(pact => pact.id === 'grounded')).toBe(true)
  })
})

describe('promotion', () => {
  it('banks merits for a clean operation and announces the promotion first', () => {
    let state = soloSpecialist('juggernaut')
    state = clearMission(state)
    expect(diver(state).commission?.merits).toBe(0)
    const atClimb = toRewards(toDiving(state, 43))
    expect(promotionsDue(atClimb)).toEqual([{ diverId: 'p1', specialistId: 'juggernaut', from: 0, to: 1 }])
    state = reduce(pickAll(atClimb), { type: 'ADVANCE' })
    expect(state.difficulty).toBe(4)
    expect(commissionRankOf(diver(state))).toBe(1)
    expect(diver(state).commission?.cleanOperation).toBe(true)
  })

  it('banks nothing for an operation with broken orders', () => {
    let state = soloSpecialist('juggernaut')
    state = reduce(pickAll(toRewards(reduce(toDiving(state), { type: 'BREAK_ORDERS', playerId: 'p1' }))), { type: 'ADVANCE' })
    state = clearMission(state, 43)
    expect(state.difficulty).toBe(4)
    expect(diver(state).commission?.merits).toBe(0)
  })
})

describe('the mantle', () => {
  function startedSquad(): DiveState {
    let lobby = reduce(lobbyOfTwo(), { type: 'SET_SPECIALIST', playerId: 'p2', specialistId: 'demolitionist' })
    lobby = reduce(lobby, { type: 'START_DIVE', settings: HARD_SEAF, seed: 7 })
    // Two clean operations behind the squad: the commission has merits and a
    // joiner now owes a Field Promotion.
    return {
      ...lobby,
      difficulty: 7,
      divers: lobby.divers.map(entry => entry.commission ? { ...entry, commission: { ...entry.commission, merits: 4 } } : entry),
    }
  }

  it('parks with the departed diver and passes to the joiner who claims it', () => {
    const left = reduce(startedSquad(), { type: 'LEAVE_DIVE', playerId: 'p2' })
    expect(left.legacyCaches.p2?.commission).toEqual({ specialistId: 'demolitionist', merits: 4 })
    const joined = joinDiver(left, 'p3', 'Rook', ALL_WARBOND_CODES)!
    const pack = diver(joined, 'p3').supportKit ?? []
    expect(pack.length).toBeGreaterThan(0)
    expect(availableCaches(joined).find(cache => cache.ownerId === 'p2')?.commission?.specialistId).toBe('demolitionist')
    const claimed = reduce(joined, { type: 'CLAIM_CACHE', playerId: 'p3', cacheOwnerId: 'p2' })
    const heir = diver(claimed, 'p3')
    expect(heir.commission).toMatchObject({ specialistId: 'demolitionist', merits: 4, predecessor: 'Kestrel' })
    expect(heir.supportKit).toEqual([])
    expect(claimed.personalInventories.p3).toEqual(expect.arrayContaining([...specialistById('demolitionist')!.kit]))
    for (const id of pack) {
      expect(claimed.personalInventories.p3).not.toContain(id)
    }
  })

  it('refuses a claim that would take nothing: a mantle the joiner can\'t carry and no gear', () => {
    const left = reduce(startedSquad(), { type: 'LEAVE_DIVE', playerId: 'p2' })
    expect(left.legacyCaches.p2?.itemIds).toEqual([])
    const joined = joinDiver(left, 'p3', 'Rook', [])!
    expect(reduce(joined, { type: 'CLAIM_CACHE', playerId: 'p3', cacheOwnerId: 'p2' })).toBe(joined)
  })

  it('resumes for the same diver rejoining', () => {
    const left = reduce(startedSquad(), { type: 'LEAVE_DIVE', playerId: 'p2' })
    const back = joinDiver(left, 'p2', 'Kestrel', ALL_WARBOND_CODES)!
    expect(diver(back, 'p2').commission).toMatchObject({ specialistId: 'demolitionist', merits: 4 })
    expect(diver(back, 'p2').supportKit).toEqual([])
  })

  it('survives a fork as the owner\'s commission or a departed diver\'s cache', () => {
    const forked = forkCrusade(startedSquad(), 'p1')!
    expect(forked.legacyCaches.p2?.commission?.specialistId).toBe('demolitionist')
    const owned = forkCrusade(startedSquad(), 'p2')!
    expect(diver(owned, 'p2').commission?.specialistId).toBe('demolitionist')
  })
})

describe('enlisting mid-crusade', () => {
  it('lets a fresh joiner take a commission before their first mission ends', () => {
    const solo = createDiveState(HARD_SEAF, 'p1', 'Griffin', [...ALL_WARBOND_CODES], 7)
    const joined = joinDiver(solo, 'p2', 'Kestrel', ALL_WARBOND_CODES)!
    const pack = diver(joined, 'p2').supportKit ?? []
    expect(canEnlist(joined, diver(joined, 'p2'))).toBe(true)
    const enlisted = reduce(joined, { type: 'SET_SPECIALIST', playerId: 'p2', specialistId: 'sentryEngineer' })
    expect(diver(enlisted, 'p2').commission?.issuedKit).toEqual(specialistById('sentryEngineer')!.kit)
    expect(enlisted.personalInventories.p2).toEqual(expect.arrayContaining(startingItemIds('hard')))
    for (const id of pack) {
      expect(enlisted.personalInventories.p2).not.toContain(id)
    }
    expect(reduce(enlisted, { type: 'SET_SPECIALIST', playerId: 'p2', specialistId: 'marksman' })).toBe(enlisted)
  })

  it('closes once the joiner\'s first mission ends', () => {
    const solo = createDiveState(MEDIUM, 'p1', 'Griffin', [...ALL_WARBOND_CODES], 7)
    const joined = joinDiver(solo, 'p2', 'Kestrel', ALL_WARBOND_CODES)!
    const next = clearMission(joined)
    expect(canEnlist(next, diver(next, 'p2'))).toBe(false)
  })
})
