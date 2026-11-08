import type { Item, Tier } from '../data/types'
import {
  ARMOR_PACK_ODDS,
  ARMOR_PACK_SIZE,
  BARGAIN_TIER_REACH,
  BONUS_STATS,
  MAX_OPTIONS,
  OVERFLOW_S_LUCK,
  OVERFLOW_S_PLUS_LUCK,
  CREDIT_PRICE_TIER,
  CREDIT_PRICE_TYPE,
  CREDIT_PRICE_TYPE_DEFAULT,
  SAMPLE_CREDITS,
  S_PLUS_OVERFLOW_CAP,
  S_PLUS_UPGRADE_DIVISOR,
  S_OVERFLOW_CAP,
  S_UPGRADE_CAP,
  S_UPGRADE_DIVISOR,
  STARS_TO_OPTIONS,
  TIER_ROLL_WEIGHT_BASE,
  TIME_HAUL_FLOOR,
  CEILING_PREVIEW_FLOOR,
  VALOR_METER_MAX,
  armorPackBandFor,
  bandPosition,
  baseTierFor,
  sPlusUpgradeCapFor,
  sPlusValorFloorFor,
  sValorFloorFor,
  topRungAltitude,
  topRungReachFor,
  upgradeOdds,
} from './config'
import type { BonusStat } from './config'
import { deriveSeed, mulberry32, pickIndex, pickWeighted } from './rng'
import type { Rng } from './rng'
import type { BargainSlotKind, MissionReport, RewardTier, SampleCounts } from './types'

const TIER_INDEX: Readonly<Record<Tier, number>> = { c: 0, b: 1, a: 2, s: 3 }
export const CEILING_LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

// One step of the ceiling ladder. The top rungs (S, S+) don't use the shared
// step curve: each has a Valor floor, its own ramp and the smooth ladder
// altitude, so the top scales with difficulty instead of sawtoothing at band
// boundaries — and altitude still can't hand out the top tier for a trickle of
// risk. Valor past the meter top is banked as Luck and adds flat odds to both
// rungs; below the A band both are scaled by the band's reach, so the top tiers
// stay a high-altitude prize. The roll, the preview and the priced climb all
// share this so the UI never overstates the jackpot.
function stepOdds(difficulty: number, valor: number, step: number, targetIndex: number): number {
  const bandPos = bandPosition(difficulty)
  const altitude = topRungAltitude(difficulty)
  const metered = Math.min(valor, VALOR_METER_MAX)
  const overflow = Math.max(0, valor - VALOR_METER_MAX)
  const reach = topRungReachFor(difficulty)
  if (targetIndex === CEILING_LADDER.length - 1) {
    const ramp = Math.max(0, metered - sPlusValorFloorFor(difficulty) + 1)
    const cap = sPlusUpgradeCapFor(difficulty)
    const base = Math.min(cap, (ramp * altitude) / S_PLUS_UPGRADE_DIVISOR)
    return Math.min(S_PLUS_OVERFLOW_CAP, base + overflow * OVERFLOW_S_PLUS_LUCK) * reach
  }
  if (targetIndex === CEILING_LADDER.length - 2) {
    const ramp = Math.max(0, metered - sValorFloorFor(difficulty) + 1)
    const base = Math.min(S_UPGRADE_CAP, (ramp * altitude) / S_UPGRADE_DIVISOR)
    return Math.min(S_OVERFLOW_CAP, base + overflow * OVERFLOW_S_LUCK) * reach
  }
  return upgradeOdds(metered, bandPos, step)
}

// No catalog item carries the S+ tier, so a ceiling that breaks the scale
// banks as Liberty's Cross instead: one option to claim any item the diver's
// own catalog allows. The sentinel id can never collide with a catalog id
// (catalog ids are camelCase) and is never stored — offers are derived.
export const DIVERS_CHOICE_OPTION_ID = 's-plus:divers-choice'

// Display stand-in for the choice slot; the UI renders its own special card
// for it and PICK_REWARD swaps in the actually chosen item.
export const DIVERS_CHOICE_ITEM: Item = {
  id: DIVERS_CHOICE_OPTION_ID,
  displayName: 'Liberty’s Cross',
  type: 'equipment',
  category: 'booster',
  tags: [],
  warbondCode: 'none',
  tier: 's',
}

