import { ITEMS_BY_ID } from '../data/catalog'
import type { Item } from '../data/types'
import { SEAF_SUPPORT_ANTITANK_MIN, SEAF_SUPPORT_TIER } from './config'
import type { SupportRolls } from './config'
import { startingItemIds, supportRollsFor } from './progression'
import { deriveSeed, hashString, mulberry32 } from './rng'
import { rewardPoolFor } from './selectors'
import type { TierList } from './tierList'
import type { CrusadeSettings } from './types'

// One entry per roll kind, in the order the pack is dealt. The index salts the
// kind's own rng stream, so retuning one kind's count never reshuffles another.
const KINDS: readonly { kind: keyof SupportRolls, matches: (item: Item) => boolean }[] = [
  { kind: 'primary', matches: item => item.category === 'primary' },
  { kind: 'secondary', matches: item => item.category === 'secondary' },
  { kind: 'throwable', matches: item => item.category === 'throwable' },
  { kind: 'stratagem', matches: item => item.type === 'stratagem' },
  { kind: 'armorPassive', matches: item => item.category === 'armorPassive' },
  { kind: 'booster', matches: item => item.category === 'booster' },
]

// A diver's SEAF Support Package: random items of SEAF_SUPPORT_TIER drawn from
// the catalog of warbonds they own, never an item they already hold and never
// the same item twice. The pack always fields SEAF_SUPPORT_ANTITANK_MIN
// anti-tank items. Seeded by the diver's id alone — the package is dealt once
// (at launch or on seating) and stored on the diver, so a warbond change later
// never reshuffles it, and a diver rejoining under the same id draws the same
// pack from the same warbonds. A kind whose pool runs dry deals what it has.
export function rollSupportKit(
  settings: Pick<CrusadeSettings, 'variant' | 'mode'>,
  diverId: string,
  warbondCodes: readonly string[],
  tierList?: TierList | null,
): string[] {
  const rolls = supportRollsFor(settings.variant, settings.mode)
  if (!rolls) {
    return []
  }
  const owned = new Set(startingItemIds(settings.variant))
  const pool = rewardPoolFor(warbondCodes, tierList).filter(item => item.tier === SEAF_SUPPORT_TIER)
  const base = hashString(`${diverId}:seaf`)
  const dealt: string[] = []
  KINDS.forEach(({ kind, matches }, index) => {
    const candidates = pool.filter(item => matches(item) && !owned.has(item.id))
    const rng = mulberry32(deriveSeed(base, index))
    for (let n = 0; n < rolls[kind] && candidates.length > 0; n++) {
      const [item] = candidates.splice(Math.floor(rng() * candidates.length), 1)
      owned.add(item!.id)
      dealt.push(item!.id)
    }
  })
  return guaranteeAntiTank(dealt, pool, owned, deriveSeed(base, KINDS.length))
}

// Re-rolls dealt stratagems into anti-tank ones until the pack has enough,
// leaving every kind's count unchanged. The anti-tank draw has its own stream,
// so a pack that already qualifies is untouched.
function guaranteeAntiTank(dealt: string[], pool: readonly Item[], held: ReadonlySet<string>, seed: number): string[] {
  const isAntiTank = (id: string): boolean => ITEMS_BY_ID.get(id)?.antitank === true
  const rng = mulberry32(seed)
  const kit = [...dealt]
  let missing = SEAF_SUPPORT_ANTITANK_MIN - kit.filter(isAntiTank).length
  const candidates = pool.filter(item => item.type === 'stratagem' && item.antitank === true
    && !held.has(item.id) && !kit.includes(item.id))
  for (let index = 0; missing > 0 && index < kit.length && candidates.length > 0; index++) {
    if (ITEMS_BY_ID.get(kit[index]!)?.type !== 'stratagem') {
      continue
    }
    const [item] = candidates.splice(Math.floor(rng() * candidates.length), 1)
    kit[index] = item!.id
    missing--
  }
  return kit
}
