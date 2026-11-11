<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { SPECIALISTS, SPECIALIST_DOCTRINES, SPECIALIST_ROLES } from '~~/shared/data/specialists'
import type { Item } from '~~/shared/data/types'
import { BONUS_STATS } from '~~/shared/engine/config'
import { specialistUnavailableReason, specialistWarbondReason } from '~~/shared/engine/specialists'
import type { DiveState, DiverState } from '~~/shared/engine/types'

// The specialist choice: Freelancer or one commission. In a room it reads the
// squad (one commission per squad); on the Bridge there is no squad yet, so
// only the diver's own warbonds can rule a specialist out.
const props = withDefaults(defineProps<{
  selected: string | null
  warbondCodes: readonly string[]
  state?: DiveState | null
  self?: DiverState | null
  disabled?: boolean
}>(), { state: null, self: null, disabled: false })

const emit = defineEmits<{ 'update:selected': [specialistId: string | null] }>()

const FREELANCER = 'freelancer'

const cards = computed(() => SPECIALISTS.map(specialist => ({
  ...specialist,
  roleLabel: SPECIALIST_ROLES[specialist.role],
  items: specialist.kit.map(id => ITEMS_BY_ID.get(id)).filter((item): item is Item => item !== undefined),
  doctrineLabel: specialist.doctrine ? SPECIALIST_DOCTRINES[specialist.doctrine] : null,
  callingLabel: BONUS_STATS.find(stat => stat.id === specialist.calling)?.label ?? specialist.calling,
  reason: props.selected === specialist.id
    ? null
    : props.state && props.self
      ? specialistUnavailableReason(props.state, props.self, specialist.id)
      : specialistWarbondReason(specialist, props.warbondCodes),
})))

function choose(value: unknown): void {
  emit('update:selected', value === FREELANCER ? null : String(value))
}
</script>

<template>
  <section
    class="specialists"
    aria-labelledby="specialist-h"
  >
    <h2
      id="specialist-h"
      class="lbl"
    >
      Specialist
    </h2>
    <p class="intro">
      Optional. Start with an issued kit (it replaces the SEAF pack on runs that have one). You start
      every mission in it, and you draft one fewer loot option until you are Commissioned. Gear types
      in the kit never drop as loot.
    </p>
    <RadioGroupRoot
      :model-value="selected ?? FREELANCER"
      class="grid"
      aria-labelledby="specialist-h"
      :disabled="disabled"
      @update:model-value="choose"
    >
      <RadioGroupItem
        :value="FREELANCER"
        class="card cut-sm"
        :class="{ on: selected === null }"
      >
        <span class="role">No specialist</span>
        <span class="name">Freelancer</span>
        <span class="tagline">No issued kit. Full loot drafts.</span>
      </RadioGroupItem>
      <RadioGroupItem
        v-for="card in cards"
        :key="card.id"
        :value="card.id"
        class="card cut-sm"
        :class="{ on: selected === card.id }"
        :disabled="card.reason !== null"
        :aria-label="`${card.name}, ${card.roleLabel}. Issued: ${card.items.map(item => item.displayName).join(', ')}.${card.reason ? ` ${card.reason}.` : ''}`"
      >
        <span class="role">{{ card.roleLabel }}</span>
        <span class="name">{{ card.name }}</span>
        <span class="tagline">“{{ card.tagline }}”</span>
        <span
          class="kit"
          aria-hidden="true"
        >
          <span
            v-for="item in card.items"
            :key="item.id"
            class="kit-item"
            :title="item.displayName"
            :style="{ '--tier': `var(--tier-${item.tier})` }"
          >
            <img
              v-if="itemImageUrl(item)"
              :src="itemImageUrl(item)"
              alt=""
              loading="lazy"
              draggable="false"
            >
          </span>
        </span>
        <span class="kit-names">{{ card.items.map(item => item.displayName).join(' · ') }}</span>
        <span
          v-if="card.doctrineLabel"
          class="fact"
        >Loot: {{ card.doctrineLabel.toLowerCase() }} until Sergeant</span>
        <span class="fact">Honors: {{ card.callingLabel }}</span>
        <span
          v-if="card.reason"
          class="reason"
        >{{ card.reason }}</span>
      </RadioGroupItem>
    </RadioGroupRoot>
  </section>
</template>

<style scoped>
.specialists { display: grid; gap: 8px; min-width: 0; container: specialists / inline-size; }
.specialists .lbl { margin: 0; }
.intro { margin: 0; color: var(--muted); font-size: var(--fs-sm); line-height: 1.45; max-width: 72ch; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 8px;
}
.card {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.card:hover:not(:disabled) { border-color: var(--line-4); }
.card.on { border-color: var(--teal); background: var(--raised); box-shadow: inset 0 -3px 0 var(--teal); }
.card:disabled { cursor: not-allowed; opacity: 0.55; }

.role { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.card.on .role { color: var(--teal); }
.name { font-size: 0.82rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text); }
.tagline { color: var(--dim); font-size: 11px; font-style: italic; line-height: 1.3; }

.kit { display: flex; gap: 4px; margin-top: 4px; }
.kit-item {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-bottom: 2px solid var(--tier);
  background: var(--ground);
}
.kit-item img { width: 28px; height: 28px; object-fit: contain; }
.kit-names { color: var(--khaki); font-size: 11px; line-height: 1.3; }
.fact { color: var(--muted); font-size: 10px; line-height: 1.3; }
.reason { color: var(--orange); font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }

@container specialists (max-width: 420px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
