import { defineStore } from 'pinia'
import type { DiveState } from '~~/shared/engine/types'
import type { DiveSaveInfo, ServerMessage, SteamLobbyInfo } from '~~/shared/types/messages'

export type SocketStatus = 'connecting' | 'connected' | 'disconnected'

export const useSessionStore = defineStore('session', () => {
  const roomCode = ref<string | null>(null)
  const selfId = ref<string | null>(null)
  const snapshot = ref<DiveState | null>(null)
  const online = ref<string[]>([])
  const saved = ref<DiveSaveInfo | null>(null)
  const steam = ref<SteamLobbyInfo | null>(null)
  const status = ref<SocketStatus>('disconnected')
  const lastError = ref<{ code: string, message: string } | null>(null)
  // The server announced a restart (a deploy): the drop that follows is
  // expected, and the room is waiting in storage.
  const restarting = ref(false)

  function openSession(code: string): void {
    roomCode.value = code
    selfId.value = null
    snapshot.value = null
    online.value = []
    saved.value = null
    steam.value = null
    lastError.value = null
    restarting.value = false
    status.value = 'connecting'
  }

  function applyMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'welcome':
        selfId.value = message.selfId
        snapshot.value = message.snapshot
        online.value = message.online
        saved.value = message.saved
        steam.value = message.steam
        status.value = 'connected'
        lastError.value = null
        restarting.value = false
        break
      case 'state':
        snapshot.value = message.snapshot
        online.value = message.online
        saved.value = message.saved
        steam.value = message.steam
        break
      case 'error':
        lastError.value = { code: message.code, message: message.message }
        break
      case 'restarting':
        restarting.value = true
        break
    }
  }

  function dismissError(): void {
    lastError.value = null
  }

  return {
    roomCode,
    selfId,
    snapshot,
    online,
    saved,
    steam,
    status,
    lastError,
    restarting,
    openSession,
    applyMessage,
    dismissError,
  }
})
