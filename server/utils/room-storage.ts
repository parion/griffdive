import type { StoredRoom, RoomKV } from './room-sync'

const PREFIX = 'room:'

// Adapts Nitro's useStorage('rooms') to the RoomKV interface (codes without
// prefix). Memory driver today; Redis is a config swap, not a code change.
export function roomKV(): RoomKV {
  const storage = useStorage('rooms')
  return {
    async getItem(code: string) {
      return storage.getItem(`${PREFIX}${code}`)
    },
    async setItem(code: string, value: StoredRoom) {
      await storage.setItem(`${PREFIX}${code}`, value)
    },
    async removeItem(code: string) {
      await storage.removeItem(`${PREFIX}${code}`)
    },
    async getKeys() {
      return (await storage.getKeys())
        .filter(key => key.startsWith(PREFIX))
        .map(key => key.slice(PREFIX.length))
    },
  }
}
