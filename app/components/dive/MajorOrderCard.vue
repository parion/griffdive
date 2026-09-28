<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import { factionImageUrl } from '~~/shared/data/images'
import { MAJOR_ORDER_REROLL_BONUS, MAJOR_ORDER_RISK } from '~~/shared/engine/config'
import type { MajorOrderSelection } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  order: MajorOrderSelection
  playable?: boolean
  canControl?: boolean
}>(), { playable: false, canControl: true })

const emit = defineEmits<{ play: [] }>()

// The in-game "Ends in" ticks, so refresh it on a slow cadence rather than
// freezing the value at render.
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})
onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

const countdown = computed(() => {
  const expires = props.order.expiresAt ? Date.parse(props.order.expiresAt) : Number.NaN
  if (!Number.isFinite(expires)) {
    return ''
  }
  const ms = expires - now.value
  if (ms <= 0) {
    return 'ending'
  }
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
})

const frontsLabel = computed(() =>
  props.order.fronts
    .map(id => FRONTS.find(front => front.id === id)?.displayName ?? id)
    .join(' / '),
)

// The card frames itself in the order's faction color, falling back to gold.
const accent = computed(() =>
  FRONTS.find(front => front.id === props.order.fronts[0])?.accent ?? 'var(--gold)')

function liberationWidth(value: number): string {
  return `${Math.min(100, Math.max(0, value))}%`
}
</script>

<template>
  <article
    class="mo-card cut rise"
    :class="{ playable }"
    :style="{ '--mo-accent': accent }"
  >
    <header class="mo-head">
      <span
        class="mo-emblem"
        aria-hidden="true"
      />
      <h3 class="mo-title disp">
        Major Order
      </h3>
      <span
        v-if="countdown"
        class="mo-ends cap"
      >Ends in <b>{{ countdown }}</b></span>
    </header>

    <p
      v-if="order.title"
      class="mo-brief"
    >
      {{ order.title }}
    </p>

    <section
      v-if="order.planets?.length"
      class="mo-overview"
    >
      <h4 class="mo-overview-title cap">
        <span
          class="mo-overview-icon"
          aria-hidden="true"
        />
        Order overview
      </h4>
      <ul class="mo-planets">
        <li
          v-for="planet in order.planets"
          :key="planet.index"
          class="mo-planet"
        >
          <span class="mo-planet-head">
            <img
              class="mo-planet-front"
              :src="factionImageUrl(planet.front)"
              alt=""
              draggable="false"
            >
            <span class="mo-planet-name">Liberate <strong>{{ planet.name }}</strong></span>
            <span
              class="mo-check"
              :class="{ done: planet.liberation >= 100 }"
              aria-hidden="true"
            />
          </span>
          <span
            class="mo-bar"
            role="progressbar"
            :aria-label="`${planet.name} liberation`"
            :aria-valuenow="Math.round(planet.liberation)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span
              class="mo-bar-fill"
              :style="{ width: liberationWidth(planet.liberation) }"
            />
            <span class="mo-bar-pct">{{ planet.liberation.toFixed(1) }}%</span>
          </span>
        </li>
      </ul>
    </section>

    <div class="mo-stats">
      <div class="mo-stat">
        <span class="lbl">Front</span>
        <span
          class="mo-stat-val"
          :style="{ color: accent }"
        >Pinned</span>
      </div>
      <div class="mo-stat">
        <span class="lbl">Each mission</span>
        <span class="mo-stat-val risk">+{{ MAJOR_ORDER_RISK }} risk</span>
      </div>
      <div class="mo-stat">
        <span class="lbl">On clear</span>
        <span class="mo-stat-val gold">+{{ MAJOR_ORDER_REROLL_BONUS }} reroll</span>
      </div>
    </div>

    <button
      v-if="playable"
      class="btn primary cut mo-play"
      type="button"
      :disabled="!canControl"
      @click="emit('play')"
    >
      Play this order — {{ frontsLabel }}
    </button>
    <p
      v-if="playable"
      class="mo-play-note cap"
    >
      +{{ MAJOR_ORDER_RISK }} team risk · +{{ MAJOR_ORDER_REROLL_BONUS }} reroll token on completion
    </p>
  </article>
</template>

<style scoped>
.mo-card {
  position: relative;
  display: grid;
  gap: 0.7rem;
  padding: 14px 16px 16px;
  background: var(--panel);
  border: 1px solid var(--line-3);
}
.mo-card.playable { border-color: color-mix(in srgb, var(--mo-accent) 45%, var(--line-3)); }

.mo-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--line-2);
}
.mo-emblem {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  background-color: var(--mo-accent);
  mask-image: url('/images/iconSVGs/skull-and-crossbones.svg');
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-image: url('/images/iconSVGs/skull-and-crossbones.svg');
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}
.mo-title {
  margin: 0;
  flex: 1;
  font-size: 1.05rem;
  letter-spacing: 0.12em;
  color: var(--text);
}
.mo-ends {
  flex-shrink: 0;
  padding: 0.2rem 0.45rem;
  color: var(--on-gold);
  background: var(--gold);
}
.mo-ends b { color: var(--on-gold); }

.mo-brief {
  margin: 0;
  color: var(--khaki);
  line-height: 1.4;
}

.mo-overview { display: grid; gap: 0.5rem; }
.mo-overview-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--red);
}
.mo-overview-icon {
  width: 0.85rem;
  height: 0.85rem;
  background-color: var(--red);
  mask-image: url('/images/iconSVGs/missile.svg');
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-image: url('/images/iconSVGs/missile.svg');
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}

.mo-planets {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mo-planet { display: grid; gap: 0.25rem; }
.mo-planet-head { display: flex; align-items: center; gap: 0.45rem; }
.mo-planet-front {
  width: 1.15rem;
  height: 1.15rem;
  object-fit: contain;
  flex-shrink: 0;
}
.mo-planet-name { color: var(--khaki); }
.mo-planet-name strong { color: var(--text); }
.mo-check {
  margin-left: auto;
  width: 0.85rem;
  height: 0.85rem;
  border: 1px solid var(--line-4);
  flex-shrink: 0;
}
.mo-check.done { background: var(--teal); border-color: var(--teal); }

.mo-bar {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 1.05rem;
  background: var(--line-1);
  overflow: hidden;
}
.mo-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: color-mix(in srgb, var(--mo-accent, var(--red)) 80%, #000);
  transition: width var(--dur-med) var(--ease-out);
}
.mo-bar-pct {
  position: relative;
  padding-left: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--on-gold);
  text-shadow: 0 1px 0 color-mix(in srgb, #000 55%, transparent);
}

.mo-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.mo-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px;
  border: 1px solid var(--line-2);
}
.mo-stat .lbl { font-size: 9px; }
.mo-stat-val {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.mo-stat-val.risk { color: var(--orange); }
.mo-stat-val.gold { color: var(--gold); }

.mo-play { width: 100%; }
.mo-play-note {
  margin: 0;
  color: var(--muted);
  white-space: normal;
}
</style>
