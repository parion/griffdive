<script setup lang="ts">
import { STRATAGEM_SLOTS_REQUIRED, conditionRiskAt, missionsPerOperation } from '~~/shared/engine/config'
import { factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import { pactName } from '~~/shared/data/pacts'
import {
  applyPactToggle,
  hasLegalLoadout,
  legalStratagemCount,
  pactConflictsWith,
  pactRiskTotal,
  pactSubsumedBy,
} from '~~/shared/engine/pacts'
import {
  activeMisfortune,
  currentFront,
  currentStrain,
  filteredPactsFor,
  pactOfferFor,
  teamRiskBreakdown,
} from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl?: boolean
}>(), { canControl: true })

const emit = defineEmits<{
  lock: [pactIds: string[]]
  pactRisk: [value: number]
}>()

const selection = ref<string[]>([])

watch(
  () => [props.state.wheel?.seed, props.state.misfortuneAccepted],
  () => {
    selection.value = []
  },
)

const offer = computed(() =>
  props.selfId ? pactOfferFor(props.state, props.selfId) : [])

watch(
  selection,
  ids => emit('pactRisk', pactRiskTotal(ids, props.state.difficulty)),
  { immediate: true },
)

function toggle(pactId: string): void {
  if (locked.value) {
    return
  }
  selection.value = applyPactToggle(
    offer.value.map(pact => pact.id),
    selection.value,
    pactId,
  )
}

const coverage = computed<Record<string, string>>(() => {
  const blocked: Record<string, string> = {}
  const misfortuneId = activeMisfortune(props.state)?.id ?? null
  const owned = props.state.personalInventories[props.selfId ?? ''] ?? []
  const baseLegal = hasLegalLoadout(misfortuneId, [], owned)
  for (const pact of offer.value) {
    if (selection.value.includes(pact.id)) {
      continue
    }
    const subsumer = pactSubsumedBy(pact.id, selection.value)
    if (subsumer) {
      blocked[pact.id] = `Covered by ${pactName(subsumer)}`
      continue
    }
    const conflict = pactConflictsWith(pact.id, selection.value)
    if (conflict) {
      blocked[pact.id] = `Conflicts with ${pactName(conflict)}`
      continue
    }
    if (baseLegal && !hasLegalLoadout(misfortuneId, [...selection.value, pact.id], owned)) {
      blocked[pact.id] = 'Leaves too few stratagems to ready up'
    }
  }
  return blocked
})

const locked = computed(() => Boolean(props.self?.pactsLocked))
const selectedRisk = computed(() => pactRiskTotal(selection.value, props.state.difficulty))
const opLength = computed(() => missionsPerOperation(props.state.difficulty))

const front = computed(() => currentFront(props.state))
const strain = computed(() => currentStrain(props.state))
const misfortune = computed(() => activeMisfortune(props.state))
const breakdown = computed(() => teamRiskBreakdown(props.state))
const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))

const filtered = computed(() => filteredPactsFor(props.state))
const floorCount = computed(() => {
  const misfortuneId = activeMisfortune(props.state)?.id ?? null
  const owned = props.state.personalInventories[props.selfId ?? ''] ?? []
  return legalStratagemCount(misfortuneId, selection.value, owned)
})

const canLock = computed(() => !locked.value && offer.value.length > 0)
const swornText = computed(() => `${selection.value.length}/${offer.value.length} sworn`)

const pendingText = computed(() => {
  if (selectedRisk.value > 0) {
    return `+${selectedRisk.value} pending`
  }
  return ''
})
</script>

