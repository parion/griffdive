// Steam lobby deep links: `steam://joinlobby/<appid>/<lobbyId>[/<steamId>]`.
// Squadmates in Helldivers Discord groups trade these to jump straight into a
// host's open lobby. Griffdive only ever relays the link — the host pastes it,
// every seated diver can click it — so it is cosmetic room metadata, never a
// game rule.

// Helldivers 2's Steam app id. A lobby link for any other game is refused.
export const STEAM_LOBBY_APP_ID = '553850'

const STEAM_LOBBY_PATTERN = /steam:\/\/joinlobby\/553850\/(\d+)(?:\/(\d+))?/i

// A Steam lobby link is a few dozen chars; anything wildly longer is a paste
// artifact and never a real link.
const MAX_LINK_LENGTH = 160

// Accepts the raw pasted text — a host often copies the whole line (or whole
// chat message) around the link — and returns the normalized deep link, or
// null when no Helldivers 2 lobby link can be found. The pattern scans rather
// than anchors so surrounding chatter never makes a valid paste fail.
export function normalizeSteamLobbyLink(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > MAX_LINK_LENGTH) {
    return null
  }
  const match = STEAM_LOBBY_PATTERN.exec(trimmed)
  if (!match) {
    return null
  }
  const [, lobbyId, steamId] = match
  return steamId
    ? `steam://joinlobby/${STEAM_LOBBY_APP_ID}/${lobbyId}/${steamId}`
    : `steam://joinlobby/${STEAM_LOBBY_APP_ID}/${lobbyId}`
}
