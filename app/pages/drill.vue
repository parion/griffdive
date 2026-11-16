<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot, SwitchRoot, SwitchThumb } from 'reka-ui'
import { heroPoolIds } from '~~/shared/data/stratagemCodes'
import type { HeroCategory } from '~~/shared/data/stratagemCodes'

useHead({ title: 'Drill · Griffdive' })

const CATEGORIES: readonly { id: HeroCategory, label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Supply', label: 'Supply' },
  { id: 'Eagle', label: 'Eagle' },
  { id: 'Orbital', label: 'Orbital' },
  { id: 'Defense', label: 'Defense' },
  { id: 'Mission', label: 'Mission' },
]

const hero = useStratagemHero()
const records = useDrillRecords()
const category = ref<HeroCategory>('all')
const untimed = ref(false)
const newBest = ref(false)
const finished = ref<{ score: number, round: number } | null>(null)

const best = computed(() => records.best(category.value, untimed.value))
const live = computed(() => hero.phase.value === 'ready' || hero.phase.value === 'running')

function arm(): void {
  newBest.value = false
  finished.value = null
  const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  hero.arm(seed, { targetRound: null, untimed: untimed.value, pool: heroPoolIds(category.value) })
}

function record(): void {
  const run = hero.run.value
  if (!run) {
    return
  }
  const result = { score: run.score, round: run.totals.roundsCleared }
  finished.value = result
  newBest.value = records.submit(category.value, untimed.value, result)
}

function stop(): void {
  record()
  hero.reset()
}

watch(hero.phase, (phase) => {
  if (phase === 'done') {
    record()
  }
})

// A changed filter or mode re-arms the cabinet with the new pool.
watch([category, untimed], () => {
  if (hero.phase.value === 'ready') {
    arm()
  }
})

onMounted(arm)
</script>

<template>
  <main
    id="main-content"
    class="page drill"
    tabindex="-1"
  >
    <header class="page-header">
      <div>
        <h1>Drill</h1>
        <p class="drill-sub">
          A Stratagem Hero–style run. Type each code before the bar runs out — the same arcade that
          earns a fallen diver's Redemption.
        </p>
      </div>
    </header>

    <div class="drill-grid">
      <section class="drill-main">
        <StratagemHeroBoard
          :run="hero.run.value"
          :phase="hero.phase.value"
          :target-round="null"
          :misses="hero.misses.value"
          :untimed="untimed"
        />

        <div
          v-if="hero.phase.value === 'done' || (hero.phase.value === 'idle' && finished)"
          class="result panel"
          role="status"
        >
          <p class="disp result-title">
            {{ newBest ? 'New personal best' : 'Run over' }}
          </p>
          <p class="cap">
            Rounds cleared <b>{{ finished?.round ?? 0 }}</b> · Score <b>{{ finished?.score ?? 0 }}</b>
          </p>
          <button
            type="button"
            class="btn primary"
            @click="arm"
          >
            Again
          </button>
        </div>

        <button
          v-if="untimed && hero.phase.value === 'running'"
          type="button"
          class="btn ghost"
          @click="stop"
        >
          End run
        </button>

        <StratagemHeroPad
          class="drill-pad"
          :disabled="!live"
          @press="hero.press"
        />
      </section>

      <aside class="drill-side panel">
        <h2 class="lbl">
          Pool
        </h2>
        <RadioGroupRoot
          v-model="category"
          class="cats"
          aria-label="Stratagem pool"
          :disabled="hero.phase.value === 'running'"
        >
          <RadioGroupItem
            v-for="entry in CATEGORIES"
            :key="entry.id"
            :value="entry.id"
            class="chip cat"
            :class="{ gold: category === entry.id }"
          >
            {{ entry.label }}
          </RadioGroupItem>
        </RadioGroupRoot>

        <label class="untimed">
          <SwitchRoot
            v-model="untimed"
            class="switch"
            :disabled="hero.phase.value === 'running'"
          >
            <SwitchThumb class="switch-thumb" />
          </SwitchRoot>
          <span>Untimed practice</span>
        </label>

        <h2 class="lbl">
          Personal best
        </h2>
        <p
          v-if="best"
          class="best"
        >
          <template v-if="untimed">
            Round <b>{{ best.round }}</b>
          </template>
          <template v-else>
            <b>{{ best.score }}</b> · {{ best.round }} rounds
          </template>
        </p>
        <p
          v-else
          class="cap"
        >
          No run on record for this pool yet.
        </p>
        <p class="cap">
          Kept on this device only.
        </p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.drill-sub {
  margin: var(--sp-2) 0 0;
  max-width: 60ch;
  color: var(--muted);
  font-size: var(--fs-sm);
}

.drill-grid {
  display: grid;
  gap: var(--gap-panel);
  grid-template-columns: minmax(0, 1fr);
  margin-top: var(--gap-panel);
}

@media (min-width: 900px) {
  .drill-grid { grid-template-columns: minmax(0, 1fr) 280px; }
}

.drill-main {
  display: grid;
  min-width: 0;
  gap: var(--gap-panel);
  align-content: start;
}

.result {
  display: grid;
  justify-items: center;
  gap: var(--sp-3);
  padding: var(--pad-panel);
  text-align: center;
}

.result-title {
  margin: 0;
  font-size: var(--fs-h1);
  color: var(--gold);
}

.drill-pad { margin-top: var(--sp-3); }

/* Desktop players type on the keyboard; the pad is for touch. */
@media (hover: hover) and (pointer: fine) {
  .drill-pad { display: none; }
}

.drill-side {
  display: grid;
  gap: var(--sp-3);
  align-content: start;
  padding: var(--pad-panel);
}

.drill-side h2 { margin: var(--sp-2) 0 0; }

.cats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.cat { cursor: pointer; }

.untimed {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: var(--fs-sm);
}

.switch {
  position: relative;
  width: 36px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--line-4);
  background: var(--rail);
  cursor: pointer;
}

.switch[data-state='checked'] { border-color: var(--gold); }

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: var(--khaki);
  transition: transform var(--dur-fast) var(--ease-out);
}

.switch[data-state='checked'] .switch-thumb {
  transform: translateX(16px);
  background: var(--gold);
}

.best { margin: 0; font-size: var(--fs-body); }
.best b { color: var(--gold); }
</style>