<template>
  <div class="phone-pacts">
    <div class="scroll">
      <section
        class="summary"
        aria-label="Team risk, locked for the squad"
      >
        <span
          class="summary-lock hazard-soft"
          aria-hidden="true"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.3"
            aria-hidden="true"
          >
            <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
          </svg>
        </span>
        <div class="summary-cells">
          <div
            class="summary-line"
            role="img"
            :aria-label="`Directive ${misfortune?.name ?? 'none'}, plus ${breakdown.misfortuneRisk}`"
          >
            <span class="s-name">{{ misfortune?.name ?? 'Safe dive' }}</span>
            <span class="disp s-risk gold">+{{ breakdown.misfortuneRisk }}</span>
          </div>
          <div
            v-if="strain || breakdown.majorOrderRisk > 0"
            class="summary-line"
            role="img"
            :aria-label="strain ? `${strain.name} strain, plus ${breakdown.strainRisk} every mission` : `Major Order, plus ${breakdown.majorOrderRisk} every mission`"
          >
            <img
              v-if="frontImage"
              :src="frontImage"
              alt=""
              class="s-icon"
            >
            <img
              v-if="strainImage"
              :src="strainImage"
              alt=""
              class="s-icon s-icon-sub"
            >
            <span class="s-name">{{ strain?.name ?? 'Major Order' }}</span>
            <span class="disp s-risk orange">+{{ breakdown.strainRisk || breakdown.majorOrderRisk }} ×{{ opLength }}</span>
          </div>
        </div>
        <div class="summary-total">
          <span class="lbl">Team</span>
          <span class="disp total-n">{{ breakdown.total }}</span>
        </div>
      </section>

      <div class="notes">
        <span
          v-if="filtered.length"
          class="note filter"
          role="note"
        >
          <b>{{ filtered.length }} filtered</b>
          <s>{{ filtered.map(p => p.name).join(', ') }}</s>
        </span>
        <span
          class="note floor"
          role="note"
        >
          <i
            v-for="n in STRATAGEM_SLOTS_REQUIRED"
            :key="n"
          />
          Floor · {{ floorCount }}
        </span>
      </div>

      <section
        class="hand"
        :aria-label="`Pact offer, ${offer.length} dealt. Toggle to swear.`"
      >
        <button
          v-for="pact in offer"
          :key="pact.id"
          class="pact-row"
          :class="{ on: selection.includes(pact.id), blocked: Boolean(coverage[pact.id]) }"
          type="button"
          :aria-pressed="selection.includes(pact.id)"
          :aria-disabled="locked || Boolean(coverage[pact.id])"
          :aria-label="`${pact.name}, ${pact.rule}, risk ${conditionRiskAt(pact.id, state.difficulty)}${coverage[pact.id] ? `. ${coverage[pact.id]}` : ''}`"
          @click="toggle(pact.id)"
        >
          <span
            class="pact-tile grid-bg"
            aria-hidden="true"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 3h12v14l-6 4-6-4z" />
            </svg>
          </span>
          <span class="pact-copy">
            <span class="disp pact-name">{{ pact.name }}</span>
            <span class="pact-rule">{{ pact.rule }}</span>
            <span class="pact-meta">
              <span class="chan">{{ pact.accountability }}</span>
              <span
                v-if="coverage[pact.id]"
                class="covered"
              >{{ coverage[pact.id] }}</span>
            </span>
          </span>
          <span class="pact-risk">
            <span class="disp risk-n red">+{{ conditionRiskAt(pact.id, state.difficulty) }}</span>
            <span class="skulls">
              <RiskPips
                :value="conditionRiskAt(pact.id, state.difficulty)"
                :max="5"
              />
            </span>
          </span>
          <span
            v-if="selection.includes(pact.id)"
            class="sworn disp stamp"
            aria-hidden="true"
          >Sworn</span>
        </button>

        <p
          v-if="!offer.length"
          class="no-offer"
        >
          No pact offer yet — the wheel decides first.
        </p>
      </section>
    </div>

    <PhoneActionBar aria-label="Valor and lock-in">
      <template #detail>
        <div class="sheet-head">
          <span class="lbl gold">Valor</span>
          <span class="disp sheet-val">{{ (self ? selectedRisk + breakdown.total : breakdown.total) }}</span>
          <span class="sheet-scale">/ 11</span>
          <span
            v-if="pendingText"
            class="sheet-pending"
          >{{ pendingText }}</span>
          <span
            v-else-if="locked"
            class="sheet-locked"
          >Locked</span>
          <span
            v-else
            class="sheet-count"
          >{{ swornText }}</span>
        </div>
      </template>

      <template #action>
        <div class="sheet-foot">
          <HoldButton
            v-if="!locked"
            :label="canLock ? 'Lock in' : 'Locked out'"
            :hint="canLock ? 'hold to lock' : ''"
            tone="gold"
            :disabled="!canLock"
            @confirm="emit('lock', selection)"
          />
          <div
            v-else
            class="locked-row"
          >
            <span class="disp stamp locked-stamp">Locked</span>
            <span class="locked-note">Waiting for the squad…</span>
          </div>
        </div>
      </template>
    </PhoneActionBar>
  </div>
