import { createHmac, randomBytes } from 'node:crypto'
import { customAlphabet, nanoid } from 'nanoid'
import { SQUAD_SIZE_MAX, MAX_NAME_LENGTH } from '~~/shared/engine/config'
import { createLobbyState, forkCrusade, joinDiver, seatingBlocked } from '~~/shared/engine/room'
import { reduce } from '~~/shared/engine/reducer'
import { normalizeSaveDoc } from '~~/shared/engine/saves'
import type { DiveState, DivePhase, EngineAction } from '~~/shared/engine/types'
import { isEngineActionType, isHostOnlyAction } from '~~/shared/types/messages'
import type { DiveSaveInfo, ServerMessage, SteamLobbyInfo } from '~~/shared/types/messages'
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isRoomCode } from '~~/shared/utils/room-code'
import { normalizeSteamLobbyLink } from '~~/shared/utils/steam-lobby'
import { roomMetrics } from './metrics'
import { isPeerSilent, PEER_SILENCE_MS } from './peer-presence'
import type { RateLimiter } from './rate-limit'

const newRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH)
const newPlayerId = () => nanoid(12)

// Rooms idle in storage this long before they are pruned on access.
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000

// A launched crusade takes weeks of evenings, so its room waits far longer than
// an unlaunched lobby — a squad that steps away resumes exactly where it was.
// Personal session saves cover anything older (AGENTS.md: Personal session saves).
export const CRUSADE_TTL_MS = 30 * 24 * 60 * 60 * 1000

// How long a dropped diver keeps gating the squad before they are marked away:
// long enough to ride out a reconnect or a page refresh.
export const AWAY_GRACE_MS = 30 * 1000

function roomExpired(room: StoredRoom, now: number): boolean {
  if (room.saved) {
    return false
  }
  const ttl = room.state.phase === 'lobby' ? ROOM_TTL_MS : CRUSADE_TTL_MS
  return now - room.updatedAt > ttl
}

// The active span, not the idle tail: `updatedAt` is the last event, so a room
// that sat untouched until its TTL does not inflate the session-length metric.
// Rooms written before `createdAt` existed are skipped rather than counted as
// zero-length sessions.
function recordSessionEnded(room: StoredRoom): void {
  const createdAt = room.createdAt
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
    return
  }
  const seconds = Math.max(0, (room.updatedAt - createdAt) / 1000)
  roomMetrics.recordSessionEnded(room.state.phase === 'lobby' ? 'lobby' : 'crusade', seconds)
}

// A backstop against unbounded room growth on the single 256 MB machine, in
// case rate-limited creation is still sustained. The sweeper below reaps
// expired rooms so the ceiling rarely matters in normal play.
export const MAX_ROOMS = 2000

// Saved dives are exempt from the idle TTL, so they need their own ceiling:
// saving past it unpins the oldest save (which then ages out normally). The cap
// is what bounds storage cost, not the save itself.
export const MAX_SAVED_DIVES = 500

export const SAVE_NAME_MAX_LENGTH = 60

// A kick bars the removed seat for the rest of the dive. Only a host can add a
// bar, and a crusade's churn is tiny; the cap is just a bound on room size.
export const MAX_ROOM_BANS = 100

// A host kick removes the seat from the engine and bars it from reseating in
// this room: the diver id blocks the same browser, the keyed address hash
// blocks a browser that cleared its storage. The raw address is never stored.
export interface RoomBan {
  playerId: string
  ip: string | null
  at: number
}

export class RoomLimitError extends Error {}

export class InvalidSaveError extends Error {}

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
  // When the room opened. Used only for the aggregate session-length metric;
  // absent on rooms written before the field existed.
  createdAt?: number
  updatedAt: number
  // Set when any seated diver pins the dive: the room skips the idle TTL until
  // unpinned. Null/absent means an ordinary transient room.
  saved?: DiveSaveInfo | null
  // The host-pasted Steam lobby deep link, relayed to every seated diver.
  // Cosmetic room metadata — never touches DiveState or the idle TTL.
  steam?: SteamLobbyInfo | null
  // Keyed address fingerprints for the seated divers, so a kick can bar the
  // network a diver arrived from. Salted per room: hashes never correlate
  // across dives, and the raw address never reaches storage.
  ipSalt?: string
  seatIps?: Record<string, string>
  // Seats the host removed. A hello presenting one of these ids, or arriving
  // from one of these networks while taking a fresh seat, is refused.
  bans?: RoomBan[]
}

