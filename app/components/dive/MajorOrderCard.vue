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
      <svg
        class="mo-pulse pulse"
        viewBox="0 0 24 24"
        fill="none"
        :stroke="accent"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M5 12a7 7 0 0 1 14 0M8.5 12a3.5 3.5 0 0 1 7 0" />
        <circle
          cx="12"
          cy="12"
          r="1"
        />
        <path d="M12 13v8" />
      </svg>
      <h3 class="lbl mo-incoming">
        Incoming · Major Order
      </h3>
      <span
        v-if="countdown"
        class="mo-ends"
      >{{ countdown }}</span>
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
      <ul class="mo-planets">
        <li
          v-for="planet in order.planets"
          :key="planet.index"
          class="mo-planet"
        >
          <img
            class="mo-planet-front"
            :src="factionImageUrl(planet.front)"
            alt=""
            draggable="false"
          >
          <div class="mo-planet-body">
            <span class="mo-planet-head">
              <span class="mo-planet-name">{{ planet.name }}</span>
              <span class="mo-planet-pct">{{ planet.liberation.toFixed(1) }}%</span>
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
            </span>
          </div>
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
}
.mo-pulse { flex-shrink: 0; width: 1.15rem; height: 1.15rem; }
.mo-incoming { flex: 1; margin: 0; color: var(--gold); }
.mo-ends {
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
}

.mo-brief {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}

.mo-overview { display: grid; gap: 0.5rem; }

.mo-planets {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mo-planet { display: flex; align-items: center; gap: 0.7rem; }
.mo-planet-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.mo-planet-head { display: flex; align-items: center; gap: 0.45rem; }
.mo-planet-front {
  width: 1.75rem;
  height: 1.75rem;
  object-fit: contain;
  flex-shrink: 0;
}
.mo-planet-name {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text);
}
.mo-planet-pct { margin-left: auto; font-weight: 700; color: var(--red); }

.mo-bar {
  position: relative;
  display: block;
  height: 0.4rem;
  background: var(--line-1);
  overflow: hidden;
}
.mo-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: color-mix(in srgb, var(--mo-accent, var(--red)) 80%, #000);
  transition: width var(--dur-med) var(--ease-out);
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
