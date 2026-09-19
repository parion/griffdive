<script setup lang="ts">
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'

withDefaults(defineProps<{ text: string, label?: string }>(), { label: 'More info' })
</script>

<template>
  <TooltipProvider :delay-duration="150">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <button
          class="info-tip"
          type="button"
          :aria-label="label"
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="info-tip-content"
          side="top"
          :side-offset="6"
        >
          {{ text }}
          <TooltipArrow
            class="info-tip-arrow"
            :width="11"
            :height="5"
          />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style scoped>
.info-tip {
  display: inline-grid;
  place-items: center;
  width: 1.05rem;
  height: 1.05rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  cursor: help;
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.info-tip:hover,
.info-tip:focus-visible {
  outline: none;
  color: var(--gold);
  border-color: var(--gold);
}

/* Tooltip content is portaled to <body>, outside this component's scope. */
:global(.info-tip-content) {
  z-index: 60;
  width: max-content;
  max-width: 16rem;
  padding: 0.45rem 0.6rem;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.75rem;
  line-height: 1.35;
  box-shadow: 0 6px 20px rgb(0 0 0 / 45%);
}

:global(.info-tip-arrow) {
  fill: var(--bg-raised);
}
</style>
