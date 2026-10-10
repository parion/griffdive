<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import { misfortuneById } from '~~/shared/data/misfortunes'
import { sortKitItems } from '~~/shared/data/ordering'
import { pactName } from '~~/shared/data/pacts'
import type { Item } from '~~/shared/data/types'
import { itemBannedInArmory } from '~~/shared/engine/selectors'
import type { ArmoryBan } from '~~/shared/engine/selectors'
import type { DiveState, DiverState } from '~~/shared/engine/types'
import { KIT_SECTIONS, kitSectionOf, ownedKitItems } from '~/utils/kit'

// The Kit: the diver's own items by category, with the live bans washed
// over them. The desktop rail and the phone drawer share it.
const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  previewPactIds?: string[]
}>(), { previewPactIds: () => [] })

interface TileView {
  item: Item
  image?: string
  banSource: ArmoryBan['source'] | null
  banPreview: boolean
  reason: string
}

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
  const items = sortKitItems(ownedKitItems(props.state, current.id))
  return KIT_SECTIONS
    .map(def => ({
      ...def,
      tiles: items.filter(item => kitSectionOf(item) === def.id).map((item): TileView => {
        const ban = itemBannedInArmory(props.state, current, item, previewIds)
        return {
          item,
          image: itemImageUrl(item),
          banSource: ban?.source ?? null,
          banPreview: ban?.preview ?? false,
          reason: ban ? banReason(ban) : '',
        }
      }),
    }))
    .filter(section => section.tiles.length > 0)
})
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
        class="diver cut-sm"
        :class="{ on: entry.id === selectedId }"
        :aria-pressed="entry.id === selectedId"
        @click="selectedId = entry.id"
      >
        {{ entry.name }}
      </button>
    </div>

    <p
      v-if="!sections.length"
      class="muted small empty"
    >
      No items in this kit yet.
    </p>

    <section
      v-for="section in sections"
      :key="section.id"
      class="kit-sec"
      :style="{ '--accent': section.accent }"
    >
      <header class="kit-sec-head">
        <span
          class="kit-sec-mark"
          aria-hidden="true"
        />
        <h3 class="lbl">
          {{ section.label }}
        </h3>
        <span class="cap">{{ section.tiles.length }}</span>
      </header>
      <ul class="tiles">
        <li
          v-for="tile in section.tiles"
          :key="tile.item.id"
          class="tile cut-sm"
          :class="[tile.banSource ? `banned ban-${tile.banSource}` : '', { preview: tile.banPreview }]"
          :title="tile.reason ? `${tile.item.displayName} — ${tile.reason}${tile.banPreview ? ' (if sworn)' : ''}` : tile.item.displayName"
        >
          <div class="media">
            <img
              v-if="tile.image"
              :src="tile.image"
              alt=""
              loading="lazy"
              draggable="false"
            >
            <span
              v-if="tile.banSource"
              class="wash"
              :class="tile.banSource === 'misfortune'
                ? (tile.banPreview ? 'hazard-soft' : 'hazard')
                : (tile.banPreview ? 'hazard-soft-red' : 'hazard-red')"
              aria-hidden="true"
            />
            <span
              class="tier-badge sm"
              :data-tier="tile.item.tier"
            >{{ tile.item.tier.toUpperCase() }}</span>
          </div>
          <span class="name">{{ tile.item.displayName }}</span>
          <span
            v-if="tile.banSource"
            class="sr-only"
          >Banned: {{ tile.reason }}{{ tile.banPreview ? ' (if sworn)' : '' }}</span>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.kit-panel { display: flex; flex-direction: column; gap: var(--sp-5); min-width: 0; }

.divers { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.diver {
  max-width: 100%;
  padding: var(--sp-2) var(--sp-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: inherit;
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--khaki);
  background: var(--panel);
  border: 1px solid var(--line-2);
  cursor: pointer;
}
.diver:hover { color: var(--text); border-color: var(--line-4); }
.diver.on { color: var(--gold); border-color: var(--gold); }

.empty { margin: 0; }

.kit-sec { display: grid; gap: var(--sp-3); }
.kit-sec-head { display: flex; align-items: center; gap: var(--sp-3); }
.kit-sec-head h3 { margin: 0; }
.kit-sec-head .cap { margin-left: auto; color: var(--khaki); }
.kit-sec-mark { width: 8px; height: 8px; flex-shrink: 0; background: var(--accent); }

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.tile {
  --ban: var(--red);
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--panel);
  border: 1px solid var(--line-2);
}
.tile.ban-misfortune { --ban: var(--gold); }
.tile.banned { border-color: var(--ban); }
.tile.preview { border-style: dashed; }

.media {
  position: relative;
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  background: var(--ground);
  border-bottom: 1px solid var(--line-1);
  overflow: hidden;
}
.media img {
  max-width: 100%;
  max-height: 100%;
  padding: var(--sp-1);
  object-fit: contain;
  filter: brightness(0.9) contrast(1.08);
}
.tile.banned .media img { filter: grayscale(1); opacity: 0.45; }
.tile.preview .media img { opacity: 0.3; }
.wash { position: absolute; inset: 0; opacity: 0.26; pointer-events: none; }
.media .tier-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  background: var(--ground);
}

.name {
  display: -webkit-box;
  padding: var(--sp-1) var(--sp-2) var(--sp-2);
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
  overflow-wrap: break-word;
  text-transform: uppercase;
  color: var(--text);
}
.tile.banned .name { color: var(--muted); }
</style>
