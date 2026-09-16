<script setup lang="ts">
import { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastViewport } from 'reka-ui'
import { useToasts } from '~/composables/useToasts'

const { toasts, dismiss } = useToasts()
</script>

<template>
  <ToastProvider :duration="5000">
    <ToastRoot
      v-for="toast in toasts"
      :key="toast.id"
      :type="toast.tone === 'warn' ? 'foreground' : 'background'"
      class="toast"
      :class="toast.tone"
      @update:open="open => { if (!open) dismiss(toast.id) }"
    >
      <ToastDescription>
        {{ toast.message }}
      </ToastDescription>
      <ToastClose
        class="toast-close"
        aria-label="Dismiss notice"
      >
        <span aria-hidden="true">×</span>
      </ToastClose>
    </ToastRoot>
    <ToastViewport class="toast-stack" />
  </ToastProvider>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  inset-block-end: 1rem;
  inset-inline: 0;
  z-index: 50;
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  margin: 0;
  list-style: none;
  outline: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: min(90vw, 26rem);
  padding: 0.55rem 0.6rem 0.55rem 0.9rem;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-left: 3px solid var(--teal);
  border-radius: 6px;
  box-shadow: 0 8px 24px color-mix(in srgb, #000 45%, transparent);
  font-size: 0.85rem;
}

.toast.warn { border-left-color: var(--red); }

.toast[data-state='open'] {
  animation: toast-in var(--dur-med) var(--ease-out);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

.toast-close {
  flex-shrink: 0;
  padding: 0 0.25rem;
  border: none;
  background: none;
  color: var(--muted);
  font: inherit;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .toast[data-state='open'] { animation: none; }
}
</style>
