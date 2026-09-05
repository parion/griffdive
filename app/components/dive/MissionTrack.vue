<script setup lang="ts">
const props = defineProps<{
  missionInOperation: number
  opLength: number
  missionIndex: number
}>()

const label = computed(() =>
  `Operation mission ${props.missionInOperation} of ${props.opLength} — mission ${props.missionIndex + 1} overall`)
</script>

<template>
  <span
    class="mission-track"
    role="img"
    :aria-label="label"
    :title="label"
  >
    <span
      v-for="m in opLength"
      :key="m"
      class="seg"
      :class="{ done: m < missionInOperation, active: m === missionInOperation }"
    >
      <svg
        v-if="m < missionInOperation"
        class="check"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path d="M3 8.5 6.5 12 13 4.5" />
      </svg>
      <span
        v-else
        class="num"
      >{{ m }}</span>
    </span>
  </span>
</template>

<style scoped>
.mission-track {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.seg {
  display: inline-grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
}

.seg.done {
  border-color: color-mix(in srgb, var(--gold) 55%, var(--border));
  background: color-mix(in srgb, var(--gold) 16%, transparent);
  color: var(--gold);
}

.seg.active {
  border-color: var(--gold);
  color: var(--gold);
  animation: seg-pulse 1.8s ease-in-out infinite;
}

.check {
  width: 0.85rem;
  height: 0.85rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes seg-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 40%, transparent); }
  50% { box-shadow: 0 0 0 4px transparent; }
}
</style>