// Chosen risk (accepted team misfortune + personal pacts) is the diver's Valor
// — it buys odds, not tiers. Samples become credits and never feed it.
export function valorOf(teamRisk: number, pactRisk: number): number {
  return teamRisk + pactRisk
}

// The sample haul's raw credit worth, before the extraction-speed multiplier.
// No cap: this is currency, not Valor — difficulty already scales it through
// the game's own sample mix (commons dominate early, supers appear at 6).
export function haulValue(samples: SampleCounts | undefined): number {
  if (!samples) {
    return 0
  }
  return (
    Math.max(0, samples.common) * SAMPLE_CREDITS.common
    + Math.max(0, samples.rare) * SAMPLE_CREDITS.rare
    + Math.max(0, samples.super) * SAMPLE_CREDITS.super
  )
}

// Extraction speed scales the purse: TIME_HAUL_FLOOR at no time remaining, 1.0
// at a full clock. An absent time reading counts as none.
export function timeHaulMultiplier(timePct: number | undefined): number {
  const fraction = timePct === undefined ? 0 : Math.min(1, Math.max(0, timePct / 100))
  return TIME_HAUL_FLOOR + (1 - TIME_HAUL_FLOOR) * fraction
}

// Credits a successful mission banks into every diver's purse. Rounded down —
// a partial credit is not currency.
export function missionHaul(report: MissionReport | null): number {
  if (!report) {
    return 0
  }
  return Math.floor(haulValue(report.samples) * timeHaulMultiplier(report.timePct))
}

// Brasch's Bargains price: tier first, then type (a primary out-prices a
// stratagem). Unknown categories cost the default multiplier.
export function itemPrice(item: Item): number {
  const base = CREDIT_PRICE_TIER[item.tier]
  const multiplier = CREDIT_PRICE_TYPE[item.category] ?? CREDIT_PRICE_TYPE_DEFAULT
  return Math.round(base * multiplier)
}

// The offer's tier ceiling is rolled: start at the difficulty's base tier,
// each step to the next tier succeeds with odds scaled by Valor and the band
// position, and the chain stops on the first miss. A zero-Valor dive always
// rolls its base tier; S/S+ need stacked Valor and even then are never sure.
export function rollCeiling(rng: Rng, difficulty: number, valor: number): RewardTier {
  let index = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  for (let step = 1; index + 1 < CEILING_LADDER.length; step++) {
    if (rng() < stepOdds(difficulty, valor, step, index + 1)) {
      index++
    }
    else {
      break
    }
  }
  return CEILING_LADDER[index]!
}

// Deterministic best case for previews: the highest tier whose odds of being
// reached clear the preview floor.
export function maxCeiling(difficulty: number, valor: number): RewardTier {
  const base = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  let index = base
  while (index + 1 < CEILING_LADDER.length
    && oddsToReach(difficulty, valor, CEILING_LADDER[index + 1]!) >= CEILING_PREVIEW_FLOOR) {
    index++
  }
  return CEILING_LADDER[index]!
}

export function oddsToReach(difficulty: number, valor: number, tier: RewardTier): number {
  const target = CEILING_LADDER.indexOf(tier)
  const floor = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  let odds = 1
  for (let step = 1; floor + step <= target; step++) {
    odds *= stepOdds(difficulty, valor, step, floor + step)
  }
  return odds
}

// The whole-percent odds the UI shows for a tier: the base tier and below read
// 100, and anything under the preview floor reads 0, matching maxCeiling.
export function ceilingOddsPercent(difficulty: number, valor: number, tier: RewardTier): number {
  if (CEILING_LADDER.indexOf(tier) <= CEILING_LADDER.indexOf(baseTierFor(difficulty))) {
    return 100
  }
  const odds = oddsToReach(difficulty, valor, tier)
  return odds < CEILING_PREVIEW_FLOOR ? 0 : Math.round(odds * 100)
}

