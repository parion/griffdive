<script setup lang="ts">
import { BRAND_MARK } from '~/utils/brandMark'
</script>

<!-- The brand mark without its dial: at nav-icon size the rim and ticks blur into noise. -->
<template>
  <svg
    viewBox="50 72 412 412"
    fill="currentColor"
    aria-hidden="true"
  >
    <path :d="BRAND_MARK.wings" />
    <path
      fill-rule="evenodd"
      :d="BRAND_MARK.head"
    />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 1.35rem;
  height: 1.35rem;
}
</style>
