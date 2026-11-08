<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { conditionById } from '~~/shared/data/conditions'
import { conditionRiskAt } from '~~/shared/engine/config'
import { statsRules } from '~~/shared/engine/selectors'
import type { StatsRule } from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'

// The stats check: every rule only HD2's end-of-mission stats screen can prove,
// attested held or broke now that the drafts are banked. A broken pact is owed
// back next mission as Penance (purple); a broken Penance pact voids the reward
// it was guarding. The engine owns all of it; this panel only reports.
const props = defineProps<{
  state: DiveState
  selfId: string | null
  isHost: boolean
}>()

const emit = defineEmits<{
  holdPact: [playerId: string, pactId: string]
  failPact: [playerId: string, pactId: string]
  holdDirective: []
  failDirective: []
}>()

const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'The host')

interface RuleRow extends StatsRule {
  name: string
  scopeLabel: string
  condition: NonNullable<ReturnType<typeof conditionById>>
  risk: number
  canSettle: boolean
  waitingOn: string
  stake: string | null
  outcome: string
}

const rows = computed<RuleRow[]>(() => statsRules(props.state).flatMap((rule) => {
  const condition = conditionById(rule.conditionId)
  if (!condition) {
    return []
  }
  const owner = rule.diverId ? props.state.divers.find(diver => diver.id === rule.diverId) : null
  const ownerName = owner ? upperName(owner.name) : hostName.value
  const stakeId = rule.penance ? owner?.penance?.itemId : null
  const stake = stakeId ? ITEMS_BY_ID.get(stakeId)?.displayName ?? null : null
  let outcome = rule.status === 'held' ? 'Held' : 'Broke'
  if (rule.status === 'held' && rule.penance) {
    outcome = stake ? `Held · ${stake} kept` : 'Held · debt cleared'
  }
  else if (rule.status === 'broke' && rule.penance) {
    outcome = stake ? `Broke · ${stake} voided` : 'Broke · voided'
  }
  else if (rule.status === 'broke' && rule.afterDraft) {
    outcome = rule.scope === 'directive' ? 'Broke · draft tax next mission' : 'Broke · Penance next mission'
  }
  return [{
    ...rule,
    name: condition.name,
    condition,
    risk: conditionRiskAt(rule.conditionId, props.state.difficulty),
    scopeLabel: rule.scope === 'directive'
      ? 'Squad directive'
      : `${ownerName}’s ${rule.penance ? 'penance' : 'pact'}`,
    // The host referees any pact, as with field marks; a diver settles their
    // own. The directive binds the squad, so only the host settles it.
    canSettle: rule.scope === 'directive'
      ? props.isHost
      : props.isHost || rule.diverId === props.selfId,
    waitingOn: rule.scope === 'directive' ? hostName.value : ownerName,
    stake,
    outcome,
  }]
}))
const pending = computed(() => rows.value.filter(row => row.status === 'pending').length)

// A broke mark is one-way and has a price, so it takes a second tap.
const armed = ref<string | null>(null)
const keyOf = (rule: StatsRule): string => `${rule.scope}:${rule.diverId ?? ''}:${rule.conditionId}`

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
  const key = keyOf(rule)
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
</script>

<template>
  <section
    class="stats"
    aria-label="Stats check"
  >
    <header class="stats-head">
      <span class="cap">Stats check</span>
      <span
        class="tiny"
        :class="{ clear: pending === 0 && rows.length > 0 }"
      >{{ rows.length === 0 ? 'Nothing rides on the stats screen' : pending === 0 ? 'All settled' : `${pending} to settle` }}</span>
    </header>

    <ul
      v-if="rows.length > 0"
      class="rules"
    >
      <li
        v-for="row in rows"
        :key="keyOf(row)"
        class="rule-row"
        :class="[row.status, { penance: row.penance }]"
      >
        <div class="rule-text">
          <span class="cap scope">{{ row.scopeLabel }}</span>
          <span class="rule-name">
            <RiskPips
              v-if="row.scope === 'pact'"
              :value="row.risk"
              :max="row.risk"
              :tone="row.penance ? 'purple' : row.risk >= 3 ? 'red' : 'gold'"
            />
            <b class="disp">{{ row.name }}</b>
          </span>
          <ConditionRule
            class="rule-body"
            :condition="row.condition"
          />
          <span
            v-if="row.penance && row.status === 'pending'"
            class="rule-stake"
          >{{ row.stake ? `Hold it to keep ${row.stake}.` : 'Hold it to clear the debt.' }}</span>
        </div>
        <div
          v-if="row.status === 'pending' && row.canSettle"
          class="rule-act"
        >
          <button
            class="act held"
            type="button"
            :aria-label="`${row.name} held`"
            @click="hold(row)"
          >
            Held
          </button>
          <button
            class="act broke"
            :class="{ armed: armed === keyOf(row) }"
            type="button"
            :aria-label="`${row.name} broke`"
            @click="broke(row)"
          >
            {{ armed === keyOf(row) ? 'Confirm?' : 'Broke' }}
          </button>
        </div>
        <span
          v-else-if="row.status === 'pending'"
          class="chip wait"
        >Waiting on {{ row.waitingOn }}</span>
        <span
          v-else
          class="chip"
          :class="[row.status, { owes: row.afterDraft && row.scope === 'pact' && !row.penance }]"
        >{{ row.outcome }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.stats { display: flex; flex-direction: column; gap: 12px; }
.stats-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.tiny { color: var(--muted); font-size: 11px; }
.tiny.clear { color: var(--teal); }
.rules { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.rules > * { flex-shrink: 0; }
.rule-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--raised);
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.rule-row.held { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--teal) 45%, var(--line-3)); }
.rule-row.broke { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 55%, var(--line-3)); }
.rule-row.penance {
  background: color-mix(in srgb, var(--purple) 8%, var(--raised));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--purple) 50%, var(--line-3)), inset 3px 0 0 var(--purple);
}
.rule-text { display: flex; flex: 1 1 220px; flex-direction: column; gap: 3px; min-width: 0; }
.scope { color: var(--muted); }
.penance .scope { color: var(--purple); }
.rule-name { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.rule-name .disp { font-size: 18px; }
.rule-body { color: var(--khaki); font-size: var(--fs-sm); }
.rule-stake { color: var(--purple); font-size: 12px; }
.rule-act { display: flex; gap: 8px; }
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
.act.broke.armed { color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }
.chip { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.chip.held { color: var(--teal); }
.chip.broke { color: var(--red); }
.chip.broke.owes { color: var(--purple); }
.chip.wait { color: var(--muted); font-weight: 600; }
</style>