// One room's scrape-time shape for the metrics census: no state, no payloads.
export interface RoomCensusEntry {
  code: string
  phase: DivePhase
  difficulty: number
  saved: boolean
}

// Storage abstraction so the sync core stays unit-testable without Nitro.
export interface RoomKV {
  getItem(code: string): Promise<unknown>
  setItem(code: string, value: StoredRoom): Promise<void>
  removeItem(code: string): Promise<void>
  getKeys(): Promise<string[]>
}

export interface PeerContext {
  roomCode?: string
  playerId?: string
  clientIp?: string
  // Set the moment the socket is gone. A hello can still be queued on the room
  // lock when that happens; without this flag it would seat a diver nobody can
  // reach and leave an unremovable peer in the directory.
  closed?: boolean
  // Last inbound frame. The client heartbeats every 25s, so silence past
  // PEER_SILENCE_MS means the connection is gone even without a close event.
  lastSeenAt?: number
}

export interface PeerLike {
  id: string
  context: PeerContext
  remoteAddress?: string
  send(text: string): void
  // The transport's own close, so reaping a silent peer goes through the normal
  // close path (crossws peers have it; test doubles may not).
  close?(code?: number, reason?: string): void
}

// Live connections are process memory; room state lives in storage. crossws
// topics are global to the process, so routing goes through this directory
// instead of pub/sub.
export interface PeerDirectory {
  // Set once the process is shutting down (see drainPeers).
  draining: boolean
  add(roomCode: string, peer: PeerLike): void
  remove(peer: PeerLike): void
  list(roomCode: string): PeerLike[]
  rooms(): string[]
  all(): PeerLike[]
}

export function createPeerDirectory(): PeerDirectory {
  const byRoom = new Map<string, Set<PeerLike>>()
  return {
    draining: false,
    add(roomCode, peer) {
      let set = byRoom.get(roomCode)
      if (!set) {
        set = new Set()
        byRoom.set(roomCode, set)
      }
      set.add(peer)
    },
    remove(peer) {
      // Drop the room key with its last peer: the directory outlives every room
      // the process has served, and an empty set would keep a dead code alive.
      for (const [roomCode, set] of byRoom) {
        set.delete(peer)
        if (set.size === 0) {
          byRoom.delete(roomCode)
        }
      }
    },
    list(roomCode) {
      return [...(byRoom.get(roomCode) ?? [])]
    },
    rooms() {
      return [...byRoom.keys()]
    },
    all() {
      const unique = new Set<PeerLike>()
      for (const set of byRoom.values()) {
        for (const peer of set) {
          unique.add(peer)
        }
      }
      return [...unique]
    },
  }
}

// Storage is read-modify-write: each handler loads its own parsed copy, mutates
// it and writes it back. The process is single-threaded but `await` lets two
// handlers on one room interleave, so without this the second write clobbers
// the first (a joiner's SET_WARBONDS overwriting the host's START_DIVE). The
// memory driver hid this because every handler shared one object; a real
// storage driver does not. This per-room promise chain serializes mutations.
// Single machine only — horizontal scale needs a distributed lock (Redis).
const roomLocks = new Map<string, Promise<void>>()

function withRoomLock<T>(roomCode: string, task: () => Promise<T>): Promise<T> {
  const prior = roomLocks.get(roomCode) ?? Promise.resolve()
  const result = prior.then(task, task)
  const tail = result.then(() => undefined, () => undefined)
  roomLocks.set(roomCode, tail)
  void tail.then(() => {
    if (roomLocks.get(roomCode) === tail) {
      roomLocks.delete(roomCode)
    }
  })
  return result
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
    && (room.createdAt == null || Number.isFinite(room.createdAt))
    && (room.saved == null
      || (typeof room.saved === 'object' && typeof room.saved.savedAt === 'number'))
    && (room.steam == null
      || (typeof room.steam === 'object' && typeof room.steam.link === 'string'))
}

