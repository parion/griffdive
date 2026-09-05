export interface MotionTarget {
  [key: string]: number
}

export interface MotionTransition {
  type?: 'spring' | 'tween'
  stiffness?: number
  damping?: number
  mass?: number
  duration?: number
  ease?: string
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
