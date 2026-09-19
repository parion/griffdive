<script setup lang="ts">
import { DrawerClose, DrawerContent, DrawerDescription, DrawerOverlay, DrawerPortal, DrawerRoot, DrawerTitle } from 'reka-ui'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <DrawerRoot
    :open="props.open"
    swipe-direction="right"
    modal
    @update:open="emit('update:open', $event)"
  >
    <DrawerPortal>
      <DrawerOverlay class="codex-overlay" />
      <DrawerContent class="codex-drawer">
        <header class="row spread codex-drawer-head">
          <DrawerTitle
            as="h2"
            class="codex-drawer-title"
          >
            Codex
          </DrawerTitle>
          <DrawerClose
            class="btn tiny ghost"
            aria-label="Close codex"
          >
            Close
          </DrawerClose>
        </header>
        <DrawerDescription
          as="p"
          class="codex-drawer-desc muted small"
        >
          Every item, tier and warbond in the catalog.
        </DrawerDescription>
        <div class="codex-drawer-body">
          <CodexBrowser />
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<style scoped>
.codex-overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(9, 10, 7, 0.72);
}

.codex-drawer {
  position: fixed;
  inset-block: 0;
  right: 0;
  z-index: 46;
  display: flex;
  flex-direction: column;
  width: min(92vw, 34rem);
  background: var(--bg-raised);
  border-left: 1px solid var(--border);
  box-shadow: -24px 0 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  transform: translateX(var(--drawer-swipe-movement-x, 0px));
  transition: transform 450ms cubic-bezier(0.32, 0.72, 0, 1);
}
.codex-drawer[data-state='open'] { animation: codex-slide-in 320ms var(--ease-out); }
.codex-drawer[data-state='closed'] { animation: codex-slide-out 220ms ease-in; }
.codex-drawer[data-swiping] { transition-duration: 0ms; }

@keyframes codex-slide-in {
  from { translate: 100% 0; }
}
@keyframes codex-slide-out {
  to { translate: 100% 0; }
}

.codex-drawer-head {
  align-items: baseline;
  padding: 0.9rem 1.1rem 0.6rem;
  border-bottom: 1px solid var(--border);
}
.codex-drawer-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  font-stretch: 125%;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
}
.codex-drawer-desc { padding: 0 1.1rem 0.6rem; margin: 0; }
.codex-drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem 1.1rem 1.2rem;
}

@media (prefers-reduced-motion: reduce) {
  .codex-drawer { transition: none; }
  .codex-drawer[data-state='open'],
  .codex-drawer[data-state='closed'] { animation: none; }
}
</style>
