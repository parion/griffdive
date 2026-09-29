<script setup lang="ts">
// The phone dive's fixed bottom action bar (Destroyer Terminal redesign): a
// detail element (usually the Valor readout) sits directly above the phase's
// single forward action — Deal the pacts, Lock in, File report — or, on the
// reward draft, the token tools with no primary action. It pins to the bottom
// of the scrolling main so the action is always reachable.
</script>

<template>
  <footer class="phone-action">
    <span
      class="bar-notch"
      aria-hidden="true"
    />
    <div
      v-if="$slots.detail"
      class="bar-detail"
    >
      <slot name="detail" />
    </div>
    <div
      v-if="$slots.action"
      class="bar-action"
    >
      <slot name="action" />
    </div>
  </footer>
</template>

<style scoped>
.phone-action {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--ground);
  border-top: 1px solid var(--line-2);
}
.bar-notch {
  position: absolute;
  left: 0;
  top: -1px;
  width: 64px;
  height: 3px;
  background: var(--gold);
}
.bar-detail { min-width: 0; }
.bar-action { display: flex; gap: 8px; }
.bar-action :deep(> *) { min-width: 0; }
</style>
