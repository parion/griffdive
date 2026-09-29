<script setup lang="ts">
import { MAJOR_ORDER_RISK, STRAIN_RISK, conditionRiskAt, missionsPerOperation } from '~~/shared/engine/config'
import { canRerollWheel, currentMisfortune, currentStrain, majorOrderFronts, misfortuneDecision, misfortuneStrandedDivers, strainDecision, teamRiskOf } from '~~/shared/engine/selectors'
import { factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import { FRONTS } from '~~/shared/data/fronts'
import type { DiveState, MajorOrderSelection } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  canControl?: boolean
}>(), { canControl: true })

const emit = defineEmits<{
  spin: []
  decide: [accepted: boolean]
  decideStrain: [accepted: boolean]
  deal: []
  setMajorOrder: [order: MajorOrderSelection | null]
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
}>()

const misfortune = computed(() => currentMisfortune(props.state))
const misfortuneRisk = computed(() =>
  misfortune.value ? conditionRiskAt(misfortune.value.id, props.state.difficulty) : 0)
const decision = computed(() => misfortuneDecision(props.state))
const stranded = computed(() => misfortuneStrandedDivers(props.state))
const acceptBlocked = computed(() => stranded.value.length > 0)
const strandedReason = computed(() =>
  `${stranded.value.map(d => d.name).join(', ')} can't field four stratagems under this rule — opt out or reroll.`)

const strain = computed(() => currentStrain(props.state))
const strainRisk = computed(() => STRAIN_RISK[strain.value?.id ?? ''] ?? 0)
const strainCall = computed(() => strainDecision(props.state))
// The drawn strain persists with the front for the whole operation, so the
// card shows whenever one exists (not just on the first mission's decision).
const strainVisible = computed(() =>
  Boolean(props.state.strainId) && !props.state.majorOrder)

const front = computed(() =>
  props.state.frontId ? FRONTS.find(f => f.id === props.state.frontId) ?? null : null)
const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))

const mo = computed(() => props.state.majorOrder)
const moFronts = computed(() => majorOrderFronts(props.state))

const misfortuneReroll = computed(() => canRerollWheel(props.state, 'misfortune'))
const frontReroll = computed(() => canRerollWheel(props.state, 'front'))
const strainReroll = computed(() => canRerollWheel(props.state, 'strain'))

function rerollTitle(info: { free: boolean, reason: string | null }, wheel: string): string {
  return info.reason ?? (info.free
    ? `Reroll ${wheel} — free: combo already completed`
    : `Reroll ${wheel} — spends a reroll token (${props.state.rerollTokens} left)`)
}

const teamRisk = computed(() => teamRiskOf(props.state))
const opLength = computed(() => missionsPerOperation(props.state.difficulty))

const pendingText = computed(() => {
  return decision.value.decided ? 'Misfortune called' : 'Misfortune pending'
})

// The host gate: both calls in, the wheel holds until the host deals.
const dealReady = computed(() =>
  props.state.phase === 'deal'
  && decision.value.decided
  && strainCall.value.decided)

// The gate readout counts the calls still outstanding (misfortune + strain).
const gateText = computed(() => {
  const needsStrain = strainVisible.value && Boolean(strain.value)
  const need = 1 + (needsStrain ? 1 : 0)
  const made = (decision.value.decided ? 1 : 0) + (needsStrain && strainCall.value.decided ? 1 : 0)
  return `${made}/${need} CALLS`
})

const showMo = computed(() => !props.state.frontId)

function acceptDisabled(): boolean {
  return !props.canControl || acceptBlocked.value
}
</script>

