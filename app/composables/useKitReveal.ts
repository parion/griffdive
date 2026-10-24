import type { Ref } from 'vue'
import type { DiveState, DiverState } from '~~/shared/engine/types'

// When the diver's SEAF pack should be shown being dealt. Presentation only:
// the engine dealt the pack already, this just decides whether to stage it.
// Armed by (a) the squad launching while this page watched the lobby, (b) this
// diver being seated mid-crusade after the join briefing, and (c) a fresh solo
// crusade that has not reached its first spin. A plain reload of a running dive
// never replays it.
export function useKitReveal(
  state: Ref<DiveState | null>,
  self: Ref<DiverState | null>,
  awaitingJoin: Ref<boolean>,
  local: boolean,
) {
  const active = ref(false)
  let briefed = awaitingJoin.value

  function arm(): void {
    const settings = state.value?.settings
    if (settings?.mode === 'seaf' && (self.value?.supportKit?.length ?? 0) > 0) {
      active.value = true
    }
  }

  watch(awaitingJoin, (waiting) => {
    briefed ||= waiting
  })

  watch(() => state.value?.phase, (phase, before) => {
    if (before === 'lobby' && phase && phase !== 'lobby') {
      arm()
    }
  })

  watch(() => self.value?.id, (id, before) => {
    if (id && !before && briefed) {
      briefed = false
      arm()
    }
  })

  if (local) {
    let checked = false
    watch(state, (current) => {
      if (checked || !current) {
        return
      }
      checked = true
      if (current.phase === 'spin' && current.wheel === null && current.frontId === null && current.missionIndex === 0) {
        arm()
      }
    }, { immediate: true })
  }

  function dismiss(): void {
    active.value = false
  }

  return { active, dismiss }
}