function isRoomBan(raw: unknown): raw is RoomBan {
  if (!raw || typeof raw !== 'object') {
    return false
  }
  const ban = raw as Partial<RoomBan>
  return typeof ban.playerId === 'string'
    && ban.playerId.length > 0
    && (ban.ip === null || typeof ban.ip === 'string')
    && typeof ban.at === 'number'
}

function roomBansOf(room: StoredRoom): RoomBan[] {
  return Array.isArray(room.bans)
    ? room.bans.filter(isRoomBan).slice(-MAX_ROOM_BANS)
    : []
}

function seatIpsOf(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

function clientAddress(peer: PeerLike): string | null {
  return peer.context.clientIp ?? peer.remoteAddress ?? null
}

function addressFingerprint(salt: string, address: string): string {
  return createHmac('sha256', salt).update(address).digest('base64url')
}

// Checks never mint a salt: without one the room has no address bars yet.
function existingFingerprint(room: StoredRoom, peer: PeerLike): string | null {
  const address = clientAddress(peer)
  return room.ipSalt && address ? addressFingerprint(room.ipSalt, address) : null
}

// Minting is for seating: the salt persists with the room so a kick later
// still matches the address the diver arrived from.
function recordFingerprint(room: StoredRoom, peer: PeerLike): string | null {
  const address = clientAddress(peer)
  if (!address) {
    return null
  }
  room.ipSalt ??= randomBytes(16).toString('base64url')
  return addressFingerprint(room.ipSalt, address)
}

function seatBanReason(
  room: StoredRoom,
  presentedIds: (string | null)[],
  fingerprint: string | null,
): 'id' | 'ip' | null {
  const presented = new Set(presentedIds.filter((id): id is string => !!id))
  for (const ban of roomBansOf(room)) {
    if (presented.has(ban.playerId)) {
      return 'id'
    }
    if (fingerprint && ban.ip === fingerprint) {
      return 'ip'
    }
  }
  return null
}

export async function createRoom(
  kv: RoomKV,
  maxRooms: number = MAX_ROOMS,
  seed?: DiveState,
): Promise<string> {
  if ((await kv.getKeys()).length >= maxRooms) {
    throw new RoomLimitError('Room capacity reached')
  }
  let code = newRoomCode()
  while (await kv.getItem(code) != null) {
    code = newRoomCode()
  }
  const state = seed ?? createLobbyState()
  const now = Date.now()
  await kv.setItem(code, { code, state, createdAt: now, updatedAt: now } satisfies StoredRoom)
  // Seed the dwell clock at creation so lobby time is measured from here, not
  // from the first state change.
  roomMetrics.trackRoom(code, state.phase)
  return code
}

// Continues a personal session save as a brand-new room: normalizeSaveDoc
// refuses saves from another epoch or schema, forkCrusade seats the saver as host and parks every
// other diver's kit as a claimable legacy cache. The save is client-supplied,
// so a malformed doc is refused rather than seated.
export async function createRoomFromSave(
  kv: RoomKV,
  rawSave: unknown,
  name: string,
  maxRooms: number = MAX_ROOMS,
): Promise<{ code: string, selfId: string | null }> {
  const doc = normalizeSaveDoc(rawSave)
  if (!doc) {
    throw new InvalidSaveError('Not a valid Griffdive save')
  }
  const ownerId = (rawSave as { ownerId?: unknown }).ownerId
  const forked = forkCrusade(doc.state, typeof ownerId === 'string' ? ownerId : null, name)
  if (!forked) {
    throw new InvalidSaveError('This crusade cannot be continued')
  }
  return { code: await createRoom(kv, maxRooms, forked), selfId: forked.hostId }
}

// Reap idle rooms in the background so they do not sit in memory until the
// next access (loadRoom only prunes the room it is asked for).
export async function sweepRooms(kv: RoomKV, now: number = Date.now()): Promise<number> {
  let removed = 0
  for (const code of await kv.getKeys()) {
    const raw = await kv.getItem(code)
    // Saved dives are pinned: the squad is coming back, however long that takes.
    if (isStoredRoom(raw) && roomExpired(raw, now)) {
      await kv.removeItem(code)
      recordSessionEnded(raw)
      removed += 1
    }
  }
  roomMetrics.recordRoomsSwept(removed)
  return removed
}

// The scrape-time census: what every stored room looks like right now, without
// the state payloads. Read-only, no TTL pruning — the sweeper owns that.
export async function censusRooms(kv: RoomKV): Promise<RoomCensusEntry[]> {
  const entries: RoomCensusEntry[] = []
  for (const code of await kv.getKeys()) {
    const raw = await kv.getItem(code)
    if (isStoredRoom(raw)) {
      entries.push({
        code,
        phase: raw.state.phase,
        difficulty: raw.state.difficulty,
        saved: !!raw.saved,
      })
    }
  }
  return entries
}

export async function loadRoom(kv: RoomKV, code: string): Promise<StoredRoom | null> {
  const raw = await kv.getItem(code)
  if (!isStoredRoom(raw)) {
    return null
  }
  if (roomExpired(raw, Date.now())) {
    await kv.removeItem(code)
    recordSessionEnded(raw)
    return null
  }
  raw.bans = roomBansOf(raw)
  raw.seatIps = seatIpsOf(raw.seatIps)
  if (typeof raw.ipSalt !== 'string' || raw.ipSalt.length === 0) {
    raw.ipSalt = undefined
  }
  return raw
}

async function saveRoom(kv: RoomKV, room: StoredRoom): Promise<void> {
  room.updatedAt = Date.now()
  await kv.setItem(room.code, room)
  // Every state write passes through here, so this is the one place that sees
  // each phase transition exactly once (pins and Steam links keep the phase).
  roomMetrics.observePhaseTransition(room.code, room.state.phase)
}

function sendError(peer: PeerLike, code: string, message: string): void {
  peer.send(JSON.stringify({ type: 'error', code, message } satisfies ServerMessage))
}

export function onlineDiverIds(peers: PeerDirectory, roomCode: string, state: DiveState): string[] {
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
  steam: SteamLobbyInfo | null,
  except?: PeerLike,
): void {
  const message = JSON.stringify({
    type: 'state',
    snapshot: state,
    applied,
    online: onlineDiverIds(peers, roomCode, state),
    saved,
    steam,
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
    // Lock the target so unpinning never clobbers a concurrent action's write.
    await withRoomLock(entry.code, async () => {
      const raw = await kv.getItem(entry.code)
      if (isStoredRoom(raw) && raw.saved) {
        raw.saved = null
        await kv.setItem(entry.code, raw)
      }
    })
  }
}

const MAX_KNOWN_IDS = 20

function knownIdsOf(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64)
    .slice(0, MAX_KNOWN_IDS)
}

// The warbonds a joiner declared on arrival, so the SEAF pack they are dealt at
// seating rolls against what they actually own. Absent or malformed means the
// seated default.
function warbondCodesOf(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }
  return raw.filter((code): code is string => typeof code === 'string' && code.length <= 32).slice(0, 100)
}

