<script setup lang="ts">
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui'
import { conditionRiskAt } from '~~/shared/engine/config'
import { pactById, pactName } from '~~/shared/data/pacts'
import type { DiveState } from '~~/shared/engine/types'

// The field's "Pacts sworn" ledger, shared by the desktop and phone screens.
// Each pact is an accordion row that opens on its vow; your own start open so
// the rules you swore are in front of you while you play.
const props = defineProps<{
  state: DiveState
  selfId: string | null
  isHost: boolean
}>()

const emit = defineEmits<{ fail: [playerId: string, pactId: string] }>()

const pactsByDiver = computed(() =>
  props.state.divers.map(diver => ({
    id: diver.id,
    name: diver.id === props.selfId ? 'You' : upperName(diver.name),
    pacts: diver.pactIds.map((id) => {
      const pact = pactById(id)
      return {
        id,
        key: `${diver.id}:${id}`,
        name: pactName(id),
        pact: pact ?? null,
        accountability: pact ? ACCOUNTABILITY_LABELS[pact.accountability] : '',
        risk: conditionRiskAt(id, props.state.difficulty),
        failed: diver.failedPactIds.includes(id),
      }
    }),
  })))

const ownKeys = pactsByDiver.value
  .find(diver => diver.id === props.selfId)
  ?.pacts.map(pact => pact.key) ?? []

const armedPact = ref<string | null>(null)

function canMark(diverId: string): boolean {
  return props.selfId === diverId || props.isHost
}

function markPact(diverId: string, pactId: string): void {
  if (!canMark(diverId)) {
    return
  }
  const key = `${diverId}:${pactId}`
  if (armedPact.value !== key) {
    armedPact.value = key
    return
  }
  armedPact.value = null
  emit('fail', diverId, pactId)
}
</script>

<template>
  <section
    class="ledger"
    aria-label="Pacts sworn"
  >
    <span class="cap ledger-cap">Pacts sworn</span>
    <AccordionRoot
      type="multiple"
      :default-value="ownKeys"
      class="rows"
    >
      <template
        v-for="diver in pactsByDiver"
        :key="diver.id"
      >
        <div
          v-if="diver.pacts.length === 0"
          class="row empty"
        >
          <span class="who"><b>{{ diver.name }}</b></span>
          <span class="no-pacts">No pacts</span>
        </div>
        <AccordionItem
          v-for="(pact, index) in diver.pacts"
          :key="pact.key"
          :value="pact.key"
          class="row"
          :class="{ failed: pact.failed, cont: index > 0, own: diver.id === selfId }"
        >
          <span class="who"><b v-if="index === 0">{{ diver.name }}</b></span>
          <AccordionHeader
            as="div"
            class="head"
          >
            <AccordionTrigger class="trigger">
              <RiskPips
                :value="pact.risk"
                :max="pact.risk"
                :tone="pact.risk >= 3 ? 'red' : 'gold'"
              />
              <span class="pact-name">{{ pact.name }}</span>
              <svg
                class="row-chev"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              ><path
                d="M2 4l4 4 4-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              /></svg>
            </AccordionTrigger>
          </AccordionHeader>
          <span
            v-if="pact.failed"
            class="pact-void"
          >Broken</span>
          <button
            v-else-if="canMark(diver.id)"
            class="mark-pact"
            :class="{ armed: armedPact === pact.key, own: diver.id === selfId }"
            type="button"
            @click="markPact(diver.id, pact.id)"
          >
            {{ armedPact === pact.key ? 'Confirm?' : 'Mark broken' }}
          </button>
          <span v-else />
          <AccordionContent class="body">
            <div class="body-inner">
              <p class="vow">
                “<ConditionRule
                  v-if="pact.pact"
                  :condition="pact.pact"
                />”
              </p>
              <ConditionKeywords
                v-if="pact.pact"
                :keywords="pact.pact.keywords"
              />
              <span class="acct">
                <i aria-hidden="true" />{{ pact.accountability }}
              </span>
            </div>
          </AccordionContent>
        </AccordionItem>
      </template>
    </AccordionRoot>
  </section>
