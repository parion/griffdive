import { HERO_POOL, REINFORCE_ID, heroStratagem } from '../data/stratagemCodes'
import type { Arrow, HeroStratagem } from '../data/stratagemCodes'
import {
  HERO_ARROW_BONUS_MS,
  HERO_ARROW_POINTS,
  HERO_BASE_CODES,
  HERO_INTERMISSION_MS,
  HERO_MAX_CODES,
  HERO_MAX_GAP_MS,
  HERO_MAX_INPUTS,
  HERO_MIN_MEDIAN_GAP_MS,
  HERO_PERFECT_BONUS,
  HERO_ROUND_BONUS_BASE,
  HERO_ROUND_BONUS_STEP,
  HERO_ROUND_MS,
  HERO_ROUND_STREAM,
  HERO_TIME_POINTS_PER_100MS,
} from './config'
import { deriveSeed, mulberry32, pickIndex } from './rng'

export type { Arrow }

export interface HeroOptions {
  // The round that ends the run cleared (Redemption); null runs endless (Drill).
  targetRound: number | null
  // Drill's practice mode: the countdown never runs out.
  untimed?: boolean
  // Restrict the deal to these stratagem ids (Drill's category filter). Kept in
  // pool order, so the filter never changes how a seed derives.
  pool?: readonly string[]
}

export type HeroStatus = 'playing' | 'intermission' | 'cleared' | 'over'

export interface HeroRoundClear {
  round: number
  roundBonus: number
  timeBonus: number
  perfectBonus: number
}

export interface HeroRun {
  seed: number
  options: HeroOptions
  status: HeroStatus
  round: number
  // Stratagem ids dealt this round, in order.
  codes: string[]
  codeIndex: number
  // Arrows of the current code entered correctly so far.
  progress: number
  remainingMs: number
  intermissionMs: number
  clockMs: number
  score: number
  roundErrors: number
  lastClear: HeroRoundClear | null
  totals: { arrows: number, errors: number, codes: number, roundsCleared: number }
}

export type HeroEvent
  = | { kind: 'input', arrow: Arrow, dt: number }
    | { kind: 'tick', dt: number }

// A run as the server sees it: the arrows pressed and the integer ms between
// each press and the one before it (the first measured from the run's start).
export interface HeroTranscript {
  inputs: string
  gaps: number[]
}

export function heroRoundSize(round: number): number {
  return Math.min(HERO_BASE_CODES + round - 1, HERO_MAX_CODES)
}

function poolFor(options: HeroOptions): readonly HeroStratagem[] {
  if (!options.pool) {
    return HERO_POOL
  }
  const wanted = new Set(options.pool)
  const filtered = HERO_POOL.filter(entry => wanted.has(entry.id))
  return filtered.length >= 2 ? filtered : HERO_POOL
}

// Each round draws from its own stream, so any round derives without replaying
// the ones before it. No code repeats back to back; the target round always
// ends on Reinforce.
export function heroRoundCodes(seed: number, round: number, options: HeroOptions): string[] {
  const pool = poolFor(options)
  const rng = mulberry32(deriveSeed(deriveSeed(seed, HERO_ROUND_STREAM), round))
  const size = heroRoundSize(round)
  const codes: string[] = []
  let previous = -1
  for (let i = 0; i < size; i++) {
    let index = previous < 0 ? pickIndex(rng, pool.length) : pickIndex(rng, pool.length - 1)
    if (previous >= 0 && index >= previous) {
      index += 1
    }
    codes.push(pool[index]!.id)
    previous = index
  }
  if (round === options.targetRound) {
    codes[size - 1] = REINFORCE_ID
    if (size >= 2 && codes[size - 2] === REINFORCE_ID) {
      const before = size >= 3 ? codes[size - 3] : undefined
      codes[size - 2] = HERO_POOL.find(entry => entry.id !== REINFORCE_ID && entry.id !== before)!.id
    }
  }
  return codes
}

export function heroCodeOf(id: string): string {
  return heroStratagem(id)?.code ?? ''
}

export function heroCurrent(run: HeroRun): HeroStratagem | null {
  const id = run.codes[run.codeIndex]
  return id ? heroStratagem(id) : null
}

export function heroStart(seed: number, options: HeroOptions): HeroRun {
  return {
    seed,
    options,
    status: 'playing',
    round: 1,
    codes: heroRoundCodes(seed, 1, options),
    codeIndex: 0,
    progress: 0,
    remainingMs: HERO_ROUND_MS,
    intermissionMs: 0,
    clockMs: 0,
    score: 0,
    roundErrors: 0,
    lastClear: null,
    totals: { arrows: 0, errors: 0, codes: 0, roundsCleared: 0 },
  }
}

function startRound(run: HeroRun, round: number): HeroRun {
  return {
    ...run,
    status: 'playing',
    round,
    codes: heroRoundCodes(run.seed, round, run.options),
    codeIndex: 0,
    progress: 0,
    remainingMs: HERO_ROUND_MS,
    intermissionMs: 0,
    roundErrors: 0,
  }
}

