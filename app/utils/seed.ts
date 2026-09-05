export function newSeed(): number {
  if (!import.meta.client) {
    return 0
  }
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
}