export async function processHello(
  kv: RoomKV,
  peers: PeerDirectory,
  peer: PeerLike,
  payload: { name?: unknown, playerId?: unknown, knownIds?: unknown, warbondCodes?: unknown },
  limits?: RoomLimits,
): Promise<void> {
  const requested = peer.context.roomCode ?? ''
  if (!requested) {
    roomMetrics.recordHello('bad_code')
    sendError(peer, 'bad-room', 'Missing room code')
    return
  }

  if (!isRoomCode(requested)) {
    roomMetrics.recordHello('bad_code')
    sendError(peer, 'bad-room', 'Invalid room code')
    return
  }

  // Throttle joins before any storage work: this is the room-code brute-force
  // guard as much as a connection-flood guard.
  if (limits?.hello && !limits.hello.take(peer.context.clientIp ?? peer.remoteAddress ?? 'unknown')) {
    roomMetrics.recordHello('rate_limited')
    sendError(peer, 'rate-limited', 'Too many join attempts — try again shortly')
    return
  }

  await withRoomLock(requested, async () => {
    const room = await loadRoom(kv, requested)
    if (!room) {
      roomMetrics.recordHello('room_not_found')
      sendError(peer, 'room-not-found', `No dive found for code ${requested}`)
      return
    }

    // A socket that closed while this hello waited on the lock must not seat
    // anyone: processClose already ran (and bailed, because no seat was
    // assigned yet), so seating here would leave a peer nobody can reach —
    // counted online forever, never marked away, never migrated.
    if (peer.context.closed) {
      return
    }

    const storedId = typeof payload.playerId === 'string' ? payload.playerId : null
    const knownIds = knownIdsOf(payload.knownIds)
    const known = storedId ? room.state.divers.find(diver => diver.id === storedId) : undefined
    // A kick is a bar for the rest of the dive. Known seats are the reconnect
    // path and may share a network with a removed seat (a household), so only
    // fresh seating — including a cache reclaim — is checked.
    if (!known) {
      const reason = seatBanReason(room, [storedId, ...knownIds], existingFingerprint(room, peer))
      if (reason) {
        roomMetrics.recordHello('removed')
        sendError(peer, 'kicked', reason === 'ip'
          ? 'A diver on this network was removed from this dive by the host.'
          : 'You were removed from this dive by the host.')
        return
      }
    }
    const hostOnline = isOnline(peers, requested, room.state.hostId)
    // A stored id whose seat is gone but whose gear sits in legacyCaches is the
    // same diver rejoining: reuse the id so joinDiver reclaims the cache. A
    // forked session keys its caches by the source room's ids, so the browser
    // also offers every seat it remembers from other rooms.
    const reclaimId = known
      ? null
      : [storedId, ...knownIds].find(id => !!id && !!room.state.legacyCaches[id]) ?? null
    const reclaiming = reclaimId !== null
    let playerId: string
    let changed = false

    if (known) {
      playerId = known.id
      if (known.away) {
        room.state = reduce(room.state, { type: 'SET_AWAY', playerId, away: false })
        changed = true
      }
    }
    else {
      const blocked = seatingBlocked(room.state)
      if (blocked) {
        roomMetrics.recordHello(room.state.divers.length >= SQUAD_SIZE_MAX ? 'full' : 'locked')
        sendError(peer, room.state.divers.length >= SQUAD_SIZE_MAX ? 'room-full' : 'dive-locked', blocked)
        return
      }
      playerId = reclaimId ?? newPlayerId()
      const joined = joinDiver(room.state, playerId, sanitizeName(payload.name), warbondCodesOf(payload.warbondCodes))
      if (!joined) {
        roomMetrics.recordHello('full')
        sendError(peer, 'room-full', 'Dive squad is full')
        return
      }
      const seated = joined.divers.find(diver => diver.id === playerId)
      room.state = joined
      changed = true
      roomMetrics.recordJoin(reclaiming ? 'reclaim' : seated && seated.catchUpGranted > 0 ? 'mid_crusade' : 'new')
    }

    // Arrival bookkeeping: the hello's kind, and how long the room had been
    // quiet. The gap reads updatedAt before any write below moves it.
    if (!known) {
      const gapMs = Math.max(0, Date.now() - room.updatedAt)
      if (reclaiming) {
        roomMetrics.recordHello('reclaim')
        roomMetrics.recordRejoin(gapMs)
      }
      else {
        roomMetrics.recordHello('new')
      }
    }
    else {
      roomMetrics.recordHello('rejoin')
      roomMetrics.recordRejoin(Math.max(0, Date.now() - room.updatedAt))
      if (known.away) {
        roomMetrics.recordPresence('returned')
      }
    }

    // Whoever comes back to a room whose host is gone takes the helm — a
    // crusade never waits on one particular diver. A host who is merely
    // offline (a server restart dropped everyone at once) keeps the crown for
    // the away grace; markAwayIfOffline hands it on if they don't return.
    const host = room.state.divers.find(diver => diver.id === room.state.hostId)
    if (room.state.hostId !== playerId && !hostOnline && (!host || host.away)) {
      room.state = reduce(room.state, { type: 'TRANSFER_HOST', playerId })
      roomMetrics.recordHostTransfer('offline_host')
      changed = true
    }

    peer.context.roomCode = requested
    peer.context.playerId = playerId
    peers.add(requested, peer)

    // Keep a keyed fingerprint of the seat's network for a later kick, and
    // drop fingerprints whose seats have gone. This is metadata, never state.
    const fingerprint = recordFingerprint(room, peer)
    const seated = new Set(room.state.divers.map(diver => diver.id))
    const seatIps = Object.fromEntries(
      Object.entries(room.seatIps ?? {}).filter(([id]) => seated.has(id)),
    )
    let seatsChanged = Object.keys(seatIps).length !== Object.keys(room.seatIps ?? {}).length
    if (fingerprint && seatIps[playerId] !== fingerprint) {
      seatIps[playerId] = fingerprint
      seatsChanged = true
    }
    if (seatsChanged) {
      room.seatIps = seatIps
      changed = true
    }

    // Divers who dropped while the server was down never sent a close: give
    // them the same grace, then stop waiting on them.
    for (const diver of room.state.divers) {
      if (!diver.away && !isOnline(peers, requested, diver.id)) {
        scheduleAway(kv, peers, requested, diver.id)
      }
    }

    if (changed) {
      await saveRoom(kv, room)
    }
    peer.send(JSON.stringify({
      type: 'welcome',
      selfId: playerId,
      hostId: room.state.hostId,
      roomCode: requested,
      snapshot: room.state,
      online: onlineDiverIds(peers, requested, room.state),
      saved: room.saved ?? null,
      steam: room.steam ?? null,
    } satisfies ServerMessage))

    if (changed) {
      broadcastState(peers, requested, room.state, null, room.saved ?? null, room.steam ?? null, peer)
    }
  })
}

