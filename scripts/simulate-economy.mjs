// Monte Carlo of the sample → credit → Brasch's Bargains economy.
//   node --experimental-strip-types scripts/simulate-economy.mjs [runs]
// Reads the live numbers from shared/engine/config.ts, so it always reflects
// what ships. Profiles are how much of the map's spawned samples a squad files.
import { armorPassives } from '../shared/data/equipment.ts'
import {
  ARMOR_PACK_ODDS,
  ARMOR_PACK_SIZE,
  BARGAIN_TIER_REACH,
  CREDIT_PRICE_TIER,
  CREDIT_PRICE_TYPE,
  CREDIT_PRICE_TYPE_DEFAULT,
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  SAMPLE_AVAILABILITY,
  SAMPLE_CREDITS,
  TIME_HAUL_FLOOR,
  armorPackBandFor,
  armorPackPrice,
  bargainStratagemSlotsFor,
  baseTierFor,
  missionsPerOperation,
  sampleReportCeiling,
} from '../shared/engine/config.ts'

const RUNS = Number(process.argv[2] ?? 4000)
// SAVER=1: a diver who sees an S on the shelf within two missions' haul skips smaller buys to afford it.
const SAVER = process.env.SAVER === '1'
// PACKS=0: skip Brasch's Armor Pack entirely, to compare shelf-only spending.
// PACKFIRST=1: a passive collector buys a pack before shelf gear.
const PACKS = process.env.PACKS !== '0'
const PACKFIRST = process.env.PACKFIRST === '1'
const TIERS = ['c', 'b', 'a', 's']
const SLOT_KINDS = ['primary', 'secondary', 'throwable']

// share of spawned samples filed; scanner = Sample Scanner booster (15% chance
// to double each pickup, so +15% on average), maxed = honor-system ceiling.
const PROFILES = {
  casual: { share: 0.35, scanner: false, time: [0.2, 0.7] },
  steady: { share: 0.6, scanner: false, time: [0.3, 0.8] },
  eager: { share: 0.85, scanner: true, time: [0.4, 0.9] },
  maxed: { share: 1, scanner: true, time: [0.6, 1], ceiling: true },
}

const rand = (lo, hi) => lo + Math.random() * (hi - lo)

function filed(spawned, profile) {
  const mean = spawned * profile.share
  let count = 0
  for (let i = 0; i < Math.round(mean); i++) {
    count += profile.scanner && Math.random() < 0.15 ? 2 : 1
  }
  return count
}

function missionHaul(difficulty, profile) {
  const available = SAMPLE_AVAILABILITY[difficulty]
  const ceiling = sampleReportCeiling(difficulty)
  const sample = kind => Math.min(filed(available[kind], profile), ceiling[kind])
  const value = sample('common') * SAMPLE_CREDITS.common
    + sample('rare') * SAMPLE_CREDITS.rare
    + sample('super') * SAMPLE_CREDITS.super
  const time = rand(...profile.time)
  return Math.floor(value * (TIME_HAUL_FLOOR + (1 - TIME_HAUL_FLOOR) * time))
}

function price(tier, kind) {
  return Math.round(CREDIT_PRICE_TIER[tier] * (CREDIT_PRICE_TYPE[kind] ?? CREDIT_PRICE_TYPE_DEFAULT))
}

function weightedTier(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = Math.random() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll < 0) {
      return entry.tier
    }
  }
  return entries[entries.length - 1].tier
}

// One Armor Pack: two ordinary cards and one guaranteed hit, with a single S
// roll on the hit. Pool exhaustion is not modelled — the live engine steps an
// exhausted tier to the nearest stocked one, so this is the optimistic ceiling.
function openArmorPack(difficulty) {
  const odds = ARMOR_PACK_ODDS[armorPackBandFor(difficulty)]
  const sHit = Math.random() < odds.sChance
  return Array.from({ length: ARMOR_PACK_SIZE }, (_, index) => {
    if (index === 0 && sHit) {
      return 's'
    }
    return weightedTier(index === 0 ? odds.hit : odds.standard)
  })
}

function shelf(difficulty) {
  const floor = TIERS.indexOf(baseTierFor(difficulty).toLowerCase())
  const top = Math.min(floor + BARGAIN_TIER_REACH, 3)
  const kinds = [...SLOT_KINDS, ...Array(bargainStratagemSlotsFor(difficulty)).fill('stratagem')]
  return kinds.map((kind) => {
    const tier = TIERS[floor + Math.floor(Math.random() * (top - floor + 1))]
    return { kind, tier, cost: price(tier, kind) }
  })
}

