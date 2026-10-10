<script setup lang="ts">
import { BRAND_MARK } from '~/utils/brandMark'

withDefaults(defineProps<{ size?: number, title?: string }>(), { size: 26, title: '' })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="BRAND_MARK.viewBox"
    :role="title ? 'img' : undefined"
    :aria-label="title || undefined"
    :aria-hidden="title ? undefined : 'true'"
    fill="currentColor"
  >
    <g
      class="dial"
      fill="none"
      stroke="currentColor"
    >
      <path
        :d="BRAND_MARK.rim"
        :stroke-width="BRAND_MARK.rimWidth"
      />
      <path
        :d="BRAND_MARK.ticks"
        :stroke-width="BRAND_MARK.tickWidth"
      />
    </g>
    <path :d="BRAND_MARK.wings" />
    <path
      fill-rule="evenodd"
      :d="BRAND_MARK.head"
    />
  </svg>
</template>

<style scoped>
.dial { opacity: 0.6; }
</style>
