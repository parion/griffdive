<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <AppDrawer
    :open="props.open"
    title="How a dive works"
    description="The six beats of a mission, from spin to reward."
    @update:open="emit('update:open', $event)"
  >
    <DiveGuide />
  </AppDrawer>
</template>
