import { defineStore } from 'pinia'
import type { DiveState } from '~~/shared/engine/types'
import type { ServerMessage } from '~~/shared/types/messages'

export type SocketStatus = 'connecting' | 'connected' | 'disconnected'

export const useSessionStore = defineStore('session', () => {
  const roomCode = ref<string | null>(null)
  const selfId = ref<string | null>(null)
  const snapshot = ref<DiveState | null>(null)
  const online = ref<string[]>([])
  const status = ref<SocketStatus>('disconnected')
  const lastError = ref<{ code: string, message: string } | null>(null)

  function openSession(code: string): void {
    roomCode.value = code
    selfId.value = null
    snapshot.value = null
    online.value = []
    lastError.value = null
    status.value = 'connecting'
  }

  function applyMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'welcome':
        selfId.value = message.selfId
        snapshot.value = message.snapshot
        online.value = message.online
        status.value = 'connected'
        lastError.value = null
        break
      case 'state':
        snapshot.value = message.snapshot
        online.value = message.online
        break
      case 'error':
        lastError.value = { code: message.code, message: message.message }
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
    status,
    lastError,
    openSession,
    applyMessage,
    dismissError,
  }
})
