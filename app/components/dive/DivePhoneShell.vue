<script setup lang="ts">
// The phone terminal: one fixed column, no page scroll. Three fixed bands
// (header · crusade · squad) frame a scrolling body, and the action bar pins to
// the bottom on every screen — info on top, secondary + primary action below.
// Phases fill the bar through `PhoneActionBar`; the sheet slot (host
// moderation) overlays it. The `dock` slot is shell-owned, not a phase's: the
// tool rail (Kit, Codex, Warbonds, Bargains) pinned just above the bar.
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

    <slot name="dock" />

    <footer
      class="phone-bar"
      aria-label="Dive actions"
    >
      <div
        id="phone-bar-detail"
        class="bar-detail"
      />
      <div class="bar-actions">
        <div
          id="phone-bar-secondary"
          class="bar-secondary"
        />
        <div
          id="phone-bar-primary"
          class="bar-primary"
        />
      </div>
    </footer>

    <slot name="sheet" />
  </div>
</template>

<style scoped>
.phone-shell {
  position: relative;
  width: min(100vw, 720px);
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

.phone-bar {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--ground);
  border-top: 1px solid var(--line-2);
}
.bar-detail { min-width: 0; }
.bar-detail:empty { display: none; }
.bar-actions { display: flex; gap: 8px; }
.bar-primary { flex: 1 1 0; min-width: 0; display: flex; }
.bar-secondary { flex: 0 0 auto; width: clamp(88px, 26%, 132px); display: flex; }
.bar-secondary:empty { display: none; }
.bar-primary :deep(.hold-btn) { min-height: 56px; }
</style>
