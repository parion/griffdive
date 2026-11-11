// Specialists: a commission a diver may take at launch — an issued kit, the
// standing orders to report in it, and a service record that climbs through the
// ranks. An evolution of Penitent Crusade's specialists (hd2-random-strat by
// Selenestica, MIT): the Zealous Martyr and the two ground coordinators are
// ports, the rest are Griffdive's own. The rules live in
// shared/engine/specialists.ts; this file is the roster and its copy.

export type SpecialistRole = 'assault' | 'heavy' | 'demolitions' | 'support' | 'recon' | 'engineer'

// Which stratagems a specialist's reward pools may offer until they make
// Sergeant. A doctrine narrows a pool; it never names an item.
export type SpecialistDoctrine = 'eagle' | 'orbital' | 'defense' | 'demolition'

export interface Specialist {
  id: string
  name: string
  role: SpecialistRole
  tagline: string
  // Catalog ids issued at launch. The diver must own every warbond they come
  // from, and must report in them at the start of every mission.
  kit: readonly string[]
  doctrine?: SpecialistDoctrine
  // The end-of-mission stat (a BONUS_STATS id) the specialist is known for:
  // winning Squad Honors on it earns a commendation.
  calling: string
}

export const SPECIALIST_ROLES: Readonly<Record<SpecialistRole, string>> = {
  assault: 'Assault',
  heavy: 'Heavy',
  demolitions: 'Demolitions',
  support: 'Support',
  recon: 'Recon',
  engineer: 'Engineer',
}

export const SPECIALIST_DOCTRINES: Readonly<Record<SpecialistDoctrine, string>> = {
  eagle: 'Eagle stratagems only',
  orbital: 'Orbital stratagems only',
  defense: 'Sentries, emplacements and mines only',
  demolition: 'Explosive and anti-tank stratagems only',
}

export const SPECIALISTS: readonly Specialist[] = [
  {
    id: 'fieldMedic',
    name: 'Field Medic',
    role: 'support',
    tagline: 'Nobody bleeds out on my watch.',
    kit: ['p11stimpistol', 'medkit', 'experimentalinfusion'],
    calling: 'deaths',
  },
  {
    id: 'quartermaster',
    name: 'Quartermaster',
    role: 'support',
    tagline: 'Ammunition is a form of patriotism.',
    kit: ['b1supplypack', 'armedresupplypods'],
    calling: 'samplesExtracted',
  },
  {
    id: 'demolitionist',
    name: 'Demolitionist',
    role: 'demolitions',
    tagline: 'If it has armor, it has a weak point. If not, I make one.',
    kit: ['eat17expendableantitank', 'g123thermitegrenade', 'siegeready'],
    doctrine: 'demolition',
    calling: 'kills',
  },
  {
    id: 'zealousMartyr',
    name: 'Zealous Martyr',
    role: 'demolitions',
    tagline: 'Every diver is a delivery system for Liberty.',
    kit: ['b100portablehellbomb', 'integratedexplosives'],
    calling: 'meleeKills',
  },
  {
    id: 'eagleCoordinator',
    name: 'Eagle Ground Coordinator',
    role: 'assault',
    tagline: 'Eagle-1, I have a target for you.',
    kit: ['eagleairstrike', 'eagle500kgbomb'],
    doctrine: 'eagle',
    calling: 'stratagemsUsed',
  },
  {
    id: 'orbitalCoordinator',
    name: 'Orbital Ground Coordinator',
    role: 'assault',
    tagline: 'The Destroyer does the talking.',
    kit: ['orbitalprecisionstrike', 'orbitallaser'],
    doctrine: 'orbital',
    calling: 'stratagemsUsed',
  },
  {
    id: 'exterminator',
    name: 'Exterminator',
    role: 'heavy',
    tagline: 'Hives burn. So do their hatcheries.',
    kit: ['flam40flamethrower', 'inflammable', 'g10incendiarygrenade'],
    calling: 'kills',
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    role: 'heavy',
    tagline: 'Point me at it.',
    kit: ['mg206heavymachinegun', 'fortified', 'vitalityenhancement'],
    calling: 'shotsFired',
  },
  {
    id: 'sentryEngineer',
    name: 'Sentry Engineer',
    role: 'engineer',
    tagline: 'I hold the line so the line holds me.',
    kit: ['ag16gatlingsentry', 'engineeringkit'],
    doctrine: 'defense',
    calling: 'accidentals',
  },
  {
    id: 'marksman',
    name: 'Marksman',
    role: 'recon',
    tagline: 'One round. One less traitor.',
    kit: ['apw1antimaterielrifle', 'scout', 'uavrecon'],
    calling: 'accuracy',
  },
]

const SPECIALISTS_BY_ID: ReadonlyMap<string, Specialist> = new Map(
  SPECIALISTS.map(specialist => [specialist.id, specialist]),
)

export function specialistById(id: string | null | undefined): Specialist | undefined {
  return id ? SPECIALISTS_BY_ID.get(id) : undefined
}

// Index = rank. Rank 0 is where every commission starts.
export const SPECIALIST_RANK_TITLES = ['Recruit', 'Specialist', 'Sergeant', 'Commissioned'] as const

// Promotion dispatches from Super Earth Command, one per rank reached.
// `{name}` is the diver, `{specialist}` the commission.
export const PROMOTION_DISPATCHES: Readonly<Record<number, string>> = {
  1: '{name}, {specialist}: your record has been reviewed. You are confirmed in rank. Carry on.',
  2: '{name} is promoted Sergeant. Command trusts your judgment in the field: doctrine is yours to interpret.',
  3: '{name} is Commissioned. Super Earth no longer asks what you are owed. You have earned it.',
}

export const SUCCESSION_DISPATCH = '{name} takes up the mantle of {predecessor}, {specialist}. The rank carries over. So does the expectation.'
