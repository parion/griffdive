import { describe, expect, it } from 'vitest'
import { pactOfferFor } from '~~/shared/engine/selectors'
import { ROOM_TTL_MS, RoomLimitError, createPeerDirectory, createRoom, loadRoom, processAction, processClose, processHello, sweepRooms } from './room-sync'
import type { PeerLike, RoomKV, StoredRoom } from './room-sync'
import { createRateLimiter } from './rate-limit'
import type { ServerMessage } from '~~/shared/types/messages'

function fakeKV(): RoomKV & { dump(): Map<string, unknown> } {
  const map = new Map<string, unknown>()
  return {
    async getItem(code: string) {
      return map.get(code)
    },
    async setItem(code: string, value: unknown) {
      map.set(code, value)
    },
    async removeItem(code: string) {
      map.delete(code)
    },
    async getKeys() {
      return [...map.keys()]
    },
    dump: () => map,
  }
}

interface FakePeer extends PeerLike {
  inbox: ServerMessage[]
}

function fakePeer(id: string): FakePeer {
  const inbox: ServerMessage[] = []
  return {
    id,
    context: {},
    inbox,
    send(text: string) {
      inbox.push(JSON.parse(text) as ServerMessage)
    },
  }
}

function sent(peer: FakePeer): ServerMessage[] {
  return peer.inbox
}

function welcomeOf(peer: FakePeer): Extract<ServerMessage, { type: 'welcome' }> {
  const message = sent(peer).find(entry => entry.type === 'welcome')
  if (!message || message.type !== 'welcome') {
    throw new Error('no welcome message received')
  }
  return message
}

async function lastSnapshot(peer: FakePeer) {
  const states = sent(peer).filter(message => message.type === 'state')
  const message = states[states.length - 1]
  if (!message || message.type !== 'state') {
    throw new Error('no state message received')
  }
  return message.snapshot
}

