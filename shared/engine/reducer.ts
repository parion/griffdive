import { ALL_WARBOND_CODES, ITEMS_BY_ID, WARBONDS } from '../data/catalog'
import type { CrusadeSettings, DiveState, DiverState, EngineAction, MajorOrderSelection } from './types'
import { ACTION_LOG_CAP, ARMOR_PACK_STREAM, MAJOR_ORDER_REROLL_BONUS, MAX_DIFFICULTY, MAX_NAME_LENGTH, REROLL_TOKENS_PER_OPERATION, REWARD_TOKEN_CAP, armorPackPrice, maxStarsFor, missionsPerOperation } from './config'
import { STARTING_KITS, earnedKit, mergeKit, startingItemIds } from './progression'
import { pactById } from '../data/pacts'
import { hasLegalLoadout, pactConflictsWith, pactSubsumedBy } from './pacts'
import { createLobbyState, joinDiver, resolveFrontPlan } from './room'
import { deriveSeed, hashString } from './rng'
import { rollSupportKit } from './support'
import { activeDivers, activeMisfortune, allDiversPicked, armorPackPoolFor, availableCaches, bonusEligibleFor, canBuyArmorPack, canBuyItem, catchUpOptionsFor, climbSettled, comboKey, dealBargain, diverOptions, forfeitOptionsFor, forfeitSettled, isPenancePact, majorOrderFronts, misfortuneDecision, misfortuneStrandedDivers, pactOfferFor, pactsSettled, penanceIncurredBy, rewardPoolFor, squadInventories, squadPenances, squadSize, statsPendingMisfortune, statsPendingPactIds, strainDecision } from './selectors'
import { bargainKindOf, itemPrice, missionHaul, rollArmorPack } from './rewards'
import { deriveFront, deriveMisfortune, deriveStrain } from './wheel'

export function createDiveState(
  settings: CrusadeSettings,
  hostId: string,
  hostName: string,
  warbondCodes?: string[],
  seed?: number,
  majorOrder?: MajorOrderSelection | null,
): DiveState {
  const lobby = joinDiver(createLobbyState(), hostId, hostName) ?? createLobbyState()
  // The host's own warbond selection, applied like any self-service action so
  // the action log records it.
  const seated = warbondCodes
    ? reduce(lobby, { type: 'SET_WARBONDS', playerId: hostId, warbondCodes })
    : lobby
  return reduce(seated, { type: 'START_DIVE', settings, seed, majorOrder })
}

function commit(state: DiveState, patch: Partial<DiveState>, action: EngineAction): DiveState {
  return {
    ...state,
    ...patch,
    actionLog: [...state.actionLog.slice(-(ACTION_LOG_CAP - 1)), action],
  }
}

function applyStart(
  state: DiveState,
  requested: CrusadeSettings,
  seed: number | undefined,
  order: MajorOrderSelection | null | undefined,
): Partial<DiveState> {
  const { front, majorOrder } = resolveFrontPlan(requested.front, order)
  const settings: CrusadeSettings = front ? { ...requested, front } : requested
  const kit = STARTING_KITS[settings.variant]
  // Every seated diver rolls their own SEAF Support Package against the
  // warbonds they have declared by launch.
  const personalInventories: Record<string, string[]> = {}
  const supported = state.divers.map((diver) => {
    const supportKit = rollSupportKit(settings, diver.id, diver.warbondCodes)
    personalInventories[diver.id] = mergeKit(startingItemIds(settings.variant), supportKit)
    return { ...diver, supportKit }
  })
  // The first mission's Brasch's Bargains deal. A caller that injects no seed
  // still gets a deterministic shelf, keyed to the host.
  const stocked = { ...state, personalInventories }
  const divers = supported.map(diver => ({ ...diver, bargain: dealBargain(stocked, diver, null, true) }))
  return {
    divers,
    bargainSeed: typeof seed === 'number' && Number.isFinite(seed) ? seed : hashString(state.hostId ?? ''),
    settings,
    difficulty: kit.startDifficulty,
    phase: 'spin',
    rerollTokens: REROLL_TOKENS_PER_OPERATION,
    frontId: null,
    strainId: null,
    strainAccepted: false,
    strainDecided: false,
    majorOrder,
    personalInventories,
  }
}

function resetDivers(state: DiveState): DiverState[] {
  return state.divers.map(diver => ({
    ...diver,
    pactsLocked: false,
    pactIds: [],
    failedPactIds: [],
    heldPactIds: [],
    brokenPactIds: [],
    penance: null,
    pickedOptionId: null,
    forfeitedItemId: null,
    rewardRerollSeed: null,
    rewardBanned: false,
    draftExcludedIds: null,
  }))
}

// A broken Penance pact (or a failed mission) voids the reward it was
// guarding: the item leaves the kit. A debt already served or voided is inert.
function voidPenance(state: DiveState, diverId: string): Pick<DiveState, 'divers' | 'personalInventories'> {
  const debt = state.divers.find(diver => diver.id === diverId)?.penance
  if (!debt || debt.status !== 'owed') {
    return { divers: state.divers, personalInventories: state.personalInventories }
  }
  return {
    divers: state.divers.map(diver =>
      diver.id === diverId ? { ...diver, penance: { ...debt, status: 'voided' } } : diver),
    personalInventories: debt.itemId
      ? {
          ...state.personalInventories,
          [diverId]: (state.personalInventories[diverId] ?? []).filter(id => id !== debt.itemId),
        }
      : state.personalInventories,
  }
}

