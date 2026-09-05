export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickIndex(rng: Rng, length: number): number {
  return Math.floor(rng() * length)
}

export function pickRandom<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('pickRandom: empty list')
  }
  return items[pickIndex(rng, items.length)] as T
}

export function pickWeighted<T>(rng: Rng, entries: readonly { value: T, weight: number }[]): T {
  if (entries.length === 0) {
    throw new Error('pickWeighted: no entries')
  }
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) {
    throw new Error('pickWeighted: no positive weights')
  }
  let roll = rng() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll < 0) {
      return entry.value
    }
  }
  const last = entries[entries.length - 1]
  if (!last) {
    throw new Error('pickWeighted: no entries')
  }
  return last.value
}

export function deriveSeed(base: number, salt: number): number {
  let h = (base ^ Math.imul(salt, 0x9e3779b9)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  return (h ^ (h >>> 16)) >>> 0
}

export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
