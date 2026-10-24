// Global slide-over visibility, so any page (the dive, notably) can open the
// Codex or Warbonds without unmounting the session.
//
// On the dive shells the slide-overs live in one persistent `DiveSidebar`, so
// the four panels (Kit, Codex, Warbonds, Bargains) share a single slot and only
// one is open at a time. `codexOpen` / `warbondsOpen` stay writable flags over
// that slot: the global drawers in `app.vue` read them wherever no sidebar is
// mounted (the Bridge, the lobby, the briefings).
export type SidePanel = 'kit' | 'codex' | 'warbonds' | 'bargains'

const sidePanel = ref<SidePanel | null>(null)
const sidebarHosts = ref(0)

function panelFlag(panel: SidePanel) {
  return computed({
    get: () => sidePanel.value === panel,
    set: (open: boolean) => {
      if (open) {
        sidePanel.value = panel
      }
      else if (sidePanel.value === panel) {
        sidePanel.value = null
      }
    },
  })
}

const codexOpen = panelFlag('codex')
const warbondsOpen = panelFlag('warbonds')
const sidebarHosted = computed(() => sidebarHosts.value > 0)

export function useDrawers() {
  function openCodex(): void {
    codexOpen.value = true
  }

  function openWarbonds(): void {
    warbondsOpen.value = true
  }

  function hostSidebar(): void {
    sidebarHosts.value++
  }

  function releaseSidebar(): void {
    sidebarHosts.value = Math.max(0, sidebarHosts.value - 1)
    if (sidebarHosts.value === 0 && (sidePanel.value === 'kit' || sidePanel.value === 'bargains')) {
      sidePanel.value = null
    }
  }

  return { sidePanel, sidebarHosted, codexOpen, warbondsOpen, openCodex, openWarbonds, hostSidebar, releaseSidebar }
}
