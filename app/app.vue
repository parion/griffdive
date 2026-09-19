<script setup lang="ts">
const changelogOpen = ref(false)
const codexOpen = ref(false)
</script>

<template>
  <MotionConfig reduced-motion="user">
    <div>
      <header class="top-bar">
        <div class="row">
          <NuxtLink
            to="/"
            class="brand"
          >GRIFFDIVE</NuxtLink>
          <button
            type="button"
            class="chip warn"
            title="Pre-alpha — click for the changelog"
            aria-haspopup="dialog"
            :aria-expanded="changelogOpen"
            @click="changelogOpen = true"
          >
            pre-alpha
          </button>
        </div>
        <nav>
          <button
            type="button"
            class="nav-link"
            aria-haspopup="dialog"
            :aria-expanded="codexOpen"
            @click="codexOpen = true"
          >
            Codex
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
      <ToastStack />
    </div>
  </MotionConfig>
</template>

<style scoped>
.nav-link {
  padding: 0;
  border: none;
  background: none;
  color: var(--teal);
  font: inherit;
  cursor: pointer;
}
.nav-link:hover { text-decoration: underline; }
</style>
