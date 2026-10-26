<script setup lang="ts">
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core'

// The Bridge's backdrop: a faint tactical grid drifting toward the bottom
// right, lit by the diver's cursor like a stratagem map. Everything moves on
// the compositor — the drift is a looping transform, the light is a small
// pre-rasterised grid tile moved by transforms (snapped to the grid's period
// so it never re-paints), and the rAF loop only runs while something is
// still settling. Presentation only; the field is aria-hidden and inert to
// pointers.
const CELL = 44
const MAJOR = CELL * 4
// Fast enough that thin lines glide rather than visibly ticking pixel to
// pixel — a crawl of a few px/s reads as shimmer, not motion.
const DRIFT_MS = 12_000
const SPOT = 560
const HAZE = 960
const FOLLOW_MS = 60
const FADE_MS = 220
const ENERGY_MS = 520
const LOCK_IDLE_MS = 1600
const TAP_HOLD_MS = 900
const RING = 260
const FRAME_PAD = 7
// The squad-moving controls: live forward actions and primary buttons.
const PRIMARY = '.cta-sweep:not(:disabled), .btn.primary:not(:disabled)'
// Map sectors skip I and O so a readout never looks like a digit.
const SECTORS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

const reduced = usePreferredReducedMotion()

const drift = ref<HTMLElement | null>(null)
const marks = ref<HTMLElement | null>(null)
const litDrift = ref<HTMLElement | null>(null)
const spot = ref<HTMLElement | null>(null)
const spotGrid = ref<HTMLElement | null>(null)
const haze = ref<HTMLElement | null>(null)
const lock = ref<HTMLElement | null>(null)
const lockBox = ref<HTMLElement | null>(null)
const lineX = ref<HTMLElement | null>(null)
const lineY = ref<HTMLElement | null>(null)
const beamX = ref<HTMLElement | null>(null)
const beamY = ref<HTMLElement | null>(null)
const rings = ref<HTMLElement[]>([])
const corners = ref<HTMLElement[]>([])

const sector = ref('')
const locked = ref(false)
const armed = ref(false)

const fieldVars = {
  '--bf-cell': `${CELL}px`,
  '--bf-major': `${MAJOR}px`,
  '--bf-spot': `${SPOT}px`,
  '--bf-haze': `${HAZE}px`,
  '--bf-ring': `${RING}px`,
}

const mod = (n: number, m: number): number => ((n % m) + m) % m

let drifts: Animation[] = []
let driftStart = 0

function stopDrift(): void {
  drifts.forEach(animation => animation.cancel())
  drifts = []
}

function startDrift(): void {
  stopDrift()
  if (reduced.value === 'reduce') {
    return
  }
  const frames: Keyframe[] = [
    { transform: 'translate3d(0, 0, 0)' },
    { transform: `translate3d(${MAJOR}px, ${MAJOR}px, 0)` },
  ]
  // The lit tile and the reticle ride their own copies of the drift, so all
  // three share one start time and never slip a pixel apart.
  driftStart = Number(document.timeline.currentTime ?? 0)
  drifts = [drift.value, marks.value, litDrift.value]
    .filter((el): el is HTMLElement => el !== null)
    .map((el) => {
      const animation = el.animate(frames, { duration: DRIFT_MS, iterations: Infinity })
      animation.startTime = driftStart
      return animation
    })
}

// Total drift since the loop began, unwrapped, so a node keeps its sector
// name across loop boundaries.
function driftTravel(): number {
  if (drifts.length === 0) {
    return 0
  }
  return ((Number(document.timeline.currentTime ?? 0) - driftStart) / DRIFT_MS) * MAJOR
}

const target = { x: 0, y: 0 }
const pos = { x: 0, y: 0 }
let awake = false
let opacity = 0
let energy = 0
let raf = 0
let last = 0

function paint(): void {
  const sx = pos.x - SPOT / 2
  const sy = pos.y - SPOT / 2
  if (spot.value && spotGrid.value) {
    spot.value.style.transform = `translate3d(${sx}px, ${sy}px, 0)`
    // The lit grid repeats every major cell, so the inner tile only ever
    // shifts within one period and stays aligned with the field behind it.
    spotGrid.value.style.transform = `translate3d(${-mod(sx, MAJOR)}px, ${-mod(sy, MAJOR)}px, 0)`
    spot.value.style.opacity = opacity.toFixed(3)
  }
  if (haze.value) {
    haze.value.style.transform = `translate3d(${pos.x - HAZE / 2}px, ${pos.y - HAZE / 2}px, 0)`
    haze.value.style.opacity = opacity.toFixed(3)
  }
}

