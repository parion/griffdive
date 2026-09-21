<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <AppDrawer
    :open="props.open"
    title="Warbonds"
    description="Declare the warbonds you own — reward offers roll against your own catalog."
    @update:open="emit('update:open', $event)"
  >
    <WarbondBrowser />
  </AppDrawer>
</template>
