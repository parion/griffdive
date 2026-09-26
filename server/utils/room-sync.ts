import { customAlphabet, nanoid } from 'nanoid'
import { SQUAD_SIZE_MAX, MAX_NAME_LENGTH } from '~~/shared/engine/config'
import { createLobbyState, joinDiver, seatingBlocked } from '~~/shared/engine/room'
import { reduce } from '~~/shared/engine/reducer'
import type { DiveState, EngineAction } from '~~/shared/engine/types'
import { isEngineActionType, isHostOnlyAction } from '~~/shared/types/messages'
import type { DiveSaveInfo, ServerMessage } from '~~/shared/types/messages'
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isRoomCode } from '~~/shared/utils/room-code'
import { roomMetrics } from './metrics'
import type { RateLimiter } from './rate-limit'

const newRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH)
const newPlayerId = () => nanoid(12)

// Rooms idle in storage this long before they are pruned on access.
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000

// A backstop against unbounded room growth on the single 256 MB machine, in
// case rate-limited creation is still sustained. The sweeper below reaps
// expired rooms so the ceiling rarely matters in normal play.
export const MAX_ROOMS = 2000

// Saved dives are exempt from the idle TTL, so they need their own ceiling:
// saving past it unpins the oldest save (which then ages out normally). The cap
// is what bounds storage cost, not the save itself.
export const MAX_SAVED_DIVES = 500

export const SAVE_NAME_MAX_LENGTH = 60

export class RoomLimitError extends Error {}

// Optional transport-level throttles, injected by the WS route so the sync
// core stays unit-testable. Keyed by address for joins (brute-force guard) and
// by player id for actions (flood guard).
export interface RoomLimits {
  hello?: RateLimiter
  action?: RateLimiter
}

export interface StoredRoom {
  code: string
  state: DiveState
  updatedAt: number
  // Set when any seated diver pins the dive: the room skips the idle TTL until
  // unpinned. Null/absent means an ordinary transient room.
  saved?: DiveSaveInfo | null
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
  remoteAddress?: string
  send(text: string): void
}

// Live connections are process memory; room state lives in storage. crossws
// topics are global to the process, so routing goes through this directory
// instead of pub/sub.
export interface PeerDirectory {
  add(roomCode: string, peer: PeerLike): void
  remove(peer: PeerLike): void
  list(roomCode: string): PeerLike[]
  rooms(): string[]
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
    rooms() {
      return [...byRoom.keys()]
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
    && (room.saved == null
      || (typeof room.saved === 'object' && typeof room.saved.savedAt === 'number'))
}

export async function createRoom(kv: RoomKV, maxRooms: number = MAX_ROOMS): Promise<string> {
  if ((await kv.getKeys()).length >= maxRooms) {
    throw new RoomLimitError('Room capacity reached')
  }
  let code = newRoomCode()
  while (await kv.getItem(code) != null) {
    code = newRoomCode()
  }
  await kv.setItem(code, { code, state: createLobbyState(), updatedAt: Date.now() } satisfies StoredRoom)
  return code
}

// Reap idle rooms in the background so they do not sit in memory until the
// next access (loadRoom only prunes the room it is asked for).
export async function sweepRooms(kv: RoomKV, now: number = Date.now()): Promise<number> {
  let removed = 0
  for (const code of await kv.getKeys()) {
    const raw = await kv.getItem(code)
    // Saved dives are pinned: the squad is coming back, however long that takes.
    if (isStoredRoom(raw) && !raw.saved && now - raw.updatedAt > ROOM_TTL_MS) {
      await kv.removeItem(code)
      removed += 1
    }
  }
  return removed
}

export async function loadRoom(kv: RoomKV, code: string): Promise<StoredRoom | null> {
  const raw = await kv.getItem(code)
  if (!isStoredRoom(raw)) {
    return null
  }
  if (!raw.saved && Date.now() - raw.updatedAt > ROOM_TTL_MS) {
    await kv.removeItem(code)
    return null
  }
  return raw
}

async function saveRoom(kv: RoomKV, room: StoredRoom): Promise<void> {
  room.updatedAt = Date.now()
  await kv.setItem(room.code, room)
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
  saved: DiveSaveInfo | null,
  except?: PeerLike,
): void {
  const message = JSON.stringify({
    type: 'state',
    snapshot: state,
    applied,
    online: onlineIds(peers, roomCode, state),
    saved,
  } satisfies ServerMessage)
  for (const peer of peers.list(roomCode)) {
    if (peer !== except) {
      peer.send(message)
    }
  }
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') {
    return 'Diver'
  }
  return name.trim().slice(0, MAX_NAME_LENGTH) || 'Diver'
}

