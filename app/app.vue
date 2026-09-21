<script setup lang="ts">
const changelogOpen = ref(false)
const { codexOpen, warbondsOpen } = useDrawers()
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
            class="chip warn"
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
</style>
