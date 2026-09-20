import type { ComputedRef, Ref } from 'vue'
import { MAX_DIFFICULTY, missionsPerOperation } from '~~/shared/engine/config'
import type { DiverState, DivePhase, DiveState } from '~~/shared/engine/types'
import type { DiveSession } from './useDiveSession'
import { rememberDiverName } from './useGameSocket'

export interface DiveView {
  state: ComputedRef<DiveState | null>
  self: ComputedRef<DiverState | null>
  selfId: ComputedRef<string | null>
  phase: ComputedRef<DivePhase | null>
  canControl: ComputedRef<boolean>
  kicked: ComputedRef<boolean>
  opLength: ComputedRef<number>
  // spin/decision/pacts share one key so the wheel reveal isn't interrupted by
  // the phase flips that follow the spin.
  phaseKey: ComputedRef<DivePhase | 'spin-pacts' | undefined>
  diverName: (id: string | null) => string
  nameDraft: Ref<string>
  setNameDraft: (name: string) => void
  commitName: () => void
}

// The shell's read-only view over a dive session: the derivations the page and
// its header/strip need, so the template never walks `session.state` by hand.
// Phase-specific shaping lives with each phase component.
export function useDiveView(session: DiveSession): DiveView {
  const state = session.state
  const selfId = session.selfId

  const self = computed(() =>
    state.value?.divers.find(diver => diver.id === selfId.value) ?? null)
  const phase = computed(() => state.value?.phase ?? null)
  const canControl = computed(() => session.mode === 'local' || session.selfIsHost.value)
  const opLength = computed(() => missionsPerOperation(state.value?.difficulty ?? MAX_DIFFICULTY))

  const kicked = computed(() =>
    session.mode === 'room'
    && !!state.value
    && !!selfId.value
    && !state.value.divers.some(diver => diver.id === selfId.value))

  const phaseKey = computed((): DivePhase | 'spin-pacts' | undefined => {
    const current = phase.value
    if (current === null) {
      return undefined
    }
    return current === 'spin' || current === 'decision' || current === 'pacts'
      ? 'spin-pacts'
      : current
  })

  function diverName(id: string | null): string {
    return state.value?.divers.find(diver => diver.id === id)?.name ?? 'another diver'
  }

  const nameDraft = ref('')
  const nameTouched = ref(false)

  // Adopt the diver's actual name (welcome snapshot / local save) until edited.
  watch(() => self.value?.name, (name) => {
    if (name && !nameTouched.value) {
      nameDraft.value = name
    }
  }, { immediate: true })

  function commitName(): void {
    const name = nameDraft.value.trim() || 'Diver'
    nameTouched.value = true
    rememberDiverName(name)
    nameDraft.value = name
    if (selfId.value) {
      session.dispatch({ type: 'SET_NAME', playerId: selfId.value, name })
    }
  }

  function setNameDraft(name: string): void {
    nameDraft.value = name
  }

  return {
    state,
    self,
    selfId,
    phase,
    canControl,
    kicked,
    opLength,
    phaseKey,
    diverName,
    nameDraft,
    setNameDraft,
    commitName,
  }
}
