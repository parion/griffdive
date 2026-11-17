import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { REINFORCE_ID } from '../data/stratagemCodes'
import {
  HERO_ARROW_BONUS_MS,
  HERO_INTERMISSION_MS,
  HERO_MAX_GAP_MS,
  HERO_PERFECT_BONUS,
  HERO_ROUND_MS,
} from './config'
import {
  heroCodeOf,
  heroPerfectTranscript,
  heroReplay,
  heroRoundCodes,
  heroRoundSize,
  heroStart,
  heroStep,
} from './hero'
import type { Arrow, HeroOptions, HeroRun } from './hero'

const UPDATE = process.env.GRIFFDIVE_UPDATE_GOLDENS === '1'
const goldenPath = join(dirname(fileURLToPath(import.meta.url)), '__goldens__', 'hero-rounds.json')

const ENDLESS: HeroOptions = { targetRound: null }

function currentCode(run: HeroRun): string {
  return heroCodeOf(run.codes[run.codeIndex]!)
}

function typeCode(run: HeroRun, dt = 100): HeroRun {
  let next = run
  for (const arrow of currentCode(run)) {
    next = heroStep(next, { kind: 'input', arrow: arrow as Arrow, dt })
  }
  return next
}

function wrongArrow(run: HeroRun): Arrow {
  const right = currentCode(run)[run.progress]
  return (['U', 'D', 'L', 'R'] as const).find(arrow => arrow !== right)!
}

describe('heroRoundCodes', () => {
  it('deals six codes in round one, one more each round, capped at sixteen', () => {
    expect([1, 2, 5, 10, 11, 12, 20].map(heroRoundSize)).toEqual([6, 7, 10, 15, 16, 16, 16])
    expect(heroRoundCodes(7, 3, ENDLESS)).toHaveLength(8)
  })

  it('derives the same round from the same seed', () => {
    expect(heroRoundCodes(1234, 4, ENDLESS)).toEqual(heroRoundCodes(1234, 4, ENDLESS))
    expect(heroRoundCodes(1234, 4, ENDLESS)).not.toEqual(heroRoundCodes(1235, 4, ENDLESS))
  })

  it('never repeats a code back to back', () => {
    for (let seed = 0; seed < 200; seed++) {
      const codes = heroRoundCodes(seed, 12, ENDLESS)
      codes.forEach((id, i) => expect(id).not.toBe(codes[i - 1]))
    }
  })

  it('seals the target round with Reinforce, and only that round', () => {
    for (let seed = 0; seed < 200; seed++) {
      const codes = heroRoundCodes(seed, 3, { targetRound: 3 })
      expect(codes.at(-1)).toBe(REINFORCE_ID)
      expect(codes.at(-2)).not.toBe(REINFORCE_ID)
    }
    expect(heroRoundCodes(5, 2, { targetRound: 3 })).toEqual(heroRoundCodes(5, 2, ENDLESS))
  })

  it('deals only from a filtered pool, and falls back to the full pool when it is too thin', () => {
    const pool = ['eagleairstrike', 'eaglestrafingrun', 'eagle500kgbomb']
    expect(heroRoundCodes(9, 5, { targetRound: null, pool }).every(id => pool.includes(id))).toBe(true)
    expect(heroRoundCodes(9, 5, { targetRound: null, pool: ['eagleairstrike'] }))
      .toEqual(heroRoundCodes(9, 5, ENDLESS))
  })
})