// Bonus honors: after every reward draft the squad spins one end-of-mission
// stat contest. Like the wheel and the pact offer, it is a deterministic
// derivation of a seed — stream salt 4 (wheel uses 1/2, pacts 3) — so every
// client animates to the same result. The host resolves the winner by reading
// HD2's stats screen; the app never captures the stats.
export function rollBonus(seed: number): BonusStat {
  const rng = mulberry32(deriveSeed(seed, 4))
  return BONUS_STATS[pickIndex(rng, BONUS_STATS.length)]!
}

export function optionsForStars(stars: number): number {
  const clamped = Math.min(Math.max(Math.round(stars), 0), STARS_TO_OPTIONS.length - 1)
  return Math.min(STARS_TO_OPTIONS[clamped] ?? 1, MAX_OPTIONS)
}

// The options a diver's draft actually offers: the star count less the options
// lost to a failed pact or a broken team directive, floored at one so the draft
// can always complete (AGENTS.md: Reward math). The single source for both the
// rolled offer and the preview. S+ is one of the rolled tiers now, not an extra
// slot: a Cross replaces an option rather than adding one.
export function optionsForDiver(
  stars: number,
  lostOptions: number,
): number {
  return Math.max(1, optionsForStars(stars) - lostOptions)
}

// Reward options live in the band the difficulty guarantees (its base tier) and
// the ceiling the diver's Valor rolled. The base is a hard floor — a Super
// Helldive never offers C-tier gear — and within the band a higher tier is
// exponentially likelier, so the ceiling the diver bought is actually what the
// draft leans into. S+ has no items of its own, so it prices as S.
export function tierWeight(tier: Tier, floor: RewardTier, ceiling: RewardTier): number {
  const floorIndex = tierIndex(floor)
  const ceilingIndex = tierIndex(ceiling)
  const index = TIER_INDEX[tier]
  if (index > ceilingIndex || index < floorIndex) {
    return 0
  }
  return TIER_ROLL_WEIGHT_BASE ** (index - floorIndex)
}

function tierIndex(tier: RewardTier): number {
  return tier === 'S+' ? TIER_INDEX.s : TIER_INDEX[tier.toLowerCase() as Tier]
}

// The lit roll: one d100 line split into tier zones. `start`/`end` are
// percentage points from the left (0–100), so the UI can draw each zone at its
// true width and a needle at the rolled number. The base tier is a hard floor,
// so tiers below it carry zero width and are never rolled.
export interface TierZone {
  tier: RewardTier
  start: number
  end: number
  chance: number
}

export function tierZones(difficulty: number, valor: number): TierZone[] {
  const reach: Record<RewardTier, number> = {
    'C': 1,
    'B': oddsToReach(difficulty, valor, 'B'),
    'A': oddsToReach(difficulty, valor, 'A'),
    'S': oddsToReach(difficulty, valor, 'S'),
    'S+': oddsToReach(difficulty, valor, 'S+'),
  }
  let cursor = 0
  return CEILING_LADDER.map((tier, index) => {
    const next = CEILING_LADDER[index + 1]
    const chance = Math.max(0, reach[tier] - (next ? reach[next]! : 0))
    const start = cursor
    cursor += chance * 100
    return { tier, start, end: cursor, chance }
  }).map((zone, index, zones) => ({
    ...zone,
    end: index === zones.length - 1 ? 100 : zone.end,
  }))
}

// A d100 result (1–100) lands in the half-open zone centred on its face. The
// 0.5 offset keeps a face on a boundary inside the lower zone, matching the
// needle drawn at the same position.
export function tierForRoll(roll: number, zones: readonly TierZone[]): RewardTier {
  const position = Math.min(99.999, Math.max(0, roll - 0.5))
  return zones.find(zone => zone.chance > 0 && position < zone.end)?.tier
    ?? zones[zones.length - 1]!.tier
}

export interface RewardOption {
  optionId: string
  item: Item
  // Liberty's Cross: the diver names the item when picking (PICK_REWARD's
  // choiceItemId); the placeholder item is display-only.
  choice?: boolean
  // The lit loot roll: the d100 face and the tier it landed in. Older derived
  // offers (forfeit, Field Promotion) leave these unset.
  roll?: number
  tier?: RewardTier
}

