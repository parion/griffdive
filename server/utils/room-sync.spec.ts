import { describe, expect, it } from 'vitest'
import { ROOM_TTL_MS, createPeerDirectory, createRoom, loadRoom, listLobby, lobbyEntryFor, processAction, processClose, processHello } from './room-sync'
import type { PeerLike, RoomKV, StoredRoom } from './room-sync'
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
      action: { type: 'START_DIVE', settings: { variant: 'standard', ownedWarbondCodes: [] } },
    })
    sent(host).length = 0

    // Non-host cannot spin.
    await processAction(kv, peers, joiner, { action: { type: 'SPIN_WHEEL', seed: 1 } })
    expect(sent(joiner).some(m => m.type === 'error' && m.code === 'not-host')).toBe(true)
    expect(sent(host)).toHaveLength(0)

    // Host spins; everyone gets a state.
    await processAction(kv, peers, host, { action: { type: 'SPIN_WHEEL', seed: 42 } })
    const snapshot = await lastSnapshot(joiner)
    expect(snapshot.wheel?.seed).toBe(42)

    // Self-service spoofing is coerced to the sender.
    await processAction(kv, peers, joiner, {
      action: { type: 'SET_PACTS', playerId: hostId.selfId, pactIds: ['thirsty'] },
    })
    const after = await lastSnapshot(joiner)
    const coerced = after.divers.find(diver => diver.id === joinerId)
    expect(coerced?.pactIds).toEqual(['thirsty'])
    const hostDiver = after.divers.find(diver => diver.id === hostId.selfId)
    expect(hostDiver?.pactIds).toEqual([])

    // Reducer no-ops stay silent.
    const before = await lastSnapshot(joiner)
    await processAction(kv, peers, joiner, { action: { type: 'ADVANCE' } })
    const afterNoop = await lastSnapshot(joiner)
    expect(afterNoop).toBe(before)
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

  it('publishes lobby entries only for open, non-full rooms', async () => {
    const kv = fakeKV()
    const peers = createPeerDirectory()
    const code = await createRoom(kv)

    const listener = fakePeer('ws-lobby')
    listener.context.roomCode = '__lobby__'
    await processHello(kv, peers, listener, {})

    const host = fakePeer('ws-a')
    host.context.roomCode = code
    await processHello(kv, peers, host, { name: 'Host' })
    expect(listLobby).toBeDefined()

    // Closed room: no entry.
    expect(await listLobby(kv)).toHaveLength(0)

    await processAction(kv, peers, host, { action: { type: 'TOGGLE_OPEN', open: true } })
    expect(sent(listener).some(m => m.type === 'lobby' && m.rooms.length === 1)).toBe(true)

    // Open but full: filtered out of the list.
    for (const letter of ['b', 'c', 'd']) {
      const peer = fakePeer(`ws-${letter}`)
      peer.context.roomCode = code
      await processHello(kv, peers, peer, { name: letter })
    }
    const full = await listLobby(kv)
    expect(full).toHaveLength(0)

    const stored = await loadRoom(kv, code)
    expect(stored).not.toBeNull()
    expect(lobbyEntryFor(stored as StoredRoom)).toBeNull()
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
})
