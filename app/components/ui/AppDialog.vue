<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { AnimatePresence, Motion } from 'motion-v'
import { SPRING_SNAP } from '~/utils/motion'

const open = defineModel<boolean>('open', { required: true })

const props = withDefaults(defineProps<{
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  dismissible?: boolean
  showClose?: boolean
  contentClass?: string
}>(), {
  description: undefined,
  size: 'md',
  dismissible: true,
  showClose: true,
  contentClass: undefined,
})

const emit = defineEmits<{ openAutoFocus: [event: Event] }>()

function blockDismiss(event: Event): void {
  if (!props.dismissible) {
    event.preventDefault()
  }
}
</script>

<template>
  <DialogRoot
    v-model:open="open"
    modal
  >
    <DialogPortal>
      <AnimatePresence multiple>
        <DialogOverlay as-child>
          <Motion
            class="app-dialog-overlay"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :exit="{ opacity: 0 }"
            :transition="{ duration: 0.15 }"
          />
        </DialogOverlay>
        <DialogContent
          as-child
          aria-modal="true"
          @escape-key-down="blockDismiss"
          @pointer-down-outside="blockDismiss"
          @open-auto-focus="emit('openAutoFocus', $event)"
        >
          <Motion
            class="app-dialog"
            :class="[`app-dialog--${size}`, contentClass]"
            :initial="{ opacity: 0, y: 24, scale: 0.97 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 12, scale: 0.98 }"
            :transition="SPRING_SNAP"
          >
            <header class="app-dialog-head">
              <div class="app-dialog-heading">
                <DialogTitle
                  as="h2"
                  class="app-dialog-title"
                >
                  <slot name="title">
                    {{ title }}
                  </slot>
                </DialogTitle>
                <DialogDescription
                  v-if="description || $slots.description"
                  as="p"
                  class="app-dialog-desc muted small"
                >
                  <slot name="description">
                    {{ description }}
                  </slot>
                </DialogDescription>
              </div>
              <DialogClose
                v-if="showClose"
                class="btn tiny ghost"
                aria-label="Close dialog"
              >
                Close
              </DialogClose>
            </header>
            <div class="app-dialog-body">
              <slot />
            </div>
            <footer
              v-if="$slots.footer"
              class="app-dialog-foot"
            >
              <slot name="footer" />
            </footer>
          </Motion>
        </DialogContent>
      </AnimatePresence>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.app-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(9, 10, 7, 0.72);
}

.app-dialog {
  position: fixed;
  inset: 0;
  z-index: 41;
  margin: auto;
  height: fit-content;
  max-height: min(84vh, 760px);
  overflow: auto;
  padding: 1.1rem 1.25rem 1.25rem;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

.app-dialog--sm { width: min(26rem, calc(100vw - 2rem)); }
.app-dialog--md { width: min(42rem, calc(100vw - 2rem)); }
.app-dialog--lg { width: min(52rem, calc(100vw - 2rem)); }

.app-dialog-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.6rem;
  margin-bottom: 0.75rem;
}

.app-dialog-heading { min-width: 0; }
.app-dialog-title { margin: 0; }
.app-dialog-desc { margin: 0.15rem 0 0; }

.app-dialog-foot {
  border-top: 1px solid var(--border);
  margin-top: 0.9rem;
  padding-top: 0.75rem;
}
</style>
