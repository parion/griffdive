<script setup lang="ts">
// A large Valor figure: the whole number holds the weight, the fractional tail
// (decimal point included) drops to smaller type so the digits left of the
// decimal read as the headline.
const props = defineProps<{ value: string | number }>()

const parts = computed(() => {
  const [whole, fraction] = String(props.value).split('.')
  return { whole, fraction }
})
</script>

<template>
  <span class="valor-figure"><span class="whole">{{ parts.whole }}</span><span
    v-if="parts.fraction"
    class="frac"
  >.{{ parts.fraction }}</span></span>
</template>

<style scoped>
.valor-figure { font-variant-numeric: tabular-nums; }
.frac { font-size: 0.68em; }
</style>
