<script setup lang="ts">
import { useSessionStore } from '~/stores/session'

const route = useRoute()
// The dive renders its own terminal header (crusade, room code, copy, nav), so
// the global bridge header stands down there.
const onDive = computed(() => route.path.startsWith('/dive'))

const changelogOpen = ref(false)
const { codexOpen, warbondsOpen, guideOpen } = useDrawers()
const { online } = useSessionStore()
</script>

<template>
  <MotionConfig reduced-motion="user">
    <div class="app-shell">
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
          <BrandMark :size="26" />
          <span class="brand-word disp">Griffdive</span>
        </NuxtLink>
        <button
          type="button"
          class="chip alpha-chip"
          title="Alpha — click for the changelog"
          aria-haspopup="dialog"
          :aria-expanded="changelogOpen"
          @click="changelogOpen = true"
        >
          Alpha
        </button>
        <div class="grow" />
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
            :aria-expanded="guideOpen"
            @click="guideOpen = true"
          >
            <IconGuide class="nav-icon" />
            <span>Field manual</span>
          </button>
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
      <ChangelogModal
        :open="changelogOpen"
        @close="changelogOpen = false"
      />
      <GuideDrawer
        :open="guideOpen"
        @update:open="guideOpen = $event"
      />
      <CodexDrawer
        :open="codexOpen"
        @update:open="codexOpen = $event"
      />
      <WarbondDrawer
        :open="warbondsOpen"
        @update:open="warbondsOpen = $event"
      />
      <ToastStack />
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

.alpha-chip {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--khaki);
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
  .alpha-chip { display: none; }
  .uplink { display: none; }
  .navb span { display: none; }
  /* Phone hit-size floor: icon-only nav controls stay a 44px touch target. */
  .navb {
    padding: 0;
    width: 44px;
    height: 44px;
    justify-content: center;
  }
}
</style>
