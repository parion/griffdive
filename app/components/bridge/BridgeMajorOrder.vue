<script setup lang="ts">
import { MAJOR_ORDER_REROLL_BONUS, MAJOR_ORDER_RISK } from '~~/shared/engine/config'
import { FRONTS } from '~~/shared/data/fronts'
import { factionImageUrl } from '~~/shared/data/images'
import type { MajorOrderSelection } from '~~/shared/engine/types'
import type { MajorOrderStatus } from '~/composables/useMajorOrder'

// The live Major Order: pass-through war metadata (never the engine), with a
// one-click campaign that pins the run to the order's front. The Bridge docks
// it in the middle of the ship header on desktop and pins it to the bottom
// edge on phones; it sheds detail by its own width, never the viewport's, so
// a three-front order still fits beside the brand and the ship nav.
const props = defineProps<{
  order: MajorOrderSelection | null
  status: MajorOrderStatus
  pending: boolean
}>()

const emit = defineEmits<{ start: [] }>()

const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})
onBeforeUnmount(() => clearInterval(ticker))

const frontList = computed(() =>
  (props.order?.fronts ?? []).map(id => FRONTS.find(front => front.id === id)?.displayName ?? id))
const frontNames = computed(() => frontList.value.join(' / '))
// A narrow band names the lead front and counts the rest; the emblems show all.
const frontShort = computed(() =>
  frontList.value.length > 1 ? `${frontList.value[0]} +${frontList.value.length - 1}` : frontNames.value)
// The planet worth naming: an open world on the lead front, else any open one.
const planet = computed(() => {
  const planets = props.order?.planets ?? []
  const lead = props.order?.fronts[0]
  return planets.find(p => p.front === lead && p.available !== false)
    ?? planets.find(p => p.available !== false)
    ?? planets[0]
    ?? null
})
const countdown = computed(() => {
  const expires = props.order?.expiresAt ? Date.parse(props.order.expiresAt) : Number.NaN
  if (!Number.isFinite(expires)) {
    return ''
  }
  const ms = expires - now.value
  if (ms <= 0) {
    return 'ending'
  }
  const totalHours = Math.floor(ms / 3_600_000)
  return `${Math.floor(totalHours / 24)}D ${String(totalHours % 24).padStart(2, '0')}H`
})
const emptyCopy = computed(() => {
  switch (props.status) {
    case 'none': return 'No Major Order — the wheel picks the front'
    case 'no-front': return 'Major Order has no front yet — the wheel picks'
    default: return 'War feed offline — the wheel picks the front'
  }
})
</script>

<template>
  <div
    v-if="order"
    class="mo"
  >
    <section
      class="mo-band mo-in"
      aria-label="Major Order"
    >
      <span
        v-if="planet"
        class="mo-lib"
        aria-hidden="true"
        :style="{ width: `${planet.liberation}%` }"
      />
      <span
        class="mo-factions"
        aria-hidden="true"
      >
        <img
          v-for="f in order.fronts"
          :key="f"
          :src="factionImageUrl(f)"
          width="30"
          height="30"
          alt=""
          draggable="false"
        >
      </span>
      <span class="mo-title">
        <span class="mo-k">
          <span
            class="lamp red pulse"
            aria-hidden="true"
          />
          <span>Major Order</span>
          <template v-if="countdown">
            <span
              class="mo-sep"
              aria-hidden="true"
            >·</span>
            <span class="mo-count"><span class="sr-only">Time remaining: </span>{{ countdown }}</span>
          </template>
        </span>
        <span
          class="mo-name"
          :title="frontNames"
        ><span class="mo-name-full">{{ frontNames }}</span><span
          class="mo-name-short"
          aria-hidden="true"
        >{{ frontShort }}</span></span>
      </span>
      <span
        v-if="planet"
        class="mo-planet"
      >
        <span class="mo-planet-head">
          <span class="mo-planet-name">{{ planet.name }}</span>
          <span class="mo-pct">{{ planet.liberation.toFixed(1) }}%</span>
        </span>
        <span
          class="mo-track"
          role="progressbar"
          :aria-label="`${planet.name} liberation`"
          :aria-valuenow="Math.round(planet.liberation)"
          aria-valuemin="0"
          aria-valuemax="100"
        ><span
          class="mo-fill"
          :style="{ width: `${planet.liberation}%` }"
        /></span>
      </span>
      <span class="mo-carrots">
        <span class="mo-carrot">
          <RiskPips
            :value="MAJOR_ORDER_RISK"
            :max="MAJOR_ORDER_RISK"
            tone="gold"
          />Odds
        </span>
        <span class="mo-carrot">+{{ MAJOR_ORDER_REROLL_BONUS }} reroll</span>
      </span>
      <button
        class="btn primary cut-sm mo-start cta-sweep"
        type="button"
        aria-label="Start campaign"
        @click="emit('start')"
      >
        <span class="disp">Start<span class="mo-start-more"> campaign</span></span>
      </button>
    </section>
  </div>
  <div
    v-else-if="!pending"
    class="mo mo-quiet"
  >
    <section
      class="mo-band mo-empty"
      aria-label="Major Order"
    >
      <span class="lamp dim" />
      <span class="mo-empty-copy">{{ emptyCopy }}</span>
    </section>
  </div>