function tick(now: number): void {
  const dt = Math.min(now - last, 64)
  last = now
  const still = reduced.value === 'reduce'
  const follow = still ? 1 : 1 - Math.exp(-dt / FOLLOW_MS)
  pos.x += (target.x - pos.x) * follow
  pos.y += (target.y - pos.y) * follow
  energy = still ? 0 : energy * Math.exp(-dt / ENERGY_MS)
  const goal = awake ? 0.6 + 0.4 * energy : 0
  opacity += (goal - opacity) * (1 - Math.exp(-dt / FADE_MS))
  paint()
  const settled = Math.abs(target.x - pos.x) < 0.25
    && Math.abs(target.y - pos.y) < 0.25
    && Math.abs(goal - opacity) < 0.004
    && energy < 0.01
  raf = settled ? 0 : requestAnimationFrame(tick)
}

function kick(): void {
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

let lockCol = Number.NaN
let lockRow = Number.NaN
let lockTimer: ReturnType<typeof setTimeout> | undefined

// Snap the reticle to the grid node nearest the pointer. It lives inside the
// drifting layer, so once placed it rides the grid without any per-frame work.
function lockOn(x: number, y: number): void {
  const travel = driftTravel()
  const phase = mod(travel, MAJOR)
  const col = Math.round((x + MAJOR - phase) / CELL)
  const row = Math.round((y + MAJOR - phase) / CELL)
  if (col !== lockCol || row !== lockRow) {
    lockCol = col
    lockRow = row
    const at = `translate3d(${col * CELL}px, ${row * CELL}px, 0)`
    if (lock.value && lineX.value && lineY.value && beamX.value && beamY.value) {
      lock.value.style.transform = at
      lineX.value.style.transform = at
      lineY.value.style.transform = at
      beamX.value.style.transform = `translate3d(0, ${row * CELL}px, 0)`
      beamY.value.style.transform = `translate3d(${col * CELL}px, 0, 0)`
    }
    const loops = Math.floor(travel / MAJOR) * (MAJOR / CELL)
    sector.value = `${SECTORS[mod(col - loops, SECTORS.length)]}·${String(mod(row - loops, 100)).padStart(2, '0')}`
  }
  if (!locked.value && reduced.value !== 'reduce') {
    lockBox.value?.animate(
      [{ transform: 'scale(1.8) rotate(45deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }],
      { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
  }
  locked.value = true
  holdLock()
}

// A lock on a primary action never times out; anywhere else it fades once
// the pointer rests.
function holdLock(): void {
  clearTimeout(lockTimer)
  if (!armedEl) {
    lockTimer = setTimeout(() => {
      locked.value = false
    }, LOCK_IDLE_MS)
  }
}

let armedEl: Element | null = null

function frameCorners(el: Element): string[] {
  const { left, top, right, bottom } = el.getBoundingClientRect()
  return [
    [left - FRAME_PAD, top - FRAME_PAD],
    [right + FRAME_PAD, top - FRAME_PAD],
    [right + FRAME_PAD, bottom + FRAME_PAD],
    [left - FRAME_PAD, bottom + FRAME_PAD],
  ].map(([x, y]) => `translate3d(${x}px, ${y}px, 0)`)
}

// Hovering a primary action arms the reticle: its row and column light up
// across the field and its brackets fly out from the pointer to frame the
// button.
function arm(el: Element | null): void {
  if (el === armedEl) {
    return
  }
  armedEl = el
  armed.value = el !== null
  holdLock()
  if (!el) {
    return
  }
  const to = frameCorners(el)
  const from = `translate3d(${target.x}px, ${target.y}px, 0)`
  corners.value.forEach((corner, i) => {
    corner.style.transform = to[i]!
    if (reduced.value !== 'reduce') {
      corner.animate(
        [{ transform: from, opacity: 0 }, { transform: to[i]!, opacity: 1 }],
        { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      )
    }
  })
}

function wake(x: number, y: number): void {
  target.x = x
  target.y = y
  if (!awake) {
    pos.x = x
    pos.y = y
    awake = true
  }
  lockOn(x, y)
  kick()
}

function sleep(): void {
  armedEl = null
  armed.value = false
  awake = false
  locked.value = false
  clearTimeout(lockTimer)
  kick()
}

let lastMove = 0
let lastPointer = 'mouse'
let tapTimer: ReturnType<typeof setTimeout> | undefined

useEventListener(window, 'pointermove', (event: PointerEvent) => {
  if (event.pointerType === 'touch') {
    return
  }
  const dt = event.timeStamp - lastMove
  if (awake && dt > 0 && dt < 100) {
    const speed = Math.hypot(event.clientX - target.x, event.clientY - target.y) / dt
    energy = Math.max(energy, Math.min(1, speed / 3))
  }
  lastMove = event.timeStamp
  wake(event.clientX, event.clientY)
}, { passive: true })

useEventListener(window, 'pointerdown', (event: PointerEvent) => {
  lastPointer = event.pointerType
}, { passive: true })

useEventListener(document, 'pointerover', (event: PointerEvent) => {
  if (event.pointerType !== 'touch') {
    arm(event.target instanceof Element ? event.target.closest(PRIMARY) : null)
  }
}, { passive: true })

useEventListener(window, 'scroll', () => {
  if (armedEl) {
    const to = frameCorners(armedEl)
    corners.value.forEach((corner, i) => {
      corner.style.transform = to[i]!
    })
  }
}, { passive: true })

useEventListener(document, 'mouseout', (event: MouseEvent) => {
  if (!event.relatedTarget) {
    sleep()
  }
}, { passive: true })
useEventListener(window, 'blur', sleep)

let ringTurn = 0

// A click drops a beacon: two rings ripple out across the grid. Keyboard
// activations (detail 0) carry no position and stay quiet.
useEventListener(window, 'click', (event: MouseEvent) => {
  if (event.detail === 0) {
    return
  }
  const { clientX: x, clientY: y } = event
  if (lastPointer === 'touch') {
    clearTimeout(tapTimer)
    wake(x, y)
    tapTimer = setTimeout(sleep, TAP_HOLD_MS)
  }
  if (reduced.value === 'reduce') {
    return
  }
  energy = 1
  kick()
  const at = `translate3d(${x}px, ${y}px, 0)`
  ;[0, 140].forEach((delay) => {
    const ring = rings.value[ringTurn++ % rings.value.length]
    ring?.animate(
      [
        { transform: `${at} scale(0.04)`, opacity: 0.9 },
        { transform: `${at} scale(1)`, opacity: 0 },
      ],
      { duration: 900, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
    )
  })
}, { passive: true })

onMounted(() => {
  watch(reduced, startDrift, { immediate: true })
})

onBeforeUnmount(() => {
  stopDrift()
  cancelAnimationFrame(raf)
  clearTimeout(lockTimer)
  clearTimeout(tapTimer)
})
</script>

<template>
  <div
    class="bf"
    :class="{ 'is-locked': locked, 'is-armed': armed }"
    :style="fieldVars"
    aria-hidden="true"
  >
    <div
      ref="drift"
      class="bf-drift bf-grid"
    />
    <div
      ref="haze"
      class="bf-haze"
    />
    <div
      ref="spot"
      class="bf-spot"
    >
      <div
        ref="spotGrid"
        class="bf-spot-grid"
      >
        <div
          ref="litDrift"
          class="bf-drift bf-grid bf-grid-lit"
        />
      </div>
    </div>
    <div
      ref="marks"
      class="bf-drift bf-marks"
    >
      <i
        ref="beamX"
        class="bf-beam bf-beam-x"
      />
      <i
        ref="beamY"
        class="bf-beam bf-beam-y"
      />
      <i
        ref="lineX"
        class="bf-line bf-line-x"
      />
      <i
        ref="lineY"
        class="bf-line bf-line-y"
      />
      <div
        ref="lock"
        class="bf-lock"
      >
        <span
          ref="lockBox"
          class="bf-lock-box"
        ><i /><i /><i /><i /></span>
        <span class="bf-lock-tag">{{ sector }}</span>
      </div>
    </div>
    <i
      v-for="n in 4"
      :key="n"
      ref="rings"
      class="bf-ring"
    />
    <div class="bf-vignette" />
    <!-- The frame rides above the page so it can bracket a button inside an
         opaque panel or the header. -->
    <Teleport to="body">
      <div
        class="bf-frame"
        :class="{ 'is-armed': armed }"
        aria-hidden="true"
      >
        <i
          v-for="n in 4"
          :key="n"
          ref="corners"
          class="bf-corner"
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bf {
  --bf-minor: rgba(184, 176, 141, 0.032);
  --bf-line: rgba(184, 176, 141, 0.058);
  --bf-node: rgba(184, 176, 141, 0.2);
  --bf-node-step: var(--bf-major);
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  contain: strict;
  animation: bf-in 1.6s var(--ease-out) both;
}
@keyframes bf-in { from { opacity: 0; } }

.bf-drift {
  position: absolute;
  top: calc(var(--bf-major) * -1);
  left: calc(var(--bf-major) * -1);
  width: calc(100% + var(--bf-major));
  height: calc(100% + var(--bf-major));
  will-change: transform;
}

/* Minor lines every cell, major lines and nodes every fourth — the node dot
   is centred in its tile, then shifted half a tile onto the crossing. */
.bf-grid {
  background-image:
    radial-gradient(circle, var(--bf-node) 1.1px, transparent 1.7px),
    linear-gradient(var(--bf-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--bf-line) 1px, transparent 1px),
    linear-gradient(var(--bf-minor) 1px, transparent 1px),
    linear-gradient(90deg, var(--bf-minor) 1px, transparent 1px);
  background-size:
    var(--bf-node-step) var(--bf-node-step),
    var(--bf-major) var(--bf-major),
    var(--bf-major) var(--bf-major),
    var(--bf-cell) var(--bf-cell),
    var(--bf-cell) var(--bf-cell);
  background-position:
    calc(var(--bf-node-step) / -2 + 0.5px) calc(var(--bf-node-step) / -2 + 0.5px),
    0 0, 0 0, 0 0, 0 0;
}
.bf-grid-lit {
  --bf-minor: rgba(255, 214, 66, 0.26);
  --bf-line: rgba(255, 214, 66, 0.46);
  --bf-node: rgba(255, 232, 138, 0.95);
  --bf-node-step: var(--bf-cell);
  width: calc(var(--bf-spot) + var(--bf-major) * 2);
  height: calc(var(--bf-spot) + var(--bf-major) * 2);
}

.bf-spot,
.bf-haze {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  will-change: transform, opacity;
}
.bf-spot {
  width: var(--bf-spot);
  height: var(--bf-spot);
  overflow: hidden;
  -webkit-mask-image: radial-gradient(closest-side, #000 8%, rgba(0, 0, 0, 0.42) 46%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 8%, rgba(0, 0, 0, 0.42) 46%, transparent 100%);
}
.bf-spot-grid {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}
.bf-haze {
  width: var(--bf-haze);
  height: var(--bf-haze);
  background: radial-gradient(closest-side, rgba(255, 214, 66, 0.075), rgba(255, 214, 66, 0.025) 48%, transparent);
}

/* The lock: a reticle on the nearest node with its sector readout, and two
   hairlines running out along the node's row and column. */
.bf-marks { pointer-events: none; }
.bf-lock,
.bf-line {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition:
    transform 60ms var(--ease-out),
    opacity var(--dur-slow) var(--ease-out);
}
.is-locked .bf-lock { opacity: 1; }
.is-locked .bf-line { opacity: 1; transition-duration: 60ms, var(--dur-fast); }
.bf-line-x {
  width: 120vmax;
  height: 1px;
  margin-left: -60vmax;
  background: linear-gradient(90deg, transparent, rgba(255, 214, 66, 0.2) 50%, transparent);
}
.bf-line-y {
  width: 1px;
  height: 120vmax;
  margin-top: -60vmax;
  background: linear-gradient(180deg, transparent, rgba(255, 214, 66, 0.2) 50%, transparent);
}
/* Armed: the node's row lights left to right and its column top to bottom —
   a steady line drawn behind a bright head, both on the same curve so the
   head always sits at the line's leading edge. Each beam spans the whole
   drifting layer, so it crosses the viewport from wherever the node is. */
.bf-beam {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition:
    transform 60ms var(--ease-out),
    opacity var(--dur-med) var(--ease-out);
}
.is-armed .bf-beam { opacity: 1; }
.bf-beam-x { width: 100%; height: 1px; }
.bf-beam-y { width: 1px; height: 100%; }
.bf-beam::before,
.bf-beam::after {
  content: '';
  position: absolute;
  inset: 0;
}
.bf-beam::before {
  background: rgba(255, 214, 66, 0.34);
  box-shadow: 0 0 6px rgba(255, 214, 66, 0.4);
}
.bf-beam::after { opacity: 0; }
.bf-beam-x::before { transform-origin: left; }
.bf-beam-y::before { transform-origin: top; }
.bf-beam-x::after { background: linear-gradient(90deg, transparent calc(100% - 280px), var(--gold-bright)); }
.bf-beam-y::after { background: linear-gradient(180deg, transparent calc(100% - 280px), var(--gold-bright)); }
.is-armed .bf-beam-x::before { animation: bf-draw-x 620ms var(--ease-out) both; }
.is-armed .bf-beam-y::before { animation: bf-draw-y 620ms var(--ease-out) both; }
.is-armed .bf-beam-x::after { animation: bf-head-x 620ms var(--ease-out) both, bf-head-fade 620ms linear both; }
.is-armed .bf-beam-y::after { animation: bf-head-y 620ms var(--ease-out) both, bf-head-fade 620ms linear both; }
@keyframes bf-draw-x { from { transform: scaleX(0); } }
@keyframes bf-draw-y { from { transform: scaleY(0); } }
@keyframes bf-head-x { from { transform: translateX(-100%); } }
@keyframes bf-head-y { from { transform: translateY(-100%); } }
@keyframes bf-head-fade {
  0%, 70% { opacity: 1; }
  100% { opacity: 0; }
}

.bf-lock-box {
  position: absolute;
  top: -11px;
  left: -11px;
  width: 23px;
  height: 23px;
}
.bf-lock-box i {
  position: absolute;
  width: 6px;
  height: 6px;
  border: 0 solid var(--gold);
}
.bf-lock-box i:nth-child(1) { top: 0; left: 0; border-width: 1.5px 0 0 1.5px; }
.bf-lock-box i:nth-child(2) { top: 0; right: 0; border-width: 1.5px 1.5px 0 0; }
.bf-lock-box i:nth-child(3) { bottom: 0; right: 0; border-width: 0 1.5px 1.5px 0; }
.bf-lock-box i:nth-child(4) { bottom: 0; left: 0; border-width: 0 0 1.5px 1.5px; }
.bf-lock-tag {
  position: absolute;
  top: 9px;
  left: 15px;
  padding: 2px 5px;
  background: rgba(11, 12, 9, 0.8);
  color: rgba(255, 214, 66, 0.78);
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.22em;
  white-space: nowrap;
}

.bf-ring {
  position: absolute;
  top: calc(var(--bf-ring) * -1);
  left: calc(var(--bf-ring) * -1);
  width: calc(var(--bf-ring) * 2);
  height: calc(var(--bf-ring) * 2);
  border: 1px solid rgba(255, 214, 66, 0.5);
  border-radius: 50%;
  box-shadow: inset 0 0 36px rgba(255, 214, 66, 0.1), 0 0 18px rgba(255, 214, 66, 0.08);
  opacity: 0;
}

.bf-frame {
  position: fixed;
  inset: 0;
  z-index: 40;
  overflow: hidden;
  pointer-events: none;
  contain: strict;
}
.bf-corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  border: 0 solid var(--gold);
  opacity: 0;
  filter: drop-shadow(0 0 4px rgba(255, 214, 66, 0.55));
  transition: opacity var(--dur-fast) var(--ease-out);
}
.bf-corner:nth-child(1) { border-width: 2px 0 0 2px; }
.bf-corner:nth-child(2) { margin-left: -12px; border-width: 2px 2px 0 0; }
.bf-corner:nth-child(3) { margin: -12px 0 0 -12px; border-width: 0 2px 2px 0; }
.bf-corner:nth-child(4) { margin-top: -12px; border-width: 0 0 2px 2px; }
.is-armed .bf-corner { opacity: 1; }

.bf-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 115% 90% at 50% 38%, transparent 48%, rgba(0, 0, 0, 0.6) 100%);
}
</style>
