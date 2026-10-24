<script setup lang="ts">
import { MAJOR_ORDER_REROLL_BONUS, MAJOR_ORDER_RISK } from '~~/shared/engine/config'
import { FRONTS } from '~~/shared/data/fronts'
import { factionImageUrl } from '~~/shared/data/images'
import type { MajorOrderSelection } from '~~/shared/engine/types'
import type { MajorOrderStatus } from '~/composables/useMajorOrder'

// The live Major Order: pass-through war metadata (never the engine), with a
// one-click campaign that pins the run to the order's front.
const props = defineProps<{
  order: MajorOrderSelection | null
  status: MajorOrderStatus
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

const frontNames = computed(() =>
  (props.order?.fronts ?? [])
    .map(id => FRONTS.find(front => front.id === id)?.displayName ?? id)
    .join(' / '))
const planets = computed(() => (props.order?.planets ?? []).slice(0, 3))
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
    case 'none': return 'No active Major Order — the wheel picks the front.'
    case 'no-front': return 'The Major Order has no active front yet — the wheel picks the front.'
    default: return 'War feed unavailable — the wheel picks the front.'
  }
})
</script>

<template>
  <section
    v-if="order"
    class="mo-band mo-in"
    aria-label="Major Order"
  >
    <span
      class="mo-edge hazard"
      aria-hidden="true"
    />
    <div class="mo-id">
      <span
        class="mo-factions"
        aria-hidden="true"
      >
        <img
          v-for="f in order.fronts"
          :key="f"
          :src="factionImageUrl(f)"
          width="56"
          height="56"
          alt=""
          draggable="false"
        >
      </span>
      <div class="mo-title">
        <span class="lbl mo-k"><span
          class="lamp red pulse"
          aria-hidden="true"
        />Live · Major Order</span>
        <span class="disp mo-name">{{ frontNames }}</span>
        <span
          v-if="countdown"
          class="mo-count"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          ><circle
            cx="12"
            cy="13"
            r="8"
          /><path d="M12 9v4l3 2M9 2h6" /></svg>
          <b>{{ countdown }}</b> remaining
        </span>
      </div>
    </div>

    <ul
      v-if="planets.length"
      class="mo-planets"
      aria-label="Major Order planets"
    >
      <li
        v-for="planet in planets"
        :key="planet.index"
        class="mo-planet"
      >
        <div class="mo-planet-head">
          <span>{{ planet.name }}</span>
          <span class="mo-pct">{{ planet.liberation.toFixed(1) }}%</span>
        </div>
        <div
          class="mo-track"
          role="progressbar"
          :aria-label="`${planet.name} liberation`"
          :aria-valuenow="Math.round(planet.liberation)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span
            class="mo-fill"
            :style="{ width: `${planet.liberation}%` }"
          />
        </div>
      </li>
    </ul>

    <div class="mo-play">
      <div class="mo-carrots">
        <span class="mo-carrot">
          <RiskPips
            :value="MAJOR_ORDER_RISK"
            :max="MAJOR_ORDER_RISK"
            tone="gold"
          />Better odds
        </span>
        <span class="mo-carrot">
          <span
            class="hex mo-hex"
            aria-hidden="true"
          />+{{ MAJOR_ORDER_REROLL_BONUS }} reroll / op
        </span>
      </div>
      <button
        class="btn primary cut-sm mo-start cta-sweep"
        type="button"
        @click="emit('start')"
      >
        <span class="disp">Start campaign</span>
      </button>
    </div>
  </section>
  <section
    v-else
    class="mo-band mo-empty"
    aria-label="Major Order"
  >
    <span class="lbl mo-k">Major Order</span>
    <span class="muted small">{{ emptyCopy }}</span>
  </section>
</template>

<style scoped>
.mo-band {
  position: relative;
  display: grid;
  gap: 18px 28px;
  align-items: center;
  padding: 22px 24px 22px 32px;
  border: 1px solid var(--line-3);
  grid-template-columns: minmax(0, 1fr);
  background:
    radial-gradient(60% 120% at 0% 50%, rgba(255, 75, 62, 0.1), transparent 70%),
    var(--rail);
}
.mo-band.mo-in { animation: riseIn 0.55s var(--ease-out) both; }
@media (min-width: 1020px) {
  .mo-band.mo-in { grid-template-columns: auto minmax(0, 1fr) auto; }
}
.mo-empty { display: flex; flex-wrap: wrap; gap: 12px; padding-block: 16px; }
.mo-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
.mo-id { display: flex; align-items: center; gap: 18px; min-width: 0; }
.mo-factions { display: flex; flex-shrink: 0; }
.mo-factions img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.8));
}
.mo-factions img + img { margin-left: -18px; }
.mo-title { display: grid; gap: 4px; min-width: 0; }
.mo-k { display: inline-flex; align-items: center; gap: 8px; color: var(--gold); }
.mo-name { font-size: clamp(18px, 1.8vw, 24px); line-height: 1.1; color: var(--text); overflow-wrap: anywhere; }
.mo-count { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--khaki); }
.mo-count b { color: var(--text); }
.mo-planets { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; min-width: 0; }
.mo-planet { display: grid; gap: 5px; min-width: 0; }
.mo-planet-head { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.mo-pct { color: var(--red); }
.mo-track { height: 6px; background: var(--line-2); }
.mo-fill { display: block; height: 6px; background: var(--red); box-shadow: 0 0 10px rgba(255, 75, 62, 0.5); animation: growX 1.1s var(--ease-out) 0.3s both; transform-origin: left center; }
.mo-play { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.mo-carrots { display: flex; flex-wrap: wrap; gap: 6px; }
.mo-carrot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--gold) 60%, transparent);
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}
.mo-hex { width: 10px; height: 11px; background: var(--gold); }
.mo-start { height: 46px; padding: 0 22px; }
.mo-start .disp { font-size: 14px; }
@media (min-width: 1020px) {
  .mo-play { flex-direction: column; align-items: stretch; grid-column: 3; }
}
</style>
