<script setup lang="ts">
import { DrawerClose, DrawerContent, DrawerDescription, DrawerOverlay, DrawerPortal, DrawerRoot, DrawerTitle } from 'reka-ui'

const props = defineProps<{
  open: boolean
  title: string
  description?: string
}>()

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
      <DrawerOverlay class="drawer-overlay" />
      <DrawerContent class="drawer">
        <header class="row spread drawer-head">
          <DrawerTitle
            as="h2"
            class="drawer-title"
          >
            {{ props.title }}
          </DrawerTitle>
          <DrawerClose
            class="btn tiny ghost"
            :aria-label="`Close ${props.title.toLowerCase()}`"
          >
            Close
          </DrawerClose>
        </header>
        <DrawerDescription
          v-if="props.description"
          as="p"
          class="drawer-desc muted small"
        >
          {{ props.description }}
        </DrawerDescription>
        <div class="drawer-body">
          <slot />
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(9, 10, 7, 0.72);
}

.drawer {
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
.drawer[data-state='open'] { animation: drawer-slide-in 320ms var(--ease-out); }
.drawer[data-state='closed'] { animation: drawer-slide-out 220ms ease-in; }
.drawer[data-swiping] { transition-duration: 0ms; }

@keyframes drawer-slide-in {
  from { translate: 100% 0; }
}
@keyframes drawer-slide-out {
  to { translate: 100% 0; }
}

.drawer-head {
  align-items: baseline;
  padding: 0.9rem 1.1rem 0.6rem;
  border-bottom: 1px solid var(--border);
}
.drawer-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  font-stretch: 125%;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
}
.drawer-desc { padding: 0 1.1rem 0.6rem; margin: 0; }
.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem 1.1rem 1.2rem;
}

@media (prefers-reduced-motion: reduce) {
  .drawer { transition: none; }
  .drawer[data-state='open'],
  .drawer[data-state='closed'] { animation: none; }
}
</style>
