export interface MotionTarget {
  [key: string]: number
}

export interface MotionTransition {
  type?: 'spring' | 'tween'
  stiffness?: number
  damping?: number
  mass?: number
  duration?: number
  ease?: string | number[]
  delay?: number
}

export interface MotionPreset {
  initial: MotionTarget
  animate: MotionTarget
  transition: MotionTransition
}

/** Snappy settle — default for entrances. */
export const SPRING_SNAP: MotionTransition = { type: 'spring', stiffness: 320, damping: 24 }

/** Overshoots once — landings, badge pops, reward ceremony. */
export const SPRING_POP: MotionTransition = { type: 'spring', stiffness: 500, damping: 16 }

/** Gentle drift — panels and large blocks. */
export const SPRING_SOFT: MotionTransition = { type: 'spring', stiffness: 220, damping: 26 }

export function riseIn(delay = 0, step = 0.07): MotionPreset {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING_SNAP, delay: delay * step },
  }
}

export function popIn(delay = 0, step = 0.06): MotionPreset {
  return {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1 },
    transition: { ...SPRING_POP, delay: delay * step },
  }
}

/** Heavy landing — tier readouts, difficulty numerals, prize cards. */
export function slamIn(delay = 0, step = 0.06): MotionPreset {
  return {
    initial: { opacity: 0, scale: 1.18, y: -10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { type: 'spring', stiffness: 420, damping: 18, delay: delay * step },
  }
}

/** Card dealt onto the table — pact offers, reward options. */
export function dealIn(delay = 0, step = 0.08, from = { x: 0, y: 40 }): MotionPreset {
  return {
    initial: { opacity: 0, scale: 0.82, ...from },
    animate: { opacity: 1, scale: 1, x: 0, y: 0 },
    transition: { ...SPRING_SNAP, delay: delay * step },
  }
}

/** Rise from below — mobile sheets, drawer content. */
export function sheetUp(delay = 0): MotionPreset {
  return {
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING_SOFT, delay },
  }
}

/** Impact wipe — horizontal rules and divider reveals. */
export function impactIn(delay = 0, step = 0.05): MotionPreset {
  return {
    initial: { opacity: 0, scaleX: 0 },
    animate: { opacity: 1, scaleX: 1 },
    transition: { type: 'tween', duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: delay * step },
  }
}
