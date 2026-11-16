import { useEventListener } from '@vueuse/core'
import { heroStart, heroStep } from '~~/shared/engine/hero'
import type { Arrow, HeroOptions, HeroRun, HeroTranscript } from '~~/shared/engine/hero'

export type HeroPhase = 'idle' | 'ready' | 'running' | 'done'

const KEY_ARROWS: Readonly<Record<string, Arrow>> = {
  ArrowUp: 'U',
  ArrowDown: 'D',
  ArrowLeft: 'L',
  ArrowRight: 'R',
  KeyW: 'U',
  KeyS: 'D',
  KeyA: 'L',
  KeyD: 'R',
}

// The standard gamepad mapping's d-pad buttons.
const PAD_BUTTONS: readonly [number, Arrow][] = [[12, 'U'], [13, 'D'], [14, 'L'], [15, 'R']]

// Drives one arcade run in the browser. Every rule goes through the engine's
// heroStep; this only keeps the clock, reads the controls and records the
// transcript the server replays. Times are rounded against a fixed start so
// rounding never drifts, and display ticks are never recorded (the engine's
// clock is split-invariant).
export function useStratagemHero() {
  const phase = ref<HeroPhase>('idle')
  const run = shallowRef<HeroRun | null>(null)
  // Bumped on every wrong arrow / finished code, for presentation to react to.
  const misses = ref(0)
  const hits = ref(0)

  let seed = 0
  let options: HeroOptions = { targetRound: null }
  let t0 = 0
  let lastInputMs = 0
  let inputs = ''
  let gaps: number[] = []
  let frame = 0
  const padHeld = new Set<number>()

  function elapsed(): number {
    return Math.round(performance.now() - t0)
  }

  function settle(next: HeroRun): void {
    run.value = next
    if (next.status === 'cleared' || next.status === 'over') {
      phase.value = 'done'
      stopLoop()
    }
  }

  function tick(): void {
    if (phase.value === 'running' && run.value) {
      const now = elapsed()
      settle(heroStep(run.value, { kind: 'tick', dt: Math.max(0, now - run.value.clockMs) }))
    }
    pollPad()
    if (phase.value === 'ready' || phase.value === 'running') {
      frame = requestAnimationFrame(tick)
    }
  }

  function startLoop(): void {
    if (!frame && import.meta.client) {
      frame = requestAnimationFrame(tick)
    }
  }

  function stopLoop(): void {
    if (frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
  }

  // Waits for the first press, like the cabinet's "press any stratagem input".
  function arm(nextSeed: number, nextOptions: HeroOptions): void {
    seed = nextSeed
    options = nextOptions
    run.value = null
    inputs = ''
    gaps = []
    phase.value = 'ready'
    startLoop()
  }

  function press(arrow: Arrow): void {
    if (phase.value === 'ready') {
      t0 = performance.now()
      lastInputMs = 0
      run.value = heroStart(seed, options)
      phase.value = 'running'
      return
    }
    if (phase.value !== 'running' || !run.value) {
      return
    }
    const now = elapsed()
    const before = run.value
    const next = heroStep(before, { kind: 'input', arrow, dt: Math.max(0, now - before.clockMs) })
    // Presses in an intermission are recorded too: the replay ignores them
    // exactly as the screen did, and the gaps stay aligned.
    if (before.status === 'playing' || before.status === 'intermission') {
      inputs += arrow
      gaps.push(now - lastInputMs)
      lastInputMs = now
    }
    if (next.totals.errors > before.totals.errors) {
      misses.value++
    }
    else if (next.totals.codes > before.totals.codes) {
      hits.value++
    }
    settle(next)
  }

  function pollPad(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return
    }
    for (const pad of navigator.getGamepads()) {
      if (!pad) {
        continue
      }
      for (const [button, arrow] of PAD_BUTTONS) {
        const key = pad.index * 100 + button
        if (pad.buttons[button]?.pressed) {
          if (!padHeld.has(key)) {
            padHeld.add(key)
            press(arrow)
          }
        }
        else {
          padHeld.delete(key)
        }
      }
    }
  }

  function onKey(event: KeyboardEvent): void {
    if (phase.value !== 'ready' && phase.value !== 'running') {
      return
    }
    const arrow = KEY_ARROWS[event.code]
    if (!arrow || event.ctrlKey || event.metaKey || event.altKey) {
      return
    }
    event.preventDefault()
    if (!event.repeat) {
      press(arrow)
    }
  }

  function transcript(): HeroTranscript {
    return { inputs, gaps: [...gaps] }
  }

  function reset(): void {
    stopLoop()
    phase.value = 'idle'
    run.value = null
  }

  if (import.meta.client) {
    useEventListener(window, 'keydown', onKey)
  }
  onBeforeUnmount(stopLoop)

  return { phase, run, misses, hits, arm, press, transcript, reset }
}