// Self-service actions are coerced to the sender — a client can never act as
// another diver.
function enforceSelf(action: EngineAction, playerId: string): EngineAction {
  if (
    action.type === 'SET_PACTS'
    || action.type === 'SET_WARBONDS'
    || action.type === 'PICK_REWARD'
    || action.type === 'FORFEIT_ITEM'
    || action.type === 'BUY_ITEM'
    || action.type === 'SET_NAME'
    || action.type === 'CLAIM_CATCHUP_OPTION'
    || action.type === 'CLAIM_CACHE'
    || action.type === 'REROLL_REWARDS'
    || action.type === 'BAN_REWARDS'
    || action.type === 'LEAVE_DIVE'
    || action.type === 'SET_AWAY'
  ) {
    return { ...action, playerId }
  }
  return action
}

// Old rooms (and a kick landing before the seat's next hello) have no stored
// fingerprint; the removed diver's live socket still knows the address.
function liveFingerprint(
  room: StoredRoom,
  peers: PeerDirectory,
  roomCode: string,
  playerId: string,
): string | null {
  for (const peer of peers.list(roomCode)) {
    if (peer.context.playerId === playerId) {
      const fingerprint = recordFingerprint(room, peer)
      if (fingerprint) {
        return fingerprint
      }
    }
  }
  return null
}