// Diver buys the priciest shelf item they can afford each mission (one buy per
// mission, a bought kind is held back until the next operation), then opens
// Armor Packs with what is left. Packs are repeatable and each one costs
// ARMOR_PACK_PRICE_STEP more for the rest of the crusade, so the loop stops
// when the next pack is unaffordable or the passive pool would be exhausted.
// Pool duplicates across packs are not modelled, so the pull totals are the
// optimistic ceiling.
function climb(profile) {
  let purse = 0
  const bought = { c: 0, b: 0, a: 0, s: 0 }
  const packs = { count: 0, pulls: { c: 0, b: 0, a: 0, s: 0 }, sPacks: 0 }
  const perDiff = {}
  let passivePool = armorPassives.length
  let packTally = 0
  for (let difficulty = MIN_DIFFICULTY; difficulty <= MAX_DIFFICULTY; difficulty++) {
    const stats = (perDiff[difficulty] = { haul: 0, missions: 0, bought: { c: 0, b: 0, a: 0, s: 0 }, packs: 0 })
    const held = new Set()
    for (let m = 0; m < missionsPerOperation(difficulty); m++) {
      const haul = missionHaul(difficulty, profile)
      purse += haul
      stats.haul += haul
      stats.missions++
      const stock = shelf(difficulty).filter(slot => !held.has(slot.kind))
      const beforePack = stock.filter(slot => slot.cost <= purse).sort((a, b) => b.cost - a.cost)
      const saving = SAVER && !beforePack.some(slot => slot.tier === 's')
        && stock.some(slot => slot.tier === 's' && slot.cost <= purse + 2 * haul)
      const buyPack = () => {
        if (!PACKS || passivePool < 1) {
          return false
        }
        const cost = armorPackPrice(difficulty, packTally)
        if (purse < cost) {
          return false
        }
        purse -= cost
        passivePool -= Math.min(passivePool, ARMOR_PACK_SIZE)
        packs.count++
        packTally++
        stats.packs++
        const pull = openArmorPack(difficulty)
        for (const tier of pull) {
          packs.pulls[tier]++
        }
        if (pull.includes('s')) {
          packs.sPacks++
        }
        return true
      }
      if (PACKFIRST && !saving) {
        while (buyPack()) {
          // A passive-first collector keeps opening until the next price is out of reach.
        }
      }
      const options = stock.filter(slot => slot.cost <= purse).sort((a, b) => b.cost - a.cost)
      const pick = saving ? undefined : options[0]
      if (pick) {
        purse -= pick.cost
        held.add(pick.kind)
        bought[pick.tier]++
        stats.bought[pick.tier]++
      }
      if (!PACKFIRST) {
        while (buyPack()) {
          // Spend the rest of the purse on packs, one rising price at a time.
        }
      }
    }
  }
  return { bought, packs, perDiff, purse }
}

console.log(`prices  C/B/A/S = ${TIERS.map(t => CREDIT_PRICE_TIER[t]).join('/')}   credits c/r/s = ${SAMPLE_CREDITS.common}/${SAMPLE_CREDITS.rare}/${SAMPLE_CREDITS.super}   packs ${PACKS ? 'on' : 'off'}   (${RUNS} runs)\n`)

for (const [name, profile] of Object.entries(PROFILES)) {
  const totals = { c: 0, b: 0, a: 0, s: 0 }
  const packTotals = { count: 0, sPacks: 0, pulls: { c: 0, b: 0, a: 0, s: 0 } }
  const diffs = {}
  let leftover = 0
  let sBuys = 0
  let sMissions = 0
  for (let i = 0; i < RUNS; i++) {
    const run = climb(profile)
    leftover += run.purse
    for (const tier of TIERS) {
      totals[tier] += run.bought[tier]
      packTotals.pulls[tier] += run.packs.pulls[tier]
    }
    packTotals.count += run.packs.count
    packTotals.sPacks += run.packs.sPacks
    for (const [difficulty, stats] of Object.entries(run.perDiff)) {
      if (Number(difficulty) >= 8) {
        sBuys += stats.bought.s
        sMissions += stats.missions
      }
      const acc = (diffs[difficulty] ??= { haul: 0, missions: 0, bought: 0, packs: 0 })
      acc.haul += stats.haul
      acc.missions += stats.missions
      acc.bought += Object.values(stats.bought).reduce((a, b) => a + b, 0)
      acc.packs += stats.packs
    }
  }
  const per = tier => (totals[tier] / RUNS).toFixed(1)
  const total = TIERS.reduce((sum, tier) => sum + totals[tier], 0) / RUNS
  console.log(`${name.padEnd(7)} ${total.toFixed(1)} buys / 20 missions (${(total / 8).toFixed(2)} per operation)  C ${per('c')}  B ${per('b')}  A ${per('a')}  S ${per('s')}   leftover ${(leftover / RUNS).toFixed(0)}`)
  console.log(`        packs ${(packTotals.count / RUNS).toFixed(1)} / climb   pulls C ${(packTotals.pulls.c / RUNS).toFixed(1)}  B ${(packTotals.pulls.b / RUNS).toFixed(1)}  A ${(packTotals.pulls.a / RUNS).toFixed(1)}  S ${(packTotals.pulls.s / RUNS).toFixed(2)}   packs with an S ${(packTotals.sPacks / RUNS).toFixed(2)}`)
  console.log(`        S band (diff 8+): one S buy per ${sBuys ? (sMissions / sBuys).toFixed(1) : 'never'} missions`)
  console.log('        haul/mission by diff: '
    + Object.entries(diffs).map(([d, s]) => `${d}:${(s.haul / s.missions).toFixed(0)}`).join('  ')
    + '   buys/mission: '
    + Object.entries(diffs).map(([d, s]) => `${d}:${(s.bought / s.missions).toFixed(2)}`).join('  ')
    + '   pack buys/mission: '
    + Object.entries(diffs).map(([d, s]) => `${d}:${(s.packs / s.missions).toFixed(2)}`).join('  '))
}