// Time passing. Split-invariant — advancing a then b equals advancing a + b —
// which is why a transcript records only the gaps between presses and never
// the display ticks. Time left over after an intermission runs on into the
// next round's countdown.
function advance(run: HeroRun, dt: number): HeroRun {
  let next = run
  let left = dt
  while (left > 0 && (next.status === 'playing' || next.status === 'intermission')) {
    if (next.status === 'intermission') {
      const used = Math.min(left, next.intermissionMs)
      left -= used
      next = { ...next, intermissionMs: next.intermissionMs - used, clockMs: next.clockMs + used }
      if (next.intermissionMs === 0) {
        next = startRound(next, next.round + 1)
      }
      continue
    }
    if (next.options.untimed) {
      return { ...next, clockMs: next.clockMs + left }
    }
    const used = Math.min(left, next.remainingMs)
    left -= used
    next = { ...next, remainingMs: next.remainingMs - used, clockMs: next.clockMs + used }
    if (next.remainingMs === 0) {
      next = { ...next, status: 'over' }
    }
  }
  return next
}

function press(run: HeroRun, arrow: Arrow): HeroRun {
  if (run.status !== 'playing') {
    return run
  }
  const code = heroCodeOf(run.codes[run.codeIndex] ?? '')
  if (code[run.progress] !== arrow) {
    return {
      ...run,
      progress: 0,
      roundErrors: run.roundErrors + 1,
      totals: { ...run.totals, errors: run.totals.errors + 1 },
    }
  }
  const totals = { ...run.totals, arrows: run.totals.arrows + 1 }
  const score = run.score + HERO_ARROW_POINTS
  if (run.progress + 1 < code.length) {
    return { ...run, progress: run.progress + 1, score, totals }
  }
  const remainingMs = run.options.untimed
    ? run.remainingMs
    : Math.min(HERO_ROUND_MS, run.remainingMs + code.length * HERO_ARROW_BONUS_MS)
  const codeIndex = run.codeIndex + 1
  const finished = { ...run, progress: 0, codeIndex, remainingMs, score, totals: { ...totals, codes: totals.codes + 1 } }
  if (codeIndex < run.codes.length) {
    return finished
  }
  const clear: HeroRoundClear = {
    round: run.round,
    roundBonus: HERO_ROUND_BONUS_BASE + HERO_ROUND_BONUS_STEP * (run.round - 1),
    timeBonus: run.options.untimed ? 0 : Math.floor(remainingMs / 100) * HERO_TIME_POINTS_PER_100MS,
    perfectBonus: run.roundErrors === 0 ? HERO_PERFECT_BONUS : 0,
  }
  const cleared = run.round === run.options.targetRound
  return {
    ...finished,
    status: cleared ? 'cleared' : 'intermission',
    intermissionMs: cleared ? 0 : HERO_INTERMISSION_MS,
    score: score + clear.roundBonus + clear.timeBonus + clear.perfectBonus,
    lastClear: clear,
    totals: { ...finished.totals, roundsCleared: finished.totals.roundsCleared + 1 },
  }
}

// Time runs before the press lands: an arrow that arrives after the countdown
// ran out is lost, on screen and in a replay alike.
export function heroStep(run: HeroRun, event: HeroEvent): HeroRun {
  const advanced = advance(run, event.dt)
  return event.kind === 'input' ? press(advanced, event.arrow) : advanced
}

export interface HeroReplay {
  run: HeroRun | null
  ok: boolean
  reason?: string
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

export function heroReplay(seed: number, options: HeroOptions, transcript: HeroTranscript): HeroReplay {
  const { inputs, gaps } = transcript
  if (typeof inputs !== 'string' || !Array.isArray(gaps)) {
    return { run: null, ok: false, reason: 'shape' }
  }
  if (!/^[UDLR]*$/.test(inputs) || inputs.length > HERO_MAX_INPUTS || gaps.length !== inputs.length) {
    return { run: null, ok: false, reason: 'shape' }
  }
  if (!gaps.every(gap => Number.isInteger(gap) && gap >= 0 && gap <= HERO_MAX_GAP_MS)) {
    return { run: null, ok: false, reason: 'gaps' }
  }
  if (gaps.length > 0 && median(gaps) < HERO_MIN_MEDIAN_GAP_MS) {
    return { run: null, ok: false, reason: 'too-fast' }
  }
  let run = heroStart(seed, options)
  for (let i = 0; i < inputs.length; i++) {
    if (run.status === 'cleared' || run.status === 'over') {
      break
    }
    run = heroStep(run, { kind: 'input', arrow: inputs[i] as Arrow, dt: gaps[i]! })
  }
  return { run, ok: true }
}

// A perfect run for a seed: every code typed at a steady pace. Tests and the
// e2e driver use it; it is also the shape a clear transcript takes.
export function heroPerfectTranscript(seed: number, options: HeroOptions, gapMs: number): HeroTranscript {
  let run = heroStart(seed, options)
  let inputs = ''
  const gaps: number[] = []
  let pending = 0
  while (run.status !== 'cleared' && run.status !== 'over' && inputs.length < HERO_MAX_INPUTS) {
    if (run.status === 'intermission') {
      pending += run.intermissionMs
      run = heroStep(run, { kind: 'tick', dt: run.intermissionMs })
      continue
    }
    const arrow = heroCodeOf(run.codes[run.codeIndex]!)[run.progress] as Arrow
    run = heroStep(run, { kind: 'input', arrow, dt: gapMs })
    inputs += arrow
    gaps.push(pending + gapMs)
    pending = 0
  }
  return { inputs, gaps }
}
