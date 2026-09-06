<script setup lang="ts">
const changelogOpen = ref(false)
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
          <NuxtLink to="/codex">Codex</NuxtLink>
        </nav>
      </header>
      <NuxtPage />
      <ChangelogModal
        :open="changelogOpen"
        @close="changelogOpen = false"
      />
    </div>
  </MotionConfig>
</template>
