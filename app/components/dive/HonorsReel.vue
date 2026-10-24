<script setup lang="ts">
import { BONUS_STATS } from '~~/shared/engine/config'
import type { BonusStat } from '~~/shared/engine/config'
import { HONORS_REEL_MS } from '~/utils/motion'

// The Squad Honors slot reel. Presentation only: the stat is the engine's
// seeded result; this strip just winds down onto it when it arrives.
const props = defineProps<{ stat: BonusStat | null }>()
const emit = defineEmits<{ landed: [] }>()

// Presentation-only glyph per end-of-mission stat; `BONUS_STATS` stays the
// engine's contract.
const STAT_ICONS: Readonly<Record<string, string>> = {
  kills: 'M13 2L4 14h6l-1 8 9-12h-6z',
  accuracy: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18M12 7.5a4.5 4.5 0 1 0 0 9M12 12h.01',
  shotsFired: 'M3 12h13M13 8l4 4-4 4M3 8v8',
  shotsHit: 'M12 3v18M3 12h18M12 7a5 5 0 1 0 0 10M12 12h.01',
  deaths: 'M12 3a7 7 0 0 0-7 7v4l2 2v3h10v-3l2-2v-4a7 7 0 0 0-7-7M9.5 11h.01M14.5 11h.01M10 16h4',
  stimsUsed: 'M14 3l7 7M16.5 5.5L12 10M11 9l4 4M6 14l4 4M4 20l6-6-4-4-6 6z',
  accidentals: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
  samplesExtracted: 'M5 21L19 7M13 3c3 0 6 2 7 5M11 3c-1 0-2 .5-3 1.5M8 6l10 10',
  stratagemsUsed: 'M6 3l6 5 6-5M6 12l6 5 6-5',
  meleeKills: 'M4 20l7-7M11 13L20 4l-1-1-9 9M18 11l2 2M15 8l2 2',
  timesReinforcing: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  friendlyFireDamage: 'M12 3l9 16H3zM12 10v4M12 17h.01',
}

// The strip is the stat pool repeated so it can wind down onto the winner
// from well above it.
const COPIES = 4
const ROW_H = 44
const rows = Array.from({ length: COPIES }, () => BONUS_STATS).flat()

function offsetFor(row: number): number {
  return ROW_H - row * ROW_H
}

// The strip parks a copy down so a stat shows above and below the band.
const IDLE_OFFSET = offsetFor(BONUS_STATS.length)

const landed = ref(false)
const spinning = ref(false)
const offset = ref(IDLE_OFFSET)

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
let timer: ReturnType<typeof setTimeout> | undefined
// A stat already set at mount is a settled result, not a fresh spin.
let first = true

watch(() => props.stat, (stat) => {
  clearTimeout(timer)
  const settled = first
  first = false
  if (!stat) {
    landed.value = false
    spinning.value = false
    offset.value = IDLE_OFFSET
    return
  }
  const win = Math.max(0, BONUS_STATS.findIndex(entry => entry.id === stat.id))
  const target = offsetFor(BONUS_STATS.length * 2 + win)
  if (reduced || settled) {
    offset.value = target
    landed.value = true
    emit('landed')
    return
  }
  landed.value = false
  spinning.value = true
  offset.value = IDLE_OFFSET
  requestAnimationFrame(() => {
    offset.value = target
  })
  timer = setTimeout(() => {
    spinning.value = false
    landed.value = true
    emit('landed')
  }, HONORS_REEL_MS)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    class="reel ticks"
    :class="{ landed, spinning }"
    :style="{ '--row-h': `${ROW_H}px` }"
  >
    <div
      class="view"
      aria-hidden="true"
    >
      <div
        class="strip"
        :style="{ transform: `translateY(${offset}px)`, transitionDuration: spinning ? `${HONORS_REEL_MS}ms` : '0ms' }"
      >
        <div
          v-for="(entry, index) in rows"
          :key="`${entry.id}-${index}`"
          class="row"
          :class="{ win: landed && stat?.id === entry.id }"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path :d="STAT_ICONS[entry.id] ?? ''" /></svg>
          <span class="disp label">{{ entry.label }}</span>
        </div>
      </div>
    </div>
    <span
      class="band"
      aria-hidden="true"
    />
    <span
      class="tri left"
      aria-hidden="true"
    />
    <span
      class="tri right"
      aria-hidden="true"
    />
    <span
      class="sr-only"
      aria-live="polite"
    >{{ landed && stat ? `Squad Honors stat: ${stat.label}` : '' }}</span>
  </div>
</template>

<style scoped>
.reel {
  position: relative;
  overflow: hidden;
  width: min(100%, 360px);
  height: calc(var(--row-h) * 3);
  background: var(--ground);
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.view {
  position: absolute;
  inset: 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 30%, #000 70%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 30%, #000 70%, transparent 100%);
}
.strip {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.12, 0.64, 0.14, 1);
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: var(--row-h);
  padding: 0 34px 0 30px;
  color: var(--khaki);
  opacity: 0.5;
}
.row.win { color: var(--gold); opacity: 1; }
.row svg { flex: none; }
.label {
  min-width: 0;
  overflow: hidden;
  font-size: 1.05rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.band {
  position: absolute;
  left: 8px;
  right: 8px;
  top: var(--row-h);
  height: var(--row-h);
  border-top: 1px solid var(--line-4);
  border-bottom: 1px solid var(--line-4);
  background: color-mix(in srgb, var(--gold) 9%, transparent);
  pointer-events: none;
}
.reel.spinning .band { border-color: var(--gold); }
.reel.landed .band { animation: bandFlash 0.5s ease-out both; }
.tri {
  position: absolute;
  top: calc(var(--row-h) * 1.5 - 8px);
  width: 11px;
  height: 16px;
  background: var(--gold);
}
.tri.left { left: 8px; clip-path: polygon(0 0, 100% 50%, 0 100%); }
.tri.right { right: 8px; clip-path: polygon(100% 0, 0 50%, 100% 100%); }
</style>
