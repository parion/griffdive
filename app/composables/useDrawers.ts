// Global slide-over visibility, so any page (the dive, notably) can open the
// Warbonds drawer without unmounting the session.
const codexOpen = ref(false)
const warbondsOpen = ref(false)

export function useDrawers() {
  function openCodex(): void {
    codexOpen.value = true
  }

  function openWarbonds(): void {
    warbondsOpen.value = true
  }

  return { codexOpen, warbondsOpen, openCodex, openWarbonds }
}
