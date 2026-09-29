<script setup lang="ts">
import { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastViewport } from 'reka-ui'
import { useToasts } from '~/composables/useToasts'

const { toasts, dismiss } = useToasts()
</script>

<template>
  <div class="toast-root">
    <ToastProvider :duration="5000">
      <ToastViewport class="toast-stack">
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
      </ToastViewport>
    </ToastProvider>
  </div>
</template>

<style scoped>
/* Reka's toast parts do not forward the scoped attribute, so their styles hang
   off the wrapper with :deep. The viewport is fixed and must not add height to
   the page — the dive shell is exactly 100vh. */
.toast-root,
.toast-root :deep([role='region']) { display: contents; }

.toast-root :deep(.toast-stack) {
  position: fixed;
  inset-block-end: var(--sp-5);
  inset-inline: 0;
  z-index: 50;
  display: grid;
  justify-items: center;
  gap: var(--sp-3);
  padding: 0 var(--sp-5);
  margin: 0;
  list-style: none;
  outline: none;
}

.toast-root :deep(.toast) {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  max-width: min(90vw, 26rem);
  padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-5);
  background: var(--panel);
  border: 1px solid var(--line-3);
  border-left: 3px solid var(--teal);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  font-size: var(--fs-sm);
}

.toast-root :deep(.toast.warn) { border-left-color: var(--red); }

.toast-root :deep(.toast[data-state='open']) {
  animation: toast-in var(--dur-med) var(--ease-out);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

.toast-root :deep(.toast-close) {
  flex-shrink: 0;
  padding: 0 var(--sp-1);
  border: none;
  background: none;
  color: var(--muted);
  font: inherit;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .toast-root :deep(.toast[data-state='open']) { animation: none; }
}
</style>