</template>

<style scoped>
.ledger {
  --ledger-pad: 18px;
  container: ledger / inline-size;
  display: flex;
  flex-direction: column;
  padding: var(--ledger-pad) var(--ledger-pad) 8px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
  min-width: 0;
}
.ledger-cap { padding-bottom: 8px; }
.rows { display: flex; flex-direction: column; }

.row {
  position: relative;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  min-height: 56px;
  border-top: 1px solid var(--line-2);
}
.row.cont { border-top-style: dashed; border-top-color: var(--line-1); }
.row::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--ledger-pad));
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: var(--gold);
  box-shadow: 0 0 10px rgba(255, 214, 66, 0.5);
  opacity: 0;
  transition: opacity var(--dur-fast);
}
.row[data-state='open']::before { opacity: 1; }
.row.failed::before { background: var(--red); box-shadow: none; }

.who { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.who b { font-size: 15px; font-weight: 700; }
.no-pacts { grid-column: 2 / -1; color: var(--dim); font-size: 13px; }

.head { display: flex; min-width: 0; }
.trigger {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 44px;
  margin-inline: -8px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-fast);
}
.trigger:hover { background: var(--raised); }
.trigger :deep(.pips i) { width: 13px; height: 13px; }
.pact-name { flex: 1; min-width: 0; font-size: 15px; }
.row-chev {
  flex-shrink: 0;
  color: var(--dim);
  transition: transform var(--dur-fast) var(--ease-out), color var(--dur-fast);
}
.trigger:hover .row-chev { color: var(--khaki); }
.trigger[data-state='open'] .row-chev { transform: rotate(180deg); color: var(--gold); }

.row.failed .pact-name { color: var(--muted); text-decoration: line-through; }
.row.failed :deep(.pips) { opacity: 0.4; }
.pact-void { color: var(--red); font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }

.mark-pact {
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 55%, var(--line-3));
  color: var(--red);
  font: 700 10px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color var(--dur-fast), box-shadow var(--dur-fast);
}
.mark-pact:hover,
.mark-pact.armed { box-shadow: inset 0 0 0 1px var(--red); background: rgba(255, 75, 62, 0.1); }
.mark-pact.armed { animation: shake 0.3s ease-out; }
.mark-pact:not(.own):not(.armed) { box-shadow: none; color: var(--dim); }
.mark-pact:not(.own):not(.armed):hover { color: var(--red); }

.body {
  grid-column: 2 / -1;
  overflow: hidden;
}
.body[data-state='open'] { animation: ledger-open var(--dur-fast) var(--ease-out); }
.body[data-state='closed'] { animation: ledger-close var(--dur-fast) ease-in; }
.body-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 0 14px;
}
.vow { margin: 0; color: var(--khaki); font-size: 14px; line-height: 1.4; }
.row.failed .vow { color: var(--muted); }
.acct {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.acct i { width: 5px; height: 5px; background: var(--teal); box-shadow: 0 0 6px var(--teal); }

@keyframes ledger-open {
  from { height: 0; opacity: 0; }
  to { height: var(--reka-accordion-content-height); opacity: 1; }
}
@keyframes ledger-close {
  from { height: var(--reka-accordion-content-height); opacity: 1; }
  to { height: 0; opacity: 0; }
}

@container ledger (max-width: 420px) {
  .row { grid-template-columns: 52px minmax(0, 1fr) auto; column-gap: 8px; min-height: 44px; }
  .who b { font-size: 11px; }
  .trigger { gap: 8px; min-height: 40px; }
  .trigger :deep(.pips i) { width: 11px; height: 11px; }
  .pact-name { font-size: 12px; }
  .mark-pact { min-height: 28px; padding: 0 7px; font-size: 9px; letter-spacing: 0.06em; }
  .vow { font-size: 12px; }
  .acct { font-size: 9px; }
}
</style>
