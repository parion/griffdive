import { reduce } from '~~/shared/engine/reducer'
import type { DiveState, EngineAction } from '~~/shared/engine/types'
import { useSaves } from './useSaves'

export function useDiveEngine(slotId: string) {
  const saves = useSaves()
  const state = ref<DiveState | null>(null)
  const slotName = ref('')
  const loadError = ref(false)

  onMounted(() => {
    const doc = saves.loadSlot(slotId)
    if (doc) {
      state.value = doc.state
      slotName.value = doc.slotName
    }
    else {
      loadError.value = true
    }
  })

  function dispatch(action: EngineAction): void {
    if (!state.value) {
      return
    }
    state.value = reduce(state.value, action)
    saves.persistSlot(slotId, state.value, slotName.value)
  }

  function newSeed(): number {
    if (!import.meta.client) {
      return 0
    }
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  }

  return { state, slotName, loadError, dispatch, newSeed }
}