// A kick leaves a bar behind; a voluntary leave does not. The removed seat's
// keyed address fingerprint moves into the bar so clearing site data does not
// buy a way back in from the same network.
function updateSeatPolicy(
  room: StoredRoom,
  peers: PeerDirectory,
  roomCode: string,
  action: EngineAction,
  before: DiveState,
): void {
  if (action.type !== 'KICK_DIVER' && action.type !== 'LEAVE_DIVE') {
    return
  }
  if (action.type === 'KICK_DIVER') {
    const removed = before.divers.find(diver => diver.id === action.playerId)
    if (!removed) {
      return
    }
    const fingerprint = room.seatIps?.[removed.id]
      ?? liveFingerprint(room, peers, roomCode, removed.id)
    const bans = roomBansOf(room)
    if (!bans.some(ban => ban.playerId === removed.id)) {
      room.bans = [...bans, { playerId: removed.id, ip: fingerprint ?? null, at: Date.now() }]
        .slice(-MAX_ROOM_BANS)
    }
  }
  if (room.seatIps && action.playerId in room.seatIps) {
    room.seatIps = Object.fromEntries(
      Object.entries(room.seatIps).filter(([id]) => id !== action.playerId),
    )
  }
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
  await withRoomLock(roomCode, async () => {
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
    // FAIL_PACT and HOLD_PACT are neither host-only nor self-service: the diver
    // owns their pact, but the host referees the squad — so sender = target or host.
    if (
      (action.type === 'FAIL_PACT' || action.type === 'HOLD_PACT')
      && action.playerId !== playerId
      && room.state.hostId !== playerId
    ) {
      sendError(peer, 'bad-action', 'Only the diver or the host can settle a pact')
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
      // The one refusal with a player-facing cause: a directive the squad is
      // not allowed to accept because it would strand someone below HD2's four
      // stratagems. The reducer refuses silently, so the count lives here.
      const deciding = room.state.phase === 'decision'
      const switching = (room.state.phase === 'strain' || room.state.phase === 'deal' || room.state.phase === 'pacts')
        && !room.state.divers.some(diver => diver.pactsLocked)
      if (
        enforced.type === 'ACCEPT_MISFORTUNE'
        && enforced.accepted
        && (deciding || switching)
        && !room.state.misfortuneAccepted
        && room.state.wheel
      ) {
        roomMetrics.recordDirectiveRefused(room.state.wheel.misfortuneId, room.state.difficulty)
      }
      return
    }

    const before = room.state
    room.state = next
    updateSeatPolicy(room, peers, roomCode, enforced, before)
    await saveRoom(kv, room)
    roomMetrics.recordAction(before, next, enforced)
    if (enforced.type === 'START_DIVE') {
      roomMetrics.recordDiveStarted()
    }
    broadcastState(peers, roomCode, room.state, enforced, room.saved ?? null, room.steam ?? null)
  })
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
  let pinned = false
  await withRoomLock(roomCode, async () => {
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
    broadcastState(peers, roomCode, room.state, null, room.saved, room.steam ?? null)
    pinned = true
  })
  // Outside the lock: the cap touches other rooms and must not nest locks.
  if (pinned) {
    await enforceSaveCap(kv, roomCode)
  }
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
  await withRoomLock(roomCode, async () => {
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
    broadcastState(peers, roomCode, room.state, null, null, room.steam ?? null)
  })
}

