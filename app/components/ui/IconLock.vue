<script setup lang="ts">
// A padlock: closed when a decision is locked in, open (shackle raised and
// hinged clear of the body) when it is still open — pending or opted out.
withDefaults(defineProps<{ open?: boolean }>(), { open: false })
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect
      x="5"
      y="10.5"
      width="14"
      height="9.5"
      rx="2.2"
    />
    <path
      v-if="open"
      d="M8.5 10.5V7.2a3.5 3.5 0 0 1 6.9-0.9"
    />
    <path
      v-else
      d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"
    />
    <circle
      cx="12"
      cy="15.1"
      r="1.35"
      fill="currentColor"
      stroke="none"
    />
  </svg>
</template>