</template>

<style scoped>
.phone-pacts { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 14px;
}

.summary {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--line-2);
  background: var(--rail);
}
.summary-lock {
  width: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: var(--gold);
  border-right: 1px solid var(--line-2);
}
.summary-lock svg { background: var(--rail); padding: 2px; box-sizing: content-box; }
.summary-cells {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
}
.summary-line { display: flex; align-items: center; gap: 7px; min-width: 0; }
.s-name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.s-icon { width: 16px; height: 16px; object-fit: contain; }
.s-icon-sub { width: 14px; height: 14px; margin-left: -8px; }
.s-risk { margin-left: auto; font-size: 14px; }
.gold { color: var(--gold); }
.orange { color: var(--orange); }
.summary-total .lbl { font-size: 9px; }
.summary-total {
  width: 72px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-left: 1px solid var(--line-1);
  background: var(--panel);
}
.total-n { font-size: 24px; color: var(--text); }

.notes { display: flex; gap: 8px; min-height: 26px; }
.note {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
}
.note.filter {
  flex: 1 1 auto;
  border: 1px dashed var(--line-3);
  color: var(--muted);
}
.note.filter b { color: var(--text); }
.note.filter s { color: var(--khaki); text-decoration-color: var(--red); }
.note.floor {
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--teal) 45%, transparent);
  background: color-mix(in srgb, var(--teal) 6%, transparent);
  color: var(--teal);
}
.note.floor i { width: 5px; height: 5px; background: var(--teal); }

.hand { display: flex; flex-direction: column; gap: 8px; }

.pact-row {
  position: relative;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.pact-row.on { border-color: var(--red); background: color-mix(in srgb, var(--red) 6%, var(--panel)); }
.pact-row.blocked { opacity: 0.5; cursor: not-allowed; }
.pact-tile {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  background-color: var(--ground);
  background-size: 12px 12px;
  border: 1px solid var(--line-2);
  color: var(--text);
}
.pact-row.on .pact-tile { color: var(--red); border-color: var(--red); }
.pact-copy { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.pact-name { font-size: 16px; }
.pact-rule { font-size: 12.5px; line-height: 1.25; }
.pact-meta { display: flex; align-items: center; gap: 8px; min-width: 0; }
.chan {
  padding: 0 6px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--line-2);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.covered {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--red);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pact-risk { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.risk-n { font-size: 22px; }
.red { color: var(--red); }
.skulls { display: flex; }

.sworn {
  position: absolute;
  right: 12px;
  bottom: 8px;
  padding: 4px 9px;
  font-size: 13px;
  border: 2px solid var(--red);
  color: var(--red);
  background: rgba(11, 12, 9, 0.9);
}

.no-offer {
  margin: 0;
  padding: 24px 12px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.sheet-head { display: flex; align-items: baseline; gap: 7px; }
.sheet-val { font-size: 24px; color: var(--gold); }
.sheet-scale { font-size: 11px; font-weight: 700; color: var(--dim); }
.sheet-pending,
.sheet-locked,
.sheet-count {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}
.sheet-pending { color: var(--red); }
.sheet-locked { color: var(--gold); }
.sheet-count { color: var(--muted); }
.sheet-foot { display: flex; }
.locked-row { display: flex; align-items: center; gap: 12px; width: 100%; }
.locked-stamp {
  padding: 6px 12px;
  font-size: 16px;
  border: 3px solid var(--gold);
  color: var(--gold);
}
.locked-note {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.wait-note {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
</style>
