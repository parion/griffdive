import { stratagems } from './stratagems'

// Stratagem input codes, written over U/D/L/R (the game's up/down/left/right).
// Hand-maintained: the generated catalog carries no codes, so every catalog
// stratagem is keyed here by its catalog id and the coverage spec fails the
// build when an import adds one without a code. Source: the helldivers.wiki.gg
// stratagem tables, cross-checked against drizzer14/stratagem-hero (MIT).
export type Arrow = 'U' | 'D' | 'L' | 'R'

export const STRATAGEM_CODES: Readonly<Record<string, string>> = {
  // Supply: support weapons
  'mg43machinegun': 'DLDUR',
  'eat17expendableantitank': 'DDLUR',
  'm105stalwart': 'DLDUUL',
  'las98lasercannon': 'DLDUL',
  'apw1antimaterielrifle': 'DLRUD',
  'gr8recoillessrifle': 'DLRRL',
  'gl21grenadelauncher': 'DLULD',
  'flam40flamethrower': 'DLUDU',
  'mg206heavymachinegun': 'DLUDD',
  'ac8autocannon': 'DLDUUR',
  'arc3arcthrower': 'DRDULL',
  'las99quasarcannon': 'DDULR',
  'rl77airburstrocketlauncher': 'DUULR',
  'mls4xcommando': 'DLUDR',
  'faf14spear': 'DDUDD',
  'rs422railgun': 'DRDULR',
  'stax3wasplauncher': 'DDUDR',
  'amw20apex': 'DLLUDL',
  'cqc20breachinghammer': 'DLRLU',
  'mgx42bulletstorm': 'DLDRUL',
  'plas45epoch': 'DLULR',
  's11speargun': 'DRDLUR',
  'leveller': 'DDLUD',
  'eat700expendablenapalm': 'DDLUL',
  'cqc9defoliationtool': 'DLRRD',
  'gl52deescalator': 'DRULR',
  'tx41sterilizer': 'DLUDL',
  'bmdc4pack': 'DRUURU',
  'ms11solosilo': 'DURDD',
  'bflam80cremator': 'DDRDUU',
  'cqc1onetrueflag': 'DLRRU',
  'gl28beltfedgrenadelauncher': 'DLULUU',
  'm1000maxigun': 'DLRDUU',
  'las44nova': 'DLRDD',
  '40kmeltagun': 'DLULLD',

  // Supply: backpacks
  'b1supplypack': 'DLDUUD',
  'lift850jumppack': 'DUUDU',
  'sh20ballisticshieldbackpack': 'DLDDUL',
  'axar23guarddog': 'DULURD',
  'axlas5rover': 'DULURR',
  'sh32shieldgeneratorpack': 'DULRLR',
  'sh51directionalshield': 'DULRUU',
  'axflam75hotdog': 'DULULL',
  'b100portablehellbomb': 'DRUUU',
  'axarc3k9': 'DULURL',
  'lift860hoverpack': 'DUUDLR',
  'axtx13dogbreath': 'DULURU',
  'lift182warppack': 'DLRDLR',

  // Supply: vehicles
  'm102gunnerfrv': 'LDRDRDU',
  'm103supplyfrv': 'LDLLDUR',
  'td110maelstrom': 'LDRDLDULR',
  'td220bastion': 'LDRDLDUDU',
  'exo45patriotexosuit': 'LDRULDD',
  'exo49emancipatorexosuit': 'LDRULDU',
  'exo51lumbererexosuit': 'LDRURLU',
  'exo55breakthroughexosuit': 'LDRLRDU',

  // Eagle
  'eaglestrafingrun': 'URR',
  'eagleairstrike': 'URDR',
  'eagleclusterbomb': 'URDDR',
  'eaglenapalmairstrike': 'URDU',
  'eaglesmokestrike': 'URUD',
  'eagle110mmrocketpods': 'URUL',
  'eagle500kgbomb': 'URDDD',
  'eaglegasairstrike': 'URLR',

  // Orbital
  'orbitalprecisionstrike': 'RRU',
  'orbitalgasstrike': 'RRDR',
  'orbitalemsstrike': 'RRLD',
  'orbitalsmokestrike': 'RRDU',
  'orbitalairburststrike': 'RRR',
  'orbitalrailcannonstrike': 'RUDDR',
  'orbitallaser': 'RDURD',
  'orbitalgatlingbarrage': 'RDLUU',
  'orbital120mmhebarrage': 'RRDLRD',
  'orbital380mmhebarrage': 'RDUULDD',
  'orbitalwalkingbarrage': 'RDRDRD',
  'orbitalnapalmbarrage': 'RRDLRU',

  // Defense: sentries
  'amg43machinegunsentry': 'DURRU',
  'ag16gatlingsentry': 'DURL',
  'aac8autocannonsentry': 'DURULU',
  'am12mortarsentry': 'DURRD',
  'amls4xrocketsentry': 'DURRL',
  'aarc3teslatower': 'DURULR',
  'am23emsmortarsentry': 'DURDR',
  'alas98lasersentry': 'DURDUR',
  'aflam40flamesentry': 'DURDUU',
  'agm17gasmortarsentry': 'DURDL',

  // Defense: emplacements and mines
  'md6antipersonnelminefield': 'DLUR',
  'md14incendiarymines': 'DLLD',
  'md17antitankmines': 'DLUU',
  'md8gasmines': 'DLLR',
  'fx12shieldgeneratorrelay': 'DDLRLR',
  'emg101hmgemplacement': 'DULRRL',
  'egl21grenadierbattlement': 'DRDLR',
  'eat12antitankemplacement': 'DULRRR',
}

