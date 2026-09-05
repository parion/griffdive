<script setup lang="ts">
withDefaults(defineProps<{ value: number, max?: number }>(), { max: 5 })
</script>

<template>
  <span
    class="pips"
    role="img"
    :aria-label="`risk ${value} of ${max}`"
  >
    <i
      v-for="i in max"
      :key="i"
      :class="{ on: i <= value }"
      :style="{ '--i': i - 1 }"
    />
  </span>
</template>
