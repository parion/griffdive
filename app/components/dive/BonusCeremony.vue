<script setup lang="ts">
import { BONUS_STATS, bonusIntervalFor, maxStarsFor } from '~~/shared/engine/config'
import { bonusFor } from '~~/shared/engine/selectors'
import type { DiveState, DiverState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl?: boolean
}>(), { canControl: true })

const emit = defineEmits<{
  spin: []
  award: [playerId: string]
}>()

// The contest is a host-spun seed like the Wheel — nothing is revealed until
// the spin lands. The host resolves the winner by reading HD2's end screen;
// the app never captures the stats, and awarding banks the token immediately.
const contest = computed(() => bonusFor(props.state))
const spun = computed(() => props.state.bonusSeed !== null)
const statLabels = BONUS_STATS.map(stat => stat.label)
const winner = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.bonusWinnerId) ?? null)
// A diver seated mid-mission sat the draft out, so they have no stats to win
// with — only the divers who dove are award candidates.
const candidates = computed(() =>
  props.state.divers.filter(diver => !diver.skipsCurrentDraft))
const solo = computed(() => candidates.value.length === 1)

// Eligibility readout (presentation only — the parent already gated on the
// engine's bonusEligible): the clear, the squad size, and the cadence.
const stars = computed(() => props.state.lastReport?.stars ?? 0)
const maxStars = computed(() => maxStarsFor(props.state.difficulty))
const interval = computed(() => bonusIntervalFor(props.state.divers.length))

// ReelText reports its own roll so the cabinet window can blur while winding.
const rolling = ref(false)

function initials(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : '??'
}
</script>

<template>
  <section class="panel honors scan">
    <header class="honors-head">
      <div class="head-copy">
        <span class="lbl">Bonus · end-of-mission stats</span>
        <h2 class="disp honors-title">
          <WaitingLight
            v-if="!state.bonusWinnerId"
            label="Waiting on the host's award"
          />
          Squad Honors
        </h2>
        <p class="muted small">
          One random stat from the mission's end screen. The host reads the squad's
          stats and names who won it — that diver banks a reward token.
        </p>
      </div>
      <span class="chip gold nowrap">Host calls it</span>
    </header>

    <ul class="elig">
      <li>
        <span class="lbl">Stars</span>
        <strong>{{ stars }}/{{ maxStars }}</strong>
      </li>
      <li>
        <span class="lbl">Squad</span>
        <strong>{{ state.divers.length }} divers</strong>
      </li>
      <li>
        <span class="lbl">Cadence</span>
        <strong>{{ interval === 1 ? 'every mission' : `every ${interval} missions` }}</strong>
      </li>
      <li class="elig-ok">
        <span
          class="lamp teal"
          aria-hidden="true"
        />
        <span class="lbl">Eligible</span>
      </li>
    </ul>

    <div class="stage">
      <div
        class="slot reel-box ticks"
        :class="{ reeling: rolling, landed: !!state.bonusWinnerId }"
      >
        <span class="lbl reel-cap">{{ spun ? 'The winning stat' : 'Draw a stat' }}</span>
        <template v-if="spun">
          <strong class="reel-value disp">
            <ReelText
              :final="contest?.label ?? '—'"
              :candidates="statLabels"
              :reel-id="state.bonusSeed"
              @reeling="rolling = $event"
            />
          </strong>
          <span class="lbl reel-dir">{{ contest?.direction === 'least' ? 'least wins' : 'most wins' }}</span>
        </template>
        <button
          v-else
          class="spin-btn"
          type="button"
          :disabled="!canControl"
          @click="emit('spin')"
        >
          <span class="disp spin-word">Spin</span>
          <span class="odl">Host · draw a stat</span>
        </button>
      </div>

      <div class="prize">
        <span
          class="hex prize-hex"
          aria-hidden="true"
        />
        <span class="lbl">Prize</span>
        <strong class="disp prize-name">Reward token</strong>
        <span class="odl">Spend on a reroll or a ban</span>
      </div>
    </div>

    <template v-if="!spun">
      <p
        v-if="canControl"
        class="muted small"
      >
        Spin to draw the honors contest.
      </p>
      <p
        v-else
        class="muted small"
      >
        Waiting for the host to spin…
      </p>
    </template>

    <template v-else-if="!winner">
      <p
        v-if="canControl"
        class="muted small"
      >
        Award the honors to the diver who won the stat:
      </p>
      <p
        v-else
        class="muted small"
      >
        The host is choosing who won…
      </p>
      <div
        class="award-row"
        role="radiogroup"
        aria-label="Honors winner"
      >
        <button
          v-for="diver in candidates"
          :key="diver.id"
          class="award-tag"
          type="button"
          role="radio"
          :aria-checked="false"
          :disabled="!canControl"
          @click="emit('award', diver.id)"
        >
          <span
            class="tag-shape"
            aria-hidden="true"
          />
          <span class="award-init cut-sm disp">{{ initials(diver.name) }}</span>
          <span class="award-name">{{ diver.name }}</span>
        </button>
      </div>
      <p
        v-if="solo"
        class="muted small"
      >
        Only one diver can win — the spin banks the token automatically.
      </p>
    </template>

    <p
      v-else
      class="winner-line"
    >
      <strong>{{ winner.name }}</strong> takes the honors and banks a reward token.
    </p>
  </section>
