<script setup lang="ts">
const props = defineProps<{
  missionInOperation: number
  opLength: number
  missionIndex: number
  failed?: boolean
}>()

const label = computed(() => props.failed
  ? `Operation failed — mission ${props.missionInOperation} of ${props.opLength} failed. Pick one item to forfeit, then the operation restarts at mission 1`
  : `Operation mission ${props.missionInOperation} of ${props.opLength} — mission ${props.missionIndex + 1} overall`)
</script>

<template>
  <span
    class="mission-track"
    :class="{ failed: props.failed }"
    role="img"
    :aria-label="label"
    :title="label"
  >
    <span
      v-for="m in opLength"
      :key="m"
      class="seg"
      :class="{
        done: m < missionInOperation,
        active: m === missionInOperation,
        down: props.failed && m === missionInOperation,
      }"
    >
      <svg
        v-if="m < missionInOperation"
        class="glyph"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path d="M3 8.5 6.5 12 13 4.5" />
      </svg>
      <svg
        v-else-if="props.failed && m === missionInOperation"
        class="glyph"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
      <span
        v-else
        class="num disp"
      >{{ m }}</span>
    </span>
  </span>
</template>

<style scoped>
.mission-track {
  display: inline-flex;
  align-items: stretch;
  gap: 3px;
}

.seg {
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.1rem;
  border: 1px solid var(--line-3);
  background: var(--ground);
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 700;
  clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px);
}

.seg.done {
  border-color: var(--line-4);
  background: rgba(74, 215, 200, 0.08);
  color: var(--teal);
}

.seg.active {
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.1);
  color: var(--gold);
  animation: seg-pulse 1.8s ease-in-out infinite;
}

/* A failed mission is no longer progress — mark it red and still. */
.mission-track.failed .seg.active,
.mission-track.failed .seg.down {
  border-color: var(--red);
  background: rgba(255, 75, 62, 0.12);
  color: var(--red);
  animation: none;
}

.glyph {
  width: 0.7rem;
  height: 0.7rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes seg-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 214, 66, 0.4); }
  50% { box-shadow: 0 0 0 4px transparent; }
}
</style>
