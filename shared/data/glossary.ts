// The rules glossary. A condition's rule is one short headline; the words that
// carry real mechanics are marked as keywords and defined here once, so a rule
// stays terse while "offensive", "reserve" or "fails" always mean the same
// thing everywhere (the Hades boon screen's side panels, in Griffdive's voice).
export interface GlossaryEntry {
  id: string
  term: string
  definition: string
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  // Stratagems
  {
    id: 'stratagem',
    term: 'Stratagem',
    definition: 'Anything called in from the stratagem menu, in four colors: red strikes, blue supply, green defense, yellow mission.',
  },
  {
    id: 'yellow',
    term: 'Yellow stratagem',
    definition: 'Mission stratagems: Resupply, SOS Beacon, Hellbomb, SEAF Artillery and the objective tools. Reinforce is yellow too, but it keeps its own rules.',
  },
  {
    id: 'supply',
    term: 'Blue stratagem',
    definition: 'Supply stratagems: support weapons, backpacks and vehicles.',
  },
  {
    id: 'reinforce',
    term: 'Reinforce',
    definition: 'The yellow stratagem that drops a fallen diver back in. Only rules that name it touch it; "no stratagems" never does.',
  },
  {
    id: 'resupply',
    term: 'Resupply',
    definition: 'The yellow Resupply stratagem and the pods it drops. Ammo boxes on the map and Supply Packs are not resupplies.',
  },
  {
    id: 'reserve',
    term: 'Reserve',
    definition: 'The four non-lethal stratagems every diver always owns: Orbital EMS, Orbital Smoke, Eagle Smoke and the EMS Mortar Sentry. Pacts never take them; squad directives can.',
  },
  {
    id: 'offensive',
    term: 'Offensive',
    definition: 'Built to hurt the enemy: guns, strikes, barrages, and lethal sentries, mines and emplacements. Smoke, EMS and shield utility never count.',
  },
  {
    id: 'eagle',
    term: 'Eagle',
    definition: 'Red stratagems flown in by Eagle-1: strafing runs, bombs, rocket pods and smoke.',
  },
  {
    id: 'orbital',
    term: 'Orbital',
    definition: 'Red stratagems fired from the Destroyer: barrages, lasers, precision strikes, EMS and smoke.',
  },
  {
    id: 'sentry',
    term: 'Sentry',
    definition: 'A green stratagem that stands and fires on its own, mortars included. Mines and emplacements are not sentries.',
  },
  {
    id: 'backpack',
    term: 'Backpack',
    definition: 'Any stratagem worn on your back: Supply Pack, Jump and Hover Packs, shields, Guard Dogs, and backpack-fed weapons like the Autocannon.',
  },
  {
    id: 'supportWeapon',
    term: 'Support weapon',
    definition: 'A blue weapon stratagem with its own carry slot: Machine Gun, Railgun, Autocannon, even melee ones like the Breaching Hammer. Primaries, secondaries and throwables are not support weapons.',
  },
  {
    id: 'antiTank',
    term: 'Anti-tank',
    definition: 'Anything built to crack heavy armor: AT-tagged stratagems, weapons and grenades such as thermite.',
  },

  // Loadout
  {
    id: 'booster',
    term: 'Booster',
    definition: 'The perk chosen in the loadout screen\'s booster slot. Armor passives are not boosters.',
  },
  {
    id: 'lightArmor',
    term: 'Light armor',
    definition: 'Any armor set the armor screen classes as Light, whatever its passive.',
  },
  {
    id: 'heavyArmor',
    term: 'Heavy armor',
    definition: 'Any armor set the armor screen classes as Heavy, whatever its passive.',
  },
  {
    id: 'pickups',
    term: 'Pickups',
    definition: 'Anything lifted off the ground or from a fallen diver: dropped weapons, support weapons, gear.',
  },

  // Field and stats
  {
    id: 'stim',
    term: 'Stim',
    definition: 'A stim injection. The end-of-mission stats screen counts yours.',
  },
  {
    id: 'melee',
    term: 'Melee',
    definition: 'Blows by hand, blade or club. Guns, grenades and stratagems are never melee.',
  },
  {
    id: 'kill',
    term: 'Scoring a kill',
    definition: 'A kill credited on the stats screen. Stratagem kills count to whoever called the stratagem.',
  },
  {
    id: 'friendlyFire',
    term: 'Friendly fire',
    definition: 'Damage dealt to squadmates, read off the end-of-mission stats screen.',
  },
  {
    id: 'failed',
    term: 'Fails',
    definition: 'A broken rule is marked failed, never mission failure. Its risk is voided and everyone it bound loses one reward option. The mission plays on.',
  },
]

const GLOSSARY_BY_ID: ReadonlyMap<string, GlossaryEntry> = new Map(
  GLOSSARY.map(entry => [entry.id.toLowerCase(), entry]),
)
const GLOSSARY_BY_TERM: ReadonlyMap<string, GlossaryEntry> = new Map(
  GLOSSARY.map(entry => [entry.term.toLowerCase(), entry]),
)

export function glossaryEntry(id: string): GlossaryEntry | null {
  return GLOSSARY_BY_ID.get(id.toLowerCase()) ?? null
}

export interface RulePart {
  text: string
  // Set on a keyword span: the glossary entry that defines it.
  keyword?: string
}

export interface ParsedRule {
  // The rule as plain prose, markup stripped — safe for any consumer.
  text: string
  parts: readonly RulePart[]
  // Glossary ids in order of first appearance.
  keywords: readonly string[]
}

// Rule markup: `{shown text}` marks a keyword whose id or term is the text
// itself; `{shown text|id}` names the entry when the wording differs. An
// unknown keyword is a data bug, so it throws at load rather than rendering
// a dead highlight.
export function parseRule(markup: string): ParsedRule {
  const parts: RulePart[] = []
  const keywords: string[] = []
  const marker = /\{([^{}|]+)(?:\|([^{}]+))?\}/g
  let cursor = 0
  for (const match of markup.matchAll(marker)) {
    const [whole, shown = '', named] = match
    if (match.index > cursor) {
      parts.push({ text: markup.slice(cursor, match.index) })
    }
    const key = (named ?? shown).trim()
    const entry = GLOSSARY_BY_ID.get(key.toLowerCase()) ?? GLOSSARY_BY_TERM.get(key.toLowerCase())
    if (!entry) {
      throw new Error(`Unknown glossary keyword "${key}" in rule: ${markup}`)
    }
    parts.push({ text: shown, keyword: entry.id })
    if (!keywords.includes(entry.id)) {
      keywords.push(entry.id)
    }
    cursor = match.index + whole.length
  }
  if (cursor < markup.length) {
    parts.push({ text: markup.slice(cursor) })
  }
  return { text: parts.map(part => part.text).join(''), parts, keywords }
}