describe('room-sync', () => {
  it('seats the first hello as host and broadcasts joins', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Griffin' })

    const welcome = sent(host).find(message => message.type === 'welcome')
    expect(welcome?.type === 'welcome' && welcome.selfId).toBeTruthy()
    expect(welcome?.type === 'welcome' && welcome.snapshot.hostId).toBe(welcome?.selfId)
    expect(welcome?.type === 'welcome' && welcome.snapshot.phase).toBe('lobby')

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'Duo' })

    const hostStates = sent(host).filter(message => message.type === 'state')
    expect(hostStates.length).toBe(1)
    const snapshot = await lastSnapshot(host)
    expect(snapshot.divers).toHaveLength(2)
  })

  it('enforces host authority and coerces self-service actions', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })
    const hostId = sent(host).find(m => m.type === 'welcome')
    if (hostId?.type !== 'welcome') {
      throw new Error('no welcome')
    }

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'B' })
    const joinerWelcome = sent(joiner).find(m => m.type === 'welcome')
    if (joinerWelcome?.type !== 'welcome') {
      throw new Error('no welcome')
    }
    const joinerId = joinerWelcome.selfId

    sent(host).length = 0
    sent(joiner).length = 0

    // Host launches the crusade first — the room starts in lobby phase.
    await processAction(kv, peers, host, {
      action: { type: 'START_DIVE', settings: { variant: 'standard' } },
    })
    sent(host).length = 0

    // Non-host cannot spin.
    await processAction(kv, peers, joiner, { action: { type: 'SPIN_WHEEL', seed: 1 } })
    expect(sent(joiner).some(m => m.type === 'error' && m.code === 'not-host')).toBe(true)
    expect(sent(host)).toHaveLength(0)

    // Host spins; everyone gets a state — the draw opens the decision window.
    await processAction(kv, peers, host, { action: { type: 'SPIN_WHEEL', seed: 42 } })
    const snapshot = await lastSnapshot(joiner)
    expect(snapshot.wheel?.seed).toBe(42)

    // The decision precedes pacts: the host locks the misfortune in, then
    // answers the strain call that opens on the operation's first mission.
    await processAction(kv, peers, host, { action: { type: 'ACCEPT_MISFORTUNE', accepted: true } })
    expect((await lastSnapshot(joiner)).phase).toBe('strain')
    await processAction(kv, peers, host, { action: { type: 'ACCEPT_STRAIN', accepted: false } })
    const decided = await lastSnapshot(joiner)
    expect(decided.phase).toBe('pacts')

    // Self-service spoofing is coerced to the sender. The pact comes from the
    // joiner's own rolled offer.
    const offer = pactOfferFor(decided, joinerId)
    const pactId = offer[0]?.id
    if (!pactId) {
      throw new Error('no pact offered')
    }
    await processAction(kv, peers, joiner, {
      action: { type: 'SET_PACTS', playerId: hostId.selfId, pactIds: [pactId] },
    })
    const after = await lastSnapshot(joiner)
    const coerced = after.divers.find(diver => diver.id === joinerId)
    expect(coerced?.pactIds).toEqual([pactId])
    const hostDiver = after.divers.find(diver => diver.id === hostId.selfId)
    expect(hostDiver?.pactIds).toEqual([])

    // Warbonds are self-service too: the spoofed playerId is coerced to the
    // sender, and unknown codes are filtered by the reducer.
    await processAction(kv, peers, joiner, {
      action: { type: 'SET_WARBONDS', playerId: hostId.selfId, warbondCodes: ['warbond3', 'ghostBond', 'warbond3'] },
    })
    const afterWarbonds = await lastSnapshot(joiner)
    const joinerDiver = afterWarbonds.divers.find(diver => diver.id === joinerId)
    expect(joinerDiver?.warbondCodes).toEqual(['warbond3'])
    const hostAfterWarbonds = afterWarbonds.divers.find(diver => diver.id === hostId.selfId)
    expect(hostAfterWarbonds?.warbondCodes.length).toBeGreaterThan(1)

    // Reducer no-ops stay silent.
    const before = await lastSnapshot(joiner)
    await processAction(kv, peers, joiner, { action: { type: 'ADVANCE' } })
    const afterNoop = await lastSnapshot(joiner)
    expect(afterNoop).toBe(before)
  })

  it('lets the diver and the host mark pacts failed, nobody else', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })
    const hostId = welcomeOf(host).selfId

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'B' })
    const joinerId = welcomeOf(joiner).selfId

    // Launch, spin, accept, and get both divers into the diving phase.
    await processAction(kv, peers, host, { action: { type: 'START_DIVE', settings: { variant: 'standard' } } })
    await processAction(kv, peers, host, { action: { type: 'SPIN_WHEEL', seed: 42 } })
    await processAction(kv, peers, host, { action: { type: 'ACCEPT_MISFORTUNE', accepted: true } })
    await processAction(kv, peers, host, { action: { type: 'ACCEPT_STRAIN', accepted: false } })
    const decided = await lastSnapshot(joiner)
    const offer = pactOfferFor(decided, joinerId).map(pact => pact.id)
    if (offer.length < 2) {
      throw new Error('expected at least two offered pacts')
    }
    await processAction(kv, peers, joiner, { action: { type: 'SET_PACTS', playerId: joinerId, pactIds: offer } })
    await processAction(kv, peers, host, { action: { type: 'SET_PACTS', playerId: hostId, pactIds: [] } })
    expect((await lastSnapshot(joiner)).phase).toBe('diving')
    sent(joiner).length = 0

    // A third party cannot mark someone else's pact failed.
    await processAction(kv, peers, joiner, { action: { type: 'FAIL_PACT', playerId: hostId, pactId: offer[0]! } })
    expect(sent(joiner).some(m => m.type === 'error' && m.code === 'bad-action')).toBe(true)
    sent(joiner).length = 0

    // The diver marks their own pact failed.
    await processAction(kv, peers, joiner, { action: { type: 'FAIL_PACT', playerId: joinerId, pactId: offer[0]! } })
    let snapshot = await lastSnapshot(joiner)
    expect(snapshot.divers.find(diver => diver.id === joinerId)?.failedPactIds).toEqual([offer[0]])

    // The host referees the squad: marking another diver's pact fails it.
    await processAction(kv, peers, host, { action: { type: 'FAIL_PACT', playerId: joinerId, pactId: offer[1]! } })
    snapshot = await lastSnapshot(joiner)
    expect(snapshot.divers.find(diver => diver.id === joinerId)?.failedPactIds).toEqual(offer)
  })

  it('lets the host kick a diver and silences the kicked diver', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'B' })
    const joinerWelcome = sent(joiner).find(m => m.type === 'welcome')
    if (joinerWelcome?.type !== 'welcome') {
      throw new Error('no welcome')
    }
    const joinerId = joinerWelcome.selfId

    sent(host).length = 0
    sent(joiner).length = 0

    // Kicking is host-only.
    await processAction(kv, peers, joiner, { action: { type: 'KICK_DIVER', playerId: 'x' } })
    expect(sent(joiner).some(m => m.type === 'error' && m.code === 'not-host')).toBe(true)

    // Host kicks the joiner; the removal syncs to every peer.
    await processAction(kv, peers, host, { action: { type: 'KICK_DIVER', playerId: joinerId } })
    const snapshot = await lastSnapshot(host)
    expect(snapshot.divers).toHaveLength(1)
    expect((await lastSnapshot(joiner)).divers).toHaveLength(1)

    // The kicked diver's connection is live but unseated: no more actions.
    await processAction(kv, peers, joiner, { action: { type: 'SET_NAME', playerId: joinerId, name: 'Ghost' } })
    expect(sent(joiner).some(m => m.type === 'error' && m.code === 'not-in-room')).toBe(true)
  })

  it('coerces LEAVE_DIVE to the sender and parks their cache', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'B' })
    const joinerWelcome = sent(joiner).find(m => m.type === 'welcome')
    if (joinerWelcome?.type !== 'welcome') {
      throw new Error('no welcome')
    }
    const joinerId = joinerWelcome.selfId

    await processAction(kv, peers, host, {
      action: { type: 'START_DIVE', settings: { variant: 'standard' } },
    })
    sent(host).length = 0

    // A spoofed playerId still leaves the sender, never the named diver.
    await processAction(kv, peers, joiner, {
      action: { type: 'LEAVE_DIVE', playerId: 'not-me' },
    })
    const snapshot = await lastSnapshot(host)
    expect(snapshot.divers.map(diver => diver.id)).not.toContain(joinerId)
    expect(snapshot.legacyCaches[joinerId]?.length).toBeGreaterThan(0)
    expect(snapshot.personalInventories[joinerId]).toBeUndefined()

    // The departed diver's live connection is unseated: no more actions.
    await processAction(kv, peers, joiner, { action: { type: 'SET_NAME', playerId: joinerId, name: 'Ghost' } })
    expect(sent(joiner).some(m => m.type === 'error' && m.code === 'not-in-room')).toBe(true)
  })

  it('reclaims a parked legacy cache when the same id rejoins', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'B' })
    const joinerWelcome = sent(joiner).find(m => m.type === 'welcome')
    if (joinerWelcome?.type !== 'welcome') {
      throw new Error('no welcome')
    }
    const joinerId = joinerWelcome.selfId

    await processAction(kv, peers, host, {
      action: { type: 'START_DIVE', settings: { variant: 'standard' } },
    })
    const banked = (await lastSnapshot(host)).personalInventories[joinerId]?.length ?? 0
    expect(banked).toBeGreaterThan(0)

    await processAction(kv, peers, joiner, { action: { type: 'LEAVE_DIVE', playerId: joinerId } })
    expect((await lastSnapshot(host)).legacyCaches[joinerId]?.length).toBe(banked)

    // The same stored id comes back (same browser): reclaim, don't replace.
    const rejoin = fakePeer('ws-c')
    rejoin.context.roomCode = code
    await processHello(kv, peers, rejoin, { playerId: joinerId, name: 'B' })

    const welcome = welcomeOf(rejoin)
    expect(welcome.selfId).toBe(joinerId)
    expect(welcome.snapshot.legacyCaches[joinerId]).toBeUndefined()
    expect(welcome.snapshot.personalInventories[joinerId]?.length).toBe(banked)
    expect(welcome.snapshot.divers.map(diver => diver.id)).toContain(joinerId)
  })

  it('refuses seating while the squad resolves the mission', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })

    await processAction(kv, peers, host, { action: { type: 'START_DIVE', settings: { variant: 'standard' } } })
    await processAction(kv, peers, host, { action: { type: 'SPIN_WHEEL', seed: 42 } })
    await processAction(kv, peers, host, { action: { type: 'ACCEPT_MISFORTUNE', accepted: true } })
    await processAction(kv, peers, host, { action: { type: 'ACCEPT_STRAIN', accepted: false } })
    await processAction(kv, peers, host, { action: { type: 'SET_PACTS', playerId: 'x', pactIds: [] } })
    await processAction(kv, peers, host, { action: { type: 'REPORT_RESULT', outcome: 'success', stars: 3 } })
    const rewards = await lastSnapshot(host)
    expect(rewards.phase).toBe('rewards')

    const latecomer = fakePeer('ws-late')
    latecomer.context.roomCode = code
    await processHello(kv, peers, latecomer, { name: 'Late' })
    expect(sent(latecomer).some(m => m.type === 'error' && m.code === 'dive-locked')).toBe(true)
  })

  it('fills up at four divers and reports room-full', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)
    const letters = ['a', 'b', 'c', 'd', 'e']
    for (const letter of letters) {
      const peer = fakePeer(`ws-${letter}`)
      peer.context.roomCode = code
      await processHello(kv, peers, peer, { name: letter })
    }
    const fifth = fakePeer('ws-e')
    fifth.context.roomCode = code
    await processHello(kv, peers, fifth, { name: 'Five' })
    expect(sent(fifth).some(m => m.type === 'error' && m.code === 'room-full')).toBe(true)
  })

  it('migrates the host on disconnect and survives reattachment', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })
    const hostWelcome = sent(host).find(m => m.type === 'welcome')
    if (hostWelcome?.type !== 'welcome') {
      throw new Error('no welcome')
    }
    const hostId = hostWelcome.selfId

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'Earliest joiner' })
    sent(joiner).length = 0

    // Host connection drops.
    await processClose(kv, peers, host)
    const migration = await lastSnapshot(joiner)
    expect(migration.hostId).not.toBe(hostId)
    expect(migration.divers.find(diver => diver.id === hostId)).toBeTruthy()

    // The departed host reconnects with their stored playerId.
    const reborn = fakePeer('ws-a2')
    reborn.context.roomCode = code
    await processHello(kv, peers, reborn, { name: 'Host', playerId: hostId })
    const reWelcome = welcomeOf(reborn)
    expect(reWelcome.selfId).toBe(hostId)
    expect(reWelcome.snapshot.divers).toHaveLength(2)
  })

  it('refreshes presence as soon as a diver disconnects', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })
    const hostId = welcomeOf(host).selfId

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'Joiner' })
    const joinerId = welcomeOf(joiner).selfId
    sent(host).length = 0

    // The joiner's connection drops and no action follows: the host must
    // still see them go offline.
    await processClose(kv, peers, joiner)

    const states = sent(host).filter(m => m.type === 'state')
    expect(states).toHaveLength(1)
    const refresh = states[0]
    if (refresh?.type !== 'state') {
      throw new Error('no state message received')
    }
    expect(refresh.applied).toBeNull()
    expect(refresh.online).toEqual([hostId])
    expect(refresh.online).not.toContain(joinerId)
  })

  it('keeps the host seated while another of their sockets is live', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })
    const hostId = welcomeOf(host).selfId

    const joiner = fakePeer('ws-b')
    joiner.context.roomCode = code
    await processHello(kv, peers, joiner, { name: 'Joiner' })
    sent(joiner).length = 0

    // A second tab of the host reattaches with the stored playerId.
    const secondTab = fakePeer('ws-a2')
    secondTab.context.roomCode = code
    await processHello(kv, peers, secondTab, { name: 'Host', playerId: hostId })

    // One host socket closes: seat, host role and presence all stay put.
    await processClose(kv, peers, host)
    expect(sent(joiner)).toHaveLength(0)
    expect((await loadRoom(kv, code))?.state.hostId).toBe(hostId)
  })

  it('prunes rooms after the TTL', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)
    const raw = await kv.getItem(code) as StoredRoom
    raw.updatedAt = Date.now() - ROOM_TTL_MS - 1

    const late = fakePeer('ws-late')
    late.context.roomCode = code
    await processHello(kv, peers, late, { name: 'Late' })
    expect(sent(late).some(m => m.type === 'error' && m.code === 'room-not-found')).toBe(true)
  })

  it('rejects unknown and malformed actions without corrupting the room', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })
    sent(host).length = 0

    // Unknown action type: whitelisted out before the engine is reached.
    await processAction(kv, peers, host, { action: { type: 'WAT' } })
    expect(sent(host).some(m => m.type === 'error' && m.code === 'bad-action')).toBe(true)
    expect(sent(host).some(m => m.type === 'state')).toBe(false)

    // Known type, malformed shape: the reducer throws, is caught, and nothing
    // is persisted or broadcast.
    sent(host).length = 0
    await processAction(kv, peers, host, { action: { type: 'START_DIVE' } })
    expect(sent(host).some(m => m.type === 'error' && m.code === 'bad-action')).toBe(true)
    expect(sent(host).some(m => m.type === 'state')).toBe(false)

    const stored = await loadRoom(kv, code)
    expect(stored?.state.phase).toBe('lobby')
    expect(stored?.state.settings).toBeNull()
    expect(stored?.state.divers).toHaveLength(1)
  })

  it('rate-limits join attempts per address', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)
    const limits = { hello: createRateLimiter(1, 60_000) }

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    host.remoteAddress = '203.0.113.7'
    await processHello(kv, peers, host, { name: 'Host' }, limits)
    expect(sent(host).some(m => m.type === 'welcome')).toBe(true)

    const flood = fakePeer('ws-b')
    flood.context.roomCode = code
    flood.remoteAddress = '203.0.113.7'
    await processHello(kv, peers, flood, { name: 'Flood' }, limits)
    expect(sent(flood).some(m => m.type === 'error' && m.code === 'rate-limited')).toBe(true)
    expect((await loadRoom(kv, code))?.state.divers).toHaveLength(1)
  })

  it('refuses room creation past capacity', async () => {
    const kv = fakeKV()
    await createRoom(kv, 1)
    await expect(createRoom(kv, 1)).rejects.toBeInstanceOf(RoomLimitError)
  })

  it('sweeps expired rooms and keeps live ones', async () => {
    const kv = fakeKV()
    const stale = await createRoom(kv)
    const live = await createRoom(kv)
    const raw = await kv.getItem(stale) as StoredRoom
    raw.updatedAt = Date.now() - ROOM_TTL_MS - 1

    expect(await sweepRooms(kv)).toBe(1)
    expect(await kv.getItem(stale)).toBeUndefined()
    expect(await kv.getItem(live)).toBeDefined()
  })
})
