import { customAlphabet, nanoid } from 'nanoid'
import { SQUAD_SIZE_MAX, MAX_NAME_LENGTH } from '~~/shared/engine/config'
import { createLobbyState, joinDiver } from '~~/shared/engine/room'
import { reduce } from '~~/shared/engine/reducer'
import type { DiveState, EngineAction } from '~~/shared/engine/types'
import { LOBBY_ROOM, isHostOnlyAction, isLobbyRoom } from '~~/shared/types/messages'
import type { LobbyEntry, ServerMessage } from '~~/shared/types/messages'
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isRoomCode } from '~~/shared/utils/room-code'

const newRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH)
const newPlayerId = () => nanoid(12)

// Rooms idle in storage this long before they are pruned on access.
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000

export interface StoredRoom {
  code: string
  state: DiveState
  updatedAt: number
}

// Storage abstraction so the sync core stays unit-testable without Nitro.
export interface RoomKV {
  getItem(code: string): Promise<unknown>
  setItem(code: string, value: StoredRoom): Promise<void>
  removeItem(code: string): Promise<void>
  getKeys(): Promise<string[]>
}

export interface PeerLike {
  id: string
  context: { roomCode?: string, playerId?: string }
  send(text: string): void
}

// Live connections are process memory; room state lives in storage. crossws
// topics are global to the process, so routing goes through this directory
// instead of pub/sub.
export interface PeerDirectory {
  add(roomCode: string, peer: PeerLike): void
  remove(peer: PeerLike): void
  list(roomCode: string): PeerLike[]
}

export function createPeerDirectory(): PeerDirectory {
  const byRoom = new Map<string, Set<PeerLike>>()
  return {
    add(roomCode, peer) {
      let set = byRoom.get(roomCode)
      if (!set) {
        set = new Set()
        byRoom.set(roomCode, set)
      }
      set.add(peer)
    },
    remove(peer) {
      for (const set of byRoom.values()) {
        set.delete(peer)
      }
    },
    list(roomCode) {
      return [...(byRoom.get(roomCode) ?? [])]
    },
  }
}

function isStoredRoom(raw: unknown): raw is StoredRoom {
  if (!raw || typeof raw !== 'object') {
    return false
  }
  const room = raw as Partial<StoredRoom>
  return typeof room.code === 'string'
    && !!room.state
    && typeof room.state === 'object'
    && typeof room.updatedAt === 'number'
}

export async function createRoom(kv: RoomKV): Promise<string> {
  let code = newRoomCode()
  while (await kv.getItem(code) != null) {
    code = newRoomCode()
  }
  await kv.setItem(code, { code, state: createLobbyState(), updatedAt: Date.now() } satisfies StoredRoom)
  return code
}

export async function loadRoom(kv: RoomKV, code: string): Promise<StoredRoom | null> {
  const raw = await kv.getItem(code)
  if (!isStoredRoom(raw)) {
    return null
  }
  if (Date.now() - raw.updatedAt > ROOM_TTL_MS) {
    await kv.removeItem(code)
    return null
  }
  return raw
}

async function saveRoom(kv: RoomKV, room: StoredRoom): Promise<void> {
  room.updatedAt = Date.now()
  await kv.setItem(room.code, room)
}

export function lobbyEntryFor(room: StoredRoom): LobbyEntry | null {
  const squadSize = room.state.divers.length
  if (!room.state.openToLobby || squadSize >= SQUAD_SIZE_MAX) {
    return null
  }
  return {
    roomCode: room.code,
    squadSize,
    slotsFree: SQUAD_SIZE_MAX - squadSize,
    difficulty: room.state.difficulty,
    variant: room.state.settings?.variant ?? null,
    front: room.state.wheel?.front ?? null,
    hostName: room.state.divers.find(diver => diver.isHost)?.name ?? '',
  }
}

export async function listLobby(kv: RoomKV): Promise<LobbyEntry[]> {
  const keys = await kv.getKeys()
  const entries = await Promise.all(
    keys.map(async (code) => {
      const room = await loadRoom(kv, code)
      return room ? lobbyEntryFor(room) : null
    }),
  )
  return entries.filter((entry): entry is LobbyEntry => entry !== null)
}

function sendError(peer: PeerLike, code: string, message: string): void {
  peer.send(JSON.stringify({ type: 'error', code, message } satisfies ServerMessage))
}

function onlineIds(peers: PeerDirectory, roomCode: string, state: DiveState): string[] {
  const connected = new Set(
    peers
      .list(roomCode)
      .map(peer => peer.context.playerId)
      .filter((id): id is string => typeof id === 'string'),
  )
  return state.divers.filter(diver => connected.has(diver.id)).map(diver => diver.id)
}

function broadcastState(
  peers: PeerDirectory,
  roomCode: string,
  state: DiveState,
  applied: EngineAction | null,
  except?: PeerLike,
): void {
  const message = JSON.stringify({
    type: 'state',
    snapshot: state,
    applied,
    online: onlineIds(peers, roomCode, state),
  } satisfies ServerMessage)
  for (const peer of peers.list(roomCode)) {
    if (peer !== except) {
      peer.send(message)
    }
  }
}

