<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { VALOR_METER_MAX } from '~~/shared/engine/config'
import { valorOf } from '~~/shared/engine/rewards'
import type { DiveState } from '~~/shared/engine/types'
import { valorSegments } from '~/utils/valor'
import type { ValorSources } from '~/utils/valor'

interface ValorReadout extends ValorSources {
  difficulty: number
  locked?: boolean
  diverName?: string
  pendingText?: string
}

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  valor: ValorReadout
  previewPactIds?: string[]
}>(), { previewPactIds: () => [] })

const tab = defineModel<'kit' | 'valor'>({ required: true })

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const valorTotal = computed(() => valorOf(props.valor.teamRisk, props.valor.pactRisk))

// The Valor tab's bar is the meter laid flat: each source's share of the
// gauge, past the cap once the meter breaks.
const valorBar = computed(() => {
  const scale = Math.max(VALOR_METER_MAX, valorTotal.value)
  return valorSegments(props.valor)
    .filter(segment => segment.value > 0)
    .map(segment => ({ id: segment.id, color: segment.color, width: `${(segment.value / scale) * 100}%` }))
})
</script>

<template>
  <TabsRoot
    v-model="tab"
    class="side-rail"
  >
    <TabsList
      class="tabs"
      aria-label="Rail view"
    >
      <TabsTrigger
        value="kit"
        class="tab"
      >
        <span class="tab-name">Kit</span>
      </TabsTrigger>
      <TabsTrigger
        value="valor"
        class="tab"
      >
        <span class="tab-row">
          <span class="tab-name">Valor</span>
          <span class="tab-value disp">{{ format(valorTotal) }}</span>
        </span>
        <span
          class="tab-bar"
          aria-hidden="true"
        >
          <i
            v-for="segment in valorBar"
            :key="segment.id"
            :style="{ background: segment.color, width: segment.width }"
          />
        </span>
      </TabsTrigger>
    </TabsList>

    <TabsContent
      value="kit"
      class="panel-body"
    >
      <KitPanel
        :state="state"
        :self-id="selfId"
        :preview-pact-ids="previewPactIds"
      />
    </TabsContent>
    <TabsContent
      value="valor"
      class="panel-body"
    >
      <ValorMeter v-bind="valor" />
    </TabsContent>
  </TabsRoot>
</template>

<style scoped>
.side-rail { display: flex; flex-direction: column; gap: var(--sp-5); min-width: 0; }

/* The tab strip pins to the top of the scrolling rail, flush with its edge. */
.tabs {
  position: sticky;
  top: calc(-1 * var(--sp-5));
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-2);
  margin-top: calc(-1 * var(--sp-5));
  padding-top: var(--sp-5);
  background: var(--rail);
}

.tab {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-2);
  min-width: 0;
  padding: var(--sp-3) var(--sp-3) var(--sp-3);
  font: inherit;
  text-align: left;
  color: var(--muted);
  background: var(--panel);
  border: 1px solid var(--line-2);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.tab:hover { color: var(--khaki); border-color: var(--line-4); }
.tab[data-state='active'] { color: var(--gold); border-color: var(--gold); }

.tab-row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-2); }
.tab-name {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.tab-value {
  font-size: 1.35rem;
  line-height: 1;
  color: var(--text);
}
.tab[data-state='active'] .tab-value { color: var(--gold); }
.tab-bar {
  display: flex;
  gap: 2px;
  height: 5px;
  background: var(--ground);
  overflow: hidden;
}
.tab-bar i {
  display: block;
  flex-shrink: 0;
  height: 100%;
  transition: width 0.4s var(--ease-out), flex-grow 0.4s var(--ease-out);
}

.panel-body { min-width: 0; }
.panel-body:focus-visible { outline-offset: 4px; }
</style>
