<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'

withDefaults(defineProps<{
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  disabled?: boolean
}>(), {
  side: 'top',
  delayDuration: 300,
  disabled: false,
})
</script>

<template>
  <TooltipProvider>
    <TooltipRoot
      :delay-duration="delayDuration"
      :disabled="disabled"
    >
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          class="app-tooltip"
          :side="side"
          :side-offset="6"
        >
          {{ content }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style scoped>
/* Tooltip content is portaled to <body>, outside this component's scope. */
:global(.app-tooltip) {
  z-index: 60;
  max-width: 18rem;
  padding: 0.35rem 0.55rem;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.75rem;
  line-height: 1.35;
  box-shadow: 0 8px 24px color-mix(in srgb, #000 45%, transparent);
}
</style>
