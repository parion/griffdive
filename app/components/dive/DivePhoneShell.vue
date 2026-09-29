<script setup lang="ts">
// The phone terminal: one fixed 390-ish column, no page scroll. Three fixed
// bands (header · crusade · squad) frame a scrolling body, and an optional
// bottom sheet pins the phase's Valor + CTA above the fold.
</script>

<template>
  <div class="phone-shell">
    <slot name="header" />
    <slot name="crusade" />
    <slot name="squad" />

    <main
      id="main-content"
      class="phone-main grid-bg scan"
      tabindex="-1"
    >
      <slot />
    </main>

    <slot name="sheet" />
  </div>
</template>

<style scoped>
.phone-shell {
  width: min(100vw, 430px);
  height: 100dvh;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--ground);
  border-inline: 1px solid var(--line-1);
}

.phone-main {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}
.phone-main :deep(> *) { min-width: 0; }
</style>
