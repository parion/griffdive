<script setup lang="ts">
import { conditionById } from '~~/shared/data/conditions'
import { conditionRiskAt } from '~~/shared/engine/config'
import { statsRules } from '~~/shared/engine/selectors'
import type { StatsRule } from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'

// The debrief's stats check: every rule only HD2's end-of-mission stats screen
// can prove. Rules are held unless marked broke, and a break is an ordinary
// failed mark: it voids the rule's risk and costs the coming draft an option.
const props = defineProps<{
  state: DiveState
  selfId: string | null
  isHost: boolean
}>()

const emit = defineEmits<{
  failPact: [playerId: string, pactId: string]
  failDirective: []
}>()

const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'The host')

interface RuleRow extends StatsRule {
  name: string
  scopeLabel: string
  condition: NonNullable<ReturnType<typeof conditionById>>
  risk: number
  canMark: boolean
}

const rows = computed<RuleRow[]>(() => statsRules(props.state).flatMap((rule) => {
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
    risk: conditionRiskAt(rule.conditionId, props.state.difficulty),
    scopeLabel: rule.scope === 'directive' ? 'Squad directive' : `${ownerName}’s pact`,
    // The host referees any pact, as with field marks; a diver marks their
    // own. The directive binds the squad, so only the host marks it.
    canMark: rule.scope === 'directive'
      ? props.isHost
      : props.isHost || rule.diverId === props.selfId,
  }]
}))

// A broke mark is one-way and costs a loot option, so it takes a second tap.
const armed = ref<string | null>(null)
const keyOf = (rule: StatsRule): string => `${rule.scope}:${rule.diverId ?? ''}:${rule.conditionId}`

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
      <span class="tiny">{{ rows.length === 0 ? 'Nothing rides on the stats screen' : 'Held by default — mark any you broke' }}</span>
    </header>

    <ul
      v-if="rows.length > 0"
      class="rules"
    >
      <li
        v-for="row in rows"
        :key="keyOf(row)"
        class="rule-row"
        :class="row.broke ? 'broke' : 'held'"
      >
        <div class="rule-text">
          <span class="cap scope">{{ row.scopeLabel }}</span>
          <span class="rule-name">
            <RiskPips
              v-if="row.scope === 'pact'"
              :value="row.risk"
              :max="row.risk"
              :tone="row.risk >= 3 ? 'red' : 'gold'"
            />
            <b class="disp">{{ row.name }}</b>
          </span>
          <ConditionRule
            class="rule-body"
            :condition="row.condition"
          />
        </div>
        <button
          v-if="!row.broke && row.canMark"
          class="act broke"
          :class="{ armed: armed === keyOf(row) }"
          type="button"
          :aria-label="`Mark ${row.name} broke`"
          @click="broke(row)"
        >
          {{ armed === keyOf(row) ? 'Confirm?' : 'Broke' }}
        </button>
        <span
          v-else
          class="chip"
          :class="row.broke ? 'broke' : 'held'"
        >{{ row.broke ? 'Broke · loot option lost' : 'Held' }}</span>
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
.rule-text { display: flex; flex: 1 1 220px; flex-direction: column; gap: 3px; min-width: 0; }
.scope { color: var(--muted); }
.rule-name { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.rule-name .disp { font-size: 18px; }
.rule-body { color: var(--khaki); font-size: var(--fs-sm); }
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
.act.broke.armed { color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }
.chip { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.chip.held { color: var(--teal); }
.chip.broke { color: var(--red); }
</style>
