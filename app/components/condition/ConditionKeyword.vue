<script setup lang="ts">
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { glossaryEntry } from '~~/shared/data/glossary'

// One underlined rule word. Veterans read straight past it; a newcomer hovers,
// focuses or taps it and the glossary definition opens beside it. It lives
// inside button cards, so every gesture is swallowed here — opening a
// definition never selects the card under it.
const props = defineProps<{ keyword: string }>()

const entry = computed(() => glossaryEntry(props.keyword))
const open = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

function peek(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') {
    return
  }
  clearTimeout(closeTimer)
  open.value = true
}

function unpeek(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') {
    return
  }
  closeTimer = setTimeout(() => {
    open.value = false
  }, 120)
}

function toggle(event: Event): void {
  event.preventDefault()
  event.stopPropagation()
  clearTimeout(closeTimer)
  open.value = !open.value
}

onBeforeUnmount(() => clearTimeout(closeTimer))
</script>

<template>
  <PopoverRoot
    v-if="entry"
    v-model:open="open"
  >
    <PopoverAnchor
      as="span"
      class="kw"
      role="button"
      tabindex="0"
      :aria-expanded="open"
      :aria-label="`${entry.term}: show definition`"
      @pointerenter="peek"
      @pointerleave="unpeek"
      @click="toggle"
      @keydown.enter="toggle"
      @keydown.space="toggle"
    >
      <slot />
    </PopoverAnchor>
    <PopoverPortal>
      <PopoverContent
        class="kw-panel"
        :side-offset="8"
        :collision-padding="12"
        @open-auto-focus.prevent
        @close-auto-focus.prevent
        @pointerenter="peek"
        @pointerleave="unpeek"
      >
        <b class="kw-term">{{ entry.term }}</b>
        <span class="kw-def">{{ entry.definition }}</span>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
  <slot v-else />
</template>

<style scoped>
.kw {
  cursor: help;
  text-decoration: underline dotted;
  text-decoration-color: color-mix(in srgb, var(--gold) 60%, transparent);
  text-underline-offset: 3px;
}
.kw:hover,
.kw[aria-expanded='true'] {
  color: var(--gold);
}

/* The panel is portaled to <body>, outside this component's scope. */
:global(.kw-panel) {
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: min(20rem, calc(100vw - 24px));
  padding: 10px 12px;
  border: 1px solid var(--line-4, var(--line-3));
  border-left: 3px solid var(--gold);
  background: var(--raised);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
  color: var(--khaki);
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  text-transform: none;
  letter-spacing: normal;
}
:global(.kw-panel .kw-term) {
  color: var(--gold);
  font-size: var(--fs-cap);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
