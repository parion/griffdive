<script setup lang="ts">
import { heroStratagem } from '~~/shared/data/stratagemCodes'
import { HERO_ROUND_MS } from '~~/shared/engine/config'
import { heroCodeOf, heroRoundSize } from '~~/shared/engine/hero'
import type { Arrow, HeroRun } from '~~/shared/engine/hero'
import type { HeroPhase } from '~/composables/useStratagemHero'

const props = defineProps<{
  run: HeroRun | null
  phase: HeroPhase
  targetRound: number | null
  misses: number
  untimed?: boolean
}>()

const QUEUE = 4
const ARROW_WORDS: Readonly<Record<Arrow, string>> = { U: 'up', D: 'down', L: 'left', R: 'right' }

const currentId = computed(() => props.run?.codes[props.run.codeIndex] ?? null)
const current = computed(() => (currentId.value ? heroStratagem(currentId.value) : null))
const code = computed(() => (currentId.value ? heroCodeOf(currentId.value) : ''))
const arrows = computed(() => [...code.value] as Arrow[])
const upcoming = computed(() =>
  props.run ? props.run.codes.slice(props.run.codeIndex + 1, props.run.codeIndex + 1 + QUEUE) : [])
const round = computed(() => props.run?.round ?? 1)
const left = computed(() => (props.run ? props.run.codes.length - props.run.codeIndex : heroRoundSize(1)))
const timePct = computed(() => (props.run ? Math.max(0, props.run.remainingMs / HERO_ROUND_MS) * 100 : 100))
const low = computed(() => !props.untimed && timePct.value < 30)
const intermission = computed(() => props.run?.status === 'intermission')
const clear = computed(() => props.run?.lastClear ?? null)

// Screen readers hear the code to type whenever it changes.
const announcement = computed(() => {
  if (props.phase === 'ready') {
    return 'Press any arrow to start.'
  }
  if (intermission.value && clear.value) {
    return `Round ${clear.value.round} cleared.`
  }
  return current.value ? `${current.value.name}: ${arrows.value.map(arrow => ARROW_WORDS[arrow]).join(', ')}` : ''
})

// A wrong arrow shakes the code row (a red flash under reduced motion).
const shaking = ref(false)
let shakeTimer: ReturnType<typeof setTimeout> | undefined
watch(() => props.misses, () => {
  shaking.value = false
  clearTimeout(shakeTimer)
  nextTick(() => {
    shaking.value = true
    shakeTimer = setTimeout(() => (shaking.value = false), 320)
  })
})
onBeforeUnmount(() => clearTimeout(shakeTimer))
</script>

<template>
  <div
    class="board panel"
    :data-round="round"
    :data-code="phase === 'running' && !intermission ? code : ''"
    :data-status="run?.status ?? phase"
  >
    <div class="board-top">
      <span class="lbl">Round <b>{{ round }}</b><template v-if="targetRound"> / {{ targetRound }}</template></span>
      <span class="lbl">{{ left }} left</span>
      <span class="lbl score">Score <b>{{ run?.score ?? 0 }}</b></span>
    </div>

    <div
      v-if="phase === 'ready'"
      class="board-ready"
    >
      <p class="disp ready-title">
        Press any stratagem input
      </p>
      <p class="cap">
        Arrows or WASD · d-pad · controller
      </p>
    </div>

    <div
      v-else-if="intermission && clear"
      class="board-clear"
    >
      <p class="disp clear-title slam">
        Round {{ clear.round }} clear
      </p>
      <dl class="bonus">
        <dt>Round bonus</dt><dd>{{ clear.roundBonus }}</dd>
        <template v-if="!untimed">
          <dt>Time bonus</dt><dd>{{ clear.timeBonus }}</dd>
        </template>
        <dt>Perfect</dt><dd>{{ clear.perfectBonus || '—' }}</dd>
      </dl>
    </div>

    <div
      v-else-if="current"
      class="board-play"
    >
      <div class="queue">
        <div class="now">
          <StratagemHeroIcon :stratagem-id="current.id" />
        </div>
        <div
          v-for="(id, index) in upcoming"
          :key="`${run?.round}-${(run?.codeIndex ?? 0) + index}`"
          class="next"
        >
          <StratagemHeroIcon :stratagem-id="id" />
        </div>
      </div>
      <p class="name">
        {{ current.name }}
      </p>
      <div
        class="code"
        :class="{ shake: shaking }"
      >
        <StratagemHeroArrow
          v-for="(arrow, index) in arrows"
          :key="index"
          :arrow="arrow"
          :state="index < (run?.progress ?? 0) ? 'done' : 'pending'"
        />
      </div>
    </div>

    <div
      v-if="!untimed"
      class="timer"
      :class="{ low }"
      aria-hidden="true"
    >
      <span :style="{ width: `${timePct}%` }" />
    </div>

    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ announcement }}
    </p>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  min-width: 0;
  gap: var(--sp-5);
  padding: var(--pad-panel);
  min-height: 300px;
  align-content: start;
}

.board-top {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-4);
}

.board-top .score { margin-left: auto; }
.board-top b { color: var(--text); font-weight: 700; }

.board-ready,
.board-clear {
  display: grid;
  place-items: center;
  gap: var(--sp-3);
  min-height: 200px;
  text-align: center;
}

.ready-title,
.clear-title {
  margin: 0;
  font-size: var(--fs-h1);
  color: var(--gold);
}

.slam { animation: slam 420ms var(--ease-impact) both; }

.bonus {
  display: grid;
  grid-template-columns: auto auto;
  gap: var(--sp-1) var(--sp-6);
  margin: 0;
  font-size: var(--fs-sm);
}

.bonus dt { color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.bonus dd { margin: 0; text-align: right; color: var(--text); font-weight: 700; }

.board-play {
  display: grid;
  gap: var(--sp-4);
  justify-items: center;
}

.queue {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(4, minmax(0, 1fr));
  gap: var(--sp-3);
  align-items: end;
  width: min(100%, 420px);
}

.now { outline: 2px solid var(--gold); outline-offset: 2px; }
.next { opacity: 0.55; }

.name {
  margin: 0;
  min-height: 1.4em;
  font-size: var(--fs-body);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  color: var(--gold);
  background: rgba(255, 214, 66, 0.08);
  padding: var(--sp-1) var(--sp-4);
}

.code {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sp-2);
  font-size: clamp(32px, 7vw, 48px);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid transparent;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.code.shake {
  border-color: var(--red);
  animation: glitch 320ms linear both;
}

.timer {
  height: 8px;
  background: var(--rail);
  border: 1px solid var(--line-2);
}

.timer span {
  display: block;
  height: 100%;
  background: var(--gold);
}

.timer.low span { background: var(--red); }
</style>
