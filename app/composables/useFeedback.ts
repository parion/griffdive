// Global feedback sheet visibility: the Bridge footer and the dive menu both
// open one dialog, so a diver keeps their place in the crusade while typing.
// Module scope is per-tab (SPA mode), same as drawers and toasts.
const sheetOpen = ref(false)

export function useFeedback() {
  const config = useRuntimeConfig()

  // Empty until the self-hosted Fider board exists: no link to a 404.
  const boardUrl = computed(() => {
    const value = config.public.feedbackBoardUrl
    return typeof value === 'string' ? value.replace(/\/+$/, '') : ''
  })

  function openFeedback(): void {
    sheetOpen.value = true
  }

  function closeFeedback(): void {
    sheetOpen.value = false
  }

  return {
    sheetOpen,
    boardUrl,
    hasBoard: computed(() => boardUrl.value.length > 0),
    openFeedback,
    closeFeedback,
  }
}