</template>

<style scoped>
/* The wrapper is the size container; the band answers to it. */
.mo {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  justify-content: center;
  container: mo / inline-size;
}

.mo-band {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 1100px;
  min-width: 0;
  height: 44px;
  padding: 0 4px 0 12px;
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--red);
  background:
    linear-gradient(90deg, rgba(255, 75, 62, 0.1), transparent 40%),
    var(--rail);
  overflow: hidden;
}
.mo-band.mo-in { animation: riseIn 0.45s var(--ease-out) both; }
/* Liberation reads along the band's bottom edge. */
.mo-lib {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  background: var(--red);
  box-shadow: 0 0 8px rgba(255, 75, 62, 0.6);
}

.mo-factions { display: flex; flex-shrink: 0; }
.mo-factions img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.8));
}
.mo-factions img + img { margin-left: -12px; }

.mo-title { display: grid; gap: 1px; flex: 1 1 auto; min-width: 0; }
.mo-k {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.2;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--gold);
}
.mo-k .lamp { width: 6px; height: 6px; }
.mo-sep { color: var(--line-5); }
.mo-count { color: var(--text); }
.mo-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.25;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text);
}

.mo-planet { display: none; flex: 0 1 170px; min-width: 110px; gap: 4px; }
.mo-planet-head { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.mo-planet-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--khaki); }
.mo-pct { color: var(--red); }
.mo-track { display: block; height: 4px; background: var(--line-2); }
.mo-fill { display: block; height: 4px; background: var(--red); }

.mo-carrots { display: none; gap: 4px; flex-shrink: 0; }
.mo-carrot {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--gold) 50%, transparent);
  color: var(--gold);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}
.mo-carrot :deep(.pips i) { width: 11px; height: 11px; }

.mo-start { flex-shrink: 0; height: 34px; padding: 0 14px; }
.mo-start .disp { font-size: 12px; white-space: nowrap; }
.mo-start-more { display: none; }
.mo-name-full { display: none; }

/* Detail returns as the band earns room: the planet, the carrots, the full CTA. */
@container mo (min-width: 440px) {
  .mo-name-full { display: inline; }
  .mo-name-short { display: none; }
}
@container mo (min-width: 520px) {
  .mo-start-more { display: inline; }
}
@container mo (min-width: 640px) {
  .mo-planet { display: grid; }
  .mo-lib { display: none; }
}
@container mo (min-width: 1000px) {
  .mo-carrots { display: flex; }
}

.mo-empty { gap: 10px; justify-content: center; border-left-color: var(--line-4); background: transparent; }
.mo-empty-copy {
  overflow: hidden;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--muted);
}
@container mo (max-width: 340px) {
  .mo-empty { display: none; }
}

/* Phones: the order leaves the header and pins to the bottom edge. */
@media (max-width: 860px) {
  .mo {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--line-2);
    background: color-mix(in srgb, var(--ground) 92%, transparent);
    backdrop-filter: blur(8px);
  }
  .mo-band { height: 52px; max-width: none; }
  .mo-start { height: 40px; }
  .mo-quiet { display: none; }
}
</style>