// Every draft option rolls its own d100 on the same odds line. This replaces
// the old ceiling-first offer: the rolled tier is the item's tier, so the
// needle on the strip and the big letter on the card can never disagree.
export function rollRewardOffer(
  seed: number,
  difficulty: number,
  valor: number,
  count: number,
  pool: readonly Item[],
  excludeIds: ReadonlySet<string>,
): RewardOption[] {
  const zones = tierZones(difficulty, valor)
  const rng = mulberry32(seed)
  const taken = new Set<string>()
  const available = pool.filter(item => !excludeIds.has(item.id))
  const picked: RewardOption[] = []
  let crossPicked = false

  const rollFace = (): number => Math.floor(rng() * 100) + 1

  const faceInZone = (tier: RewardTier): number => {
    const zone = zones.find(entry => entry.tier === tier && entry.chance > 0)
    if (!zone) {
      return rollFace()
    }
    const width = Math.max(0.01, zone.end - zone.start)
    return Math.min(100, Math.max(1, Math.floor(zone.start + rng() * width) + 1))
  }

  const nearestTier = (tier: RewardTier): Item | undefined => {
    const target = tierIndex(tier)
    const remaining = available.filter(item => !taken.has(item.id))
    if (remaining.length === 0) {
      return undefined
    }
    const distance = (item: Item): number => {
      const index = TIER_INDEX[item.tier]
      return index >= target ? index - target : (target - index) * 1.5
    }
    const nearest = Math.min(...remaining.map(distance))
    const band = remaining.filter(item => distance(item) === nearest)
    return band[Math.floor(rng() * band.length)]
  }

  for (let index = 0; index < count; index++) {
    let roll = rollFace()
    let tier = tierForRoll(roll, zones)

    if (tier === 'S+') {
      if (crossPicked) {
        // Only one Cross per draft: a second S+ face rolls again inside S so
        // the needle never points at S+ for an S card.
        tier = 'S'
        roll = faceInZone(tier)
      }
      else {
        crossPicked = true
        picked.push({
          optionId: DIVERS_CHOICE_OPTION_ID,
          item: DIVERS_CHOICE_ITEM,
          choice: true,
          roll,
          tier: 'S+',
        })
        continue
      }
    }

    const exact = available.filter(
      item => !taken.has(item.id) && item.tier === tier.toLowerCase(),
    )
    const item = exact.length > 0
      ? exact[Math.floor(rng() * exact.length)]
      : nearestTier(tier)

    // Deep-crusade exhaustion: the band is empty, so show the nearest stocked
    // item and move the needle into its true tier rather than lie about it.
    if (item && item.tier.toUpperCase() !== tier) {
      tier = item.tier.toUpperCase() as RewardTier
      roll = faceInZone(tier)
    }
    if (!item) {
      break
    }
    taken.add(item.id)
    picked.push({ optionId: item.id, item, roll, tier })
  }

  return picked
}

// PICK_REWARD records the banked item's id, so a Liberty's Cross claim names
// an item that matches no option: when nothing matches, the Cross was banked.
export function bankedOptionId(options: readonly RewardOption[], pickedId: string | null): string | null {
  if (pickedId === null) {
    return null
  }
  return options.find(option => option.optionId === pickedId)?.optionId
    ?? options.find(option => option.choice)?.optionId
    ?? null
}

export function topTierOf(options: readonly RewardOption[]): RewardTier | null {
  if (options.length === 0) {
    return null
  }
  return options.reduce<RewardTier>((best, option) => {
    const tier = option.tier ?? (option.item.tier.toUpperCase() as RewardTier)
    return CEILING_LADDER.indexOf(tier) > CEILING_LADDER.indexOf(best) ? tier : best
  }, 'C')
}

