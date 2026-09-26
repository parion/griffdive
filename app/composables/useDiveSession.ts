import type { ComputedRef } from 'vue'
import type { DiveState, EngineAction } from '~~/shared/engine/types'
import type { DiveSaveInfo } from '~~/shared/types/messages'
import { isRoomCode } from '~~/shared/utils/room-code'
import { useDiveEngine } from './useDiveEngine'
import { useGameSocket } from './useGameSocket'

export type DiveSessionStatus = 'local' | 'connecting' | 'connected' | 'disconnected'

export interface DiveSession {
  mode: 'local' | 'room'
  state: ComputedRef<DiveState | null>
  dispatch: (action: EngineAction) => void
  connect: () => void
  awaitingName: ComputedRef<boolean>
  connectionFailed: ComputedRef<boolean>
  newSeed: () => number
  selfId: ComputedRef<string | null>
  selfIsHost: ComputedRef<boolean>
  online: ComputedRef<string[]>
  saved: ComputedRef<DiveSaveInfo | null>
  saveDive: (name?: string) => void
  unsaveDive: () => void
  status: ComputedRef<DiveSessionStatus>
  lastError: ComputedRef<{ code: string, message: string } | null>
  dismissError: () => void
  slotName: ComputedRef<string>
  loadError: ComputedRef<boolean>
}

// One driver for both modes: local saves run the reducer in the browser,
// room codes ride the WebSocket and apply server snapshots.
export function useDiveSession(slotId: string): DiveSession {
  if (!isRoomCode(slotId)) {
    const engine = useDiveEngine(slotId)
    return {
      mode: 'local',
      state: computed(() => engine.state.value),
      dispatch: engine.dispatch,
      connect: () => {},
      awaitingName: computed(() => false),
      connectionFailed: computed(() => false),
      newSeed: engine.newSeed,
      selfId: computed(() => engine.state.value?.hostId ?? null),
      selfIsHost: computed(() => true),
      online: computed(() => engine.state.value?.divers.map(diver => diver.id) ?? []),
      saved: computed(() => null),
      saveDive: () => {},
      unsaveDive: () => {},
      status: computed(() => 'local' as const),
      lastError: computed(() => null),
      dismissError: () => {},
      slotName: computed(() => engine.slotName.value),
      loadError: computed(() => engine.loadError.value),
    }
  }

  const { store, dispatch, saveDive, unsaveDive, ...socket } = useGameSocket(slotId)
  return {
    mode: 'room',
    state: computed(() => store.snapshot),
    dispatch,
    saveDive,
    unsaveDive,
    connect: () => socket.connect(),
    awaitingName: computed(() => socket.awaitingName.value),
    connectionFailed: computed(() => socket.connectionFailed.value),
    newSeed,
    selfId: computed(() => store.selfId),
    selfIsHost: computed(() =>
      !!store.snapshot && store.snapshot.hostId !== null && store.snapshot.hostId === store.selfId),
    online: computed(() => store.online),
    saved: computed(() => store.saved),
    status: computed(() => store.status),
    lastError: computed(() => store.lastError),
    dismissError: () => store.dismissError(),
    slotName: computed(() => store.roomCode ?? slotId),
    loadError: computed(() => store.lastError?.code === 'room-not-found'),
  }
}
