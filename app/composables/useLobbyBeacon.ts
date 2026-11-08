import type { MaybeRefOrGetter } from 'vue'

// Tabs of one browser tell each other about an open lobby, so a Tier Maker
// opened in a new tab can send its list — and the diver — back to it. A
// BroadcastChannel stays inside this browser and stores nothing.
const CHANNEL = 'griffdive:lobby'

type BeaconMessage = { type: 'ping' } | { type: 'open', path: string } | { type: 'closed', path: string }

function channel(): BroadcastChannel | null {
  return import.meta.client && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
}

// Lobby side: announce the lobby's page while the host can still change its
// tier list, and answer any Tier Maker that asks.
export function useLobbyBeacon(path: MaybeRefOrGetter<string | null>): void {
  const bc = channel()
  if (!bc) {
    return
  }
  let announced: string | null = null
  function announce(next: string | null): void {
    if (announced && announced !== next) {
      bc!.postMessage({ type: 'closed', path: announced } satisfies BeaconMessage)
    }
    announced = next
    if (next) {
      bc!.postMessage({ type: 'open', path: next } satisfies BeaconMessage)
    }
  }
  bc.onmessage = (event: MessageEvent<BeaconMessage>) => {
    if (event.data?.type === 'ping' && announced) {
      bc.postMessage({ type: 'open', path: announced } satisfies BeaconMessage)
    }
  }
  watch(() => toValue(path), announce, { immediate: true })
  onScopeDispose(() => {
    announce(null)
    bc.close()
  })
}

// Tier Maker side: the page of a lobby open in another tab, if any.
export function useOpenLobby() {
  const path = ref<string | null>(null)
  let bc: BroadcastChannel | null = null
  onMounted(() => {
    bc = channel()
    if (!bc) {
      return
    }
    bc.onmessage = (event: MessageEvent<BeaconMessage>) => {
      if (event.data?.type === 'open') {
        path.value = event.data.path
      }
      else if (event.data?.type === 'closed' && path.value === event.data.path) {
        path.value = null
      }
    }
    bc.postMessage({ type: 'ping' } satisfies BeaconMessage)
  })
  onBeforeUnmount(() => bc?.close())
  return path
}