describe('heroStep', () => {
  it('resets only the current code on a wrong arrow', () => {
    let run = heroStart(42, ENDLESS)
    run = heroStep(run, { kind: 'input', arrow: currentCode(run)[0] as Arrow, dt: 100 })
    expect(run.progress).toBe(1)
    run = heroStep(run, { kind: 'input', arrow: wrongArrow(run), dt: 100 })
    expect(run).toMatchObject({ progress: 0, codeIndex: 0, roundErrors: 1, status: 'playing' })
    expect(run.totals.errors).toBe(1)
  })

  it('loses an arrow that lands exactly as the countdown runs out', () => {
    const run = heroStart(42, ENDLESS)
    const late = heroStep(run, { kind: 'input', arrow: currentCode(run)[0] as Arrow, dt: HERO_ROUND_MS })
    expect(late.status).toBe('over')
    expect(late.progress).toBe(0)
  })

  it('advances the same whether time arrives at once or in pieces', () => {
    let run = heroStart(42, ENDLESS)
    for (let i = 0; i < 6; i++) {
      run = typeCode(run, 50)
    }
    expect(run.status).toBe('intermission')
    const whole = heroStep(run, { kind: 'tick', dt: HERO_INTERMISSION_MS + 700 })
    let pieces = run
    for (const dt of [300, 1_000, 900, 500]) {
      pieces = heroStep(pieces, { kind: 'tick', dt })
    }
    expect(pieces).toEqual(whole)
    expect(whole).toMatchObject({ status: 'playing', round: 2, remainingMs: HERO_ROUND_MS - 700 })
  })

  it('ignores input during an intermission', () => {
    let run = heroStart(42, ENDLESS)
    for (let i = 0; i < 6; i++) {
      run = typeCode(run, 50)
    }
    const pressed = heroStep(run, { kind: 'input', arrow: 'U', dt: 10 })
    expect(pressed).toEqual(heroStep(run, { kind: 'tick', dt: 10 }))
  })

  it('refills the bar per arrow of a finished code, never past full', () => {
    let run = heroStart(42, ENDLESS)
    const length = currentCode(run).length
    run = heroStep(run, { kind: 'tick', dt: 5_000 })
    run = typeCode(run, 0)
    expect(run.remainingMs).toBe(Math.min(HERO_ROUND_MS, 5_000 + length * HERO_ARROW_BONUS_MS))
    const fresh = typeCode(heroStart(42, ENDLESS), 0)
    expect(fresh.remainingMs).toBe(HERO_ROUND_MS)
  })

  it('pays the perfect bonus only for an error-free round', () => {
    let clean = heroStart(42, ENDLESS)
    let messy = heroStep(heroStart(42, ENDLESS), { kind: 'input', arrow: wrongArrow(heroStart(42, ENDLESS)), dt: 0 })
    for (let i = 0; i < 6; i++) {
      clean = typeCode(clean, 0)
      messy = typeCode(messy, 0)
    }
    expect(clean.lastClear?.perfectBonus).toBe(HERO_PERFECT_BONUS)
    expect(messy.lastClear?.perfectBonus).toBe(0)
  })

  it('ends cleared on the target round and takes no more input', () => {
    const options = { targetRound: 1 }
    let run = heroStart(3, options)
    for (let i = 0; i < 6; i++) {
      run = typeCode(run, 50)
    }
    expect(run.status).toBe('cleared')
    expect(heroStep(run, { kind: 'input', arrow: 'U', dt: 50 })).toEqual(run)
  })

  it('never runs out when untimed', () => {
    const run = heroStep(heroStart(3, { targetRound: null, untimed: true }), { kind: 'tick', dt: 999_999 })
    expect(run.status).toBe('playing')
  })
})

describe('heroReplay', () => {
  it('replays a perfect run to a clear', () => {
    const options = { targetRound: 4 }
    const replay = heroReplay(77, options, heroPerfectTranscript(77, options, 120))
    expect(replay.ok).toBe(true)
    expect(replay.run?.status).toBe('cleared')
    expect(replay.run?.totals.roundsCleared).toBe(4)
  })

  it('replays a run too slow for the countdown to a loss', () => {
    const options = { targetRound: 3 }
    const replay = heroReplay(77, options, heroPerfectTranscript(77, options, 2_000))
    expect(replay.ok).toBe(true)
    expect(replay.run?.status).toBe('over')
  })

  it('refuses malformed and implausibly fast transcripts', () => {
    const options = { targetRound: 1 }
    expect(heroReplay(1, options, { inputs: 'UX', gaps: [100, 100] }).ok).toBe(false)
    expect(heroReplay(1, options, { inputs: 'UD', gaps: [100] }).ok).toBe(false)
    expect(heroReplay(1, options, { inputs: 'UD', gaps: [100, 1.5] }).ok).toBe(false)
    expect(heroReplay(1, options, { inputs: 'UD', gaps: [100, -1] }).ok).toBe(false)
    expect(heroReplay(1, options, { inputs: 'UD', gaps: [100, HERO_MAX_GAP_MS + 1] }).ok).toBe(false)
    expect(heroReplay(1, options, heroPerfectTranscript(1, options, 5)).reason).toBe('too-fast')
  })
})

describe('hero golden', () => {
  it('matches the recorded rounds and a scripted score', () => {
    const rounds = [1, 2, 3].map(seed => ({
      seed,
      rounds: Array.from({ length: 10 }, (_, i) => heroRoundCodes(seed, i + 1, { targetRound: 10 })),
    }))
    const options = { targetRound: 5 }
    const scripted = heroReplay(2026, options, heroPerfectTranscript(2026, options, 150)).run
    const actual = { rounds, scripted: { score: scripted?.score, clockMs: scripted?.clockMs } }
    if (UPDATE) {
      mkdirSync(dirname(goldenPath), { recursive: true })
      writeFileSync(goldenPath, `${JSON.stringify(actual, null, 2)}\n`)
    }
    expect(actual).toEqual(JSON.parse(readFileSync(goldenPath, 'utf8')))
  })
})
