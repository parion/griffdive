<script setup lang="ts">
import type { DiveState } from '~~/shared/engine/types'

// The field's Kit, docked where the Kit drawer slides in but non-modal: the
// stage beside it stays live while divers check what they carry.
defineProps<{
  state: DiveState
  selfId: string | null
}>()

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <aside
    class="kit-dock"
    :class="{ closed: !open }"
    aria-label="Field kit"
  >
    <template v-if="open">
      <header class="dock-head">
        <span
          class="dock-mark"
          aria-hidden="true"
        />
        <h2 class="dock-title">
          Kit
        </h2>
        <button
          class="dock-hide"
          type="button"
          aria-label="Hide kit"
          :aria-expanded="true"
          @click="open = false"
        >
          Hide
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            aria-hidden="true"
          ><path
            d="M4 2l4 4-4 4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          /></svg>
        </button>
      </header>
      <p class="dock-desc">
        What each diver carries, with this mission's bans.
      </p>
      <div class="dock-body">
        <KitPanel
          :state="state"
          :self-id="selfId"
        />
      </div>
    </template>
    <button
      v-else
      class="dock-tab"
      type="button"
      aria-label="Show kit"
      :aria-expanded="false"
      @click="open = true"
    >
      <IconKit />
      <span>Kit</span>
    </button>
  </aside>
</template>

<style scoped>
.kit-dock {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: clamp(340px, 32vw, 34rem);
  min-height: 0;
  background: var(--rail);
  border-left: 1px solid var(--line-2);
  box-shadow: -24px 0 60px rgba(0, 0, 0, 0.35);
  animation: dock-in var(--dur-slow) var(--ease-out);
}
.kit-dock.closed {
  width: 48px;
  box-shadow: none;
  animation: none;
}

.dock-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px 4px;
}
.dock-mark { width: 3px; height: 18px; background: var(--gold); box-shadow: 0 0 10px rgba(255, 214, 66, 0.5); }
.dock-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  font-stretch: 125%;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
}
.dock-hide {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  margin-left: auto;
  padding: 0 10px;
  border: 0;
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--khaki);
  font: 700 10px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.dock-hide:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.dock-desc { margin: 0; padding: 0 18px 10px; color: var(--muted); font-size: var(--fs-sm); border-bottom: 1px solid var(--line-1); }
.dock-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 18px 20px;
}

.dock-tab {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 0;
  border: 0;
  background: transparent;
  color: var(--khaki);
  font: 700 11px var(--font-body);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
}
.dock-tab svg { width: 18px; height: 18px; }
.dock-tab span { writing-mode: vertical-rl; }
.dock-tab:hover { color: var(--gold); background: var(--panel); }

@keyframes dock-in {
  from { translate: 100% 0; }
}
</style>
