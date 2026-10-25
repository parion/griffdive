<script setup lang="ts">
import { useSessionStore } from '~/stores/session'
import { CURRENT_RELEASE } from '~/utils/release'

const route = useRoute()
// The dive renders its own terminal header (crusade, room code, copy, nav), so
// the global bridge header stands down there.
const onDive = computed(() => route.path.startsWith('/dive'))
const onBridge = computed(() => route.path === '/')

const changelogOpen = ref(false)
const { codexOpen, warbondsOpen, sidebarHosted } = useDrawers()
const { online } = useSessionStore()
</script>

<template>
  <MotionConfig reduced-motion="user">
    <div class="app-shell">
      <BridgeGrid v-if="onBridge" />
      <a
        href="#main-content"
        class="skip-link"
      >Skip to main content</a>
      <header
        v-if="!onDive"
        class="term-header"
      >
        <NuxtLink
          to="/"
          class="brand"
          aria-label="Griffdive bridge"
        >
          <AppBrandMark :size="26" />
          <span class="brand-word disp">Griffdive</span>
        </NuxtLink>
        <button
          type="button"
          class="chip release-chip"
          :title="`${CURRENT_RELEASE.label} — click for the release notes`"
          aria-haspopup="dialog"
          :aria-expanded="changelogOpen"
          @click="changelogOpen = true"
        >
          {{ CURRENT_RELEASE.label }}
        </button>
        <!-- The Bridge docks its live Major Order here. -->
        <div
          id="header-mid"
          class="header-mid"
        />
        <div
          v-if="online.length"
          class="chan uplink"
        >
          <span
            class="lamp teal pulse"
            aria-hidden="true"
          />
          <span>Uplink</span>
          <span class="uplink-n">Live</span>
        </div>
        <nav
          class="ship-nav"
          aria-label="Ship"
        >
          <button
            type="button"
            class="icon-btn navb"
            aria-haspopup="dialog"
            :aria-expanded="codexOpen"
            @click="codexOpen = true"
          >
            <IconBook class="nav-icon" />
            <span>Codex</span>
          </button>
          <button
            type="button"
            class="icon-btn navb"
            aria-haspopup="dialog"
            :aria-expanded="warbondsOpen"
            @click="warbondsOpen = true"
          >
            <IconWarbond class="nav-icon" />
            <span>Warbonds</span>
          </button>
        </nav>
      </header>
      <NuxtPage />
      <AppChangelogModal
        :open="changelogOpen"
        @close="changelogOpen = false"
      />
      <template v-if="!sidebarHosted">
        <CodexDrawer
          :open="codexOpen"
          @update:open="codexOpen = $event"
        />
        <WarbondDrawer
          :open="warbondsOpen"
          @update:open="warbondsOpen = $event"
        />
      </template>
      <FeedbackSheet />
      <AppToastStack />
    </div>
  </MotionConfig>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.term-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 60px;
  padding: 0 20px 0 24px;
  border-bottom: 1px solid var(--line-1);
  background: var(--ground);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
}
.brand:hover { color: var(--gold); text-decoration: none; }
.brand-word {
  font-size: 17px;
  letter-spacing: 0.06em;
}

.release-chip {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--khaki);
}

.header-mid {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  justify-content: center;
}

.uplink { height: 32px; }
.uplink-n { color: var(--muted); letter-spacing: 0.16em; }

.ship-nav {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.navb {
  flex-direction: column;
  gap: 0.12rem;
  padding: 0.3rem 0.55rem;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.nav-icon { width: 20px; height: 20px; }

@media (max-width: 720px) {
  .term-header { padding: 0 12px; gap: 10px; }
  .brand-word { font-size: 14px; letter-spacing: 0.04em; }
  .release-chip { display: none; }
  .uplink { display: none; }
  /* Labels stay on phones — playtesters never found Codex/Warbonds behind bare
     icons. Icon and label sit side by side to fit beside the brand. */
  .navb {
    flex-direction: row;
    gap: 6px;
    height: 44px;
    padding: 0 8px;
    font-size: 10px;
    letter-spacing: 0.12em;
  }
  .nav-icon { width: 18px; height: 18px; }
}

@media (max-width: 380px) {
  .term-header { gap: 6px; padding: 0 8px; }
  .brand-word { font-size: 13px; }
  .navb { padding: 0 6px; letter-spacing: 0.08em; }
}
</style>
