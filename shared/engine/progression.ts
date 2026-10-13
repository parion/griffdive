import { ITEMS_BY_ID } from '../data/catalog'
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
// fields the same surplus kit; the SEAF Support Package (below) is the only
// kit difference, and it is an explicit mode choice.
const BASE_KIT = {
  stratagems: [
    'onetrueflag',
    'defoliationtool',
    'orbitalemsstrike',
    'orbitalsmokestrike',
    'eaglesmokestrike',
    'emsmortarsentry',
    'shieldgeneratorrelay',
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

// The SEAF Support Package: the assisted ride's extra gear, granted only when
// the squad picks mode 'seaf'. Super Penance grants none of it.
export const SEAF_SUPPORT_KIT: Pick<StartingKit, 'stratagems' | 'boosters'> = {
  stratagems: [
    'sh20ballisticshieldbackpack',
    'orbitalprecisionstrike',
    'grenadierbattlement',
    'antitankmines',
    'eagle110mmrocketpods',
    'orbitalgatlingbarrage',
    'arc3arcthrower',
  ],
  boosters: ['uavrecon', 'muscleenhancement'],
}

// The full starting kit every diver owns personally — stratagems included
// (no shared pool: earned stratagems belong to the diver who rolled them).
// Only the SEAF mode appends the support package; 'penance' (and no mode) get
// the bare surplus.
export function startingItemIds(variant: CrusadeVariant, mode?: CrusadeMode): string[] {
  const kit = STARTING_KITS[variant]
  const support = mode === 'seaf' ? SEAF_SUPPORT_KIT : null
  return [
    ...kit.stratagems,
    ...kit.primaries,
    ...kit.secondaries,
    ...kit.throwables,
    ...kit.armorPassives,
    ...kit.boosters,
    ...(support?.stratagems ?? []),
    ...(support?.boosters ?? []),
  ]
}

// Completed operations behind the squad: each op bumps difficulty by one, so
// the gap to the variant's start difficulty is the joiner's catch-up scale.
export function catchUpOpsBehind(difficulty: number, variant: CrusadeVariant): number {
  return Math.max(0, difficulty - STARTING_KITS[variant].startDifficulty)
}

// The gear a diver actually won: their kit beyond the starting surplus, each
// item once. This is all a legacy cache ever holds — every joiner is already
// issued the starting kit, so parking it would only stack duplicates.
export function earnedKit(itemIds: readonly string[], variant: CrusadeVariant, mode?: CrusadeMode): string[] {
  const starting = new Set(startingItemIds(variant, mode))
  return [...new Set(itemIds)].filter(id => !starting.has(id))
}

// Inventories are sets: a claim or restore merges kits without repeating an id.
export function mergeKit(base: readonly string[], extra: readonly string[]): string[] {
  return [...new Set([...base, ...extra])]
}

export function assertKitsValid(): void {
  for (const variant of Object.keys(STARTING_KITS) as CrusadeVariant[]) {
    for (const mode of [undefined, 'seaf'] as (CrusadeMode | undefined)[]) {
      const label = `${variant}${mode ? `+${mode}` : ''}`
      for (const id of startingItemIds(variant, mode)) {
        if (!ITEMS_BY_ID.has(id)) {
          throw new Error(`Starting kit "${label}" references unknown item "${id}"`)
        }
      }
    }
  }
}