<template>
  <div class="phone-wheel">
    <div class="stage">
      <div
        class="sweep"
        aria-hidden="true"
      />

      <button
        v-if="state.wheel"
        class="ghost reroll"
        type="button"
        :disabled="!misfortuneReroll.allowed"
        :aria-label="`Reroll the misfortune${misfortuneReroll.free ? ' (free)' : `, spends a token (${state.rerollTokens} left)`}`"
        :title="misfortuneReroll.reason ?? undefined"
        @click="emit('reroll', 'misfortune')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          aria-hidden="true"
        >
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="2"
          />
          <circle
            cx="8.5"
            cy="8.5"
            r="1.3"
            fill="currentColor"
          />
          <circle
            cx="15.5"
            cy="15.5"
            r="1.3"
            fill="currentColor"
          />
          <circle
            cx="12"
            cy="12"
            r="1.3"
            fill="currentColor"
          />
        </svg>
        <span class="reroll-n">{{ state.rerollTokens }}</span>
      </button>

      <div
        class="legend"
        aria-hidden="true"
      >
        <span><i class="khaki" />1–2</span>
        <span><i class="orange" />3</span>
        <span><i class="red" />4–5</span>
      </div>

      <WheelOfMisfortune
        :difficulty="state.difficulty"
        :seed="state.wheel?.seed ?? null"
        :can-control="canControl"
        @spin="emit('spin')"
      />
    </div>

    <div class="cards">
      <template v-if="showMo">
        <MajorOrderPicker
          :state="state"
          :can-control="canControl"
          @select="emit('setMajorOrder', $event)"
        />
      </template>

      <template v-if="state.wheel">
        <div
          class="card"
          :class="decision.decided ? (decision.accepted ? 'locked' : 'safe') : 'open'"
        >
          <div class="card-head">
            <span class="lbl">Misfortune · whole squad</span>
            <span
              v-if="decision.decided"
              class="stamp disp"
              :class="decision.accepted ? 'red' : 'khaki'"
            >{{ decision.accepted ? 'Sworn' : 'Opted out' }}</span>
          </div>
          <div class="mis-name disp">
            {{ misfortune?.name ?? 'Safe dive' }}
          </div>
          <div class="mis-row">
            <span class="mis-rule">{{ misfortune?.rule ?? 'No team rule — a zero-risk dive.' }}</span>
            <span
              v-if="misfortune"
              class="mis-risk"
            >
              <span
                class="disp red"
              >+{{ misfortuneRisk }}</span>
              <RiskPips
                :value="misfortuneRisk"
                :max="5"
              />
            </span>
          </div>

          <template v-if="!decision.decided">
            <p
              v-if="acceptBlocked && canControl"
              class="block-note"
            >
              {{ strandedReason }}
            </p>
            <div class="mis-actions">
              <HoldButton
                :label="acceptBlocked ? 'Blocked' : 'Lock it in'"
                hint="hold"
                tone="gold"
                :disabled="acceptDisabled()"
                :aria-label="acceptBlocked ? strandedReason : 'Accept the misfortune, hold to lock'"
                @confirm="emit('decide', true)"
              />
              <button
                class="ghost opt-out"
                type="button"
                :disabled="!canControl"
                @click="emit('decide', false)"
              >
                <span class="disp">Opt out</span>
                <span class="sub">+0</span>
              </button>
            </div>
          </template>
          <template v-else-if="canControl">
            <button
              class="ghost change"
              type="button"
              @click="emit('decide', !decision.accepted)"
            >
              {{ decision.accepted ? 'Switch — opt out' : 'Switch — lock it in' }}
            </button>
          </template>
        </div>

        <div
          v-if="strainVisible && strain"
          class="card strain-card"
        >
          <div class="card-head">
            <span class="lbl strain-l">Front · strain</span>
            <span class="head-tools">
              <button
                v-if="canControl"
                class="reroll-dice"
                type="button"
                :disabled="!frontReroll.allowed"
                :aria-label="rerollTitle(frontReroll, 'front')"
                :title="frontReroll.allowed ? undefined : rerollTitle(frontReroll, 'front')"
                @click="emit('reroll', 'front')"
              ><IconDice /></button>
              <button
                v-if="canControl && strain"
                class="reroll-dice"
                type="button"
                :disabled="!strainReroll.allowed"
                :aria-label="rerollTitle(strainReroll, 'strain')"
                :title="strainReroll.allowed ? undefined : rerollTitle(strainReroll, 'strain')"
                @click="emit('reroll', 'strain')"
              ><IconDice /></button>
              <span
                v-if="strainCall.decided"
                class="stamp disp"
                :class="strainCall.accepted ? 'orange' : 'khaki'"
              >{{ strainCall.accepted ? 'Committed' : 'Opted out' }}</span>
            </span>
          </div>
          <div class="strain-row">
            <img
              v-if="frontImage"
              :src="frontImage"
              :alt="front?.displayName ?? 'Front'"
              class="strain-icon"
            >
            <img
              v-if="strainImage"
              :src="strainImage"
              alt=""
              class="strain-icon strain-sub"
            >
            <div class="strain-copy">
              <span class="strain-name disp">{{ strain.name }}</span>
              <span class="strain-front">{{ front?.displayName }} · every mission</span>
            </div>
            <span class="disp strain-risk orange">+{{ strainRisk }} ×{{ opLength }}</span>
          </div>

          <template v-if="!strainCall.decided">
            <div class="mis-actions">
              <HoldButton
                label="Commit"
                hint="hold · whole operation"
                tone="orange"
                :disabled="!canControl"
                @confirm="emit('decideStrain', true)"
              />
              <button
                class="ghost opt-out"
                type="button"
                :disabled="!canControl"
                @click="emit('decideStrain', false)"
              >
                <span class="disp">Opt out</span>
                <span class="sub">+0</span>
              </button>
            </div>
          </template>
          <template v-else-if="canControl">
            <button
              class="ghost change"
              type="button"
              @click="emit('decideStrain', !strainCall.accepted)"
            >
              {{ strainCall.accepted ? 'Switch — opt out' : 'Switch — commit' }}
            </button>
          </template>
        </div>

        <div
          v-if="mo"
          class="card mo-card"
        >
          <div class="card-head">
            <span class="lbl mo-l">Major Order · pinned</span>
          </div>
          <div class="mo-fronts">
            <img
              v-for="f in moFronts"
              :key="f.id"
              :src="factionImageUrl(f.id)"
              :alt="f.displayName"
              class="mo-icon"
            >
            <span class="mo-name">{{ moFronts.map(f => f.displayName).join(' / ') }}</span>
            <span class="disp mo-risk">+{{ MAJOR_ORDER_RISK }} ×{{ opLength }}</span>
          </div>
        </div>
      </template>

      <template v-else-if="!canControl">
        <p class="waiting">
          Waiting for the host to spin…
        </p>
      </template>
    </div>

    <PhoneActionBar
      v-if="state.wheel"
      aria-label="Valor and next step"
    >
      <template #detail>
        <PhoneValor
          :difficulty="state.difficulty"
          :team-risk="teamRisk"
          :pact-risk="0"
          :pending-text="decision.decided && (!strainVisible || strainCall.decided) ? 'Dealing pacts' : pendingText"
        />
      </template>
      <template #action>
        <button
          v-if="dealReady && canControl"
          class="deal-btn"
          type="button"
          @click="emit('deal')"
        >
          <span class="disp">Deal the pacts</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <div
          v-else
          class="gate"
          role="status"
        >
          <span
            class="hazard-soft gate-edge"
            aria-hidden="true"
          />
          <span class="disp gate-word">Deal the pacts</span>
          <span class="gate-meta">{{ dealReady ? 'Waiting for the host' : gateText }}</span>
        </div>
      </template>
    </PhoneActionBar>
  </div>
