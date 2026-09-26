import type { MajorOrderSelection } from '~~/shared/engine/types'

// 'active' has an order; 'none' is a clean empty response (no MO running right
// now); 'unavailable' is a failed or unreadable fetch.
export type MajorOrderStatus = 'active' | 'none' | 'unavailable'

export interface MajorOrderResponse {
  order: MajorOrderSelection | null
  status: MajorOrderStatus
}

// The live Major Order, offered to the host's picker. The server proxies and
// caches the fan war API (server/api/war/major-order.get.ts); a failed fetch,
// the kill switch, or a static build resolves to 'unavailable' and the manual
// picker stands alone. Never fetched inside the engine — this is presentation.
export function useMajorOrder() {
  const { data, pending, error, refresh } = useFetch<MajorOrderResponse>(
    '/api/war/major-order',
    {
      key: 'major-order',
      server: false,
      // The war API is dynamic, so never reuse a cached payload: a null cached
      // on an earlier mount would hide the order for the rest of the session
      // (the "only shows up on a full refresh" bug). Always fetch on mount.
      getCachedData: () => undefined,
      default: () => ({ order: null, status: 'unavailable' as const }),
    },
  )
  const order = computed(() => data.value?.order ?? null)
  const status = computed<MajorOrderStatus>(() => data.value?.status ?? 'unavailable')
  return { order, status, pending, error, refresh }
}
