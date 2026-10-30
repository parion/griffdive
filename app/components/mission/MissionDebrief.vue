<script setup lang="ts">
import { conditionById } from '~~/shared/data/conditions'
import { maxStarsFor } from '~~/shared/engine/config'
import { missionHaul, optionsForDiver } from '~~/shared/engine/rewards'
import {
  activeMisfortune,
  activeStrain,
  bonusFor,
  bonusIneligibilityReason,
  bonusWinners,
  currentFront,
  draftLocked,
  honorsDue,
  statsCheckPending,
  statsPendingPactIds,
  statsRules,
} from '~~/shared/engine/selectors'
import type { StatsRule } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'
import { HONORS_AUTO_ROLL_MS } from '~/utils/motion'

// The beat between the report and the draft. HD2 shows its end-of-mission stats
// screen only after the report, so everything that screen proves is settled
// here — the rules it checks and the Squad Honors contest — and the draft opens
// once the squad has looked. The report's own numbers ride along as the
// mission-secured moment. The engine gates the draft (draftLocked); this screen
// is how the squad clears the gate.
const props = withDefaults(defineProps<{
  state: DiveState
  self: DiverState | null
  selfId: string | null
  isHost: boolean
  opLength: number
  phone?: boolean
}>(), { phone: false })

const emit = defineEmits<{
  holdPact: [playerId: string, pactId: string]
  failPact: [playerId: string, pactId: string]
  holdDirective: []
  failDirective: []
  spinBonus: []
  awardBonus: [playerIds: string[]]
  open: []
}>()

const mission = computed(() => props.state.missionInOperation)
const opEnds = computed(() => mission.value >= props.opLength)
const report = computed(() => props.state.lastReport)
const maxStars = computed(() => maxStarsFor(props.state.difficulty))
const stars = computed(() => report.value?.stars ?? 0)
const haul = computed(() => missionHaul(report.value))
const front = computed(() => currentFront(props.state))
const directive = computed(() => activeMisfortune(props.state))
const strain = computed(() => (props.state.strainAccepted ? activeStrain(props.state) : null))
// The draft this diver is about to open, after whatever broke in the field.
const draftSize = computed(() =>
  optionsForDiver(stars.value, (props.self?.failedPactIds.length ?? 0)
  + (props.state.misfortuneFailed ? 1 : 0)))
const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'The host')

const SAMPLES = [
  { key: 'common', label: 'Common', icon: '/images/svgs/Common_Sample_Icon.svg' },
  { key: 'rare', label: 'Rare', icon: '/images/svgs/Rare_Sample_Icon.svg' },
  { key: 'super', label: 'Super', icon: '/images/svgs/Super_Sample_Icon.svg' },
] as const
const samples = computed(() => SAMPLES.map(row => ({
  ...row,
  count: report.value?.samples?.[row.key] ?? 0,
})).filter(row => row.count > 0))

// Rules that only the stats screen can prove, with who owns each one.
interface RuleRow extends StatsRule {
  name: string
  scopeLabel: string
  condition: NonNullable<ReturnType<typeof conditionById>>
  canSettle: boolean
  waitingOn: string
}
const rules = computed<RuleRow[]>(() => statsRules(props.state).flatMap((rule) => {
  const condition = conditionById(rule.conditionId)
  if (!condition) {
    return []
  }
  const owner = rule.diverId ? props.state.divers.find(diver => diver.id === rule.diverId) : null
  const ownerName = owner ? upperName(owner.name) : hostName.value
  return [{
    ...rule,
    name: condition.name,
    condition,
    scopeLabel: rule.scope === 'directive' ? 'Squad directive' : `${ownerName}’s pact`,
    // The host referees any pact, as with field marks; a diver settles their
    // own. The directive binds the squad, so only the host settles it.
    canSettle: rule.scope === 'directive'
      ? props.isHost
      : props.isHost || rule.diverId === props.selfId,
    waitingOn: rule.scope === 'directive' ? hostName.value : ownerName,
  }]
}))
const pendingCount = computed(() => rules.value.filter(rule => rule.status === 'pending').length)

// A broken mark is one-way and costs a reward option, so it takes a second tap.
const armed = ref<string | null>(null)
const ruleKey = (rule: StatsRule): string => `${rule.scope}:${rule.diverId ?? ''}:${rule.conditionId}`

function hold(rule: StatsRule): void {
  armed.value = null
  if (rule.scope === 'directive') {
    emit('holdDirective')
  }
  else if (rule.diverId) {
    emit('holdPact', rule.diverId, rule.conditionId)
  }
}

function broke(rule: StatsRule): void {
  const key = ruleKey(rule)
  if (armed.value !== key) {
    armed.value = key
    return
  }
  armed.value = null
  if (rule.scope === 'directive') {
    emit('failDirective')
  }
  else if (rule.diverId) {
    emit('failPact', rule.diverId, rule.conditionId)
  }
}

