<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  // Prefix a plus for a haul being banked rather than a balance.
  signed?: boolean
}>(), { signed: false })

const label = computed(() => `${props.signed ? 'plus ' : ''}${props.value} credits`)
</script>

<template>
  <span
    class="credit-amount"
    role="img"
    :aria-label="label"
  >
    <span
      v-if="signed"
      aria-hidden="true"
    >+</span>
    <IconCredit />
    <span aria-hidden="true">{{ value }}</span>
  </span>
</template>

<style scoped>
.credit-amount {
  display: inline-flex;
  align-items: center;
  gap: 0.18em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.credit-amount :deep(.credit-mark) { width: 0.86em; height: 0.86em; }
</style>