export function rollRewardOptions(
  seed: number,
  ceiling: RewardTier,
  floor: RewardTier,
  count: number,
  pool: readonly Item[],
  excludeIds: ReadonlySet<string>,
): RewardOption[] {
  const rng = mulberry32(seed)
  const picked: RewardOption[] = []
  const taken = new Set<string>()

  // S+ breaks the scale: its bonus slot is Liberty's Cross (AGENTS.md: Reward
  // math) — any item from the diver's own catalog, picked at draft time.
  if (ceiling === 'S+') {
    picked.push({ optionId: DIVERS_CHOICE_OPTION_ID, item: DIVERS_CHOICE_ITEM, choice: true })
  }

  const itemCeiling = tierIndex(ceiling)
  const floorIndex = tierIndex(floor)
  const band = pool.filter(
    item => !excludeIds.has(item.id) && tierWeight(item.tier, floor, ceiling) > 0,
  )
  // Exhausted the band's pool (deep crusade): degrade the tier filter rather
  // than offer nothing — an empty offer deadlocks the dive. The fallback rolls
  // uniformly, since the survivors may sit outside the band.
  const degraded = band.length === 0
  const candidates = degraded ? pool.filter(item => !excludeIds.has(item.id)) : band

  // The draft leads with one option at the rolled ceiling — the class the diver
  // earned — then fills the rest a band down, so a high ceiling lands as one top
  // pick plus support instead of flooding the offer with top-tier gear. A thin
  // pool falls back to the highest tier it still has, so the slot never drops.
  let fillCeiling = itemCeiling
  if (!degraded && itemCeiling > floorIndex && picked.length < count && candidates.length > 0) {
    const topIndex = Math.max(...candidates.map(candidate => TIER_INDEX[candidate.tier]))
    const top = candidates.filter(candidate => TIER_INDEX[candidate.tier] === topIndex)
    const item = top[Math.floor(rng() * top.length)]!
    picked.push({ optionId: item.id, item })
    taken.add(item.id)
    fillCeiling = Math.max(floorIndex, topIndex - 1)
  }

  while (picked.length < count && taken.size < candidates.length) {
    const remaining = candidates.filter(item => !taken.has(item.id))
    const inBand = remaining.filter(item => degraded || TIER_INDEX[item.tier] <= fillCeiling)
    const roll = inBand.length > 0 ? inBand : remaining
    const item = pickWeighted(
      rng,
      roll.map(candidate => ({
        value: candidate,
        weight: degraded
          ? 1
          : TIER_ROLL_WEIGHT_BASE ** (TIER_INDEX[candidate.tier] - floorIndex),
      })),
    )
    picked.push({ optionId: item.id, item })
    taken.add(item.id)
  }
  return picked
}

export interface BargainSlot {
  slotId: string
  kind: BargainSlotKind
  // Null when the diver's pool has nothing left of the slot's kind.
  item: Item | null
}

export function bargainKindOf(item: Item): BargainSlotKind | null {
  if (item.type === 'stratagem') {
    return 'stratagem'
  }
  return item.category === 'booster' ? null : item.category as BargainSlotKind
}

// Brasch's Bargains: one slot per kind, each a uniformly random item of that
// kind from the difficulty's base tier up to BARGAIN_TIER_REACH tiers above —
// no Valor, no weighting. A kind with nothing in that band steps to the
// nearest stocked tier, below the band before above it. Two stratagem slots
// never offer the same stratagem.
export function rollBargainShelf(
  seed: number,
  difficulty: number,
  kinds: readonly BargainSlotKind[],
  pool: readonly Item[],
  excludeIds: ReadonlySet<string>,
): BargainSlot[] {
  const floorIndex = tierIndex(baseTierFor(difficulty))
  const topIndex = Math.min(floorIndex + BARGAIN_TIER_REACH, TIER_INDEX.s)
  const taken = new Set(excludeIds)
  const counts = new Map<BargainSlotKind, number>()
  return kinds.map((kind, index) => {
    const nth = (counts.get(kind) ?? 0) + 1
    counts.set(kind, nth)
    const slotId = nth === 1 ? kind : `${kind}-${nth}`
    const candidates = pool.filter(item => bargainKindOf(item) === kind && !taken.has(item.id))
    const item = pickBargain(mulberry32(deriveSeed(seed, index + 1)), candidates, floorIndex, topIndex)
    if (item) {
      taken.add(item.id)
    }
    return { slotId, kind, item }
  })
}