// Squad Honors: due this mission, rolled by the host a beat after the screen
// lands, then awarded to whoever the stats screen crowns.
const due = computed(() => honorsDue(props.state))
const stat = computed(() => bonusFor(props.state))
const winners = computed(() => bonusWinners(props.state))
const awarded = computed(() => winners.value.length > 0)
const rolled = computed(() => props.state.bonusSeed !== null)
const needsRoll = computed(() => due.value && !rolled.value)
const reason = computed(() => bonusIneligibilityReason(props.state) ?? 'Not this mission.')
const reelLanded = ref(false)
watch(rolled, (value) => {
  if (!value) {
    reelLanded.value = false
  }
})

let rollTimer: ReturnType<typeof setTimeout> | undefined
const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
watch(
  () => props.isHost && needsRoll.value,
  (rollNow) => {
    clearTimeout(rollTimer)
    if (rollNow) {
      rollTimer = setTimeout(() => emit('spinBonus'), reduced ? 250 : HONORS_AUTO_ROLL_MS)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(rollTimer))

const picking = ref<string[]>([])
const canAward = computed(() =>
  props.isHost && rolled.value && !awarded.value && reelLanded.value)

function togglePick(diverId: string): void {
  picking.value = picking.value.includes(diverId)
    ? picking.value.filter(id => id !== diverId)
    : [...picking.value, diverId]
}

function award(): void {
  if (picking.value.length === 0) {
    return
  }
  emit('awardBonus', picking.value)
  picking.value = []
}

const seated = computed(() => props.state.divers.filter(diver => !diver.away))

// What still stands between this diver and their draft.
const blocker = computed(() => {
  if (props.self && statsCheckPending(props.state, props.self)) {
    const own = statsPendingPactIds(props.state, props.self).length
    if (own > 0) {
      return `Settle ${own} rule${own === 1 ? '' : 's'} to open the draft`
    }
    return props.isHost ? 'Settle the directive to open the draft' : `Waiting on ${hostName.value} to settle the directive`
  }
  if (due.value) {
    return needsRoll.value ? 'Rolling Squad Honors' : 'Waiting on the honors winner'
  }
  return null
})
const unlocked = computed(() => props.self !== null && !draftLocked(props.state, props.self))

const title = computed(() => (opEnds.value ? 'Operation secured' : 'Mission secured'))
</script>

<template>
  <section
    class="debrief"
    :class="{ phone }"
    aria-labelledby="db-h"
  >
    <header class="db-head">
      <span class="kick">Mission {{ mission }} of {{ opLength }} secured</span>
      <h1
        id="db-h"
        class="disp db-title"
      >
        {{ title }}
      </h1>
      <p class="db-sub">
        Open the end-of-mission stats screen and settle what rides on it. Your draft opens once the squad has.
      </p>
      <MissionTrack
        :mission="mission"
        :op-length="opLength"
        :phone="phone"
      />
    </header>

    <div class="db-grid">
      <article
        class="panel report"
        aria-label="Mission report"
      >
        <span class="cap">Mission report</span>
        <div
          class="stars"
          role="img"
          :aria-label="`${stars} of ${maxStars} stars`"
        >
          <IconStar
            v-for="i in maxStars"
            :key="i"
            class="star"
            :class="{ on: i <= stars }"
          />
        </div>
        <span
          class="tag"
          :class="{ full: stars >= maxStars }"
        >{{ stars >= maxStars ? 'Full-star clear' : `${maxStars - stars} star${maxStars - stars === 1 ? '' : 's'} missed` }}</span>

        <dl class="facts">
          <div
            v-if="report?.timePct !== undefined"
            class="fact"
          >
            <dt>Time remaining</dt>
            <dd class="disp">
              {{ report.timePct }}<small>%</small>
            </dd>
          </div>
          <div
            v-for="row in samples"
            :key="row.key"
            class="fact"
          >
            <dt>
              <img
                :src="row.icon"
                alt=""
                width="16"
                height="16"
              >
              {{ row.label }} samples
            </dt>
            <dd class="disp">
              {{ row.count }}
            </dd>
          </div>
        </dl>

        <ul class="recap">
          <li v-if="front">
            <span>Front</span>
            <b>{{ front.displayName }}</b>
          </li>
          <li v-if="directive">
            <span>Directive</span>
            <b :class="{ broke: state.misfortuneFailed }">{{ directive.name }}<i v-if="state.misfortuneFailed"> · broke</i></b>
          </li>
          <li v-if="strain">
            <span>Strain</span>
            <b>{{ strain.name }}</b>
          </li>
          <li>
            <span>Your draft</span>
            <b>{{ draftSize }} option{{ draftSize === 1 ? '' : 's' }}</b>
          </li>
        </ul>

        <footer
          v-if="haul > 0"
          class="credits"
        >
          <span>Credits banked</span>
          <CreditAmount
            class="disp"
            :value="haul"
            signed
          />
        </footer>
      </article>

      <article
        class="panel checks"
        aria-label="Stats check"
      >
        <header class="checks-head">
          <span class="cap">Stats check</span>
          <span
            class="tiny"
            :class="{ clear: pendingCount === 0 }"
          >{{ rules.length === 0 ? 'Nothing rides on the stats screen' : pendingCount === 0 ? 'All settled' : `${pendingCount} to settle` }}</span>
        </header>

        <ul
          v-if="rules.length > 0"
          class="stat-rules"
        >
          <li
            v-for="rule in rules"
            :key="ruleKey(rule)"
            class="stat-rule"
            :class="rule.status"
          >
            <div class="stat-rule-text">
              <span class="cap scope">{{ rule.scopeLabel }}</span>
              <b class="disp stat-rule-name">{{ rule.name }}</b>
              <ConditionRule
                class="stat-rule-body"
                :condition="rule.condition"
              />
            </div>
            <div
              v-if="rule.status === 'pending' && rule.canSettle"
              class="stat-rule-act"
            >
              <button
                class="act held"
                type="button"
                :aria-label="`${rule.name} held`"
                @click="hold(rule)"
              >
                Held
              </button>
              <button
                class="act broke"
                :class="{ armed: armed === ruleKey(rule) }"
                type="button"
                :aria-label="`${rule.name} broke`"
                @click="broke(rule)"
              >
                {{ armed === ruleKey(rule) ? 'Confirm?' : 'Broke' }}
              </button>
            </div>
            <span
              v-else-if="rule.status === 'pending'"
              class="chip wait"
            >Waiting on {{ rule.waitingOn }}</span>
            <span
              v-else
              class="chip"
              :class="rule.status"
            >{{ rule.status === 'held' ? 'Held ✓' : 'Broke · voided' }}</span>
          </li>
        </ul>

        <section
          class="honors"
          :class="{ live: due || awarded }"
          aria-label="Squad Honors"
        >
          <div class="honors-id">
            <span
              class="hex"
              aria-hidden="true"
            >1</span>
            <span class="honors-copy">
              <span class="disp">Squad Honors</span>
              <span class="tiny">
                {{ awarded ? 'Token banked' : !due ? 'Not this mission' : needsRoll ? 'Rolling the stat…' : reelLanded ? 'Read the stats screen' : 'Stat drawn' }}
              </span>
            </span>
            <button
              v-if="isHost && needsRoll"
              class="act roll"
              type="button"
              @click="emit('spinBonus')"
            >
              Roll now
            </button>
          </div>

          <div
            v-if="due || awarded"
            class="reel-slot"
          >
            <HonorsReel
              :stat="stat"
              @landed="reelLanded = true"
            />
          </div>
          <p
            v-else
            class="off"
          >
            {{ reason }}
          </p>

          <div
            v-if="canAward"
            class="pick"
          >
            <p class="pick-note">
              Whoever leads <b>{{ stat?.label }}</b> on the stats screen takes the token. Ties share it.
            </p>
            <div class="pick-row">
              <button
                v-for="diver in seated"
                :key="diver.id"
                class="winner"
                type="button"
                :aria-pressed="picking.includes(diver.id)"
                :aria-label="`Award Squad Honors token to ${diver.name}`"
                @click="togglePick(diver.id)"
              >
                {{ upperName(diver.name) }}
              </button>
              <button
                class="act held"
                type="button"
                :disabled="picking.length === 0"
                @click="award"
              >
                Award{{ picking.length > 1 ? ` ${picking.length}` : '' }}
              </button>
            </div>
          </div>
          <p
            v-else-if="rolled && !awarded && reelLanded"
            class="pick-note"
          >
            {{ hostName }} is naming the winner from the stats screen.
          </p>
          <p
            v-else-if="awarded"
            class="pick-note done"
          >
            {{ winners.map(diver => upperName(diver.name)).join(' · ') }} banked a reward token.
          </p>
        </section>
      </article>
    </div>

    <PhoneActionBar v-if="phone">
      <template #primary>
        <button
          v-if="unlocked"
          class="bar-cta cta-sweep"
          type="button"
          @click="emit('open')"
        >
          <span class="disp">Open the draft</span>
        </button>
        <span
          v-else
          class="bar-gate"
        ><span class="bar-gate-word quiet">{{ blocker ?? 'Open the draft' }}</span></span>
      </template>
    </PhoneActionBar>
    <footer
      v-else
      class="db-foot"
    >
      <button
        class="cta cut cta-sweep"
        :class="{ 'cta-locked': !unlocked }"
        type="button"
        :disabled="!unlocked"
        @click="emit('open')"
      >
        {{ unlocked ? 'Open the draft' : blocker }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.debrief {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--pad-panel);
}
.db-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.kick {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--teal);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.kick::before,
.kick::after {
  content: '';
  width: 22px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.db-title {
  margin: 0;
  font-size: clamp(40px, 5vw, 68px);
  text-shadow: 0 0 36px rgba(74, 215, 200, 0.16);
  animation: riseIn 0.45s var(--ease-out) both;
}
.db-sub { margin: 0; max-width: 56ch; color: var(--muted); font-size: 15px; }

.db-grid {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.panel > *,
.stat-rules > * { flex-shrink: 0; }
.tiny { color: var(--muted); font-size: 11px; }

.stars { display: flex; gap: 4px; }
.star { width: 30px; height: 30px; color: var(--line-4); }
.star.on { fill: currentColor; color: var(--gold); filter: drop-shadow(0 0 8px rgba(255, 214, 66, 0.4)); }
.tag { color: var(--muted); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.tag.full { color: var(--teal); }
.facts { display: flex; flex-direction: column; gap: 8px; margin: 0; }
.fact { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.fact dt { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; }
.fact dd { margin: 0; font-size: 20px; }
.fact dd small { font-size: 12px; color: var(--muted); }
.recap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--line-3);
  list-style: none;
}
.recap li { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 12px; }
.recap span { color: var(--muted); }
.recap b { color: var(--text); font-weight: 700; text-align: right; }
.recap b.broke { color: var(--red); }
.recap i { font-style: normal; font-weight: 600; }
.credits {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--line-3);
  color: var(--muted);
  font-size: 12px;
}
.credits .disp { color: var(--gold); font-size: 22px; }

.checks-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.tiny.clear { color: var(--teal); }
.stat-rules { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.stat-rule {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--raised);
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.stat-rule.held { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--teal) 45%, var(--line-3)); }
.stat-rule.broke { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 55%, var(--line-3)); }
.stat-rule-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1 1 220px; }
.scope { color: var(--muted); }
.stat-rule-name { font-size: 18px; }
.stat-rule-body { color: var(--khaki); font-size: var(--fs-sm); }
.stat-rule-act { display: flex; gap: 8px; }
.act {
  min-width: 88px;
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--khaki);
  font: 700 12px var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.act.held { background: var(--gold); color: var(--on-gold); box-shadow: none; }