async function broadcastLobby(kv: RoomKV, peers: PeerDirectory): Promise<void> {
  const message = JSON.stringify({ type: 'lobby', rooms: await listLobby(kv) } satisfies ServerMessage)
  for (const peer of peers.list(LOBBY_ROOM)) {
    peer.send(message)
  }
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') {
    return 'Diver'
  }
  return name.trim().slice(0, MAX_NAME_LENGTH) || 'Diver'
}

export async function processHello(
  kv: RoomKV,
  peers: PeerDirectory,
  peer: PeerLike,
  payload: { name?: unknown, playerId?: unknown },
): Promise<void> {
  const requested = peer.context.roomCode ?? ''
  if (!requested) {
    sendError(peer, 'bad-room', 'Missing room code')
    return
  }

  if (isLobbyRoom(requested)) {
    peer.context.roomCode = LOBBY_ROOM
    peers.add(LOBBY_ROOM, peer)
    peer.send(JSON.stringify({ type: 'lobby', rooms: await listLobby(kv) } satisfies ServerMessage))
    return
  }

  if (!isRoomCode(requested)) {
    sendError(peer, 'bad-room', 'Invalid room code')
    return
  }

  const room = await loadRoom(kv, requested)
  if (!room) {
    sendError(peer, 'room-not-found', `No dive found for code ${requested}`)
    return
  }

  const storedId = typeof payload.playerId === 'string' ? payload.playerId : null
  const known = storedId ? room.state.divers.find(diver => diver.id === storedId) : undefined
  let playerId: string
  let changed = false

  if (known) {
    playerId = known.id
  }
  else {
    if (room.state.divers.length >= SQUAD_SIZE_MAX) {
      sendError(peer, 'room-full', 'Dive squad is full')
      return
    }
    playerId = newPlayerId()
    const joined = joinDiver(room.state, playerId, sanitizeName(payload.name))
    if (!joined) {
      sendError(peer, 'room-full', 'Dive squad is full')
      return
    }
    room.state = joined
    changed = true
  }

  peer.context.roomCode = requested
  peer.context.playerId = playerId
  peers.add(requested, peer)

  if (changed) {
    await saveRoom(kv, room)
  }
  peer.send(JSON.stringify({
    type: 'welcome',
    selfId: playerId,
    hostId: room.state.hostId,
    roomCode: requested,
    snapshot: room.state,
    online: onlineIds(peers, requested, room.state),
  } satisfies ServerMessage))

  if (changed) {
    broadcastState(peers, requested, room.state, null, peer)
    if (room.state.openToLobby) {
      await broadcastLobby(kv, peers)
    }
  }
}

// Self-service actions are coerced to the sender — a client can never act as
// another diver.
function enforceSelf(action: EngineAction, playerId: string): EngineAction {
  if (action.type === 'SET_PACTS' || action.type === 'PICK_REWARD' || action.type === 'SET_NAME') {
    return { ...action, playerId }
  }
  return action
}

export async function processAction(
  kv: RoomKV,
  peers: PeerDirectory,
  peer: PeerLike,
  payload: { action?: unknown },
): Promise<void> {
  const roomCode = peer.context.roomCode
  const playerId = peer.context.playerId
  if (!roomCode || !playerId || isLobbyRoom(roomCode)) {
    sendError(peer, 'not-in-room', 'Join a dive before acting')
    return
  }
  const room = await loadRoom(kv, roomCode)
  if (!room) {
    sendError(peer, 'room-not-found', 'Dive not found')
    return
  }
  const action = payload.action as EngineAction | undefined
  if (!action || typeof action.type !== 'string') {
    sendError(peer, 'bad-action', 'Unknown action')
    return
  }
  if (!room.state.divers.some(diver => diver.id === playerId)) {
    sendError(peer, 'not-in-room', 'You are not in this dive')
    return
  }
  if (isHostOnlyAction(action.type) && room.state.hostId !== playerId) {
    sendError(peer, 'not-host', 'Only the host can do that')
    return
  }

  const wasOpen = room.state.openToLobby
  const enforced = enforceSelf(action, playerId)
  const next = reduce(room.state, enforced)
  if (next === room.state) {
    return
  }

  room.state = next
  await saveRoom(kv, room)
  broadcastState(peers, roomCode, room.state, enforced)
  if (wasOpen || room.state.openToLobby) {
    await broadcastLobby(kv, peers)
  }
}

export async function processClose(kv: RoomKV, peers: PeerDirectory, peer: PeerLike): Promise<void> {
  const roomCode = peer.context.roomCode
  const playerId = peer.context.playerId
  peers.remove(peer)
  if (!roomCode || !playerId || isLobbyRoom(roomCode)) {
    return
  }
  const room = await loadRoom(kv, roomCode)
  if (!room) {
    return
  }

  // Host connection dropped: transfer to the earliest joiner still seated
  // (AGENTS.md: host migration). The diver stays seated for reconnect.
  if (room.state.hostId === playerId && room.state.divers.length > 1) {
    const earliest = room.state.divers.find(diver => diver.id !== playerId)
    if (earliest) {
      const action: EngineAction = { type: 'TRANSFER_HOST', playerId: earliest.id }
      room.state = reduce(room.state, action)
      await saveRoom(kv, room)
      broadcastState(peers, roomCode, room.state, action)
      if (room.state.openToLobby) {
        await broadcastLobby(kv, peers)
      }
    }
  }
}
