import { useLocalStorage } from '@vueuse/core'
import type { HeroCategory } from '~~/shared/data/stratagemCodes'

export interface DrillRecord {
  score: number
  round: number
}

// Drill personal bests, kept on this device only (see PRIVACY.md), keyed by
// mode and pool so a practice filter never beats the full-pool board.
export function useDrillRecords() {
  const records = useLocalStorage<Record<string, DrillRecord>>('griffdive:drill:v1', {})

  function keyOf(category: HeroCategory, untimed: boolean): string {
    return `${untimed ? 'untimed' : 'timed'}:${category}`
  }

  function best(category: HeroCategory, untimed: boolean): DrillRecord | null {
    return records.value[keyOf(category, untimed)] ?? null
  }

  // Returns true when the run set a new best.
  function submit(category: HeroCategory, untimed: boolean, run: DrillRecord): boolean {
    const key = keyOf(category, untimed)
    const previous = records.value[key]
    const better = untimed
      ? !previous || run.round > previous.round
      : !previous || run.score > previous.score
    if (better) {
      records.value = { ...records.value, [key]: run }
    }
    return better
  }

  return { best, submit }
}