</template>

<style scoped>
.phone-wheel { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 330px;
  display: grid;
  place-items: center;
  padding: 22px 12px;
  overflow: hidden;
}
.sweep {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 56px;
  background: linear-gradient(180deg, transparent, rgba(255, 214, 66, 0.05));
  animation: sweepY 9s linear infinite;
  pointer-events: none;
}
.stage :deep(.wheel-wrap) { width: min(100%, 300px); }

.reroll {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 2;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: var(--ground);
  color: var(--text);
}
.reroll:disabled { opacity: 0.4; }
.reroll-n {
  position: absolute;
  right: -1px;
  bottom: -1px;
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 18px;
  padding: 0 3px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  font-size: 10px;
  font-weight: 700;
}

.legend {
  position: absolute;
  right: 12px;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--muted);
}
.legend span { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
.legend i { width: 7px; height: 7px; }
.legend i.khaki { background: var(--khaki); }
.legend i.orange { background: var(--orange); }
.legend i.red { background: var(--red); }

.cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--rail);
  border-top: 1px solid var(--line-3);
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--panel);
  border: 1px solid var(--line-3);
}
.card.locked { border-color: var(--red); }
.card.safe { border-color: var(--line-4); }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.head-tools { display: inline-flex; align-items: center; gap: 8px; }
.reroll-dice {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-3);
  background: var(--ground);
  color: var(--text);
  cursor: pointer;
}
.reroll-dice:disabled { opacity: 0.4; cursor: not-allowed; }
.reroll-dice :deep(svg) { width: 18px; height: 18px; }
.stamp {
  padding: 3px 8px;
  font-size: 12px;
  border: 2px solid var(--gold);
  color: var(--gold);
}
.stamp.red { border-color: var(--red); color: var(--red); }
.stamp.orange { border-color: var(--orange); color: var(--orange); }
.stamp.khaki { border-color: var(--khaki); color: var(--khaki); }
.mis-name { font-size: 24px; color: var(--gold); }
.mis-row { display: flex; align-items: center; gap: 10px; }
.mis-rule { flex: 1 1 auto; min-width: 0; font-size: 13px; line-height: 1.3; }
.mis-risk { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.mis-risk .red { font-size: 15px; color: var(--red); }
.block-note {
  margin: 0;
  padding: 7px 9px;
  border: 1px solid var(--red);
  color: var(--red);
  font-size: 11px;
  line-height: 1.3;
}
.mis-actions { display: flex; gap: 8px; }
.mis-actions :deep(.hold-btn) { flex: 1 1 auto; }
.opt-out {
  width: 104px;
  height: 54px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text);
}
.opt-out .disp { font-size: 13px; }
.opt-out .sub { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; color: var(--muted); }
.change {
  align-self: flex-start;
  height: 40px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--khaki);
}

