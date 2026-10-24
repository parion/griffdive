<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { itemImageUrl } from '~~/shared/data/images'
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
  image?: string
  tier: string
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
          image: itemImageUrl(item),
          tier: `var(--tier-${item.tier})`,
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

    <section
      v-for="section in sections"
      :id="sectionDomId(section.id)"
      :key="section.id"
      class="kit-sec"
      :class="`art-${section.art}`"
      :style="{ '--accent': section.accent }"
    >
      <header class="kit-sec-head">
        <span
          class="kit-sec-mark"
          aria-hidden="true"
        />
        <h3 class="kit-sec-title">
          {{ section.label }}
        </h3>
        <span
          class="kit-sec-rule"
          aria-hidden="true"
        />
        <span class="kit-sec-n">{{ section.tiles.length }}</span>
      </header>
      <p
        v-if="!section.tiles.length"
        class="none"
      >
        {{ earnedOnly ? 'None earned yet' : 'None' }}
      </p>
      <ul
        v-else
        class="tiles"
      >
        <li
          v-for="tile in section.tiles"
          :key="tile.item.id"
          class="tile"
          :class="[tile.banSource ? `banned ban-${tile.banSource}` : '', { preview: tile.banPreview }]"
          :style="{ '--tier': tile.tier }"
          :title="tile.reason ? `${tile.item.displayName} — ${tile.reason}${tile.banPreview ? ' (if sworn)' : ''}` : tile.item.displayName"
        >
          <div class="media">
            <img
              v-if="tile.image && section.art === 'icon'"
              class="glow"
              :src="tile.image"
              alt=""
              loading="lazy"
              draggable="false"
              aria-hidden="true"
            >
            <img
              v-if="tile.image"
              class="art"
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

.none {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  color: var(--dim);
  font-size: var(--fs-sm);
  border: 1px dashed var(--line-2);
}

.kit-sec { display: grid; gap: var(--sp-3); scroll-margin-top: 10rem; }
.kit-sec-head { display: flex; align-items: center; gap: var(--sp-3); }
.kit-sec-mark {
  width: 3px;
  height: 14px;
  flex-shrink: 0;
  background: var(--accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 60%, transparent);
}
.kit-sec-title {
  margin: 0;
  color: var(--text);
  font: 700 var(--fs-sm) var(--font-body);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.kit-sec-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--line-3), transparent); }
.kit-sec-n { color: var(--gold); font-size: var(--fs-sm); font-weight: 700; font-variant-numeric: tabular-nums; }

.tiles {
  display: grid;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.art-gear .tiles { grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); }
.art-icon .tiles { grid-template-columns: repeat(auto-fill, minmax(5.25rem, 1fr)); }

.tile {
  --ban: var(--red);
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: linear-gradient(180deg, var(--panel), var(--ground));
  box-shadow: inset 0 0 0 1px var(--line-2), inset 0 -2px 0 var(--tier);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: box-shadow var(--dur-fast), transform var(--dur-fast) var(--ease-out);
}
.tile:hover {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 70%, var(--line-3)), inset 0 -2px 0 var(--tier);
  transform: translateY(-2px);
}
.tile.ban-misfortune { --ban: var(--gold); }
.tile.banned { box-shadow: inset 0 0 0 1px var(--ban); }
.tile.preview { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ban) 55%, transparent); }

.media {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.art-gear .media {
  aspect-ratio: 16 / 10;
  background:
    radial-gradient(ellipse 60% 50% at 50% 55%, rgba(255, 255, 255, 0.07), transparent 70%),
    radial-gradient(ellipse 80% 70% at 50% 62%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 72%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 4px),
    var(--ground);
  border-bottom: 1px solid var(--line-1);
}
.art-icon .media { aspect-ratio: 1; padding: 16% 16% 10%; }

.art {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform var(--dur-med) var(--ease-out), filter var(--dur-med);
}
.art-gear .art {
  padding: var(--sp-2) var(--sp-3);
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.65)) brightness(1.18) contrast(1.08);
}
.art-icon .art {
  width: 100%;
  height: 100%;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
}
.glow {
  position: absolute;
  inset: 22% 22% 16%;
  width: 56%;
  height: 62%;
  object-fit: cover;
  filter: blur(14px) saturate(1.6);
  opacity: 0.7;
  pointer-events: none;
  transition: opacity var(--dur-med);
}
.tile:hover .art { transform: scale(1.06); }
.tile:hover .glow { opacity: 0.9; }

.tile.banned .art { filter: grayscale(1); opacity: 0.4; }
.tile.preview .art { opacity: 0.3; }
.tile.banned .glow,
.tile.preview .glow { display: none; }
.wash { position: absolute; inset: 0; opacity: 0.26; pointer-events: none; }
.media .tier-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: var(--ground);
}

.name {
  display: -webkit-box;
  margin: var(--sp-1) var(--sp-2) var(--sp-2);
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
  overflow-wrap: break-word;
  hyphens: auto;
  text-transform: uppercase;
  color: var(--text);
}
.art-icon .name { margin-top: 0; text-align: center; }
.tile.banned .name { color: var(--muted); }
</style>