// The Steam lobby link is host-owned room metadata: the host relays the lobby
// they opened in-game so every seated diver can jump in. A blank link clears
// it. It never enters DiveState or the reducer — it is presentation, like a
// saved dive.
export async function processSetSteam(
  kv: RoomKV,
  peers: PeerDirectory,
  peer: PeerLike,
  payload: { link?: unknown },
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
  const raw = typeof payload.link === 'string' ? payload.link.trim() : ''
  // Blank clears; anything non-empty must be a valid Helldivers 2 lobby link.
  const link = raw ? normalizeSteamLobbyLink(raw) : null
  if (raw && !link) {
    sendError(peer, 'bad-action', 'That is not a Helldivers 2 Steam lobby link')
    return
  }
  await withRoomLock(roomCode, async () => {
    const room = await loadRoom(kv, roomCode)
    if (!room) {
      sendError(peer, 'room-not-found', 'Dive not found')
      return
    }
    if (room.state.hostId !== playerId) {
      sendError(peer, 'not-host', 'Only the host can set the Steam lobby')
      return
    }
    if (link) {
      room.steam = { link, setAt: Date.now(), setBy: playerId }
    }
    else {
      room.steam = null
    }
    await saveRoom(kv, room)
    broadcastState(peers, roomCode, room.state, null, room.saved ?? null, room.steam)
  })
}

export async function processClose(kv: RoomKV, peers: PeerDirectory, peer: PeerLike): Promise<void> {
  // Idempotent: the presence sweeper reaps silent peers through this path and
  // the transport's own close event may follow it.
  if (peer.context.closed) {
    return
  }
  peer.context.closed = true
  const roomCode = peer.context.roomCode
  const playerId = peer.context.playerId
  peers.remove(peer)
  // A restart drops every socket at once: handing the crown down the line as
  // each one closes would leave it with whoever happened to close last. The
  // squad is coming straight back, so the room record stays as it was.
  if (!roomCode || !playerId || peers.draining) {
    return
  }
  await withRoomLock(roomCode, async () => {
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

    scheduleAway(kv, peers, roomCode, playerId)

    // Host connection dropped: transfer to the earliest joiner still connected
    // (AGENTS.md: host migration). The diver stays seated for reconnect.
    if (room.state.hostId === playerId) {
      const earliest = room.state.divers.find(diver => diver.id !== playerId && isOnline(peers, roomCode, diver.id))
      if (earliest) {
        const action: EngineAction = { type: 'TRANSFER_HOST', playerId: earliest.id }
        room.state = reduce(room.state, action)
        roomMetrics.recordHostTransfer('disconnect')
        await saveRoom(kv, room)
        broadcastState(peers, roomCode, room.state, action, room.saved ?? null, room.steam ?? null)
        return
      }
    }

    // Presence-only refresh: remaining peers must drop the departed diver from
    // their online list immediately, not at the next action.
    broadcastState(peers, roomCode, room.state, null, room.saved ?? null, room.steam ?? null)
  })
}

