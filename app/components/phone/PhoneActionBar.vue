<script setup lang="ts">
// The phone dive's one fixed bottom bar. The frame lives in DivePhoneShell and
// never changes between screens: page-relevant info (usually the Valor readout)
// sits on top, the phase's forward action fills the bottom row, and an optional
// secondary action sits to its left. Each phase fills those zones through this
// component, so the bar looks and behaves the same on every screen.
//
// `inline` renders the slots in place instead — for panels shared with the
// desktop dive, which have no bar.
defineProps<{ inline?: boolean }>()
defineSlots<{
  detail?: () => unknown
  secondary?: () => unknown
  primary?: () => unknown
}>()
</script>

<template>
  <Teleport
    v-if="$slots.detail"
    defer
    to="#phone-bar-detail"
    :disabled="inline"
  >
    <slot name="detail" />
  </Teleport>
  <Teleport
    v-if="$slots.secondary"
    defer
    to="#phone-bar-secondary"
    :disabled="inline"
  >
    <slot name="secondary" />
  </Teleport>
  <Teleport
    v-if="$slots.primary"
    defer
    to="#phone-bar-primary"
    :disabled="inline"
  >
    <slot name="primary" />
  </Teleport>
</template>
