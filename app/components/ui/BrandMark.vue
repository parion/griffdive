<script setup lang="ts">
withDefaults(defineProps<{ size?: number, title?: string }>(), { size: 26, title: '' })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 512 512"
    :role="title ? 'img' : undefined"
    :aria-label="title || undefined"
    :aria-hidden="title ? undefined : 'true'"
    fill="none"
    stroke="currentColor"
    stroke-width="48"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M256 84 L256 200" />
    <path d="M160 226 L256 322 L352 226" />
    <path d="M188 362 L256 430 L324 362" />
  </svg>
</template>
