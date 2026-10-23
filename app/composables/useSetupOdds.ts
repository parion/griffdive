import type { MaybeRefOrGetter } from 'vue'
import { STARTING_KITS } from '~~/shared/engine/progression'
import { tierZones } from '~~/shared/engine/rewards'
import { setupRiskOf } from '~~/shared/engine/selectors'
import type { CrusadeSettings, RewardTier } from '~~/shared/engine/types'

// What a crusade's setup buys on the Valor roll: the odds line at the start
// difficulty with the setup's risk (front plan + mode), lit against a bare
// start. Only the gains are lit — the setup never reads as a penalty.
export function useSetupOdds(settings: MaybeRefOrGetter<CrusadeSettings>) {
  const start = computed(() => STARTING_KITS[toValue(settings).variant].startDifficulty)
  const zones = computed(() => tierZones(start.value, setupRiskOf(toValue(settings))))
  const deltas = computed<Partial<Record<RewardTier, number>>>(() => {
    const bare = tierZones(start.value, 0)
    const result: Partial<Record<RewardTier, number>> = {}
    for (const zone of zones.value) {
      const gain = (zone.chance - (bare.find(entry => entry.tier === zone.tier)?.chance ?? 0)) * 100
      if (gain > 0) {
        result[zone.tier] = gain
      }
    }
    return result
  })
  return { zones, deltas }
}
