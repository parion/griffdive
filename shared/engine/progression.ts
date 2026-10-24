import { ITEMS_BY_ID } from '../data/catalog'
import { SEAF_SUPPORT_ROLLS } from './config'
import type { SupportRolls } from './config'
import type { CrusadeMode, CrusadeVariant } from './types'

export const DIFFICULTY_NAMES: Readonly<Record<number, string>> = {
  3: 'Medium',
  4: 'Challenging',
  5: 'Hard',
  6: 'Extreme',
  7: 'Suicide Mission',
  8: 'Impossible',
  9: 'Helldive',
  10: 'Super Helldive',
}

export function difficultyName(difficulty: number): string {
  return DIFFICULTY_NAMES[difficulty] ?? `Difficulty ${difficulty}`
}

export interface VariantDefinition {
  id: CrusadeVariant
  name: string
  description: string
}

// Three starting difficulties; squad size never gates a variant (it fluctuates
// mid-crusade). The hard and suicide starts also choose a mode — the SEAF
// Support Package or Super Penance — see STARTING_KITS below.
export const VARIANTS: readonly VariantDefinition[] = [
  {
    id: 'medium',
    name: 'Medium',
    description: 'Start at difficulty 3 with surplus, outdated gear.',
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Start at difficulty 5. Choose the SEAF Support Package or Super Penance.',
  },
  {
    id: 'suicide',
    name: 'Suicide Mission',
    description: 'Start at difficulty 7. Choose the SEAF Support Package or Super Penance.',
  },
]

export interface StartingKit {
  startDifficulty: number
  stratagems: string[]
  primaries: string[]
  secondaries: string[]
  throwables: string[]
  armorPassives: string[]
  boosters: string[]
}

// Starting kits mirror Penitent Crusade's surplus loadouts (upstream
// getStartingItems.js), expressed as catalog ids. Every starting difficulty
// fields the same surplus kit; the SEAF Support Package (support.ts) is the
// only kit difference, and it is an explicit mode choice.
const BASE_KIT = {
  stratagems: [
    'cqc1onetrueflag',
    'cqc9defoliationtool',
    'orbitalemsstrike',
    'orbitalsmokestrike',
    'eaglesmokestrike',
    'am23emsmortarsentry',
    'fx12shieldgeneratorrelay',
  ],
  primaries: ['r2124constitution'],
  secondaries: [
    'p2peacemaker',
    'cqc19stunlance',
    'cqc30stunbaton',
    'cqc2saber',
    'cqc42machete',
    'cqc73entrenchmenttool',
  ],
  throwables: ['g3smokegrenade', 'k2throwingknife', 'g12highexplosivegrenade', 'g89smokescreen'],
  armorPassives: ['extrapadding'],
  boosters: [],
} satisfies Omit<StartingKit, 'startDifficulty'>

export const STARTING_KITS: Readonly<Record<CrusadeVariant, StartingKit>> = {
  medium: { ...BASE_KIT, startDifficulty: 3 },
  hard: { ...BASE_KIT, startDifficulty: 5 },
  suicide: { ...BASE_KIT, startDifficulty: 7 },
}

// The full surplus kit every diver owns personally — stratagems included
// (no shared pool: earned stratagems belong to the diver who rolled them). The
// SEAF Support Package is not part of it: that pack is rolled per diver (see
// support.ts) and rides on top as gear the diver has at stake.
export function startingItemIds(variant: CrusadeVariant): string[] {
  const kit = STARTING_KITS[variant]
  return [
    ...kit.stratagems,
    ...kit.primaries,
    ...kit.secondaries,
    ...kit.throwables,
    ...kit.armorPassives,
    ...kit.boosters,
  ]
}

// What the SEAF mode rolls each diver at this start, or null when the run has
// no support package (medium, Super Penance, or a start with no roll table).
export function supportRollsFor(variant: CrusadeVariant, mode?: CrusadeMode): SupportRolls | null {
  if (mode !== 'seaf') {
    return null
  }
  return SEAF_SUPPORT_ROLLS[STARTING_KITS[variant].startDifficulty] ?? null
}

// Completed operations behind the squad: each op bumps difficulty by one, so
// the gap to the variant's start difficulty is the joiner's catch-up scale.
export function catchUpOpsBehind(difficulty: number, variant: CrusadeVariant): number {
  return Math.max(0, difficulty - STARTING_KITS[variant].startDifficulty)
}

// The gear a diver actually won: their kit beyond the starting surplus and the
// support pack they were dealt, each item once. This is all a legacy cache ever
// holds — every joiner is already issued a kit of their own, so parking it would
// only stack duplicates.
export function earnedKit(itemIds: readonly string[], variant: CrusadeVariant, supportKit: readonly string[] = []): string[] {
  const starting = new Set([...startingItemIds(variant), ...supportKit])
  return [...new Set(itemIds)].filter(id => !starting.has(id))
}

// Inventories are sets: a claim or restore merges kits without repeating an id.
export function mergeKit(base: readonly string[], extra: readonly string[]): string[] {
  return [...new Set([...base, ...extra])]
}

export function assertKitsValid(): void {
  for (const variant of Object.keys(STARTING_KITS) as CrusadeVariant[]) {
    for (const id of startingItemIds(variant)) {
      if (!ITEMS_BY_ID.has(id)) {
        throw new Error(`Starting kit "${variant}" references unknown item "${id}"`)
      }
    }
  }
}
