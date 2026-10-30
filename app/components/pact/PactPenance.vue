<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { pactById, pactName } from '~~/shared/data/pacts'
import { conditionRiskAt } from '~~/shared/engine/config'
import type { DiverState } from '~~/shared/engine/types'

// The debt a diver carries into the mission: pacts broken at last mission's
// stats check, sworn again without a say and without Valor. Purple is Penance's
// colour everywhere it appears, so a forced pact never reads as a chosen one.
const props = defineProps<{
  self: DiverState | null
  difficulty: number
}>()

const debt = computed(() => (props.self?.penance?.status === 'owed' ? props.self.penance : null))
const pacts = computed(() => (debt.value?.pactIds ?? []).flatMap((id) => {
  const pact = pactById(id)
  return pact ? [{ id, pact, name: pactName(id), risk: conditionRiskAt(id, props.difficulty) }] : []
}))
const stake = computed(() => (debt.value?.itemId ? ITEMS_BY_ID.get(debt.value.itemId)?.displayName ?? null : null))
</script>

<template>
  <section
    v-if="debt && pacts.length"
    class="penance"
    aria-label="Penance owed"
  >
    <header class="penance-head">
      <span class="cap">Penance</span>
      <span class="penance-note">Sworn again, no Valor.</span>
    </header>
    <ul class="penance-list">
      <li
        v-for="entry in pacts"
        :key="entry.id"
      >
        <RiskPips
          :value="entry.risk"
          :max="entry.risk"
          tone="purple"
        />
        <b class="disp">{{ entry.name }}</b>
        <span class="penance-rule"><ConditionRule :condition="entry.pact" /></span>
      </li>
    </ul>
    <p class="penance-stake">
      <template v-if="stake">
        Hold it and keep <b>{{ stake }}</b>. Break it again, or fail the mission, and it is voided.
      </template>
      <template v-else>
        Hold it to clear the debt.
      </template>
    </p>
  </section>
</template>

<style scoped>
.penance {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  width: 100%;
  max-width: 720px;
  margin-inline: auto;
  background: color-mix(in srgb, var(--purple) 9%, var(--panel));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--purple) 55%, var(--line-2)), inset 3px 0 0 var(--purple);
}
.penance-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
.penance-head .cap { color: var(--purple); }
.penance-note { color: var(--muted); font-size: 12px; }
.penance-list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.penance-list li { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
.penance-list .disp { font-size: 18px; }
.penance-rule { flex: 1 1 200px; min-width: 0; color: var(--khaki); font-size: var(--fs-sm); }
.penance-stake { margin: 0; color: var(--muted); font-size: 13px; }
.penance-stake b { color: var(--purple); }
</style>
