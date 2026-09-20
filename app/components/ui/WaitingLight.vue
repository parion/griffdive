<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Waiting on a diver' })
</script>

<template>
  <AppTooltip :content="label">
    <span
      class="waiting-light"
      role="img"
      :aria-label="label"
    />
  </AppTooltip>
</template>

<style scoped>
.waiting-light {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
  animation: waiting-pulse 2s ease-in-out infinite;
}

@keyframes waiting-pulse {
  0%, 100% {
    opacity: 0.55;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 55%, transparent);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 0 5px transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .waiting-light {
    animation: none;
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent);
  }
}
</style>
