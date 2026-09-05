import { useWebSocket } from '@vueuse/core'
import type { EngineAction } from '~~/shared/engine/types'
import { useRecentRooms } from './useRecentRooms'
import { useSessionStore } from '~/stores/session'
import type { ClientMessage, ServerMessage } from '~~/shared/types/messages'

function playerKey(roomCode: string): string {
  return `griffdive:player:${roomCode}`
}

export function storedDiverName(): string {
  if (!import.meta.client) {
    return 'Diver'
  }
  return localStorage.getItem('griffdive:name')?.trim() || 'Diver'
}

export function rememberDiverName(name: string): void {
  if (import.meta.client) {
    localStorage.setItem('griffdive:name', name.trim().slice(0, 32))
  }
}

// Room-mode driver: state is server-authoritative. The client only sends
// actions and applies snapshots (AGENTS.md: client state is never trusted).
export function useGameSocket(roomCode: string) {
  const store = useSessionStore()
  const { rememberRoom } = useRecentRooms()

  const url = computed(() => {
    if (!import.meta.client) {
      return ''
    }
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${location.host}/ws?room=${encodeURIComponent(roomCode)}`
  })

  const { status, send, open, close } = useWebSocket(url, {
    immediate: false,
    autoReconnect: {
      retries: 8,
      delay: 1500,
      onFailed() {
        store.status = 'disconnected'
      },
    },
    heartbeat: {
      interval: 25_000,
      message: 'ping',
      responseMessage: 'pong',
      pongTimeout: 10_000,
    },
    onConnected() {
      hello()
    },
    onMessage(_socket, event) {
      let message: ServerMessage
      try {
        message = JSON.parse(event.data as string) as ServerMessage
      }
      catch {
        return
      }
      store.applyMessage(message)
    },
  })

  watch(status, (value) => {
    if (value === 'CONNECTING') {
      store.status = 'connecting'
    }
    else if (value === 'CLOSED') {
      store.status = 'disconnected'
    }
  })

  function hello(): void {
    const stored = import.meta.client ? localStorage.getItem(playerKey(roomCode)) : null
    const message: ClientMessage = {
      type: 'hello',
      name: storedDiverName(),
      ...(stored ? { playerId: stored } : {}),
    }
    send(JSON.stringify(message))
  }

  function dispatch(action: EngineAction): void {
    const message: ClientMessage = { type: 'action', action }
    send(JSON.stringify(message))
  }

  function connect(): void {
    store.openSession(roomCode)
    open()
  }

  watch(() => store.selfId, (id) => {
    if (id && import.meta.client) {
      localStorage.setItem(playerKey(roomCode), id)
      rememberRoom(roomCode)
    }
  })

  onMounted(connect)
  onBeforeUnmount(close)

  return { store, dispatch, connect, close }
}
