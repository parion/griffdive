<script setup lang="ts">
import { useOwnedWarbonds } from '~/composables/useOwnedWarbonds'

const props = withDefaults(defineProps<{
  initialName?: string
  joinMode?: boolean
}>(), { initialName: '', joinMode: false })

const emit = defineEmits<{
  complete: [payload: { name: string }]
  exit: []
}>()

interface Beat {
  key: string
  title: string
  caption: string
}

const BEATS: readonly Beat[] = [
  { key: 'identity', title: 'Identify', caption: 'Enter the name the squad will see.' },
  {
    key: 'wheel',
    title: 'Spin',
    caption: 'Every mission the Wheel of Misfortune draws one rule. Lock it in to raise the squad\'s risk — or opt out for a safe dive.',
  },
  {
    key: 'pact',
    title: 'Pact',
    caption: 'Pacts are personal and optional. The risk you take becomes Valor — and Valor buys your reward ceiling.',
  },
  {
    key: 'reward',
    title: 'Reward',
    caption: 'Clear the mission and draft one reward rolled against that ceiling. Higher Valor, higher odds.',
  },
  {
    key: 'warbonds',
    title: 'Warbonds',
    caption: 'Rewards only ever come from warbonds you own. Declare yours.',
  },
  {
    key: 'deploy',
    title: 'Deploy',
    caption: 'That is the whole loop. Your kit is surplus cast-offs — you earn the rest one dive at a time.',
  },
]

const name = ref(props.initialName)
const step = ref(0)
const reached = ref(0)
const { ownedWarbonds } = useOwnedWarbonds()

const current = computed(() => BEATS[step.value]!)
const isLast = computed(() => step.value === BEATS.length - 1)
const canNext = computed(() => step.value !== 0 || name.value.trim().length > 0)
const nextLabel = computed(() => {
  if (!isLast.value) {
    return 'Next'
  }
  return props.joinMode ? 'Join the dive' : 'Enter Griffdive'
})

function next(): void {
  if (!canNext.value) {
    return
  }
  if (isLast.value) {
    finish()
    return
  }
  step.value += 1
  reached.value = Math.max(reached.value, step.value)
}

function back(): void {
  if (step.value > 0) {
    step.value -= 1
  }
}

function goTo(index: number): void {
  if (index <= reached.value) {
    step.value = index
  }
}

function finish(): void {
  const trimmed = name.value.trim()
  if (!trimmed) {
    return
  }
  emit('complete', { name: trimmed })
}
</script>

<template>
  <section class="onboarding">
    <header class="ob-top">
      <span class="ob-brand">Griffdive · briefing</span>
      <button
        v-if="name.trim()"
        class="btn ghost tiny"
        type="button"
        @click="finish"
      >
        Skip the tour
      </button>
      <button
        v-else-if="!props.joinMode"
        class="btn ghost tiny"
        type="button"
        @click="emit('exit')"
      >
        Back to base
      </button>
    </header>

    <nav
      class="ob-rail"
      aria-label="Onboarding progress"
    >
      <template
        v-for="(beat, index) in BEATS"
        :key="beat.key"
      >
        <span
          v-if="index > 0"
          class="ob-link"
          :class="{ done: index <= step }"
          aria-hidden="true"
        />
        <button
          class="ob-node"
          :class="{ current: index === step, done: index < step }"
          type="button"
          :disabled="index > reached"
          :aria-current="index === step ? 'step' : undefined"
          @click="goTo(index)"
        >
          <span class="ob-node-num">{{ index + 1 }}</span>
          <span class="ob-node-label">{{ beat.title }}</span>
        </button>
      </template>
    </nav>

    <div class="ob-copy">
      <h1>{{ current.title }}</h1>
      <p>{{ current.caption }}</p>
    </div>

    <div class="ob-stage">
      <Transition
        name="phase"
        mode="out-in"
      >
        <IdentityStep
          v-if="step === 0"
          key="identity"
          v-model="name"
        />
        <WheelStep
          v-else-if="step === 1"
          key="wheel"
        />
        <PactStep
          v-else-if="step === 2"
          key="pact"
        />
        <RewardStep
          v-else-if="step === 3"
          key="reward"
        />
        <div
          v-else-if="step === 4"
          key="warbonds"
          class="ob-scroll"
        >
          <WarbondBrowser />
        </div>
        <div
          v-else
          key="deploy"
          class="ob-deploy"
        >
          <div class="deploy-order">
            <span class="deploy-stamp">Deployment order</span>
            <dl>
              <div>
                <dt>Griffdiver</dt>
                <dd>{{ name.trim() || '—' }}</dd>
              </div>
              <div>
                <dt>Starting difficulty</dt>
                <dd>Medium · 3</dd>
              </div>
              <div>
                <dt>Warbonds declared</dt>
                <dd>{{ ownedWarbonds.length }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Transition>
    </div>

    <footer class="ob-foot">
      <button
        class="btn ghost"
        type="button"
        :disabled="step === 0"
        @click="back"
      >
        Back
      </button>
      <button
        class="btn primary"
        type="button"
        :disabled="!canNext"
        @click="next"
      >
        {{ nextLabel }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.onboarding {
  display: grid;
  gap: 0.9rem;
  width: min(100%, 52rem);
  margin: 0 auto;
}

.ob-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.ob-brand {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

/* The rail is the progress read: numbered nodes joined by lit links. */
.ob-rail {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.ob-node {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem 0.2rem 0.25rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: none;
  color: var(--muted);
  font: inherit;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.ob-node:disabled { cursor: default; opacity: 0.45; }
.ob-node.current { color: var(--gold); border-color: color-mix(in srgb, var(--gold) 50%, transparent); }
.ob-node.done { color: var(--khaki); }
.ob-node-num {
  display: inline-grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 0.72rem;
  font-weight: 700;
}
.ob-node-label {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ob-link {
  width: 1.1rem;
  height: 2px;
  background: var(--border);
  transition: background var(--dur-med) var(--ease-out);
}
.ob-link.done { background: color-mix(in srgb, var(--gold) 65%, var(--border)); }

.ob-copy { text-align: center; }
.ob-copy h1 {
  margin: 0;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
}
.ob-copy p {
  margin: 0.3rem auto 0;
  max-width: 38rem;
  color: var(--muted);
}

.ob-stage {
  min-height: 19rem;
  display: grid;
  align-content: center;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-raised);
}

.ob-scroll { max-height: 24rem; overflow: auto; padding-right: 0.25rem; }

.ob-deploy { display: grid; justify-items: center; }
.deploy-order {
  width: min(100%, 26rem);
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--border));
  border-radius: 10px;
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--gold) 8%, transparent), transparent 62%),
    var(--bg);
}
.deploy-stamp {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--gold);
}
.deploy-order dl { margin: 0.6rem 0 0; display: grid; gap: 0.45rem; }
.deploy-order dl div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px dashed var(--border);
  padding-bottom: 0.35rem;
}
.deploy-order dt {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.deploy-order dd { margin: 0; font-weight: 700; }

.ob-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

@media (max-width: 560px) {
  .ob-node-label { display: none; }
  .ob-stage { min-height: 16rem; padding: 0.75rem; }
}
</style>
