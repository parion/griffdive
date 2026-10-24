<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { misfortuneById } from '~~/shared/data/misfortunes'
import { sortKitItems } from '~~/shared/data/ordering'
import { pactName } from '~~/shared/data/pacts'
import type { Item } from '~~/shared/data/types'
import { itemBannedInArmory } from '~~/shared/engine/selectors'
import type { ArmoryBan } from '~~/shared/engine/selectors'
import type { DiveState, DiverState } from '~~/shared/engine/types'
import { KIT_SECTIONS, earnedKitItems, kitSectionOf, ownedKitItems } from '~/utils/kit'

// The Kit: the diver's own items by category, with the live bans washed
// over them. The field dock, the phone sheet and the Kit drawer share it.
const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  previewPactIds?: string[]
}>(), { previewPactIds: () => [] })

interface TileView {
  item: Item
  banSource: ArmoryBan['source'] | null
  banPreview: boolean
  reason: string
}

const earnedOnly = ref(false)
const uid = useId()

const selectedId = ref(props.selfId ?? props.state.divers[0]?.id ?? '')

watch(() => [props.selfId, props.state.divers.map(diver => diver.id).join(',')] as const, ([selfId]) => {
  if (!props.state.divers.some(diver => diver.id === selectedId.value)) {
    selectedId.value = selfId ?? props.state.divers[0]?.id ?? ''
  }
}, { immediate: true })

const diver = computed<DiverState | null>(() =>
  props.state.divers.find(entry => entry.id === selectedId.value) ?? null)

function banReason(ban: ArmoryBan): string {
  return ban.source === 'misfortune'
    ? misfortuneById(ban.id)?.rule ?? ban.id
    : pactName(ban.id)
}

const sections = computed(() => {
  const current = diver.value
  if (!current) {
    return []
  }
  const previewIds = current.id === props.selfId ? props.previewPactIds : []
  const items = sortKitItems((earnedOnly.value ? earnedKitItems : ownedKitItems)(props.state, current.id))
  return KIT_SECTIONS
    .map(def => ({
      ...def,
      tiles: items.filter(item => kitSectionOf(item) === def.id).map((item): TileView => {
        const ban = itemBannedInArmory(props.state, current, item, previewIds)
        return {
          item,
          banSource: ban?.source ?? null,
          banPreview: ban?.preview ?? false,
          reason: ban ? banReason(ban) : '',
        }
      }),
    }))
})

function sectionDomId(id: string): string {
  return `${uid}-${id}`
}

function jumpTo(id: string) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(sectionDomId(id))?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <section
    class="kit-panel"
    aria-label="Kit"
  >
    <div
      v-if="state.divers.length > 1"
      class="divers"
      role="group"
      aria-label="Diver kits"
    >
      <button
        v-for="entry in state.divers"
        :key="entry.id"
        type="button"
        class="diver"
        :class="{ on: entry.id === selectedId }"
        :aria-pressed="entry.id === selectedId"
        @click="selectedId = entry.id"
      >
        <span
          class="diver-lamp"
          aria-hidden="true"
        />
        <span class="diver-name">{{ upperName(entry.name) }}</span>
      </button>
    </div>

    <div class="toolbar">
      <nav
        class="jump"
        aria-label="Jump to kit group"
      >
        <button
          v-for="section in sections"
          :key="section.id"
          type="button"
          class="jump-chip"
          :class="{ empty: !section.tiles.length }"
          :style="{ '--accent': section.accent }"
          @click="jumpTo(section.id)"
        >
          <i aria-hidden="true" />{{ section.nav }}<span class="n">{{ section.tiles.length }}</span>
        </button>
      </nav>
      <label class="earned-toggle">
        <SwitchRoot
          v-model="earnedOnly"
          class="switch"
        >
          <SwitchThumb class="switch-thumb" />
        </SwitchRoot>
        <span class="lbl">Earned only</span>
      </label>
    </div>

    <KitSection
      v-for="section in sections"
      :id="sectionDomId(section.id)"
      :key="section.id"
      :label="section.label"
      :accent="section.accent"
      :art="section.art"
      :count="section.tiles.length"
      :empty="section.tiles.length ? '' : (earnedOnly ? 'None earned yet' : 'None')"
    >
      <KitTile
        v-for="tile in section.tiles"
        :key="tile.item.id"
        :item="tile.item"
        :art="section.art"
        :ban-source="tile.banSource"
        :ban-preview="tile.banPreview"
        :reason="tile.reason"
      />
    </KitSection>
  </section>
</template>

<style scoped>
.kit-panel { display: flex; flex-direction: column; gap: var(--sp-6); min-width: 0; }

.divers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
  gap: 2px;
  padding: 2px;
  background: var(--ground);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.diver {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  min-height: 36px;
  padding: 0 var(--sp-3);
  border: 0;
  background: transparent;
  color: var(--muted);
  font: 700 var(--fs-sm) var(--font-body);
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background-color var(--dur-fast), color var(--dur-fast);
}
.diver:hover { color: var(--text); background: var(--panel); }
.diver.on {
  color: var(--gold);
  background: var(--raised);
  box-shadow: inset 0 -2px 0 var(--gold);
}
.diver-lamp { width: 6px; height: 6px; flex-shrink: 0; background: var(--line-4); }
.diver.on .diver-lamp { background: var(--gold); box-shadow: 0 0 8px var(--gold); }
.diver-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  gap: var(--sp-2);
  padding-block: var(--sp-3);
  background: var(--kit-surface, var(--rail));
  border-bottom: 1px solid var(--line-2);
}
.earned-toggle { display: flex; align-items: center; gap: var(--sp-3); cursor: pointer; }
.earned-toggle .lbl { color: var(--khaki); }
.switch {
  position: relative;
  width: 34px;
  height: 18px;
  flex-shrink: 0;
  padding: 0;
  background: var(--panel);
  border: 1px solid var(--line-3);
  cursor: pointer;
}
.switch[data-state='checked'] { background: var(--gold); border-color: var(--gold); box-shadow: 0 0 12px rgba(255, 214, 66, 0.35); }
.switch-thumb {
  display: block;
  width: 12px;
  height: 12px;
  margin-left: 2px;
  background: var(--khaki);
  transition: transform var(--dur-fast) var(--ease-out);
}
.switch[data-state='checked'] .switch-thumb { background: var(--on-gold); transform: translateX(16px); }

.jump { display: flex; flex-wrap: wrap; gap: var(--sp-1); }
.jump-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 var(--sp-2);
  border: 0;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2);
  color: var(--khaki);
  font: 700 var(--fs-cap) var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: box-shadow var(--dur-fast), color var(--dur-fast);
}
.jump-chip i { width: 6px; height: 6px; background: var(--accent); }
.jump-chip:hover { color: var(--text); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 60%, var(--line-3)); }
.jump-chip .n { color: var(--gold); font-variant-numeric: tabular-nums; }
.jump-chip.empty { color: var(--dim); }
.jump-chip.empty i { background: var(--line-3); }
.jump-chip.empty .n { color: var(--dim); }
</style>