</template>

<style scoped>
.honors {
  border-color: color-mix(in srgb, var(--gold) 30%, var(--line-3));
  background:
    radial-gradient(120% 80% at 50% -20%, color-mix(in srgb, var(--gold) 10%, transparent), transparent 60%),
    var(--panel);
  gap: 0.85rem;
}

.honors-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.head-copy { display: grid; gap: 0.2rem; min-width: 0; }
.honors-title { display: flex; align-items: center; gap: 0.45rem; margin: 0; color: var(--gold); }

.elig {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--line-2);
  background: var(--ground);
  flex-wrap: wrap;
}
.elig li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border-right: 1px solid var(--line-2);
}
.elig li:last-child { border-right: 0; }
.elig strong { font-size: 0.85rem; letter-spacing: 0.04em; }
.elig-ok { margin-left: auto; color: var(--teal); }

.stage {
  display: grid;
  grid-template-columns: 1fr 10rem;
  gap: 0.85rem;
}

.reel-box {
  position: relative;
  min-height: 9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 1rem 0.9rem;
  border: 1px solid var(--line-3);
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--gold) 8%, transparent), transparent 60%),
    var(--ground);
  text-align: center;
}
.reel-box.reeling { animation: reelBlur 0.6s var(--ease-out); }
.reel-box.landed { border-color: color-mix(in srgb, var(--gold) 55%, var(--line-3)); }
.reel-cap { color: var(--khaki); }
.reel-value {
  font-size: 1.6rem;
  letter-spacing: 0.06em;
  color: var(--gold);
}
.reel-dir { color: var(--muted); }

.spin-btn {
  display: grid;
  place-items: center;
  gap: 0.2rem;
  width: 100%;
  max-width: 16rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  cursor: pointer;
  animation: glow 2.4s ease-in-out infinite;
  transition: filter var(--dur-fast) ease;
}
.spin-btn:hover:not(:disabled) { filter: brightness(1.1); }
.spin-btn:disabled { cursor: default; opacity: 0.5; animation: none; }
.spin-word { font-size: 1.7rem; letter-spacing: 0.14em; }

.prize {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.75rem;
  border: 1px dashed color-mix(in srgb, var(--gold) 45%, var(--line-3));
  background: var(--ground);
  text-align: center;
}
.prize-hex {
  width: 1.5rem;
  height: 1.7rem;
  background: var(--gold);
  box-shadow: 0 0 16px color-mix(in srgb, var(--gold) 45%, transparent);
}
.prize-name { font-size: 1.05rem; color: var(--gold); }

.award-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.6rem;
}
.award-tag {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line-3);
  background: var(--ground);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, background-color var(--dur-fast) ease;
}
.award-tag > .tag-shape {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--gold) 7%, transparent);
  pointer-events: none;
}
.award-tag:hover:not(:disabled) { border-color: var(--gold); }
.award-tag:disabled { cursor: default; opacity: 0.55; }
.award-init {
  position: relative;
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  flex-shrink: 0;
  background: var(--gold);
  color: var(--on-gold);
  font-size: 0.8rem;
}
.award-name {
  position: relative;
  min-width: 0;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.winner-line { margin: 0.1rem 0; }
.winner-line strong { color: var(--gold); }

@media (max-width: 560px) {
  .stage { grid-template-columns: 1fr; }
}
</style>