function pickBargain(rng: Rng, candidates: readonly Item[], floorIndex: number, topIndex: number): Item | null {
  if (candidates.length === 0) {
    return null
  }
  // Distance from the band (zero inside it); a half step breaks ties toward
  // the cheaper tier.
  const distance = (item: Item): number => {
    const index = TIER_INDEX[item.tier]
    if (index < floorIndex) {
      return floorIndex - index
    }
    return index > topIndex ? index - topIndex + 0.5 : 0
  }
  const nearest = Math.min(...candidates.map(distance))
  const stocked = candidates.filter(item => distance(item) === nearest)
  return stocked[pickIndex(rng, stocked.length)]!
}

// Brasch's Armor Pack: three duplicate-free armor passives from the diver's
// unowned pool. Two cards roll the band's ordinary ladder; the first is the
// guaranteed hit, and one pack-wide roll can lift it to S. A tier whose pool
// is empty steps to the nearest stocked tier — the hit looks up first, so its
// floor survives while any ordinary B/A passive remains. The result is a
// purchase, so the caller stores it; the seed is kept only to replay the deal.
export function rollArmorPack(
  seed: number,
  difficulty: number,
  pool: readonly Item[],
  excludeIds: ReadonlySet<string>,
): Item[] {
  const available = pool.filter(
    item => item.category === 'armorPassive' && !excludeIds.has(item.id),
  )
  if (available.length === 0) {
    return []
  }
  const rng = mulberry32(seed)
  const odds = ARMOR_PACK_ODDS[armorPackBandFor(difficulty)]
  const sAvailable = available.some(item => item.tier === 's')
  const sHit = sAvailable && rng() < odds.sChance
  const taken = new Set<string>()
  const picked: Item[] = []
  const count = Math.min(ARMOR_PACK_SIZE, available.length)
  let sTaken = false

  for (let index = 0; index < count; index++) {
    const hit = index === 0
    const tier = hit && sHit
      ? 's'
      : pickWeighted(
          rng,
          (hit ? odds.hit : odds.standard).map(entry => ({ value: entry.tier, weight: entry.weight })),
        )
    const item = pickPackItem(rng, available, taken, tier, hit, sTaken)
    if (!item) {
      break
    }
    taken.add(item.id)
    picked.push(item)
    if (item.tier === 's') {
      sTaken = true
    }
  }
  return picked
}

function pickPackItem(
  rng: Rng,
  candidates: readonly Item[],
  taken: ReadonlySet<string>,
  tier: Tier,
  hit: boolean,
  sTaken: boolean,
): Item | null {
  const remaining = candidates.filter(item => !taken.has(item.id))
  if (remaining.length === 0) {
    return null
  }
  // Only the S roll (or a pool that has nothing else left) can deal an S, and
  // never more than one per pack.
  const preferred = tier === 's'
    ? remaining
    : remaining.filter(item => item.tier !== 's')
  const stock = preferred.length > 0
    ? preferred
    : remaining.filter(item => item.tier === 's' && !sTaken)
  if (stock.length === 0) {
    return null
  }
  const exact = stock.filter(item => item.tier === tier)
  if (exact.length > 0) {
    return exact[pickIndex(rng, exact.length)]!
  }
  // The hit card prefers at-or-above its target (and only degrades when the
  // pool has nothing better); ordinary cards prefer at-or-below, so an
  // exhausted tier never mints a rarer card than the roll asked for. The hit's
  // upward fallback stops at A: S is only ever the pack's one S roll, never an
  // exhaustion upgrade.
  const targetIndex = TIER_INDEX[tier]
  const ceilingIndex = TIER_INDEX.a
  const distance = (item: Item): number => {
    const index = TIER_INDEX[item.tier]
    if (hit) {
      if (index >= targetIndex && index <= ceilingIndex) {
        return index - targetIndex
      }
      if (index > ceilingIndex) {
        return 20 + (index - ceilingIndex)
      }
      return targetIndex - index + 10
    }
    return index <= targetIndex ? targetIndex - index : index - targetIndex + 10
  }
  const nearest = Math.min(...stock.map(distance))
  const band = stock.filter(item => distance(item) === nearest)
  return band[pickIndex(rng, band.length)]!
}
