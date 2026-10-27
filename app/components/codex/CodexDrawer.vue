<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <AppDrawer
    :open="props.open"
    title="Armory"
    description="Every item, tier and warbond in the catalog."
    @update:open="emit('update:open', $event)"
  >
    <CodexBrowser />
  </AppDrawer>
</template>
