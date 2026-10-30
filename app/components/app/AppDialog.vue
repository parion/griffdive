<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { AnimatePresence, Motion } from 'motion-v'
import { SPRING_SNAP } from '~/utils/motion'

const open = defineModel<boolean>('open', { required: true })

const props = withDefaults(defineProps<{
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dismissible?: boolean
  showClose?: boolean
  // Keeps the title for assistive tech but drops the header row, for content
  // that brings its own heading.
  hideTitle?: boolean
  // `mobile` turns the dialog into a full-viewport sheet at the phone
  // breakpoint (the same 1020px the dive shell uses); `always` takes the
  // viewport at every size.
  fullscreen?: 'mobile' | 'always'
  contentClass?: string
}>(), {
  description: undefined,
  size: 'md',
  dismissible: true,
  showClose: true,
  hideTitle: false,
  fullscreen: undefined,
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
            class="app-dialog cut"
            :class="[
              `app-dialog--${size}`,
              fullscreen === 'always' ? 'app-dialog--fullscreen' : null,
              fullscreen === 'mobile' ? 'app-dialog--fullscreen-mobile' : null,
              contentClass,
            ]"
            :initial="{ opacity: 0, y: 24, scale: 0.97 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 12, scale: 0.98 }"
            :transition="SPRING_SNAP"
          >
            <header
              class="app-dialog-head"
              :class="{ 'sr-only': hideTitle }"
            >
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
              <div
                v-if="$slots.actions"
                class="app-dialog-actions"
              >
                <slot name="actions" />
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
  background: var(--panel);
  border: 1px solid var(--line-3);
  border-top: 3px solid var(--gold);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
}

.app-dialog--sm { width: min(26rem, calc(100vw - 2rem)); }
.app-dialog--md { width: min(42rem, calc(100vw - 2rem)); }
.app-dialog--lg { width: min(52rem, calc(100vw - 2rem)); }
.app-dialog--xl { width: min(64rem, calc(100vw - 2rem)); }

/* A full-viewport takeover: the content owns its own header, safe areas and
   internal scroll. The phone breakpoint matches usePhoneShell's 1020px. */
.app-dialog--fullscreen {
  inset: 0;
  width: 100vw;
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: none;
  display: flex;
  flex-direction: column;
}
.app-dialog--fullscreen .app-dialog-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
@media (max-width: 1020px) {
  .app-dialog--fullscreen-mobile {
    inset: 0;
    width: 100vw;
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: none;
    display: flex;
    flex-direction: column;
  }
  .app-dialog--fullscreen-mobile .app-dialog-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }
}

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
.app-dialog-actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
.app-dialog-title { margin: 0; }
.app-dialog-desc { margin: 0.15rem 0 0; }

.app-dialog-foot {
  border-top: 1px solid var(--border);
  margin-top: 0.9rem;
  padding-top: 0.75rem;
}
</style>
