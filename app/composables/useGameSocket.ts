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

// A saved name worth keeping — the bare 'Diver' placeholder doesn't count as
// having introduced yourself.
export function hasDiverName(): boolean {
  if (!import.meta.client) {
    return false
  }
  const name = localStorage.getItem('griffdive:name')?.trim()
  return !!name && name !== 'Diver'
}

// Room-mode driver: state is server-authoritative. The client only sends
// actions and applies snapshots (AGENTS.md: client state is never trusted).
export function useGameSocket(roomCode: string) {
  const store = useSessionStore()
  const { rememberRoom } = useRecentRooms()

  // Joining by link requires a name: first-timers to this room (no stored
  // seat) who never introduced themselves (no saved name) are held until the
  // name gate confirms them. Stored seats reconnect straight away.
  const hasSeat = import.meta.client
    && !!localStorage.getItem(playerKey(roomCode))
  const awaitingName = ref(!hasSeat && !hasDiverName())
  // Set once autoReconnect gives up. Transient CLOSED->CONNECTING churn during
  // retries must not look like a dead end, so only the exhausted case flips this.
  const connectionFailed = ref(false)

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
        connectionFailed.value = true
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
      connectionFailed.value = false
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

  function saveDive(name?: string): void {
    const message: ClientMessage = name ? { type: 'save-dive', name } : { type: 'save-dive' }
    send(JSON.stringify(message))
  }

  function unsaveDive(): void {
    const message: ClientMessage = { type: 'unsave-dive' }
    send(JSON.stringify(message))
  }

  function connect(): void {
    awaitingName.value = false
    connectionFailed.value = false
    store.openSession(roomCode)
    open()
  }

  watch(() => store.selfId, (id) => {
    if (id && import.meta.client) {
      localStorage.setItem(playerKey(roomCode), id)
      rememberRoom(roomCode)
    }
  })

  onMounted(() => {
    if (!awaitingName.value) {
      connect()
    }
  })
  onBeforeUnmount(close)

  return { store, dispatch, saveDive, unsaveDive, connect, close, awaitingName, connectionFailed }
}
