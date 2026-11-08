// Global slide-over visibility, so any page (the dive, notably) can open the
// Codex or Warbonds without unmounting the session.
//
// On the dive shells the slide-overs live in one persistent `DiveSidebar`, so
// the three panels (Kit, Codex, Warbonds) share a single slot and only one is
// open at a time. `codexOpen` / `warbondsOpen` stay writable flags over that
// slot: the global drawers in `app.vue` read them wherever no sidebar is
// mounted (the Bridge, the lobby, the briefings). Brasch's Bargains is its own
// modal/fullscreen experience, so it gets a flag rather than a panel slot.
export type SidePanel = 'kit' | 'codex' | 'warbonds'

const sidePanel = ref<SidePanel | null>(null)
const sidebarHosts = ref(0)
// The shop is a modal on desktop and a full-viewport takeover on a phone. It is
// hosted once per dive shell, not inside the sidebar panel.
const bargainsOpen = ref(false)
// A full-screen experience can be teleported out of the sidebar. While one is
// open, a phone tap on it must not count as a click outside the dock.
const panelLocks = ref(0)
const panelLocked = computed(() => panelLocks.value > 0)

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

  function openBargains(): void {
    bargainsOpen.value = true
  }

  function closeBargains(): void {
    bargainsOpen.value = false
  }

  function hostSidebar(): void {
    sidebarHosts.value++
  }

  function releaseSidebar(): void {
    sidebarHosts.value = Math.max(0, sidebarHosts.value - 1)
    if (sidebarHosts.value === 0 && sidePanel.value === 'kit') {
      sidePanel.value = null
    }
  }

  // Returns the matching release; a counter keeps nested/remounted hosts safe.
  function lockPanel(): () => void {
    panelLocks.value++
    let held = true
    return () => {
      if (held) {
        held = false
        panelLocks.value = Math.max(0, panelLocks.value - 1)
      }
    }
  }

  return { sidePanel, sidebarHosted, codexOpen, warbondsOpen, bargainsOpen, panelLocked, openCodex, openWarbonds, openBargains, closeBargains, hostSidebar, releaseSidebar, lockPanel }
}