// What the stats check leaves owing into the next mission: each diver's broken
// pacts come back as Penance, and a broken directive taxes every draft.
function carryDebts(state: DiveState, next: Partial<DiveState>): Partial<DiveState> {
  const owed = new Map(state.divers.map(diver => [diver.id, penanceIncurredBy(diver)]))
  return {
    ...next,
    directiveTax: state.misfortuneBroken,
    divers: next.divers!.map(diver => ({ ...diver, penance: owed.get(diver.id) ?? null })),
  }
}

function resetForNextMission(state: DiveState): Partial<DiveState> {
  return {
    offerSeed: null,
    lastReport: null,
    bonusSeed: null,
    bonusWinnerIds: [],
    misfortuneFailed: false,
    misfortuneHeld: false,
    misfortuneBroken: false,
    divers: resetDivers(state),
  }
}

export function resetOperation(state: DiveState): Partial<DiveState> {
  return {
    ...resetForNextMission(state),
    missionInOperation: 1,
    rerollTokens: REROLL_TOKENS_PER_OPERATION,
    // A restarted operation keeps its front and strain but draws a fresh
    // misfortune per mission, and the strain decision reopens — the retry
    // begins at the spin, like every mission.
    wheel: null,
    misfortuneAccepted: false,
    strainAccepted: false,
    strainDecided: false,
    phase: 'spin',
  }
}

// Brasch restocks at every mission start, a failure restart included: a fresh
// seed off the mission just played and a fresh deal per diver against their
// current holdings. What the operation already spent — a bought kind, the one
// Armor Pack — stays spent until a new operation begins.
function redealBargains(
  state: DiveState,
  divers: DiverState[],
  newOperation: boolean,
): Pick<DiveState, 'divers' | 'bargainSeed'> {
  return {
    bargainSeed: deriveSeed(state.wheel?.seed ?? state.bargainSeed ?? 0, state.missionIndex + 1),
    divers: divers.map(diver => ({
      ...diver,
      bargain: dealBargain(state, diver, diver.bargain, newOperation),
    })),
  }
}

// The failure's loss lands once every diver owing an item has chosen: each
// chosen item leaves its owner's kit together, then the operation restarts.
// Holding the removal back keeps every offer (derived from the live kit) stable
// while the squad is still choosing.
function resolveForfeit(state: DiveState): DiveState {
  const personalInventories = { ...state.personalInventories }
  for (const diver of state.divers) {
    if (diver.forfeitedItemId) {
      personalInventories[diver.id] = (personalInventories[diver.id] ?? [])
        .filter(id => id !== diver.forfeitedItemId)
    }
  }
  const stripped = { ...state, personalInventories }
  const restarted = resetOperation(stripped)
  return { ...stripped, ...restarted, ...redealBargains(stripped, restarted.divers!, false) }
}

// A pick, a departure or a step away can each leave the forfeit with nobody
// left to wait on.
function settleForfeit(state: DiveState): DiveState {
  return state.phase === 'forfeit' && forfeitSettled(state) ? resolveForfeit(state) : state
}

// The strain is an operation-long commitment: it is decided once, on the
// operation's first mission, before pacts roll. It may be answered before or
// after the misfortune; the phase only advances once both calls are in.
function needsStrainDecision(state: DiveState): boolean {
  return state.missionInOperation === 1 && state.strainId !== null && !state.strainDecided
}

// A departed diver (kicked or left) parks their earned gear as a legacy cache:
// a late joiner may claim it instead of their Field Promotion, and the same
// diver rejoining reclaims it. The last diver can never leave: a room is never
// abandoned or reset — the crusade waits for whoever comes back to it.
function removeDiver(state: DiveState, diverId: string, action: EngineAction): DiveState {
  const diver = state.divers.find(candidate => candidate.id === diverId)
  if (!diver) {
    return state
  }
  const earned = state.settings
    ? earnedKit(state.personalInventories[diver.id] ?? [], state.settings.variant, diver.supportKit)
    : []
  const legacyCaches = earned.length > 0
    ? { ...state.legacyCaches, [diver.id]: { name: diver.name, itemIds: earned } }
    : state.legacyCaches
  const personalInventories = Object.fromEntries(
    Object.entries(state.personalInventories).filter(([id]) => id !== diver.id),
  )
  const divers = state.divers.filter(candidate => candidate.id !== diver.id)
  if (divers.length === 0) {
    return state
  }
  const phase = state.phase === 'pacts' && pactsSettled(divers)
    ? 'diving'
    : state.phase
  if (diver.id !== state.hostId) {
    return settleForfeit(commit(state, { divers, personalInventories, legacyCaches, phase }, action))
  }
  // The host anchors the squad — hostship moves to the earliest present joiner,
  // mirroring the server's disconnect migration.
  const nextHost = divers.find(entry => !entry.away) ?? divers[0]!
  return settleForfeit(commit(state, {
    divers: divers.map(entry => ({ ...entry, isHost: entry.id === nextHost.id })),
    hostId: nextHost.id,
    personalInventories,
    legacyCaches,
    phase,
  }, action))
}

