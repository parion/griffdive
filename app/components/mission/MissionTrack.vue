<script setup lang="ts">
// The operation as a row of drops: secured ones lit, the next one breathing.
// Shared by the debrief and the regroup between missions.
defineProps<{
  mission: number
  opLength: number
  phone?: boolean
}>()
</script>

<template>
  <ol
    class="track"
    :class="{ phone }"
    :aria-label="`Operation progress: mission ${mission} of ${opLength} secured`"
  >
    <li
      v-for="i in opLength"
      :key="i"
      class="seg"
      :class="{ done: i <= mission, next: i === mission + 1 }"
      :style="{ '--i': i - 1 }"
    >
      <span class="seg-num disp">{{ i }}</span>
      <span class="seg-word">{{ i <= mission ? 'Secured' : i === mission + 1 ? 'Next drop' : 'Ahead' }}</span>
    </li>
  </ol>
</template>

<style scoped>
.track {
  display: flex;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.seg {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
  height: 46px;
  padding: 0 22px 0 26px;
  color: var(--dim);
  background: var(--panel);
  box-shadow: inset 0 -2px 0 var(--line-3);
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%, 13px 50%);
  animation: rungOn 0.5s var(--ease-out) both;
  animation-delay: calc(var(--i) * 90ms);
}
.seg:first-child {
  padding-left: 16px;
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%);
}
.seg-num { font-size: 20px; font-variant-numeric: lining-nums; }
.seg-word { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
.seg.done { color: var(--teal); background: color-mix(in srgb, var(--teal) 12%, var(--panel)); box-shadow: inset 0 -2px 0 var(--teal); }
.seg.next {
  color: var(--gold);
  box-shadow: inset 0 -2px 0 var(--gold);
  animation: rungOn 0.5s var(--ease-out) both, next-breathe 2.2s ease-in-out 0.8s infinite;
  animation-delay: calc(var(--i) * 90ms), 0.8s;
}
@keyframes next-breathe { 50% { background: color-mix(in srgb, var(--gold) 14%, var(--panel)); } }
.track.phone { width: 100%; }
.track.phone .seg { flex: 1; min-width: 0; height: 40px; padding: 0 8px 0 16px; gap: 6px; }
.track.phone .seg:first-child { padding-left: 10px; }
.track.phone .seg-word { display: none; }
</style>