function sanitizeSaveName(name: unknown): string | null {
  if (typeof name !== 'string') {
    return null
  }
  return name.trim().slice(0, SAVE_NAME_MAX_LENGTH) || null
}

function defaultSaveName(room: StoredRoom): string {
  const count = room.state.divers.length
  return `${count}-diver crusade`
}

// Keep the pinned set bounded without ever touching the save that was just
// written: the oldest other saves lose their pin and age out under the normal
// TTL. Iterating every room is a coarse scan, but saves are rare and the room
// ceiling is small.
export async function enforceSaveCap(kv: RoomKV, keepCode: string, cap: number = MAX_SAVED_DIVES): Promise<void> {
  const saved: { code: string, savedAt: number }[] = []
  for (const code of await kv.getKeys()) {
    const raw = await kv.getItem(code)
    if (isStoredRoom(raw) && raw.saved) {
      saved.push({ code, savedAt: raw.saved.savedAt })
    }
  }
  const overflow = saved.length - cap
  if (overflow <= 0) {
    return
  }
  const evictable = saved
    .filter(entry => entry.code !== keepCode)
    .sort((a, b) => a.savedAt - b.savedAt)
    .slice(0, overflow)
  for (const entry of evictable) {
    const raw = await kv.getItem(entry.code)
    if (isStoredRoom(raw)) {
      raw.saved = null
      await kv.setItem(entry.code, raw)
    }
  }
}

export async function processHello(
  kv: RoomKV,
  peers: PeerDirectory,
  peer: PeerLike,
  payload: { name?: unknown, playerId?: unknown },
  limits?: RoomLimits,
): Promise<void> {
  const requested = peer.context.roomCode ?? ''
  if (!requested) {
    sendError(peer, 'bad-room', 'Missing room code')
    return
  }

  if (!isRoomCode(requested)) {
    sendError(peer, 'bad-room', 'Invalid room code')
    return
  }

  // Throttle joins before any storage work: this is the room-code brute-force
  // guard as much as a connection-flood guard.
  if (limits?.hello && !limits.hello.take(peer.remoteAddress ?? 'unknown')) {
    sendError(peer, 'rate-limited', 'Too many join attempts — try again shortly')
    return
  }

  const room = await loadRoom(kv, requested)
  if (!room) {
    sendError(peer, 'room-not-found', `No dive found for code ${requested}`)
    return
  }

  const storedId = typeof payload.playerId === 'string' ? payload.playerId : null
  const known = storedId ? room.state.divers.find(diver => diver.id === storedId) : undefined
  // A stored id whose seat is gone but whose inventory sits in legacyCaches is
  // the same diver rejoining: reuse the id so joinDiver reclaims the cache.
  const reclaiming = !!storedId && !known && !!room.state.legacyCaches[storedId]
  let playerId: string
  let changed = false

  if (known) {
    playerId = known.id
  }
  else {
    const blocked = seatingBlocked(room.state)
    if (blocked) {
      sendError(peer, room.state.divers.length >= SQUAD_SIZE_MAX ? 'room-full' : 'dive-locked', blocked)
      return
    }
    playerId = reclaiming ? storedId! : newPlayerId()
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
    saved: room.saved ?? null,
  } satisfies ServerMessage))

  if (changed) {
    broadcastState(peers, requested, room.state, null, room.saved ?? null, peer)
  }
}

// Self-service actions are coerced to the sender — a client can never act as
// another diver.
function enforceSelf(action: EngineAction, playerId: string): EngineAction {
  if (
    action.type === 'SET_PACTS'
    || action.type === 'SET_WARBONDS'
    || action.type === 'PICK_REWARD'
    || action.type === 'SET_NAME'
    || action.type === 'CLAIM_CATCHUP_OPTION'
    || action.type === 'CLAIM_CACHE'
    || action.type === 'REROLL_REWARDS'
    || action.type === 'BAN_REWARDS'
    || action.type === 'LEAVE_DIVE'
  ) {
    return { ...action, playerId }
  }
  return action
}

