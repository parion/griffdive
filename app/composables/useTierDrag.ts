import type { Tier } from '~~/shared/data/types'

export interface TierDrag {
  id: string
  x: number
  y: number
  size: number
  overTier: Tier | null
}

interface Pending {
  id: string
  pointerId: number
  touch: boolean
  startX: number
  startY: number
  size: number
  timer: ReturnType<typeof setTimeout> | undefined
}

// Touch has to hold before an item lifts, so a swipe across the board still
// scrolls the page; a mouse lifts as soon as it moves past a few pixels.
const LONG_PRESS_MS = 220
const MOUSE_SLOP = 5
const TOUCH_SLOP = 9
const EDGE = 84
const MAX_SCROLL = 22

// Pointer-driven drag for the Tier Maker: one code path for mouse, pen and
// touch, no dependency. Drop targets are any element carrying
// `data-drop-tier`; the ghost must be `pointer-events: none` so hit-testing
// sees through it. Presentation only — the drop just reports an item and tier.
export function useTierDrag(onDrop: (id: string, tier: Tier) => void) {
  const drag = shallowRef<TierDrag | null>(null)
  const pressing = ref<string | null>(null)
  let pending: Pending | null = null
  let suppressClick = false
  let frame = 0
  let lastY = 0
  let lastX = 0

  function tierAt(x: number, y: number): Tier | null {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-tier]')
    return (target?.dataset.dropTier as Tier | undefined) ?? null
  }

  function update(x: number, y: number): void {
    lastX = x
    lastY = y
    if (drag.value) {
      drag.value = { ...drag.value, x, y, overTier: tierAt(x, y) }
    }
  }

  // Near the top or bottom edge the page scrolls under the held item, faster
  // the closer it gets, so a long board never needs a second hand.
  function autoScroll(): void {
    if (!drag.value) {
      return
    }
    const bottomEdge = window.innerHeight - EDGE
    let delta = 0
    if (lastY < EDGE) {
      delta = -Math.ceil(((EDGE - lastY) / EDGE) * MAX_SCROLL)
    }
    else if (lastY > bottomEdge) {
      delta = Math.ceil(((lastY - bottomEdge) / EDGE) * MAX_SCROLL)
    }
    if (delta !== 0) {
      window.scrollBy(0, delta)
      update(lastX, lastY)
    }
    frame = requestAnimationFrame(autoScroll)
  }

  function begin(): void {
    if (!pending) {
      return
    }
    pressing.value = null
    drag.value = { id: pending.id, x: lastX, y: lastY, size: pending.size, overTier: tierAt(lastX, lastY) }
    if (pending.touch) {
      navigator.vibrate?.(8)
    }
    frame = requestAnimationFrame(autoScroll)
  }

  function cleanup(): void {
    if (pending?.timer) {
      clearTimeout(pending.timer)
    }
    pending = null
    pressing.value = null
    drag.value = null
    cancelAnimationFrame(frame)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', cleanup)
    window.removeEventListener('keydown', onKey)
  }

  function onMove(event: PointerEvent): void {
    if (!pending || event.pointerId !== pending.pointerId) {
      return
    }
    lastX = event.clientX
    lastY = event.clientY
    if (drag.value) {
      update(event.clientX, event.clientY)
      return
    }
    const moved = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY)
    if (pending.touch) {
      // Moving before the hold completes is a scroll, not a drag.
      if (moved > TOUCH_SLOP) {
        cleanup()
      }
    }
    else if (moved > MOUSE_SLOP) {
      begin()
    }
  }

  function onUp(event: PointerEvent): void {
    if (!pending || event.pointerId !== pending.pointerId) {
      return
    }
    const done = drag.value
    if (done) {
      // The click that follows this release (if any) lands in the same task.
      suppressClick = true
      setTimeout(() => {
        suppressClick = false
      }, 0)
      const tier = tierAt(event.clientX, event.clientY)
      if (tier) {
        onDrop(done.id, tier)
      }
    }
    cleanup()
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && drag.value) {
      cleanup()
    }
  }

  function start(event: PointerEvent, id: string): void {
    if (event.button !== 0 || pending) {
      return
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const touch = event.pointerType !== 'mouse'
    lastX = event.clientX
    lastY = event.clientY
    pending = {
      id,
      pointerId: event.pointerId,
      touch,
      startX: event.clientX,
      startY: event.clientY,
      size: rect.width,
      timer: touch ? setTimeout(begin, LONG_PRESS_MS) : undefined,
    }
    if (touch) {
      pressing.value = id
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', cleanup)
    window.addEventListener('keydown', onKey)
  }

  // A drag ends in a click on the tile it started from; that click must not
  // also open the inspector.
  function consumeClick(): boolean {
    const swallow = suppressClick
    suppressClick = false
    return swallow
  }

  // Once an item is lifted, the finger owns the page: block the native scroll
  // (listeners must be non-passive to be allowed to).
  function blockTouchScroll(event: TouchEvent): void {
    if (drag.value) {
      event.preventDefault()
    }
  }

  onMounted(() => {
    window.addEventListener('touchmove', blockTouchScroll, { passive: false })
  })
  onBeforeUnmount(() => {
    window.removeEventListener('touchmove', blockTouchScroll)
    cleanup()
  })

  return { drag, pressing, start, consumeClick, cancel: cleanup }
}