.act.held:disabled { background: var(--raised); color: var(--dim); box-shadow: inset 0 0 0 1px var(--line-3); cursor: not-allowed; }
.act.broke.armed { color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }
.act.roll { min-width: 0; min-height: 30px; margin-left: auto; padding: 0 10px; font-size: 10px; }
.chip { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.chip.held { color: var(--teal); }
.chip.broke { color: var(--red); }
.chip.wait { color: var(--muted); font-weight: 600; }

.honors {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: var(--raised);
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.honors.live { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 45%, var(--line-3)); }
.honors-id { display: flex; align-items: center; gap: 12px; }
.hex {
  display: grid;
  place-items: center;
  width: 34px;
  height: 38px;
  background: var(--gold);
  color: var(--on-gold);
  font: 800 16px var(--font-display);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
.honors-copy { display: flex; flex-direction: column; gap: 2px; }
.honors-copy .disp { font-size: 18px; }
.off { margin: 0; color: var(--muted); font-size: var(--fs-sm); }
/* The reel is built for a flex row; a plain block slot keeps its 3-row height. */
.reel-slot { display: block; }
.pick { display: flex; flex-direction: column; gap: 8px; }
.pick-note { margin: 0; color: var(--muted); font-size: var(--fs-sm); }
.pick-note b { color: var(--gold); }
.pick-note.done { color: var(--teal); }
.pick-row { display: flex; flex-wrap: wrap; gap: 8px; }
.winner {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--khaki);
  font: 700 12px var(--font-body);
  letter-spacing: 0.08em;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.winner[aria-pressed='true'] { background: color-mix(in srgb, var(--gold) 18%, transparent); color: var(--gold); box-shadow: inset 0 0 0 1px var(--gold); }

.db-foot { display: flex; justify-content: center; }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: min(100%, 440px);
  min-height: 60px;
  padding: 0 24px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35), 0 0 34px rgba(255, 214, 66, 0.24);
  color: var(--on-gold);
  font: 800 18px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cta:hover { filter: brightness(1.06); }
.cta:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }

@media (max-width: 860px) {
  .db-grid { grid-template-columns: minmax(0, 1fr); }
}

.phone { gap: 14px; padding: var(--sp-4); }
.phone .db-head { align-items: flex-start; text-align: left; }
.phone .kick::after { display: none; }
.phone .db-title { font-size: 38px; }
.phone .db-sub { font-size: 13px; }
.phone .panel { padding: 14px; }
.phone .act { flex: 1; }
</style>