export async function processAction(
  kv: RoomKV,
  peers: PeerDirectory,
  peer: PeerLike,
  payload: { action?: unknown },
  limits?: RoomLimits,
): Promise<void> {
  const roomCode = peer.context.roomCode
  const playerId = peer.context.playerId
  if (!roomCode || !playerId) {
    sendError(peer, 'not-in-room', 'Join a dive before acting')
    return
  }
  // Drop action floods silently: every rejected action that answered with an
  // error would be its own amplification. 120 per 10s is far above any human.
  if (limits?.action && !limits.action.take(playerId)) {
    return
  }
  const room = await loadRoom(kv, roomCode)
  if (!room) {
    sendError(peer, 'room-not-found', 'Dive not found')
    return
  }
  const action = payload.action as EngineAction | undefined
  // Whitelist the union: an unknown type has no reducer case and would return
  // undefined, which used to be persisted and then crash the broadcast.
  if (!action || typeof action.type !== 'string' || !isEngineActionType(action.type)) {
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
  // FAIL_PACT is neither host-only nor self-service: the diver owns their
  // pact, but the host referees the squad — so sender = target or host.
  if (action.type === 'FAIL_PACT' && action.playerId !== playerId && room.state.hostId !== playerId) {
    sendError(peer, 'bad-action', 'Only the diver or the host can mark a pact failed')
    return
  }

  const enforced = enforceSelf(action, playerId)
  let next: DiveState
  try {
    next = reduce(room.state, enforced)
  }
  catch {
    // A malformed field (missing settings, a non-array pact list) must never
    // reach storage: it would be persisted and rebroadcast to the whole room.
    sendError(peer, 'bad-action', 'Malformed action')
    return
  }
  if (next === room.state) {
    return
  }

  room.state = next
  await saveRoom(kv, room)
  if (enforced.type === 'START_DIVE') {
    roomMetrics.recordDiveStarted()
  }
  broadcastState(peers, roomCode, room.state, enforced, room.saved ?? null)
}

// Saving pins the shared room any seated diver is looking at; it is a
// persistence hint, not a game rule, so it never touches the reducer. The name
// is cosmetic and only set at creation, then carried until the host unpins.
export async function processSave(
  kv: RoomKV,
  peers: PeerDirectory,
  peer: PeerLike,
  payload: { name?: unknown },
  limits?: RoomLimits,
): Promise<void> {
  const roomCode = peer.context.roomCode
  const playerId = peer.context.playerId
  if (!roomCode || !playerId) {
    sendError(peer, 'not-in-room', 'Join a dive before saving')
    return
  }
  if (limits?.action && !limits.action.take(playerId)) {
    return
  }
  const room = await loadRoom(kv, roomCode)
  if (!room) {
    sendError(peer, 'room-not-found', 'Dive not found')
    return
  }
  if (!room.state.divers.some(diver => diver.id === playerId)) {
    sendError(peer, 'not-in-room', 'You are not in this dive')
    return
  }
  const name = sanitizeSaveName(payload.name) ?? room.saved?.name ?? defaultSaveName(room)
  room.saved = { name, savedAt: Date.now(), savedBy: playerId }
  await saveRoom(kv, room)
  await enforceSaveCap(kv, room.code)
  broadcastState(peers, roomCode, room.state, null, room.saved)
}

// Unpinning is host moderation (AGENTS.md authority rules): it returns the
// room to the ordinary idle TTL. Any diver may save, only the host may remove.
export async function processUnsave(
  kv: RoomKV,
  peers: PeerDirectory,
  peer: PeerLike,
  limits?: RoomLimits,
): Promise<void> {
  const roomCode = peer.context.roomCode
  const playerId = peer.context.playerId
  if (!roomCode || !playerId) {
    sendError(peer, 'not-in-room', 'Join a dive before acting')
    return
  }
  if (limits?.action && !limits.action.take(playerId)) {
    return
  }
  const room = await loadRoom(kv, roomCode)
  if (!room) {
    sendError(peer, 'room-not-found', 'Dive not found')
    return
  }
  if (!room.state.divers.some(diver => diver.id === playerId)) {
    sendError(peer, 'not-in-room', 'You are not in this dive')
    return
  }
  if (room.state.hostId !== playerId) {
    sendError(peer, 'not-host', 'Only the host can remove a save')
    return
  }
  if (!room.saved) {
    return
  }
  room.saved = null
  await saveRoom(kv, room)
  broadcastState(peers, roomCode, room.state, null, null)
}

export async function processClose(kv: RoomKV, peers: PeerDirectory, peer: PeerLike): Promise<void> {
  const roomCode = peer.context.roomCode
  const playerId = peer.context.playerId
  peers.remove(peer)
  if (!roomCode || !playerId) {
    return
  }
  const room = await loadRoom(kv, roomCode)
  if (!room) {
    return
  }

  // A diver can hold several live sockets (extra tabs, reconnect races): the
  // seat — and the host role with it — only leaves with the last one.
  const stillConnected = peers.list(roomCode).some(other => other.context.playerId === playerId)
  if (stillConnected || !room.state.divers.some(diver => diver.id === playerId)) {
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
      broadcastState(peers, roomCode, room.state, action, room.saved ?? null)
      return
    }
  }

  // Presence-only refresh: remaining peers must drop the departed diver from
  // their online list immediately, not at the next action.
  broadcastState(peers, roomCode, room.state, null, room.saved ?? null)
}
