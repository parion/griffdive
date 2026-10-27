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

/** Reward cabinet reveal timing (ms): one rank every POD_STAGGER. */
export const POD_STAGGER = 180

/**
 * Briefing class strike (ms): once a name is filed, classes A–D are struck one
 * every REGISTRY_BEAT and E lands; the Griffdiver stamp follows after
 * REGISTRY_STAMP, and the starting kit unfolds REGISTRY_HOLD after that. A
 * saved name files itself after REGISTRY_AUTOFILE.
 */
export const REGISTRY_BEAT = 300
export const REGISTRY_STAMP = 280
export const REGISTRY_HOLD = 600
export const REGISTRY_AUTOFILE = 800

/** Wheel rotation (ms): the rotor transition and the result reveal share this clock. */
export const WHEEL_SPIN_MS = 2800

/** Squad Honors reel (ms): the strip's wind-down onto the seeded stat, then the dwell that lets the squad read it before the report files. */
export const HONORS_REEL_MS = 2000
export const HONORS_DWELL_MS = 1100