export function reduce(state: DiveState, action: EngineAction): DiveState {
  switch (action.type) {
    case 'START_DIVE': {
      if (state.settings) {
        return state
      }
      return commit(state, applyStart(state, action.settings, action.seed, action.majorOrder), action)
    }

    case 'SPIN_WHEEL': {
      if (state.phase !== 'spin' || !state.settings) {
        return state
      }
      // Every mission draws its own misfortune; the front and its strain are
      // drawn once per operation, with the first spin, and persist across its
      // missions. A Major Order (or a locked front) pins the front pool to the
      // fronts chosen at setup — and a pinned front has no random subfaction:
      // the front is the order, so no strain is drawn (or offered) for it.
      const frontId = state.frontId ?? deriveFront(action.seed, majorOrderFronts(state))
      const drawingOperation = state.frontId === null
      return commit(state, {
        wheel: { seed: action.seed, misfortuneId: deriveMisfortune(action.seed, squadInventories(state), squadPenances(state)).id },
        frontId,
        strainId: state.majorOrder
          ? null
          : state.strainId ?? deriveStrain(action.seed, state.difficulty, frontId)?.id ?? null,
        // The misfortune is a draw, not a verdict — the squad decides before
        // any pact offer exists. A fresh operation reopens the strain decision
        // too (a failure restart has already reset it).
        misfortuneAccepted: false,
        misfortuneFailed: false,
        misfortuneHeld: false,
        ...(drawingOperation ? { strainAccepted: false, strainDecided: false } : {}),
        phase: 'decision',
        seedHistory: [...state.seedHistory, action.seed],
      }, action)
    }

    case 'ACCEPT_MISFORTUNE': {
      if (!state.wheel) {
        return state
      }
      // The first call decides (the spin leaves the squad in 'decision'), and
      // on the operation's first mission it hands over to the strain decision
      // before pacts roll. Afterwards the call may still flip while nobody has
      // locked pacts — team risk is shared, so it freezes at the first lock.
      const deciding = state.phase === 'decision'
      const switching = (state.phase === 'strain' || state.phase === 'deal' || state.phase === 'pacts')
        && !state.divers.some(diver => diver.pactsLocked)
      if (!deciding && !switching) {
        return state
      }
      if (switching && action.accepted === state.misfortuneAccepted) {
        return state
      }
      // A misfortune the squad cannot field is not a risk, it is a dead end:
      // accepting it would strand a diver below HD2's four required stratagems
      // and nobody could ready up. Refuse the accept; opting out and rerolling
      // stay open. (AGENTS.md: Mandatory four stratagems.)
      if (action.accepted && misfortuneStrandedDivers(state).length > 0) {
        return state
      }
      return commit(state, {
        misfortuneAccepted: action.accepted,
        // Both calls in: hold on the wheel screen until the host deals the
        // hand ('deal'). A pending strain keeps the squad in the strain phase.
        ...(deciding ? { phase: needsStrainDecision(state) ? 'strain' : 'deal' } : {}),
      }, action)
    }

    case 'ACCEPT_STRAIN': {
      // The strain is an optional, operation-long commitment: accepting it
      // adds its team risk to every mission of the operation. It carries no
      // loadout rule, so there is no strand check — declining is always safe.
      // It is answered on the operation's first mission, independently of the
      // misfortune (either call may come first); the phase only advances once
      // both are in. Like the misfortune it may still flip until the first
      // pact lock.
      if (!state.strainId || state.missionInOperation > 1) {
        return state
      }
      const deciding = state.phase === 'decision' || state.phase === 'strain'
      const switching = (state.phase === 'deal' || state.phase === 'pacts')
        && !state.divers.some(diver => diver.pactsLocked)
      if (!deciding && !switching) {
        return state
      }
      // A reroll can reopen the strain call after it was answered; re-answering
      // an open call must register even when the value matches the stale one.
      if (switching && state.strainDecided && action.accepted === state.strainAccepted) {
        return state
      }
      return commit(state, {
        strainAccepted: action.accepted,
        strainDecided: true,
        // Answering the strain from the strain phase completes the wheel
        // decision; from the decision phase the misfortune still gates it, and
        // from 'deal'/'pacts' the squad stays put (a flip or a re-answer).
        ...(state.phase === 'strain' ? { phase: 'deal' } : {}),
      }, action)
    }

    case 'DEAL_PACTS': {
      // The host-only gate between the wheel decision and the pact hand: the
      // squad holds on the wheel until the host deals. Refuse while either call
      // is still open or a pact is already locked.
      if (state.phase !== 'deal' || !state.wheel) {
        return state
      }
      if (state.divers.some(diver => diver.pactsLocked)) {
        return state
      }
      if (!misfortuneDecision(state).decided || !strainDecision(state).decided) {
        return state
      }
      return commit(state, { phase: 'pacts' }, action)
    }

    case 'REROLL_WHEEL': {
      if (
        (state.phase !== 'decision' && state.phase !== 'strain' && state.phase !== 'deal' && state.phase !== 'pacts')
        || !state.wheel
        || !state.frontId
      ) {
        return state
      }
      if (state.divers.some(diver => diver.pactsLocked)) {
        return state
      }
      // The front and its strain lock in with the operation — mission-1
      // decision window only.
      if (action.wheel !== 'misfortune' && state.missionInOperation > 1) {
        return state
      }
      if (action.wheel === 'strain' && !state.strainId) {
        return state
      }
      // "Spins are seeds", but a reroll must actually move: refuse a seed that
      // lands on the result it would replace, so a paid reroll never returns
      // the same outcome. Only the immediately replaced result is excluded.
      const sameResult = action.wheel === 'misfortune'
        ? deriveMisfortune(action.seed, squadInventories(state), squadPenances(state)).id === state.wheel.misfortuneId
        : action.wheel === 'front'
          ? deriveFront(action.seed, majorOrderFronts(state)) === state.frontId
          : deriveStrain(action.seed, state.difficulty, state.frontId)?.id === state.strainId
      if (sameResult) {
        return state
      }
      const completed = state.completedCombos.includes(
        comboKey(state.wheel.misfortuneId, state.frontId, state.strainId),
      )
      if (!completed && state.rerollTokens < 1) {
        return state
      }
      const rerollTokens = completed ? state.rerollTokens : state.rerollTokens - 1
      const seedHistory = [...state.seedHistory, action.seed]
      // A misfortune reroll redraws that mission's draw and reopens its
      // decision; a front or strain reroll (mission 1 only) reopens the strain
      // decision — a new front brings a new subfaction.
      if (action.wheel === 'misfortune') {
        return commit(state, {
          wheel: { seed: action.seed, misfortuneId: deriveMisfortune(action.seed, squadInventories(state), squadPenances(state)).id },
          misfortuneAccepted: false,
          misfortuneFailed: false,
          misfortuneHeld: false,
          misfortuneBroken: false,
          phase: 'decision',
          rerollTokens,
          seedHistory,
        }, action)
      }
      if (action.wheel === 'front') {
        const frontId = deriveFront(action.seed, majorOrderFronts(state))
        return commit(state, {
          frontId,
          // A Major Order front carries no strain; only an unordered front draws one.
          strainId: state.majorOrder
            ? null
            : deriveStrain(action.seed, state.difficulty, frontId)?.id ?? null,
          strainAccepted: false,
          strainDecided: false,
          rerollTokens,
          seedHistory,
        }, action)
      }
      return commit(state, {
        strainId: deriveStrain(action.seed, state.difficulty, state.frontId)?.id ?? null,
        strainAccepted: false,
        strainDecided: false,
        rerollTokens,
        seedHistory,
      }, action)
    }

    case 'SET_PACTS': {
      // Pacts only exist after the wheel decision — the offer is rolled from
      // the decided draw.
      if (state.phase !== 'pacts') {
        return state
      }
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.pactsLocked) {
        return state
      }
      // A diver may only lock pacts from their own rolled offer — the offer
      // already filters whatever the accepted misfortune blocks.
      const offer = pactOfferFor(state, action.playerId)
      if (!action.pactIds.every(id => offer.some(pact => pact.id === id))) {
        return state
      }
      // Penance pacts are sworn whether chosen or not, ahead of the diver's picks.
      const pactIds = [...(diver.penance?.pactIds ?? []), ...action.pactIds]
      // Redundant picks never stack risk (AGENTS.md: Personal layer — pacts):
      // a pact another pick already covers is refused outright.
      if (pactIds.some(id => pactSubsumedBy(id, pactIds))) {
        return state
      }
      // Same-axis restrictions are mutually exclusive — two stratagem-category
      // bans would tax the same strength and can strand the loadout.
      if (pactIds.some(id => pactConflictsWith(id, pactIds))) {
        return state
      }
      // HD2 requires four equipped stratagems: never accept a pick that leaves
      // the diver unable to ready up. A misfortune that already strands the
      // loadout on its own is not a pact's fault — fix that at the wheel.
      const misfortuneId = activeMisfortune(state)?.id ?? null
      const owned = state.personalInventories[diver.id] ?? []
      if (hasLegalLoadout(misfortuneId, [], owned)
        && !hasLegalLoadout(misfortuneId, pactIds, owned)) {
        return state
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id
          ? { ...candidate, pactIds, pactsLocked: true }
          : candidate,
      )
      return commit(state, {
        divers,
        phase: pactsSettled(divers) ? 'diving' : 'pacts',
      }, action)
    }

    case 'FAIL_PACT': {
      // Broken pacts are marked while the mission runs. A stats-verified pact
      // can only be proven once the stats screen is up, so its window reopens
      // on the squad-climbs page, after the draft: that mark leaves the banked
      // offer alone and is owed back next mission as Penance.
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || !diver.pactIds.includes(action.pactId)) {
        return state
      }
      if ([diver.failedPactIds, diver.brokenPactIds, diver.heldPactIds].some(ids => ids.includes(action.pactId))) {
        return state
      }
      const diving = state.phase === 'diving'
      const atCheck = state.phase === 'rewards'
        && pactById(action.pactId)?.accountability === 'stats'
      if (!diving && !atCheck) {
        return state
      }
      const marked = state.divers.map(candidate =>
        candidate.id === diver.id
          ? diving
            ? { ...candidate, failedPactIds: [...candidate.failedPactIds, action.pactId] }
            : { ...candidate, brokenPactIds: [...candidate.brokenPactIds, action.pactId] }
          : candidate,
      )
      // Breaking a pact sworn as Penance voids the reward it was guarding.
      const voided = isPenancePact(diver, action.pactId)
        ? voidPenance({ ...state, divers: marked }, diver.id)
        : { divers: marked, personalInventories: state.personalInventories }
      return commit(state, voided, action)
    }

    case 'HOLD_PACT': {
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || !statsPendingPactIds(state, diver).includes(action.pactId)) {
        return state
      }
      const divers = state.divers.map((candidate) => {
        if (candidate.id !== diver.id) {
          return candidate
        }
        const heldPactIds = [...candidate.heldPactIds, action.pactId]
        const debt = candidate.penance
        // The debt is served once every pact it swore is held.
        const served = debt?.status === 'owed' && debt.pactIds.every(id => heldPactIds.includes(id))
        return {
          ...candidate,
          heldPactIds,
          penance: served ? { ...debt, status: 'served' as const } : debt,
        }
      })
      return commit(state, { divers }, action)
    }

    case 'FAIL_MISFORTUNE': {
      // A team directive broken in the field is marked once, by the host, while
      // the mission runs — the same window as a pact. The squad still dove
      // under the rule (its bans stand for the mission), but the shared risk it
      // staked is voided and every diver forfeits a reward option. A
      // stats-verified directive is judged on the squad-climbs page instead,
      // after the drafts: the squad takes the draft tax next mission.
      const diving = state.phase === 'diving' && state.misfortuneAccepted && !state.misfortuneFailed
      if (diving) {
        return commit(state, { misfortuneFailed: true }, action)
      }
      if (statsPendingMisfortune(state) === null) {
        return state
      }
      return commit(state, { misfortuneBroken: true }, action)
    }

    case 'HOLD_MISFORTUNE': {
      if (statsPendingMisfortune(state) === null) {
        return state
      }
      return commit(state, { misfortuneHeld: true }, action)
    }

    case 'SET_WARBONDS': {
      // Warbonds are what each diver actually owns — declared personally and
      // valid in any phase, like SET_NAME. Reward pools read them at offer
      // time; PICK_REWARD re-validates options, so no phase gate is needed.
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver) {
        return state
      }
      const known = new Set(WARBONDS.map(warbond => warbond.code))
      const codes = [...new Set(action.warbondCodes)].filter(code => known.has(code))
      return commit(state, {
        divers: state.divers.map(candidate =>
          candidate.id === diver.id ? { ...candidate, warbondCodes: codes } : candidate,
        ),
      }, action)
    }

    case 'REPORT_RESULT': {
      if (state.phase !== 'diving' || !state.wheel || !state.frontId) {
        return state
      }
      // wiki.gg Mission Result: a completed mission never awards zero stars,
      // and higher stars unlock only at higher difficulties. Failed missions
      // award none.
      const stars = action.outcome === 'success'
        ? Math.min(Math.max(Math.round(action.stars), 1), maxStarsFor(state.difficulty))
        : 0
      // Samples are honor-system like the rest of the report, but malformed
      // counts must not mint absurd credits: clamp to non-negative integers.
      const sampleCount = (value: number): number =>
        Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
      const samples = action.samples
        ? {
            common: sampleCount(action.samples.common),
            rare: sampleCount(action.samples.rare),
            super: sampleCount(action.samples.super),
          }
        : undefined
      const report = { outcome: action.outcome, stars, timePct: action.timePct, samples }
      // Honors are spun on the report form before the numbers are filed. If the
      // filed report no longer qualifies, strike the spin and claw back any
      // token it auto-banked — otherwise a full-star spin could be filed as a
      // failure (or a lower-star clear) and still mint honors.
      const honorsEligible = state.bonusSeed !== null
        && bonusEligibleFor(
          report.outcome,
          report.stars,
          state.difficulty,
          state.missionIndex,
          squadSize(state),
        )
      const revokeHonors = state.bonusSeed !== null && !honorsEligible
      const bankedWinners = new Set(state.bonusWinnerIds)
      const settleHonors = (divers: DiverState[]): DiverState[] => revokeHonors
        ? divers.map(diver => bankedWinners.has(diver.id)
            ? { ...diver, rewardTokens: Math.max(0, diver.rewardTokens - 1) }
            : diver)
        : divers
      const honorsPatch = revokeHonors ? { bonusSeed: null, bonusWinnerIds: [] } : {}
      if (action.outcome === 'success') {
        // The sample haul banks as credits into every diver's purse — a
        // mid-mission joiner dove too. The deal freezes each diver's exclusions,
        // so the offer every client derives stays put for the whole draft
        // window.
        const haul = missionHaul(report)
        const divers = settleHonors(state.divers.map(diver => ({
          ...diver,
          credits: diver.credits + haul,
          draftExcludedIds: [...(state.personalInventories[diver.id] ?? []), ...diver.bannedItemIds],
        })))
        return commit(state, {
          phase: 'rewards',
          lastReport: report,
          divers,
          offerSeed: deriveSeed(state.wheel.seed, state.missionIndex),
          completedCombos: [
            ...state.completedCombos,
            comboKey(state.wheel.misfortuneId, state.frontId, state.strainId),
          ],
          ...honorsPatch,
        }, action)
      }
      // A failure deals every diver their forfeit offer, rolled like a draft off
      // the mission's offer seed. With nothing owed (empty kits) the operation
      // restarts at once.
      // A failed mission also voids every reward a diver was still working off
      // as Penance — before the forfeit offers derive from the live kit.
      const voided = state.divers.reduce<Pick<DiveState, 'divers' | 'personalInventories'>>(
        (acc, diver) => voidPenance({ ...state, ...acc }, diver.id),
        { divers: state.divers, personalInventories: state.personalInventories },
      )
      const failed = commit(state, {
        phase: 'forfeit',
        lastReport: report,
        personalInventories: voided.personalInventories,
        divers: settleHonors(voided.divers),
        offerSeed: deriveSeed(state.wheel.seed, state.missionIndex),
        ...honorsPatch,
      }, action)
      return settleForfeit(failed)
    }

    case 'FORFEIT_ITEM': {
      if (state.phase !== 'forfeit') {
        return state
      }
      // Self-service: each diver surrenders one item, and only from the offer
      // the engine dealt them — never one of their own choosing.
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.forfeitedItemId) {
        return state
      }
      if (!forfeitOptionsFor(state, diver).some(item => item.id === action.itemId)) {
        return state
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id ? { ...candidate, forfeitedItemId: action.itemId } : candidate,
      )
      return settleForfeit(commit(state, { divers }, action))
    }

    case 'PICK_REWARD': {
      if (state.phase !== 'rewards' || state.offerSeed === null) {
        return state
      }
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.pickedOptionId || diver.rewardBanned) {
        return state
      }
      const option = diverOptions(state, diver).find(
        candidate => candidate.optionId === action.optionId,
      )
      if (!option) {
        return state
      }
      // Liberty's Cross banks the item the diver named; every other option is
      // the item itself (optionId === item id). pickedOptionId always records
      // the banked item's id.
      const itemId = option.choice ? action.choiceItemId : action.optionId
      if (!itemId) {
        return state
      }
      const item = ITEMS_BY_ID.get(itemId)
      if (!item) {
        return state
      }
      // The offer is frozen at the deal, so an item gained since (a catch-up
      // claim) can still sit in it — never bank a duplicate.
      if ((state.personalInventories[diver.id] ?? []).includes(item.id)) {
        return state
      }
      if (option.choice) {
        // The free pick still honors the personal-catalog rules: only items
        // from the diver's own warbonds, nothing owned or banned.
        const owned = new Set(state.personalInventories[diver.id] ?? [])
        const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
        if (
          owned.has(item.id)
          || diver.bannedItemIds.includes(item.id)
          || !pool.some(entry => entry.id === item.id)
        ) {
          return state
        }
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id ? { ...candidate, pickedOptionId: itemId } : candidate,
      )
      // Every reward is personal — stratagems included (no shared pool).
      const personalInventories = {
        ...state.personalInventories,
        [diver.id]: [...(state.personalInventories[diver.id] ?? []), item.id],
      }
      return commit(state, { divers, personalInventories }, action)
    }

    case 'BUY_ITEM': {
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver?.bargain) {
        return state
      }
      // The shelf, the price, the purse and the one-buy limit are all engine
      // rules: re-derive the shelf server-side and reject anything the diver
      // cannot buy.
      if (!canBuyItem(state, diver, action.itemId).allowed) {
        return state
      }
      const item = ITEMS_BY_ID.get(action.itemId)
      if (!item) {
        return state
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id
          ? {
              ...candidate,
              credits: candidate.credits - itemPrice(item),
              bargain: {
                ...diver.bargain!,
                boughtItemId: item.id,
                boughtKinds: [...diver.bargain!.boughtKinds, bargainKindOf(item)!],
                pack: diver.bargain!.pack ?? null,
              },
            }
          : candidate,
      )
      const personalInventories = {
        ...state.personalInventories,
        [diver.id]: [...(state.personalInventories[diver.id] ?? []), item.id],
      }
      return commit(state, { divers, personalInventories }, action)
    }

    case 'BUY_ARMOR_PACK': {
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver?.bargain || state.bargainSeed === null) {
        return state
      }
      if (!canBuyArmorPack(state, diver).allowed) {
        return state
      }
      // The pack is derived from the mission's seed, not a purchase-time seed:
      // a client can't reroll the paid pull by choosing a number. The pull is
      // stored once, so the shelf and a reload show the same cards.
      const seed = deriveSeed(
        deriveSeed(state.bargainSeed, ARMOR_PACK_STREAM),
        hashString(diver.id),
      )
      const items = rollArmorPack(seed, state.difficulty, armorPackPoolFor(state, diver), new Set())
      if (items.length === 0) {
        return state
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id
          ? {
              ...candidate,
              credits: candidate.credits - armorPackPrice(state.difficulty),
              bargain: {
                ...diver.bargain!,
                pack: { seed, itemIds: items.map(item => item.id) },
              },
            }
          : candidate,
      )
      const personalInventories = {
        ...state.personalInventories,
        [diver.id]: mergeKit(
          state.personalInventories[diver.id] ?? [],
          items.map(item => item.id),
        ),
      }
      return commit(state, { divers, personalInventories }, action)
    }

    case 'ADVANCE': {
      // The squad moves on once every draft is banked and the stats check and
      // Squad Honors on the climbs page are settled.
      if (state.phase !== 'rewards' || !allDiversPicked(state) || !climbSettled(state)) {
        return state
      }
      const missionIndex = state.missionIndex + 1
      const missionInOperation = state.missionInOperation + 1
      if (missionInOperation > missionsPerOperation(state.difficulty)) {
        const nextDifficulty = state.difficulty + 1
        if (nextDifficulty > MAX_DIFFICULTY) {
          return commit(state, {
            missionIndex,
            difficulty: MAX_DIFFICULTY,
            phase: 'complete',
            achieved: true,
            ...resetForNextMission(state),
            wheel: null,
            frontId: null,
            strainId: null,
            strainAccepted: false,
            strainDecided: false,
          }, action)
        }
        // Operation completed: a fresh operation draws a new front with its
        // first spin. The setup's front pin is a run-long commitment, so it
        // stays pinned and every operation played toward a live order banks
        // its extra reroll token.
        const next = carryDebts(state, resetForNextMission(state))
        return commit(state, {
          missionIndex,
          difficulty: nextDifficulty,
          missionInOperation: 1,
          rerollTokens: REROLL_TOKENS_PER_OPERATION
            + (state.majorOrder?.live ? MAJOR_ORDER_REROLL_BONUS : 0),
          ...next,
          ...redealBargains(state, next.divers!, true),
          wheel: null,
          frontId: null,
          strainId: null,
          strainAccepted: false,
          strainDecided: false,
          misfortuneAccepted: false,
          phase: 'spin',
        }, action)
      }
      // Same operation: the front and its strain persist, but every mission
      // draws a fresh misfortune — the next mission begins at the spin.
      const next = carryDebts(state, resetForNextMission(state))
      return commit(state, {
        missionIndex,
        missionInOperation,
        ...next,
        ...redealBargains(state, next.divers!, false),
        wheel: null,
        misfortuneAccepted: false,
        phase: 'spin',
      }, action)
    }

    case 'END_DIVE': {
      if (state.phase === 'complete') {
        return state
      }
      return commit(state, { phase: 'complete' }, action)
    }

    case 'KICK_DIVER': {
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      // The host anchors the squad — transfer host first to remove them.
      // A kicked diver's pending pact lock or reward pick stops blocking
      // the squad; their inventory parks as a legacy cache.
      if (!diver || diver.id === state.hostId) {
        return state
      }
      return removeDiver(state, diver.id, action)
    }

    case 'LEAVE_DIVE': {
      return removeDiver(state, action.playerId, action)
    }

    case 'CLAIM_CATCHUP_OPTION': {
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.catchUpOwed <= 0) {
        return state
      }
      // Options roll at the base tier with zero Valor, so no option is ever
      // Liberty's Cross — the item is the option.
      const option = catchUpOptionsFor(state, diver).find(
        candidate => candidate.optionId === action.optionId,
      )
      if (!option) {
        return state
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id ? { ...candidate, catchUpOwed: candidate.catchUpOwed - 1 } : candidate,
      )
      const personalInventories = {
        ...state.personalInventories,
        [diver.id]: [...(state.personalInventories[diver.id] ?? []), option.item.id],
      }
      return commit(state, { divers, personalInventories }, action)
    }

    case 'CLAIM_CACHE': {
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      const cache = availableCaches(state).find(entry => entry.ownerId === action.cacheOwnerId)?.itemIds
      // The cache replaces the promotion wholesale: claiming after rolling
      // options would stack both, so only an untouched promotion allows it.
      if (
        !diver
        || diver.catchUpOwed <= 0
        || diver.catchUpOwed !== diver.catchUpGranted
        || !cache
      ) {
        return state
      }
      const legacyCaches = Object.fromEntries(
        Object.entries(state.legacyCaches).filter(([id]) => id !== action.cacheOwnerId),
      )
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id ? { ...candidate, catchUpOwed: 0 } : candidate,
      )
      const personalInventories = {
        ...state.personalInventories,
        [diver.id]: mergeKit(state.personalInventories[diver.id] ?? [], cache),
      }
      return commit(state, { divers, legacyCaches, personalInventories }, action)
    }

    case 'REROLL_REWARDS': {
      if (state.phase !== 'rewards' || state.offerSeed === null) {
        return state
      }
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.pickedOptionId || diver.rewardBanned || diver.rewardTokens < 1) {
        return state
      }
      // "Spins are seeds", but a reroll must actually move: refuse a seed that
      // re-derives the offer it would replace (mirrors REROLL_WHEEL).
      const current = diverOptions(state, diver).map(option => option.optionId).join('|')
      const rerolled = diverOptions(state, { ...diver, rewardRerollSeed: action.seed })
        .map(option => option.optionId)
        .join('|')
      if (rerolled === current) {
        return state
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id
          ? {
              ...candidate,
              rewardTokens: candidate.rewardTokens - 1,
              rewardRerollSeed: action.seed,
            }
          : candidate,
      )
      return commit(state, { divers }, action)
    }

    case 'BAN_REWARDS': {
      if (state.phase !== 'rewards' || state.offerSeed === null) {
        return state
      }
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.pickedOptionId || diver.rewardBanned || diver.rewardTokens < 1) {
        return state
      }
      const options = diverOptions(state, diver)
      const requested = [...new Set(action.optionIds)]
      if (requested.length === 0) {
        return state
      }
      // Every target must be an offered non-choice option: Liberty's Cross is
      // a free pick, not an item, so it can never be banned.
      const targets = requested.map(id => options.find(option => option.optionId === id))
      if (targets.some(target => !target || target.choice)) {
        return state
      }
      // Banning forfeits the draft's reward pick: the diver may purge any or
      // all of the offered items and banks no reward this mission.
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id
          ? {
              ...candidate,
              rewardTokens: candidate.rewardTokens - 1,
              bannedItemIds: [
                ...candidate.bannedItemIds,
                ...targets.map(target => target!.item.id),
              ],
              rewardBanned: true,
            }
          : candidate,
      )
      return commit(state, { divers }, action)
    }

    case 'SPIN_BONUS': {
      // Host-only, like the Wheel: the contest is spun on click at the report,
      // before the loot draft, and the seed is what syncs (spins are seeds).
      // The report form passes its stars because REPORT_RESULT has not landed
      // yet; a filed report uses the same predicate.
      if (state.phase !== 'diving' && state.phase !== 'rewards') {
        return state
      }
      if (state.bonusSeed !== null) {
        return state
      }
      const filed = state.lastReport
      const outcome = state.phase === 'diving'
        ? action.outcome ?? 'success'
        : filed?.outcome ?? 'failure'
      const stars = state.phase === 'diving'
        ? action.stars ?? 0
        : filed?.stars ?? 0
      if (!bonusEligibleFor(
        outcome,
        stars,
        state.difficulty,
        state.missionIndex,
        squadSize(state),
      )) {
        return state
      }
      // Only one diver can win (solo): the selection is redundant, so the spin
      // resolves the ceremony and banks the token immediately.
      const candidates = activeDivers(state)
      if (candidates.length === 1) {
        const winner = candidates[0]!
        const divers = state.divers.map(diver =>
          diver.id === winner.id
            ? { ...diver, rewardTokens: Math.min(REWARD_TOKEN_CAP, diver.rewardTokens + 1) }
            : diver,
        )
        return commit(
          state,
          { bonusSeed: action.seed, bonusWinnerIds: [winner.id], divers },
          action,
        )
      }
      return commit(state, { bonusSeed: action.seed }, action)
    }

    case 'AWARD_BONUS': {
      // Host-only: the host reads HD2's end screen and names the winner(s) of
      // the spun contest. Ties are common, so the action carries a list — every
      // tied diver banks a token. Awarding banks the tokens immediately — there
      // is no separate claim step. The spin already validated eligibility, and
      // the award can happen at the report or in the dock during loot.
      if (
        (state.phase !== 'diving' && state.phase !== 'rewards')
        || state.bonusSeed === null
        || state.bonusWinnerIds.length > 0
      ) {
        return state
      }
      // Every named id must be a seated diver; an unknown id voids the award.
      // Duplicates collapse so a repeated id banks one token.
      const winnerIds = [...new Set(action.playerIds)]
      if (winnerIds.length === 0 || !winnerIds.every(id => state.divers.some(diver => diver.id === id))) {
        return state
      }
      const winners = new Set(winnerIds)
      const divers = state.divers.map(diver =>
        winners.has(diver.id)
          ? { ...diver, rewardTokens: Math.min(REWARD_TOKEN_CAP, diver.rewardTokens + 1) }
          : diver,
      )
      return commit(state, { divers, bonusWinnerIds: winnerIds }, action)
    }

    case 'SET_NAME': {
      const name = action.name.trim().slice(0, MAX_NAME_LENGTH)
      if (!name || !state.divers.some(diver => diver.id === action.playerId)) {
        return state
      }
      return commit(state, {
        divers: state.divers.map(diver =>
          diver.id === action.playerId ? { ...diver, name } : diver,
        ),
      }, action)
    }

    // Presence, not play: stepping away keeps the seat and everything on it,
    // but the squad stops waiting on the diver. The host role moves to a
    // present diver when there is one. Not logged — it is not a game action.
    case 'SET_AWAY': {
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.away === action.away) {
        return state
      }
      let divers = state.divers.map(candidate =>
        candidate.id === diver.id ? { ...candidate, away: action.away } : candidate,
      )
      let hostId = state.hostId
      if (action.away && hostId === diver.id) {
        const nextHost = divers.find(candidate => !candidate.away)
        if (nextHost) {
          hostId = nextHost.id
          divers = divers.map(candidate => ({ ...candidate, isHost: candidate.id === nextHost.id }))
        }
      }
      const phase = state.phase === 'pacts' && pactsSettled(divers) ? 'diving' : state.phase
      return settleForfeit({ ...state, divers, hostId, phase })
    }

    case 'TRANSFER_HOST': {
      if (!state.divers.some(diver => diver.id === action.playerId)) {
        return state
      }
      return commit(state, {
        hostId: action.playerId,
        divers: state.divers.map(diver => ({ ...diver, isHost: diver.id === action.playerId })),
      }, action)
    }

    // The union is exhaustive, but a malformed message can reach the reducer
    // at runtime (the server also whitelists): unknown actions are no-ops, not
    // undefined — never let a bad message corrupt state.
    default:
      return state
  }
}