// Stratagems every diver can call that are not catalog items (they are never
// loot): the mission and ship calls. Code-only, for the arcade.
export interface MissionStratagem {
  id: string
  name: string
  code: string
}

export const MISSION_STRATAGEMS: readonly MissionStratagem[] = [
  { id: 'reinforce', name: 'Reinforce', code: 'UDRLU' },
  { id: 'resupply', name: 'Resupply', code: 'DDUR' },
  { id: 'sosBeacon', name: 'SOS Beacon', code: 'UDRU' },
  { id: 'eagleRearm', name: 'Eagle Rearm', code: 'UULUR' },
  { id: 'hellbomb', name: 'NUX-223 Hellbomb', code: 'DULDURDU' },
  { id: 'seafArtillery', name: 'SEAF Artillery', code: 'RUUD' },
  { id: 'superEarthFlag', name: 'Super Earth Flag', code: 'DUDU' },
  { id: 'uploadData', name: 'Upload Data', code: 'LRUUU' },
  { id: 'seismicProbe', name: 'Seismic Probe', code: 'UULRDD' },
  { id: 'sssdDelivery', name: 'SSSD Delivery', code: 'DDDDDUU' },
]

export const REINFORCE_ID = 'reinforce'

export interface HeroStratagem {
  id: string
  name: string
  code: string
}

const CATALOG_NAMES: ReadonlyMap<string, string> = new Map(stratagems.map(item => [item.id, item.displayName]))

// The arcade's full pool, sorted by id: the fixed order is what makes a seeded
// round derive the same codes on every client and on the server.
export const HERO_POOL: readonly HeroStratagem[] = [
  ...Object.entries(STRATAGEM_CODES).map(([id, code]) => ({ id, name: CATALOG_NAMES.get(id) ?? id, code })),
  ...MISSION_STRATAGEMS,
].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

const HERO_BY_ID: ReadonlyMap<string, HeroStratagem> = new Map(HERO_POOL.map(entry => [entry.id, entry]))

export function heroStratagem(id: string): HeroStratagem | null {
  return HERO_BY_ID.get(id) ?? null
}

export function stratagemCode(id: string): string | null {
  return HERO_BY_ID.get(id)?.code ?? null
}

// Drill's practice filters: the catalog's four stratagem colors, plus the
// mission calls.
export type HeroCategory = 'all' | 'Supply' | 'Eagle' | 'Orbital' | 'Defense' | 'Mission'

const CATALOG_CATEGORY: ReadonlyMap<string, string> = new Map(stratagems.map(item => [item.id, item.category]))

export function heroPoolIds(category: HeroCategory): string[] | undefined {
  if (category === 'all') {
    return undefined
  }
  return HERO_POOL
    .filter(entry => (CATALOG_CATEGORY.get(entry.id) ?? 'Mission') === category)
    .map(entry => entry.id)
}
