<script setup lang="ts">
// Desktop phases defer their existing controls into DiveFrame's fixed action
// row. Shared surfaces can opt out and keep the controls in their own flow.
withDefaults(defineProps<{ inline?: boolean }>(), { inline: false })

defineSlots<{ default?: () => unknown }>()
</script>

<template>
  <Teleport
    defer
    to="#dive-action-content"
    :disabled="inline"
  >
    <slot />
  </Teleport>
</template>
