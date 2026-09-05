// Room codes: 6 chars, no ambiguous glyphs (no I/L/O/0/1).
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 6

const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)

export function isRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value)
}
