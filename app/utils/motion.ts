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

export function riseIn(delay = 0, step = 0.07): MotionPreset {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING_SNAP, delay: delay * step },
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
