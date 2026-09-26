import type { MajorOrderSelection } from '~~/shared/engine/types'

// The live Major Order, offered to the host's picker. The server proxies and
// caches the fan war API (server/api/war/major-order.get.ts); a failed fetch,
// the kill switch, or a static build simply resolves to null and the manual
// picker stands alone. Never fetched inside the engine — this is presentation.
export function useMajorOrder() {
  const { data, pending, error, refresh } = useFetch<{ order: MajorOrderSelection | null }>(
    '/api/war/major-order',
    {
      key: 'major-order',
      server: false,
      default: () => ({ order: null }),
    },
  )
  const order = computed(() => data.value?.order ?? null)
  return { order, pending, error, refresh }
}
