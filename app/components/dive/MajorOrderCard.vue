<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
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
</script>

<template>
  <article class="mo-card">
    <header class="mo-head">
      <span
        class="mo-emblem"
        aria-hidden="true"
      />
      <h3 class="mo-title">
        Major Order
      </h3>
      <span
        v-if="countdown"
        class="mo-ends"
      >Ends in: <strong>{{ countdown }}</strong></span>
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
      <h4 class="mo-overview-title">
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
            <span
              class="mo-check"
              :class="{ done: planet.liberation >= 100 }"
              aria-hidden="true"
            />
            <span class="mo-planet-name">Liberate <strong>{{ planet.name }}</strong></span>
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
              :style="{ width: `${Math.min(100, Math.max(0, planet.liberation))}%` }"
            />
            <span class="mo-bar-pct">{{ planet.liberation.toFixed(1) }}%</span>
          </span>
        </li>
      </ul>
    </section>

    <button
      v-if="playable"
      class="btn primary mo-play"
      type="button"
      :disabled="!canControl"
      @click="emit('play')"
    >
      Play this order — {{ frontsLabel }}
    </button>
  </article>
</template>

<style scoped>
.mo-card {
  display: grid;
  gap: 0.65rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg);
}
.mo-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: linear-gradient(180deg, #0d0f0b, #171a13);
  border-bottom: 1px solid var(--border);
}
.mo-emblem {
  flex-shrink: 0;
  width: 2.1rem;
  height: 2.1rem;
  background-color: #e8e6df;
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
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 1.05rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8e6df;
}
.mo-ends {
  flex-shrink: 0;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #14160f;
  background: var(--gold);
  border-radius: 3px;
  padding: 0.2rem 0.45rem;
}
.mo-brief {
  margin: 0;
  padding: 0 0.75rem;
  color: var(--khaki);
  line-height: 1.4;
}
.mo-overview {
  display: grid;
  gap: 0.5rem;
  padding: 0 0.75rem;
}
.mo-overview-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
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
.mo-planet {
  display: grid;
  gap: 0.25rem;
}
.mo-planet-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.mo-check {
  width: 0.85rem;
  height: 0.85rem;
  border: 1px solid var(--muted);
  border-radius: 2px;
  flex-shrink: 0;
}
.mo-check.done {
  background: var(--teal);
  border-color: var(--teal);
}
.mo-planet-name {
  color: var(--khaki);
}
.mo-planet-name strong {
  color: #6fb7e8;
}
.mo-bar {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 1.15rem;
  border-radius: 2px;
  background: color-mix(in srgb, var(--red) 55%, var(--bg));
  overflow: hidden;
}
.mo-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: #4aa3ff;
}
.mo-bar-pct {
  position: relative;
  padding-left: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #0d0f0b;
  text-shadow: 0 1px 0 color-mix(in srgb, #ffffff 35%, transparent);
}
.mo-play {
  margin: 0 0.75rem 0.75rem;
}
</style>
