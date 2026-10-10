import { describe, expect, it } from 'vitest'
import { STEAM_LOBBY_APP_ID, normalizeSteamLobbyLink } from './steam-lobby'

describe('normalizeSteamLobbyLink', () => {
  it('normalizes a full Helldivers 2 lobby link', () => {
    expect(normalizeSteamLobbyLink('steam://joinlobby/553850/109775244505390675/76561199111703149'))
      .toBe('steam://joinlobby/553850/109775244505390675/76561199111703149')
  })

  it('accepts a link without the host steam id', () => {
    expect(normalizeSteamLobbyLink('steam://joinlobby/553850/109775244505390675'))
      .toBe('steam://joinlobby/553850/109775244505390675')
  })

  it('trims whitespace and finds the link inside pasted chatter', () => {
    expect(normalizeSteamLobbyLink('  join up: steam://joinlobby/553850/42/7 thanks  '))
      .toBe('steam://joinlobby/553850/42/7')
  })

  it('is case-insensitive on the steam scheme', () => {
    expect(normalizeSteamLobbyLink('STEAM://JOINLOBBY/553850/42'))
      .toBe('steam://joinlobby/553850/42')
  })

  it('rejects another game\'s lobby link', () => {
    expect(normalizeSteamLobbyLink('steam://joinlobby/730/109775244505390675/1')).toBeNull()
  })

  it('rejects a bare numeric lobby code', () => {
    expect(normalizeSteamLobbyLink('109775244505390675')).toBeNull()
  })

  it('rejects non-strings, blanks, and overlong pastes', () => {
    expect(normalizeSteamLobbyLink(undefined)).toBeNull()
    expect(normalizeSteamLobbyLink('')).toBeNull()
    expect(normalizeSteamLobbyLink('   ')).toBeNull()
    expect(normalizeSteamLobbyLink(`steam://joinlobby/${STEAM_LOBBY_APP_ID}/${'9'.repeat(200)}`)).toBeNull()
  })
})
