<script setup lang="ts">
// The Bridge's ambient deck: a fixed survey grid that drifts one sector every
// two minutes, and a warm lens that lights the lines under a fine pointer.
//
// The lens is a small, masked element translated to the pointer. Its grid is a
// viewport-sized child translated back to the viewport origin, so the lit lines
// stay locked to the base grid while pointer tracking only moves two compositor
// transforms. No repaint, no filter, no layout.
const lens = ref<HTMLElement | null>(null)
const live = ref(false)

let frame = 0
let targetX = 0
let targetY = 0
let x = 0
let y = 0
let reduced = false
let lastFrame = 0
let reducedQuery: MediaQueryList | undefined

function paint(): void {
  lens.value?.style.setProperty('--gx', `${x}px`)
  lens.value?.style.setProperty('--gy', `${y}px`)
}

function step(now: number): void {
  frame = 0
  const delta = lastFrame ? Math.min(64, now - lastFrame) : 16.7
  lastFrame = now
  const dx = targetX - x
  const dy = targetY - y
  if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
    x = targetX
    y = targetY
    paint()
    return
  }
  // A short trail keeps the light feeling physical; reduced motion snaps.
  // Frame-rate independent: 90ms to cover most of the distance on any display.
  const ease = reduced ? 1 : 1 - Math.exp(-delta / 90)
  x += dx * ease
  y += dy * ease
  paint()
  frame = requestAnimationFrame(step)
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerType === 'touch') {
    return
  }
  targetX = event.clientX
  targetY = event.clientY
  if (!live.value) {
    x = targetX
    y = targetY
    live.value = true
    paint()
  }
  if (!frame) {
    lastFrame = 0
    frame = requestAnimationFrame(step)
  }
}

function hide(): void {
  live.value = false
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

function syncReduced(): void {
  reduced = reducedQuery?.matches ?? false
}

function onVisibility(): void {
  if (document.hidden) {
    hide()
  }
}

onMounted(() => {
  reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncReduced()
  reducedQuery.addEventListener('change', syncReduced)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('blur', hide)
  document.documentElement.addEventListener('pointerleave', hide)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  reducedQuery?.removeEventListener('change', syncReduced)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('blur', hide)
  document.documentElement.removeEventListener('pointerleave', hide)
  document.removeEventListener('visibilitychange', onVisibility)
  if (frame) {
    cancelAnimationFrame(frame)
  }
})
</script>

<template>
  <div
    class="bgrid"
    aria-hidden="true"
  >
    <div class="bgrid__field" />
    <div class="bgrid__shade" />

    <div
      ref="lens"
      class="bgrid__lens"
      :class="{ 'is-live': live }"
    >
      <div class="bgrid__anchor">
        <div class="bgrid__glow" />
      </div>
      <div class="bgrid__core" />
    </div>
  </div>
</template>

<style scoped>
.bgrid {
  --cell: 48px;
  --sector: 192px;
  --lens-size: clamp(360px, 44vmax, 660px);
  --line: rgba(184, 176, 141, 0.026);
  --line-major: rgba(184, 176, 141, 0.046);
  --node: rgba(184, 176, 141, 0.14);
  --lit-line: rgba(255, 214, 66, 0.2);
  --lit-node: rgba(255, 232, 138, 0.6);

  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  pointer-events: none;
  animation: bgrid-in 700ms var(--ease-out) both;
}

/* Base survey grid -------------------------------------------------------- */
.bgrid__field {
  --drift: var(--sector);
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% + var(--sector));
  height: calc(100% + var(--sector));
  background-image:
    radial-gradient(circle, var(--node) 0 1px, transparent 1.5px),
    linear-gradient(var(--line-major) 1px, transparent 1px),
    linear-gradient(90deg, var(--line-major) 1px, transparent 1px),
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size:
    var(--sector) var(--sector),
    var(--sector) var(--sector),
    var(--sector) var(--sector),
    var(--cell) var(--cell),
    var(--cell) var(--cell);
  background-position:
    calc(var(--sector) * -0.5) calc(var(--sector) * -0.5),
    0 0,
    0 0,
    0 0,
    0 0;
  animation: bgrid-drift 120s linear infinite;
}

/* Cursor lens ------------------------------------------------------------- */
.bgrid__lens {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--lens-size);
  height: var(--lens-size);
  margin: calc(var(--lens-size) * -0.5) 0 0 calc(var(--lens-size) * -0.5);
  transform: translate3d(var(--gx, 50vw), var(--gy, 50vh), 0);
  opacity: 0;
  overflow: hidden;
  border-radius: 50%;
  contain: strict;
  -webkit-mask-image: radial-gradient(circle closest-side, #000 0%, rgba(0, 0, 0, 0.92) 26%, rgba(0, 0, 0, 0.46) 54%, transparent 82%);
  mask-image: radial-gradient(circle closest-side, #000 0%, rgba(0, 0, 0, 0.92) 26%, rgba(0, 0, 0, 0.46) 54%, transparent 82%);
  transition: opacity 260ms var(--ease-out);
  will-change: transform, opacity;
}
.bgrid__lens.is-live { opacity: 1; }

/* The anchor cancels the lens translation: its child paints from the viewport
   origin, so its grid lines line up with the base field exactly. */
.bgrid__anchor {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100vw + var(--cell));
  height: calc(100vh + var(--cell));
  transform: translate3d(
    calc(var(--lens-size) * 0.5 - var(--gx, 50vw)),
    calc(var(--lens-size) * 0.5 - var(--gy, 50vh)),
    0
  );
  will-change: transform;
}

.bgrid__glow {
  --drift: var(--sector);
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100vw + var(--sector));
  height: calc(100vh + var(--sector));
  background-image:
    radial-gradient(circle, var(--lit-node) 0 1.15px, transparent 1.7px),
    linear-gradient(var(--lit-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--lit-line) 1px, transparent 1px);
  background-size:
    var(--sector) var(--sector),
    var(--cell) var(--cell),
    var(--cell) var(--cell);
  background-position:
    calc(var(--sector) * -0.5) calc(var(--sector) * -0.5),
    0 0,
    0 0;
  opacity: 0.58;
  animation: bgrid-drift 120s linear infinite;
}

.bgrid__core {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 214, 66, 0.07) 0%,
    rgba(255, 214, 66, 0.026) 34%,
    transparent 70%
  );
}

/* Edge falloff keeps the grid a lit deck rather than a flat wallpaper. */
.bgrid__shade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 92% 88% at 50% 44%, transparent 56%, rgba(11, 12, 9, 0.4) 100%),
    linear-gradient(180deg, rgba(11, 12, 9, 0.16), transparent 14%, transparent 86%, rgba(11, 12, 9, 0.26));
}

@keyframes bgrid-in {
  from { opacity: 0; }
}

@keyframes bgrid-drift {
  from { transform: translate3d(calc(var(--drift) * -1), calc(var(--drift) * -1), 0); }
  to { transform: translate3d(0, 0, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .bgrid,
  .bgrid__field,
  .bgrid__glow {
    animation: none;
  }
  .bgrid__lens {
    transition: none;
  }
}

@media (hover: none) and (pointer: coarse) {
  .bgrid__lens {
    display: none;
  }
  .bgrid__glow {
    animation: none;
  }
}
</style>