function isOnline(peers: PeerDirectory, roomCode: string, playerId: string | null): boolean {
  return !!playerId && peers.list(roomCode).some(peer => peer.context.playerId === playerId)
}

// A diver whose connection stays down past the grace window steps away: their
// seat and kit stay, but the squad stops waiting on them (AGENTS.md:
// Mid-crusade joining — stepping away).
export async function markAwayIfOffline(kv: RoomKV, peers: PeerDirectory, roomCode: string, playerId: string): Promise<void> {
  await withRoomLock(roomCode, async () => {
    const room = await loadRoom(kv, roomCode)
    const diver = room?.state.divers.find(entry => entry.id === playerId)
    if (!room || !diver || diver.away || isOnline(peers, roomCode, playerId)) {
      return
    }
    let action: EngineAction = { type: 'SET_AWAY', playerId, away: true }
    room.state = reduce(room.state, action)
    roomMetrics.recordPresence('away')
    if (room.state.hostId === playerId) {
      const earliest = room.state.divers.find(entry => entry.id !== playerId && isOnline(peers, roomCode, entry.id))
      if (earliest) {
        action = { type: 'TRANSFER_HOST', playerId: earliest.id }
        room.state = reduce(room.state, action)
        roomMetrics.recordHostTransfer('offline_host')
      }
    }
    await saveRoom(kv, room)
    broadcastState(peers, roomCode, room.state, action, room.saved ?? null, room.steam ?? null)
  })
}

// Graceful shutdown (a deploy): tell every live diver the server is restarting
// rather than gone, so the client can wait it out calmly, then close with
// 1012 (Service Restart). Room state is already in storage.
export function drainPeers(peers: PeerDirectory): number {
  peers.draining = true
  const live = peers.all()
  const notice = JSON.stringify({ type: 'restarting' } satisfies ServerMessage)
  for (const peer of live) {
    peer.send(notice)
    peer.close?.(1012, 'Server restarting')
  }
  return live.length
}

function scheduleAway(kv: RoomKV, peers: PeerDirectory, roomCode: string, playerId: string): void {
  const timer = setTimeout(() => {
    markAwayIfOffline(kv, peers, roomCode, playerId).catch(() => {})
  }, AWAY_GRACE_MS)
  // Never hold the process open for a presence check.
  timer.unref?.()
}

// Reaping goes through processClose so away marking, host migration and the
// presence refresh all take the one path the transport's own close takes.
export async function reapSilentPeers(
  kv: RoomKV,
  peers: PeerDirectory,
  now: number = Date.now(),
  graceMs: number = PEER_SILENCE_MS,
): Promise<number> {
  let reaped = 0
  for (const peer of peers.all()) {
    const seen = peer.context.lastSeenAt
    // A peer that has not been stamped yet (a test double, a transport without
    // an open hook) starts its silence window now instead of being cut off.
    if (typeof seen !== 'number') {
      peer.context.lastSeenAt = now
      continue
    }
    if (!isPeerSilent(seen, now, graceMs)) {
      continue
    }
    try {
      await processClose(kv, peers, peer)
    }
    catch {
      // The directory entry is already gone, so presence converges either way;
      // one unreadable room must not stop the rest of the sweep.
      continue
    }
    try {
      peer.close?.()
    }
    catch {
      // The directory entry is already gone; a transport that cannot close its
      // own socket is logged by the sweeper, never fatal.
    }
    reaped += 1
  }
  return reaped
}
