<script setup lang="ts">
import type { CrusadeVariant } from '~~/shared/engine/types'

defineProps<{ canControl: boolean }>()

const emit = defineEmits<{ start: [variant: CrusadeVariant] }>()

// Online-room lobby: the host configures and launches the crusade here.
const variant = ref<CrusadeVariant>('standard')
</script>

<template>
  <section
    v-if="canControl"
    class="panel"
  >
    <h2>Launch the crusade</h2>
    <CrusadeSetup
      v-model:variant="variant"
      start-label="Launch crusade"
      @start="emit('start', variant)"
    />
  </section>
  <p
    v-else
    class="panel muted"
  >
    Waiting for the host to launch the crusade…
  </p>
</template>
