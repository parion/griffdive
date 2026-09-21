import { ALL_WARBOND_CODES, DEFAULT_OWNED_WARBOND_CODES } from '~~/shared/data/catalog'

const STORAGE_KEY = 'griffdive:warbonds:v2'

// Module scope keeps one owned list per tab; SPA mode means no SSR bleed.
const owned = ref<string[]>([...DEFAULT_OWNED_WARBOND_CODES])
let loaded = false

function load(): void {
  if (loaded || !import.meta.client) {
    return
  }
  loaded = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      owned.value = parsed.filter(
        (code): code is string => typeof code === 'string' && ALL_WARBOND_CODES.includes(code),
      )
    }
  }
  catch {
    // A corrupt entry falls back to the full catalog.
  }
}

function persist(): void {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(owned.value))
}

// The warbonds this browser owns — the default for new crusades, mirrored into
// every dive the diver seats in.
export function useOwnedWarbonds() {
  load()

  function setOwned(codes: string[]): void {
    owned.value = [...new Set(codes.filter(code => ALL_WARBOND_CODES.includes(code)))]
    persist()
  }

  function toggle(code: string): void {
    setOwned(owned.value.includes(code)
      ? owned.value.filter(entry => entry !== code)
      : [...owned.value, code])
  }

  function isOwned(code: string): boolean {
    return owned.value.includes(code)
  }

  return { ownedWarbonds: owned, setOwned, toggle, isOwned }
}
