<script setup lang="ts">
const changelogOpen = ref(false)
const { codexOpen, warbondsOpen, guideOpen } = useDrawers()
</script>

<template>
  <MotionConfig reduced-motion="user">
    <div>
      <a
        href="#main-content"
        class="skip-link"
      >Skip to main content</a>
      <header class="top-bar">
        <div class="row">
          <NuxtLink
            to="/"
            class="brand"
          >GRIFFDIVE</NuxtLink>
          <button
            type="button"
            class="chip warn alpha-chip"
            title="Alpha — click for the changelog"
            aria-haspopup="dialog"
            :aria-expanded="changelogOpen"
            @click="changelogOpen = true"
          >
            alpha
          </button>
        </div>
        <nav aria-label="Primary">
          <button
            type="button"
            class="nav-link"
            aria-haspopup="dialog"
            :aria-expanded="guideOpen"
            @click="guideOpen = true"
          >
            <IconGuide class="nav-icon" />
            Guide
          </button>
          <button
            type="button"
            class="nav-link"
            aria-haspopup="dialog"
            :aria-expanded="codexOpen"
            @click="codexOpen = true"
          >
            <IconBook class="nav-icon" />
            Codex
          </button>
          <button
            type="button"
            class="nav-link"
            aria-haspopup="dialog"
            :aria-expanded="warbondsOpen"
            @click="warbondsOpen = true"
          >
            <IconWarbond class="nav-icon" />
            Warbonds
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
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--teal);
  font: inherit;
  cursor: pointer;
}
.nav-link:hover { text-decoration: underline; }
.nav-icon { opacity: 0.85; }

/* Mobile: the header is tight, so the brand drops its trailing alpha chip and
   the nav becomes a row of boxed, icon-over-label tiles — the chunky bordered
   panels the game's own HUD favours. */
@media (max-width: 640px) {
  .top-bar {
    padding: 0.55rem 0.75rem;
    gap: 0.4rem;
  }
  .alpha-chip { display: none; }
  .brand {
    font-size: 0.95rem;
    letter-spacing: 0.1em;
  }
  .top-bar nav { gap: 0.3rem; }
  .nav-link {
    position: relative;
    flex-direction: column;
    justify-content: center;
    gap: 0.12rem;
    min-width: 3.1rem;
    padding: 0.32rem 0.35rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--khaki);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    line-height: 1;
    text-transform: uppercase;
    overflow: hidden;
  }
  /* The gold service stripe: the one accent that makes the tiles read as HUD
     hardware rather than plain buttons. */
  .nav-link::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: var(--gold);
    opacity: 0.5;
    transition: opacity var(--dur-fast) var(--ease-out);
  }
  .nav-link .nav-icon {
    width: 1.15rem;
    height: 1.15rem;
    color: var(--teal);
    opacity: 1;
  }
  .nav-link:hover {
    text-decoration: none;
    border-color: color-mix(in srgb, var(--gold) 60%, var(--border));
    color: var(--gold);
  }
  .nav-link:hover::before { opacity: 1; }
  .nav-link[aria-expanded='true'] {
    border-color: var(--gold);
    color: var(--gold);
    background: color-mix(in srgb, var(--gold) 12%, var(--bg-raised));
  }
  .nav-link[aria-expanded='true']::before { opacity: 1; }
  .nav-link[aria-expanded='true'] .nav-icon { color: var(--gold); }
}
</style>
