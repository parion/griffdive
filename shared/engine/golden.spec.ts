import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MISFORTUNE_RISK } from './config'
import { createDiveState, reduce } from './reducer'
import { diverOptions } from './selectors'
import type { DiveState } from './types'

const UPDATE = process.env.GRIFFDIVE_UPDATE_GOLDENS === '1'
const goldenPath = join(dirname(fileURLToPath(import.meta.url)), '__goldens__', 'crusade-standard.json')

// Always-selectable pacts (none appear in BLOCKED_UNDER_MISFORTUNE), so the
// scripted rotation is valid under every possible misfortune.
const PACT_ROTATION: string[][] = [
  [],
  ['stimAbstinent'],
  ['antiTankAbstinent', 'deadWeight'],
  ['stimAbstinent', 'deadWeight', 'loadoutLoyalist'],
  ['loadoutLoyalist'],
  ['deadWeight'],
]
const STARS_ROTATION = [3, 4, 5, 2, 4]

function seedFor(index: number): number {
  return (index * 2654435761) >>> 0
}

interface MissionRecord {
  mission: number
  seed: number
  misfortuneId: string
  misfortuneAccepted: boolean
  pactIds: string[]
  outcome: 'success' | 'failure'
  stars: number
  optionId: string | null
  forfeitedItemId: string | null
  front: string | null
}

function playCrusade(): { state: DiveState, records: MissionRecord[], firstOptions: string[] } {
  let state = createDiveState({ variant: 'standard' }, 'host', 'Griffin')
  const records: MissionRecord[] = []
  let firstOptions: string[] = []
  let firstRecorded = false

  for (let mission = 0; mission < 80 && state.phase !== 'complete'; mission++) {
    const seed = seedFor(mission)
    state = reduce(state, { type: 'SPIN_WHEEL', seed })
    if (mission === 0) {
      state = reduce(state, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: seedFor(999) })
    }
    // The squad accepts intense misfortunes and declines weak ones — the
    // rotation pacts never conflict with any misfortune, so both paths work.
    const accepted = (MISFORTUNE_RISK[state.wheel!.misfortuneId] ?? 0) >= 3
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted })
    const pactIds = PACT_ROTATION[mission % PACT_ROTATION.length] ?? []
    state = reduce(state, { type: 'SET_PACTS', playerId: 'host', pactIds })

    const failure = mission % 5 === 3
    const stars = STARS_ROTATION[mission % STARS_ROTATION.length] ?? 3
    const record: MissionRecord = {
      mission,
      seed: state.wheel!.seed,
      misfortuneId: state.wheel!.misfortuneId,
      misfortuneAccepted: accepted,
      front: state.frontId,
      pactIds,
      outcome: failure ? 'failure' : 'success',
      stars,
      optionId: null,
      forfeitedItemId: null,
    }

    state = reduce(state, {
      type: 'REPORT_RESULT',
      outcome: failure ? 'failure' : 'success',
      stars,
    })
    // Record what the engine clamped to, not the raw input.
    record.stars = state.lastReport?.stars ?? 0

    if (failure) {
      if (state.phase === 'forfeit') {
        const personalId = (state.personalInventories.host ?? [])[0]
        const itemRef = personalId
          ? { ownerId: 'host', itemId: personalId }
          : null
        if (itemRef) {
          state = reduce(state, { type: 'FORFEIT_ITEM', itemRef })
          record.forfeitedItemId = itemRef.itemId
        }
      }
    }
    else {
      const diver = state.divers[0]
      if (!diver) {
        throw new Error('golden: no host diver')
      }
      const options = diverOptions(state, diver)
      if (!firstRecorded) {
        firstOptions = options.map(option => option.optionId)
        firstRecorded = true
      }
      const option = options[0]
      record.optionId = option?.optionId ?? null
      if (option) {
        state = reduce(state, { type: 'PICK_REWARD', playerId: 'host', optionId: option.optionId })
      }
      state = reduce(state, { type: 'ADVANCE' })
    }
    records.push(record)
  }

  return { state, records, firstOptions }
}

describe('golden: full scripted crusade (standard, diff 3 → 10)', () => {
  it('replays deterministically and matches the recorded snapshot', () => {
    const { state, records, firstOptions } = playCrusade()

    expect(state.phase).toBe('complete')
    expect(state.difficulty).toBe(10)
    expect(records.length).toBeGreaterThan(20)

    const snapshot = {
      variant: 'standard',
      missions: records,
      firstOptions,
      final: {
        phase: state.phase,
        difficulty: state.difficulty,
        missionIndex: state.missionIndex,
        missionInOperation: state.missionInOperation,
        rerollTokens: state.rerollTokens,
        completedCombos: [...state.completedCombos].sort(),
        personalInventory: [...(state.personalInventories.host ?? [])].sort(),
        seedHistory: state.seedHistory,
      },
    }

    if (UPDATE) {
      mkdirSync(dirname(goldenPath), { recursive: true })
      writeFileSync(goldenPath, `${JSON.stringify(snapshot, null, 2)}\n`)
      console.warn(`[golden] updated ${goldenPath}`)
      return
    }

    const golden = JSON.parse(readFileSync(goldenPath, 'utf8'))
    expect(snapshot).toEqual(golden)
  })
})
