import { ITEMS_BY_ID } from '../data/catalog'
import type { CrusadeVariant } from './types'

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
  squadSize: string
  description: string
}

export const VARIANTS: readonly VariantDefinition[] = [
  {
    id: 'standard',
    name: 'Standard',
    squadSize: '3–4 divers',
    description: 'Start at difficulty 3 with surplus, outdated gear.',
  },
  {
    id: 'soloDuo',
    name: 'Solo/Duo',
    squadSize: '1–2 divers',
    description: 'Difficulty 3, plus the Orbital Precision Strike.',
  },
  {
    id: 'super',
    name: 'Super',
    squadSize: '3–4 divers',
    description: 'Difficulty 4. Melee secondaries only, Integrated Explosives, Ballistic Shield.',
  },
  {
    id: 'soloDuoSuper',
    name: 'Solo/Duo Super',
    squadSize: '1–2 divers',
    description: 'Super kit, plus the Orbital Precision Strike.',
  },
  {
    id: 'quickplay',
    name: 'Quickplay',
    squadSize: 'any squad',
    description: 'Straight in at difficulty 7 with extra stratagems and boosters.',
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
// getStartingItems.js), expressed as catalog ids.
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

const MELEE_SECONDARIES = BASE_KIT.secondaries.filter(id => id !== 'p2peacemaker')
const SOLO_STRIKE = ['orbitalprecisionstrike']
const BALLISTIC_SHIELD = ['sh20ballisticshieldbackpack']
const QUICKPLAY_STRATS = [
  ...BALLISTIC_SHIELD,
  ...SOLO_STRIKE,
  'grenadierbattlement',
  'antitankmines',
  'eagle110mmrocketpods',
  'orbitalgatlingbarrage',
  'arc3arcthrower',
]
const QUICKPLAY_BOOSTERS = ['uavrecon', 'muscleenhancement']

export const STARTING_KITS: Readonly<Record<CrusadeVariant, StartingKit>> = {
  standard: { ...BASE_KIT, startDifficulty: 3 },
  soloDuo: {
    ...BASE_KIT,
    startDifficulty: 3,
    stratagems: [...BASE_KIT.stratagems, ...SOLO_STRIKE],
  },
  super: {
    ...BASE_KIT,
    startDifficulty: 4,
    secondaries: MELEE_SECONDARIES,
    armorPassives: ['integratedexplosives'],
    stratagems: [...BASE_KIT.stratagems, ...BALLISTIC_SHIELD],
  },
  soloDuoSuper: {
    ...BASE_KIT,
    startDifficulty: 4,
    secondaries: MELEE_SECONDARIES,
    armorPassives: ['integratedexplosives'],
    stratagems: [...BASE_KIT.stratagems, ...BALLISTIC_SHIELD, ...SOLO_STRIKE],
  },
  quickplay: {
    ...BASE_KIT,
    startDifficulty: 7,
    stratagems: [...BASE_KIT.stratagems, ...QUICKPLAY_STRATS],
    boosters: QUICKPLAY_BOOSTERS,
  },
}

// The full starting kit every diver owns personally — stratagems included
// (no shared pool: earned stratagems belong to the diver who rolled them).
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

// Completed operations behind the squad: each op bumps difficulty by one, so
// the gap to the variant's start difficulty is the joiner's catch-up scale.
export function catchUpOpsBehind(difficulty: number, variant: CrusadeVariant): number {
  return Math.max(0, difficulty - STARTING_KITS[variant].startDifficulty)
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