.strain-card {
  background: linear-gradient(90deg, rgba(255, 75, 62, 0.1), var(--panel) 60%);
  border-color: rgba(255, 75, 62, 0.45);
}
.strain-l { color: var(--red); }
.strain-row { display: flex; align-items: center; gap: 10px; }
.strain-icon { width: 34px; height: 34px; object-fit: contain; flex-shrink: 0; }
.strain-sub { width: 22px; height: 22px; margin-left: -14px; }
.strain-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1 1 auto; }
.strain-name { font-size: 17px; color: var(--text); }
.strain-front { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.strain-risk { font-size: 18px; }
.orange { color: var(--orange); }

.mo-card { background: linear-gradient(90deg, rgba(255, 75, 62, 0.08), var(--panel) 60%); }
.mo-l { color: var(--orange); }
.mo-fronts { display: flex; align-items: center; gap: 8px; }
.mo-icon { width: 28px; height: 28px; object-fit: contain; }
.mo-name { flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.mo-risk { font-size: 15px; color: var(--orange); }

.waiting {
  margin: 0;
  padding: 18px 12px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.deal-btn {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  background: var(--gold);
  color: var(--on-gold);
  cursor: pointer;
}
.deal-btn svg { width: 20px; height: 20px; }

/* The not-ready gate: a dashed, disabled mirror of the deal button. */
.gate {
  position: relative;
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px 0 18px;
  border: 1px dashed var(--line-4);
  background: var(--ground);
  overflow: hidden;
}
.gate-edge {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
}
.gate-word { font-size: 15px; color: var(--dim); }
.gate-meta {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--muted);
  white-space: nowrap;
}

@keyframes sweepY {
  0% { transform: translateY(-40%); }
  100% { transform: translateY(900%); }
}
@media (prefers-reduced-motion: reduce) {
  .sweep { animation: none; opacity: 0.4; }
}
</style>
