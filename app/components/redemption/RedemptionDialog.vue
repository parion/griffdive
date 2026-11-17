<script setup lang="ts">
import { conditionById } from '~~/shared/data/conditions'
import type { HeroTranscript } from '~~/shared/engine/hero'
import { redemptionOf, redemptionTargetFor, reinforceBlockersFor } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  state: DiveState
  diver: DiverState
}>()

const emit = defineEmits<{
  begin: []
  submit: [seed: number, transcript: HeroTranscript]
}>()

const hero = useStratagemHero()

const redemption = computed(() => redemptionOf(props.diver))
const openRun = computed(() => redemption.value.run)
const target = computed(() => openRun.value?.target ?? redemptionTargetFor(props.state, props.diver))
const blockers = computed(() =>
  reinforceBlockersFor(props.state, props.diver).map(id => conditionById(id)?.name ?? id))

// The seed this screen last played, and whether a fresh one was requested.
const playedSeed = ref<number | null>(null)
const awaitingSeed = ref(false)
const submittedAt = ref<number | null>(null)
const refused = ref(false)

const stage = computed<'briefing' | 'arcade' | 'missed' | 'verifying' | 'refused' | 'earned'>(() => {
  if (submittedAt.value !== null) {
    if (redemption.value.earned > submittedAt.value) {
      return 'earned'
    }
    return refused.value ? 'refused' : 'verifying'
  }
  if (hero.phase.value === 'ready' || hero.phase.value === 'running') {
    return 'arcade'
  }
  if (hero.phase.value === 'done') {
    return 'missed'
  }
  return 'briefing'
})

function armOpenRun(): void {
  const run = openRun.value
  if (!run) {
    return
  }
  playedSeed.value = run.seed
  awaitingSeed.value = false
  hero.arm(run.seed, { targetRound: run.target })
}

// A run opened but never played here (a reload, or the host's screen) is
// played as dealt; otherwise a fresh seed is committed first.
function start(): void {
  submittedAt.value = null
  refused.value = false
  if (openRun.value && openRun.value.seed !== playedSeed.value) {
    armOpenRun()
    return
  }
  awaitingSeed.value = true
  emit('begin')
}

watch(() => openRun.value?.seed, (seed) => {
  if (awaitingSeed.value && seed !== undefined && seed !== playedSeed.value) {
    armOpenRun()
  }
})

watch(hero.phase, (phase) => {
  const run = hero.run.value
  if (phase === 'done' && run?.status === 'cleared' && playedSeed.value !== null) {
    submittedAt.value = redemption.value.earned
    emit('submit', playedSeed.value, hero.transcript())
  }
})

// A run the reducer would not verify (the mission ended, or a deploy changed
// the arcade mid-run) leaves the state untouched: stop waiting after a beat.
let refuseTimer: ReturnType<typeof setTimeout> | undefined
watch(stage, (next) => {
  clearTimeout(refuseTimer)
  if (next === 'verifying') {
    refuseTimer = setTimeout(() => (refused.value = true), 6_000)
  }
})
onBeforeUnmount(() => clearTimeout(refuseTimer))

watch(open, (isOpen) => {
  if (!isOpen) {
    hero.reset()
    awaitingSeed.value = false
    submittedAt.value = null
  }
})

const reached = computed(() => hero.run.value?.round ?? 0)
</script>

<template>
  <AppDialog
    v-model:open="open"
    title="Redemption"
    :description="`Clear round ${target} to earn your reinforce`"
    fullscreen="mobile"
    size="lg"
    content-class="redemption-dialog"
  >
    <div class="redemption">
      <template v-if="stage === 'briefing'">
        <p class="lead">
          You're down, held by <b>{{ blockers.join(' and ') || 'a no-reinforce rule' }}</b>. Clear
          <b>round {{ target }}</b> of the stratagem arcade and the squad may reinforce you. The rule
          still holds; nothing else is lost.
        </p>
        <ul class="facts">
          <li><span class="lbl">Target</span> <b>Round {{ target }}</b></li>
          <li><span class="lbl">Earned this mission</span> <b>{{ redemption.earned }}</b></li>
          <li v-if="openRun">
            <span class="lbl">Tries</span> <b>{{ openRun.tries }}</b>
          </li>
        </ul>
        <p class="cap">
          Each code refills the bar a little. A wrong arrow restarts the code. The last code of round
          {{ target }} is Reinforce.
        </p>
        <button
          type="button"
          class="btn primary cta-sweep"
          :disabled="awaitingSeed"
          @click="start"
        >
          {{ awaitingSeed ? 'Opening the cabinet…' : 'Start the run' }}
        </button>
      </template>

      <template v-else-if="stage === 'arcade'">
        <StratagemHeroBoard
          :run="hero.run.value"
          :phase="hero.phase.value"
          :target-round="target"
          :misses="hero.misses.value"
        />
        <StratagemHeroPad
          class="redemption-pad"
          @press="hero.press"
        />
      </template>

      <template v-else-if="stage === 'missed'">
        <p class="disp verdict red">
          Round {{ reached }} of {{ target }}
        </p>
        <p class="lead">
          The bar ran dry. Catch your breath and go again; retries are free.
        </p>
        <button
          type="button"
          class="btn primary"
          @click="start"
        >
          Again
        </button>
      </template>

      <template v-else-if="stage === 'refused'">
        <p class="disp verdict red">
          Run not verified
        </p>
        <p class="lead">
          The squad's terminal couldn't verify that run. Go again.
        </p>
        <button
          type="button"
          class="btn primary"
          @click="start"
        >
          Again
        </button>
      </template>

      <template v-else-if="stage === 'verifying'">
        <p class="disp verdict">
          Transmitting…
        </p>
        <p class="lead">
          The squad's terminal is checking your run.
        </p>
      </template>

      <template v-else>
        <p
          class="disp verdict gold slam"
          role="status"
        >
          Redemption earned
        </p>
        <p class="lead">
          Call your reinforce. Your next Redemption this mission needs round {{ target }}.
        </p>
        <button
          type="button"
          class="btn primary"
          @click="open = false"
        >
          Back to the fight
        </button>
      </template>
    </div>
  </AppDialog>
</template>

<style scoped>
.redemption {
  display: grid;
  gap: var(--gap-panel);
  align-content: start;
  width: min(100%, 640px);
  margin: 0 auto;
  overflow-y: auto;
}

.redemption > .btn { justify-self: center; min-width: 14rem; }
.redemption > .cap { white-space: normal; }

.lead {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--khaki);
}

.lead b { color: var(--text); }

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.facts li { display: grid; gap: var(--sp-1); }
.facts b { font-size: var(--fs-h1); color: var(--gold); }

.verdict {
  margin: 0;
  font-size: var(--fs-display);
  text-align: center;
}

.verdict.red { color: var(--red); }
.verdict.gold { color: var(--gold); }
.slam { animation: slam 420ms var(--ease-impact) both; }

@media (hover: hover) and (pointer: fine) {
  .redemption-pad { display: none; }
}
</style>

<style>
/* On a phone the dialog takes the screen and drops its own padding: give the
   header and the cabinet room to breathe, inside the safe areas. */
@media (max-width: 1020px) {
  .redemption-dialog.app-dialog--fullscreen-mobile {
    padding: calc(env(safe-area-inset-top) + var(--pad-panel)) var(--pad-page) calc(env(safe-area-inset-bottom) + var(--pad-panel));
  }
}
</style>
