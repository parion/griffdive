<script setup lang="ts">
import type { DiveState } from '~~/shared/engine/types'

// The field's Kit, docked where the Kit drawer slides in but non-modal: the
// stage beside it stays live while divers check what they carry. On a phone
// it is a sheet pinned to the bottom of the scroll that rises over the field.
withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  sheet?: boolean
}>(), { sheet: false })

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <aside
    class="kit-dock"
    :class="{ closed: !open, sheet }"
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
            :d="sheet ? 'M2 4l4 4 4-4' : 'M4 2l4 4-4 4'"
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
      <small
        v-if="sheet"
        class="tab-hint"
      >What each diver carries</small>
      <svg
        v-if="sheet"
        class="tab-caret"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
      ><path
        d="M2 8l4-4 4 4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      /></svg>
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

.kit-dock.sheet {
  position: sticky;
  bottom: 0;
  width: auto;
  margin-top: auto;
  max-height: 64dvh;
  margin-inline: -12px;
  border-left: 0;
  border-top: 1px solid var(--line-3);
  box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.55);
  animation-name: sheet-rise;
}
.kit-dock.sheet.closed { max-height: none; box-shadow: 0 -12px 28px rgba(0, 0, 0, 0.45); }
.sheet .dock-head { padding: 12px 14px 2px; }
.sheet .dock-desc { padding: 0 14px 8px; }
.sheet .dock-body { padding: 0 14px 16px; }
.sheet .dock-tab {
  flex-direction: row;
  justify-content: flex-start;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
}
.sheet .dock-tab span { writing-mode: horizontal-tb; color: var(--gold); }
.tab-hint {
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: none;
}
.tab-caret { margin-left: auto; color: var(--gold); }

@keyframes sheet-rise {
  from { translate: 0 100%; }
}
</style>
