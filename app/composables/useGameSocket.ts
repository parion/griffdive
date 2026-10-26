import { useIntervalFn, useWebSocket } from '@vueuse/core'
import { VARIANTS } from '~~/shared/engine/progression'
import type { DiveState, EngineAction } from '~~/shared/engine/types'
import { hasSeenJoinBriefing } from './useJoinBriefing'
import { useOwnedWarbonds } from './useOwnedWarbonds'
import { useRecentRooms } from './useRecentRooms'
import { useSessionSaves } from './useSessionSaves'
import { useSessionStore } from '~/stores/session'
import type { ClientMessage, ServerMessage } from '~~/shared/types/messages'

function playerKey(roomCode: string): string {
  return `griffdive:seat:${roomCode}`
}

// The seat this browser holds in a room, if any. A new session seeded from a
// save pre-stores the owner's seat here so the first hello reattaches it.
export function storedSeat(roomCode: string): string | null {
  if (!import.meta.client) {
    return null
  }
  return localStorage.getItem(playerKey(roomCode))
}

export function storeSeat(roomCode: string, playerId: string): void {
  if (import.meta.client) {
    localStorage.setItem(playerKey(roomCode), playerId)
  }
}

// Every seat this browser has held. A new session keys its fallen divers'
// caches by the ids they held in the source room, so offering these on a first
// hello lets a returning diver reclaim their own kit.
function rememberedSeats(): string[] {
  if (!import.meta.client) {
    return []
  }
  const ids = new Set<string>()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    const id = key?.startsWith(playerKey('')) ? localStorage.getItem(key) : null
    if (id) {
      ids.add(id)
    }
  }
  return [...ids].slice(0, 20)
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
function hasDiverName(): boolean {
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

  // A first visit to this room (no stored seat) is held before the hello seats
  // anyone: a diver with no name yet, or one who never read the joiner's
  // briefing, confirms through the page's gate first. Stored seats reconnect
  // straight away.
  const hasSeat = import.meta.client
    && !!localStorage.getItem(playerKey(roomCode))
  const awaitingJoin = ref(!hasSeat && (!hasDiverName() || !hasSeenJoinBriefing()))
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
      scheduler: cb => useIntervalFn(cb, 25_000, { immediate: false }),
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

  // Every seated diver keeps a personal copy of the session (AGENTS.md,
  // Personal session saves), so any of them can seed a new room from it. The
  // write is debounced: a mission's phases emit a handful of snapshots each.
  const sessionSaves = useSessionSaves()
  let mirrorTimer: ReturnType<typeof setTimeout> | undefined

  // The last snapshot this browser held a seat in. Leaving (or a kick) drops
  // the seat, so the pending write must flush that one, not the seatless next.
  let pendingMirror: DiveState | null = null

  function mirrorSnapshot(): void {
    clearTimeout(mirrorTimer)
    const snapshot = pendingMirror
    const id = store.selfId
    pendingMirror = null
    if (!snapshot || !id) {
      return
    }
    const variant = VARIANTS.find(entry => entry.id === snapshot.settings?.variant)?.name
    const leader = snapshot.divers.find(diver => diver.id === snapshot.hostId) ?? snapshot.divers[0]
    sessionSaves.mirrorSession({
      roomCode,
      ownerId: id,
      state: snapshot,
      slotName: store.saved?.name ?? `${leader?.name ?? 'Crusade'} · ${variant ?? 'Crusade'}`,
      savedAt: new Date().toISOString(),
    })
  }

  watch(() => store.snapshot, (snapshot) => {
    const id = store.selfId
    if (snapshot && id && snapshot.divers.some(diver => diver.id === id)) {
      pendingMirror = snapshot
      clearTimeout(mirrorTimer)
      mirrorTimer = setTimeout(mirrorSnapshot, 750)
    }
    else {
      mirrorSnapshot()
    }
  })

  function hello(): void {
    const stored = import.meta.client ? localStorage.getItem(playerKey(roomCode)) : null
    const knownIds = stored ? [] : rememberedSeats()
    const message: ClientMessage = {
      type: 'hello',
      name: storedDiverName(),
      warbondCodes: [...useOwnedWarbonds().ownedWarbonds.value],
      ...(stored ? { playerId: stored } : {}),
      ...(knownIds.length > 0 ? { knownIds } : {}),
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

  function setSteam(link: string): void {
    const message: ClientMessage = { type: 'set-steam', link }
    send(JSON.stringify(message))
  }

  function connect(): void {
    awaitingJoin.value = false
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

  // The server reaps sockets that stop heartbeating (a sleeping phone, a frozen
  // tab), and the retry budget below gives up after a few seconds. Coming back
  // to the page should reopen the dive instead of leaving a dead board on screen.
  function reopenIfDead(): void {
    if (document.visibilityState === 'visible' && connectionFailed.value) {
      connectionFailed.value = false
      open()
    }
  }

  onMounted(() => {
    if (import.meta.client) {
      document.addEventListener('visibilitychange', reopenIfDead)
    }
    if (!awaitingJoin.value) {
      connect()
    }
  })
  onBeforeUnmount(() => {
    // Flush the pending mirror before the socket closes so the last snapshot
    // (a just-banked reward, a just-reported mission) survives the navigation.
    mirrorSnapshot()
    if (import.meta.client) {
      document.removeEventListener('visibilitychange', reopenIfDead)
    }
    close()
  })

  return { store, dispatch, saveDive, unsaveDive, setSteam, connect, close, awaitingJoin, connectionFailed }
}
