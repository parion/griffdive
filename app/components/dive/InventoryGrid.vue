<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { misfortuneById } from '~~/shared/data/misfortunes'
import { sortKitItems } from '~~/shared/data/ordering'
import { pactName } from '~~/shared/data/pacts'
import type { Item } from '~~/shared/data/types'
import {
  REWARD_TOKEN_CAP,
  RESERVE_STRATAGEMS,
  STRATAGEM_SLOTS_REQUIRED,
} from '~~/shared/engine/config'
import { hasLegalLoadout, legalStratagemCount } from '~~/shared/engine/pacts'
import type { StratagemBanSource } from '~~/shared/engine/pacts'
import { armoryRules, itemBannedInArmory } from '~~/shared/engine/selectors'
import type { DiveState, DiverState, ItemRef } from '~~/shared/engine/types'

interface DiverKit {
  diverId: string
  diverName: string
  items: Item[]
}

interface TileView {
  item: Item
  image?: string
  reserve: boolean
  tag: string
  banSource: 'misfortune' | 'pact' | null
  reason: string
}

interface SectionView {
  id: string
  label: string
  accent: string
  reserve: boolean
  empty: string
  tiles: TileView[]
}

interface ChipView {
  id: string
  label: string
  accent: string
  count: number
}

interface RuleView {
  id: string
  name: string
  source: 'misfortune' | 'pact'
  label: string
  bind: boolean
}

interface SlotView {
  filled: boolean
  image?: string
}

interface PipView {
  kind: 'spare' | 'banned'
  style?: CSSProperties
}

interface DiverArmory {
  diver: DiverState
  title: string
  count: number
  rules: RuleView[]
  chips: ChipView[]
  sections: SectionView[]
  fieldable: number
  available: number
  floorMet: boolean
  slots: SlotView[]
  pips: PipView[]
  spare: number
  banned: number
  floorAria: string
}

const props = withDefaults(defineProps<{
  state: DiveState
  selfId?: string | null
  selectMode?: boolean
}>(), { selfId: null, selectMode: false })

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()

const view = ref('mine')
const activeFilter = ref('all')
const selectedId = ref('')

const slotCount = STRATAGEM_SLOTS_REQUIRED
const tokenChits = REWARD_TOKEN_CAP
const tierKey = ['C', 'B', 'A', 'S', 'S+'] as const
const reserveSet: ReadonlySet<string> = new Set(RESERVE_STRATAGEMS)

const sectionDefs = [
  { id: 'primary', label: 'Primary', accent: 'var(--cat-primary)' },
  { id: 'secondary', label: 'Secondary', accent: 'var(--cat-gear)' },
  { id: 'throwables', label: 'Throwables', accent: 'var(--cat-gear)' },
  { id: 'armor', label: 'Armor passives', accent: 'var(--cat-armor)' },
  { id: 'boosters', label: 'Boosters', accent: 'var(--cat-booster)' },
  { id: 'stratagems', label: 'Stratagems', accent: 'var(--teal)' },
] as const

function resolve(ids: readonly string[]): Item[] {
  return ids
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}

function sectionOfItem(item: Item): string {
  if (item.type === 'stratagem') {
    return 'stratagems'
  }
  switch (item.category) {
    case 'primary':
      return 'primary'
    case 'secondary':
      return 'secondary'
    case 'throwable':
      return 'throwables'
    case 'armor':
    case 'armorPassive':
      return 'armor'
    case 'booster':
      return 'boosters'
    default:
      return 'primary'
  }
}

function sectionItems(sectionId: string, sorted: readonly Item[]): Item[] {
  if (sectionId === 'stratagems') {
    return sorted.filter(item => item.type === 'stratagem' && !reserveSet.has(item.id))
  }
  return sorted.filter(item => sectionOfItem(item) === sectionId)
}

function banReason(ban: StratagemBanSource): string {
  return ban.source === 'misfortune'
    ? misfortuneById(ban.id)?.rule ?? ban.id
    : pactName(ban.id)
}

function tileFor(item: Item, diver: DiverState, reserve: boolean): TileView {
  const ban = itemBannedInArmory(props.state, diver, item)
  return {
    item,
    image: itemImageUrl(item),
    reserve,
    tag: reserve ? 'Reserve' : item.antitank ? 'AT' : '',
    banSource: ban?.source ?? null,
    reason: ban ? banReason(ban) : '',
  }
}

function ruleView(rule: ReturnType<typeof armoryRules>[number]): RuleView {
  return {
    id: rule.id,
    name: rule.name,
    source: rule.source,
    label: rule.source === 'misfortune' ? 'Misfortune' : 'Pact',
    bind: rule.equipBearing,
  }
}

function banColor(ban: StratagemBanSource): string {
  return ban.source === 'misfortune' ? 'var(--gold)' : 'var(--red)'
}

const reserveItems = computed<Item[]>(() =>
  RESERVE_STRATAGEMS
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined))

function displayItems(diver: DiverState): Item[] {
  const owned = resolve(props.state.personalInventories[diver.id] ?? [])
  const seen = new Set(owned.map(item => item.id))
  return [...owned, ...reserveItems.value.filter(item => !seen.has(item.id))]
}

function buildArmory(diver: DiverState): DiverArmory {
  const items = displayItems(diver)
  const sorted = sortKitItems(items)
  const rules = armoryRules(props.state, diver)
  const misfortuneId = rules.find(rule => rule.source === 'misfortune')?.id ?? null
  const ownedIds = props.state.personalInventories[diver.id] ?? []
  const candidates = items.filter(item => item.type === 'stratagem')
  const legal: Item[] = []
  const blocked: { ban: StratagemBanSource, item: Item }[] = []
  for (const item of candidates) {
    const ban = itemBannedInArmory(props.state, diver, item)
    if (ban) {
      blocked.push({ ban, item })
    }
    else {
      legal.push(item)
    }
  }
  const sortedLegal = sortKitItems(legal)
  const fieldable = legalStratagemCount(misfortuneId, diver.pactIds, ownedIds)
  const sections: SectionView[] = sectionDefs
    .map(def => ({
      id: def.id,
      label: def.label,
      accent: def.accent,
      reserve: false,
      empty: def.id === 'boosters' ? 'No boosters available yet — rewards can unlock one.' : '',
      tiles: sectionItems(def.id, sorted).map(item => tileFor(item, diver, false)),
    }))
    .filter(section => section.tiles.length > 0 || section.id === 'boosters')
  sections.push({
    id: 'reserve',
    label: 'Reserve',
    accent: 'var(--khaki)',
    reserve: true,
    empty: '',
    tiles: reserveItems.value.map(item => tileFor(item, diver, true)),
  })
  const spare = Math.max(0, sortedLegal.length - slotCount)
  return {
    diver,
    title: `${diver.name}${diver.name.endsWith('s') ? '\'' : '\'s'} kit`,
    count: items.length,
    rules: rules.map(ruleView),
    chips: sectionDefs.map(def => ({
      id: def.id,
      label: def.label,
      accent: def.accent,
      count: items.filter(item => sectionOfItem(item) === def.id).length,
    })),
    sections,
    fieldable,
    available: candidates.length,
    floorMet: hasLegalLoadout(misfortuneId, diver.pactIds, ownedIds),
    slots: Array.from({ length: slotCount }, (_, index) => {
      const item = sortedLegal[index]
      const filled = index < Math.min(fieldable, slotCount) && item !== undefined
      return {
        filled,
        image: filled && item ? itemImageUrl(item) : undefined,
      }
    }),
    pips: [
      ...sortedLegal.slice(slotCount).map((): PipView => ({ kind: 'spare' })),
      ...blocked.map((entry): PipView => ({
        kind: 'banned',
        style: { '--pip': banColor(entry.ban) },
      })),
    ],
    spare,
    banned: blocked.length,
    floorAria: `${fieldable} of ${slotCount} stratagem slots fieldable, ${candidates.length} owned`,
  }
}

const armories = computed<DiverArmory[]>(() => props.state.divers.map(buildArmory))

const selectKits = computed<DiverKit[]>(() =>
  props.state.divers.map(diver => ({
    diverId: diver.id,
    diverName: diver.name,
    items: sortKitItems(resolve(props.state.personalInventories[diver.id] ?? [])),
  })))

const self = computed(() =>
  props.state.divers.find(diver => diver.id === props.selfId) ?? props.state.divers[0] ?? null)

const otherDivers = computed(() => {
  const selfId = self.value?.id
  return props.state.divers.filter(diver => diver.id !== selfId)
})

const viewTabs = computed(() => otherDivers.value.length
  ? [{ value: 'mine', label: 'My kit' }, { value: 'squad', label: 'Squad' }]
  : [{ value: 'mine', label: 'My kit' }])

const selectedEntry = computed(() =>
  armories.value.find(entry => entry.diver.id === selectedId.value) ?? null)

const rosterKey = computed(() =>
  `${props.selfId ?? ''}|${props.state.divers.map(diver => diver.id).join(',')}`)

watch(rosterKey, () => {
  const ids = new Set(props.state.divers.map(diver => diver.id))
  if (!ids.has(selectedId.value)) {
    selectedId.value = self.value?.id ?? props.state.divers[0]?.id ?? ''
  }
  if (!otherDivers.value.length) {
    view.value = 'mine'
  }
}, { immediate: true })

watch(selectedId, (id) => {
  view.value = id !== '' && id !== self.value?.id ? 'squad' : 'mine'
})

function setView(next: string): void {
  view.value = next
  if (next === 'squad') {
    if (selectedId.value === self.value?.id) {
      const other = otherDivers.value[0]
      if (other) {
        selectedId.value = other.id
      }
    }
    return
  }
  if (self.value) {
    selectedId.value = self.value.id
  }
}

function filteredSections(entry: DiverArmory): SectionView[] {
  const filter = activeFilter.value
  if (filter === 'all') {
    return entry.sections
  }
  return entry.sections.filter(section =>
    section.id === filter || (section.reserve && filter === 'stratagems'))
}

function forfeit(ownerId: string, itemId: string): void {
  emit('forfeit', { ownerId, itemId })
}
</script>

<template>
  <div class="armory">
    <template v-if="selectMode">
      <section
        v-for="kit in selectKits"
        :key="kit.diverId"
        class="diver-kit"
      >
        <header class="diver-head">
          <span class="disp diver-name">{{ kit.diverName }}</span>
          <span class="dash" />
          <span class="cap">{{ kit.items.length }} items</span>
        </header>
        <TransitionGroup
          tag="div"
          name="inv"
          class="showcase-grid"
        >
          <ItemCard
            v-for="item in kit.items"
            :key="item.id"
            :item="item"
            showcase
            @select="forfeit(kit.diverId, item.id)"
          />
        </TransitionGroup>
      </section>
    </template>

    <template v-else>
      <TabsRoot
        v-model="selectedId"
        orientation="vertical"
        class="armory-grid"
      >
        <aside
          class="rail"
          aria-label="Diver kits and reserve"
        >
          <div class="rail-head">
            <span class="lbl">Diver kits</span>
            <span class="cap">{{ state.divers.length }}/{{ state.divers.length }}</span>
          </div>

          <TabsList
            class="kit-tabs"
            aria-label="Diver kits"
          >
            <TabsTrigger
              v-for="entry in armories"
              :key="entry.diver.id"
              :value="entry.diver.id"
              class="kit-tab cut-sm"
            >
              <span
                class="kit-av cut-sm disp"
                :class="{ host: entry.diver.isHost }"
              >{{ entry.diver.name.trim().slice(0, 1).toUpperCase() }}</span>
              <span class="kit-id">
                <span class="kit-name-row">
                  <span class="kit-name">{{ entry.diver.name }}</span>
                  <svg
                    v-if="entry.diver.isHost"
                    class="kit-crown"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    role="img"
                    aria-label="Host"
                  ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
                </span>
                <span class="cap">{{ entry.diver.warbondCodes.length }} WARBONDS</span>
              </span>
              <span
                class="chits"
                role="img"
                :aria-label="`${entry.diver.rewardTokens} reward tokens`"
              >
                <span
                  v-for="chit in tokenChits"
                  :key="chit"
                  class="chit"
                  :class="{ on: chit <= entry.diver.rewardTokens }"
                />
              </span>
              <span
                v-if="entry.diver.id === selectedId"
                class="kit-arrow"
                aria-hidden="true"
              />
            </TabsTrigger>
          </TabsList>

          <div class="reserve-panel">
            <span class="lbl">Reserve · every diver</span>
            <div class="reserve-minis">
              <span
                v-for="item in reserveItems"
                :key="item.id"
                class="reserve-mini"
                :title="item.displayName"
              >
                <img
                  v-if="itemImageUrl(item)"
                  :src="itemImageUrl(item)"
                  alt=""
                  draggable="false"
                >
              </span>
            </div>
            <div class="reserve-key">
              <span class="key key-exempt">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  aria-hidden="true"
                ><path d="M5 12l5 5 9-10" /></svg>
                Pacts · exempt
              </span>
              <span class="key key-bind">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  aria-hidden="true"
                ><path d="M6 6l12 12M18 6L6 18" /></svg>
                Misfortunes · bind
              </span>
            </div>
          </div>
        </aside>

        <div class="main">
          <header class="armory-head">
            <div class="head-copy">
              <span class="lbl">Armory · personal inventory · {{ selectedEntry?.count ?? 0 }}</span>
              <h1 class="disp armory-title">
                {{ selectedEntry?.title ?? 'Diver kit' }}
              </h1>
            </div>
            <AppTabs
              class="head-tabs"
              :model-value="view"
              :tabs="viewTabs"
              label="Inventory view"
              @update:model-value="setView"
            />
          </header>

          <TabsContent
            v-for="entry in armories"
            :key="entry.diver.id"
            :value="entry.diver.id"
            class="main-panel"
          >
            <section
              class="readiness ticks"
              aria-label="Loadout readiness"
            >
              <div class="readiness-main">
                <div class="readiness-top">
                  <span class="lbl readiness-lbl">Stratagems fieldable <span class="dim">· {{ slotCount }} min</span></span>
                  <span
                    class="floor-chip"
                    :class="entry.floorMet ? 'ok' : 'warn'"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3.4"
                      aria-hidden="true"
                    >
                      <path :d="entry.floorMet ? 'M5 12l5 5 9-10' : 'M6 6l12 12M18 6L6 18'" />
                    </svg>
                    {{ entry.floorMet ? 'Floor met' : 'Below floor' }}
                  </span>
                </div>

                <div class="readiness-body">
                  <div class="readiness-count">
                    <span class="disp readiness-num">{{ entry.fieldable }}</span>
                    <span class="cap">/ {{ entry.available }} owned</span>
                  </div>
                  <div
                    class="slots"
                    role="progressbar"
                    aria-label="Loadout floor"
                    :aria-valuemin="0"
                    :aria-valuemax="slotCount"
                    :aria-valuenow="Math.min(entry.fieldable, slotCount)"
                    :aria-valuetext="entry.floorAria"
                  >
                    <span
                      v-for="(slot, index) in entry.slots"
                      :key="index"
                      class="slot cut-sm slot-in"
                      :class="{ filled: slot.filled }"
                      :style="{ animationDelay: `${index * 0.06}s` }"
                    >
                      <img
                        v-if="slot.image"
                        :src="slot.image"
                        alt=""
                        draggable="false"
                      >
                      <svg
                        v-else
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        aria-hidden="true"
                      >
                        <rect
                          x="4"
                          y="4"
                          width="16"
                          height="16"
                          stroke-dasharray="3 3"
                        />
                        <path d="M9 12h6" />
                      </svg>
                      <span
                        v-if="slot.filled"
                        class="slot-check"
                        aria-hidden="true"
                      >
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="4"
                          aria-hidden="true"
                        ><path d="M5 12l5 5 9-10" /></svg>
                      </span>
                    </span>
                  </div>
                  <div
                    v-if="entry.pips.length"
                    class="spare"
                  >
                    <div
                      class="spare-pips"
                      aria-hidden="true"
                    >
                      <span
                        v-for="(pip, index) in entry.pips"
                        :key="index"
                        class="spare-pip"
                        :class="pip.kind"
                        :style="pip.style"
                      />
                    </div>
                    <span class="cap">+{{ entry.spare }} spare · {{ entry.banned }} banned</span>
                  </div>
                </div>
              </div>

              <div class="rules">
                <span class="lbl rules-lbl">Active rules · this mission</span>
                <div
                  v-if="entry.rules.length"
                  class="rules-row"
                >
                  <span
                    v-for="rule in entry.rules"
                    :key="`${rule.source}:${rule.id}`"
                    class="rule"
                    :class="[`rule-${rule.source}`, { bind: rule.bind }]"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.9"
                      aria-hidden="true"
                    >
                      <path :d="rule.source === 'misfortune' ? 'M12 3l9 18H3z M12 9v5M12 17.5v.01' : 'M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6z'" />
                    </svg>
                    <span class="rule-name">{{ rule.name }}</span>
                    <span class="rule-src">{{ rule.label }}</span>
                  </span>
                </div>
                <span
                  v-else
                  class="cap"
                >No active rules</span>
              </div>
            </section>

            <div
              class="filters"
              role="group"
              aria-label="Filter by category"
            >
              <button
                type="button"
                class="chip filter"
                :class="{ on: activeFilter === 'all' }"
                :aria-pressed="activeFilter === 'all'"
                @click="activeFilter = 'all'"
              >
                <span class="filter-name">All</span>
                <span class="filter-count">{{ entry.count }}</span>
              </button>
              <button
                v-for="chip in entry.chips"
                :key="chip.id"
                type="button"
                class="chip filter"
                :class="{ on: activeFilter === chip.id }"
                :aria-pressed="activeFilter === chip.id"
                @click="activeFilter = chip.id"
              >
                <span
                  class="filter-dot"
                  :style="{ background: chip.accent }"
                  aria-hidden="true"
                />
                <span class="filter-name">{{ chip.label }}</span>
                <span class="filter-count">{{ chip.count }}</span>
              </button>
            </div>

            <div class="sections">
              <section
                v-for="section in filteredSections(entry)"
                :key="section.id"
                class="kit-sec"
                :class="{ reserve: section.reserve }"
                :style="{ '--accent': section.accent }"
              >
                <header class="sec-head">
                  <span
                    class="sec-mark"
                    aria-hidden="true"
                  />
                  <span class="lbl">{{ section.label }}</span>
                  <span class="cap">{{ section.tiles.length }}</span>
                  <span
                    v-if="section.reserve"
                    class="cap sec-note"
                  >· Pact-exempt</span>
                </header>
                <p
                  v-if="!section.tiles.length"
                  class="muted small sec-empty"
                >
                  {{ section.empty }}
                </p>
                <ul
                  v-else
                  class="tiles"
                >
                  <li
                    v-for="tile in section.tiles"
                    :key="tile.item.id"
                    class="tile cut-sm"
                    :class="[
                      tile.banSource ? `banned ban-${tile.banSource}` : '',
                      { reserve: tile.reserve },
                    ]"
                  >
                    <div class="tile-media scan">
                      <img
                        v-if="tile.image"
                        :src="tile.image"
                        alt=""
                        loading="lazy"
                        draggable="false"
                      >
                      <svg
                        v-else
                        class="tile-empty"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        aria-hidden="true"
                      >
                        <rect
                          x="4"
                          y="4"
                          width="16"
                          height="16"
                          stroke-dasharray="3 3"
                        />
                        <path d="M9 12h6" />
                      </svg>
                      <span
                        v-if="tile.banSource"
                        class="tile-wash"
                        :class="tile.banSource === 'misfortune' ? 'hazard' : 'hazard-red'"
                        aria-hidden="true"
                      />
                      <span
                        class="tier-badge sm"
                        :data-tier="tile.item.tier"
                      >{{ tile.item.tier.toUpperCase() }}</span>
                      <span
                        v-if="tile.tag"
                        class="tile-tag"
                      >{{ tile.tag }}</span>
                      <span
                        v-if="tile.banSource"
                        class="tile-reason"
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.6"
                          aria-hidden="true"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                          />
                          <path d="M5.6 5.6l12.8 12.8" />
                        </svg>
                        <span>{{ tile.reason }}</span>
                      </span>
                    </div>
                    <div class="tile-foot">
                      <span class="tile-name">{{ tile.item.displayName }}</span>
                      <span class="tile-cat odl">{{ tile.item.category }}</span>
                    </div>
                  </li>
                </ul>
              </section>
            </div>
          </TabsContent>
        </div>
      </TabsRoot>

      <div
        class="keybar"
        aria-label="Armory key"
      >
        <span class="lbl">Tier</span>
        <span class="key-tiers">
          <span
            v-for="tier in tierKey"
            :key="tier"
            class="tier-badge sm"
            :data-tier="tier"
          >{{ tier }}</span>
        </span>
        <span class="key-item">
          <span
            class="key-swatch hazard"
            aria-hidden="true"
          />
          Misfortune ban
        </span>
        <span class="key-item">
          <span
            class="key-swatch hazard-red"
            aria-hidden="true"
          />
          Pact ban
        </span>
        <span class="key-item">
          <span
            class="key-swatch key-reserve"
            aria-hidden="true"
          />
          Reserve
        </span>
        <span class="cap key-personal">Personal · no shared pool</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.armory {
  container: armory / inline-size;
  display: grid;
  gap: var(--gap-panel);
  min-width: 0;
}

.diver-kit { display: grid; gap: var(--gap-grid); }
.diver-head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-4);
}
.diver-name {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--gold);
}
.diver-head .cap { flex-shrink: 0; }

.showcase-grid {
  display: grid;
  gap: var(--gap-grid);
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
}

.armory-grid { display: grid; gap: var(--gap-panel); min-width: 0; }
.rail {
  display: grid;
  gap: var(--gap-panel);
  align-content: start;
  min-width: 0;
}
.rail-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
}

.kit-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: var(--sp-2);
}
.kit-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 56px;
  padding: var(--sp-3) var(--sp-4);
  text-align: left;
  font: inherit;
  background: var(--panel);
  border: 1px solid var(--line-1);
  color: var(--text);
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.kit-tab[data-state='active'] {
  background: var(--raised);
  border-color: var(--gold);
}
.kit-tab[data-state='active'] .kit-name { color: var(--gold); }
.kit-av {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  background: var(--line-2);
  color: var(--text);
  font-size: var(--fs-body);
}
.kit-av.host {
  background: var(--gold);
  color: var(--on-gold);
}
.kit-id {
  display: grid;
  gap: 2px;
  flex-grow: 1;
  min-width: 0;
}
.kit-name-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}
.kit-name {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kit-crown {
  color: var(--gold);
  flex-shrink: 0;
}
.kit-arrow {
  position: absolute;
  right: -9px;
  top: 50%;
  width: 8px;
  height: 16px;
  margin-top: -8px;
  background: var(--gold);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.reserve-panel {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border: 1px dashed var(--line-2);
}
.reserve-minis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: var(--sp-1);
}
.reserve-mini {
  display: grid;
  place-items: center;
  height: 38px;
  background: var(--ground);
  border: 1px solid var(--line-1);
}
.reserve-mini img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  opacity: 0.85;
}
.reserve-key { display: grid; gap: var(--sp-1); }
.key {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}
.key-exempt { color: var(--teal); }
.key-bind { color: var(--gold); }

.main {
  display: grid;
  gap: var(--gap-panel);
  align-content: start;
  min-width: 0;
}
.main-panel {
  display: grid;
  gap: var(--gap-panel);
  min-width: 0;
}
.armory-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.head-copy {
  display: grid;
  gap: var(--sp-1);
  min-width: 0;
}
.armory-title {
  margin: 0;
  font-size: var(--fs-h1);
  color: var(--text);
}
.head-tabs :deep(.app-tabs) { gap: var(--sp-2); }
.head-tabs :deep(.app-tabs-list) {
  border-radius: 0;
  border-color: var(--line-3);
}
.head-tabs :deep(.app-tabs-trigger) {
  font-size: var(--fs-cap);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.head-tabs :deep(.app-tabs-trigger[data-state='active']) {
  background: var(--raised);
  color: var(--gold);
}
.head-tabs :deep(.app-tabs-panel) { display: none; }

.readiness {
  display: grid;
  gap: var(--gap-panel);
  padding: var(--pad-panel);
  background-color: var(--panel);
  border: 1px solid var(--line-3);
}
.readiness-main {
  display: grid;
  gap: var(--sp-4);
  min-width: 0;
}
.readiness-top {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}
.readiness-lbl {
  color: var(--teal);
  white-space: nowrap;
}
.floor-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: 2px var(--sp-3);
  border: 1px solid currentColor;
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}
.floor-chip.ok {
  color: var(--teal);
  background: color-mix(in srgb, var(--teal) 10%, transparent);
}
.floor-chip.warn {
  color: var(--red);
  background: color-mix(in srgb, var(--red) 10%, transparent);
}
.readiness-body {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  flex-wrap: wrap;
}
.readiness-count {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}
.readiness-num {
  font-size: clamp(28px, 6vw, 40px);
  color: var(--teal);
}
.slots {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.slot {
  position: relative;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  background: var(--ground);
  border: 1px dashed var(--line-3);
  color: var(--ghost-ink);
}
.slot-in { animation: slotIn 0.5s var(--ease-out) both; }
.slot.filled {
  border-style: solid;
  border-color: var(--teal);
  color: var(--teal);
}
.slot img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}
.slot-check {
  position: absolute;
  right: -1px;
  bottom: -1px;
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  background: var(--teal);
  color: var(--ground);
}
.spare { display: grid; gap: var(--sp-2); }
.spare-pips { display: flex; gap: 3px; }
.spare-pip {
  width: 14px;
  height: 22px;
  border: 1px solid var(--line-4);
}
.spare-pip.spare {
  background: color-mix(in srgb, var(--teal) 18%, transparent);
  border-color: var(--teal);
}
.spare-pip.banned {
  border-color: var(--pip, var(--red));
  background-image: repeating-linear-gradient(
    -45deg,
    var(--pip, var(--red)) 0 3px,
    transparent 3px 6px
  );
}
.rules {
  display: grid;
  gap: var(--sp-3);
  align-content: start;
  min-width: 0;
}
.rules-lbl { color: var(--khaki); }
.rules-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.rule {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 3px var(--sp-3);
  border: 1px solid var(--line-2);
  color: var(--muted);
  white-space: nowrap;
}
.rule.bind.rule-misfortune {
  border-color: var(--gold);
  color: var(--gold);
}
.rule.bind.rule-pact {
  border-color: var(--red);
  color: var(--red);
}
.rule-name {
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.rule-src {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--dim);
}
.rule.bind .rule-src {
  color: inherit;
  opacity: 0.75;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.chip.filter {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: 2.5rem;
  padding: 0 var(--sp-4);
  background: transparent;
  color: var(--khaki);
  font-size: var(--fs-sm);
}
.chip.filter.on {
  color: var(--gold);
  border-color: var(--gold);
  background: color-mix(in srgb, var(--gold) 10%, transparent);
}
.filter-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border: 1px solid currentColor;
}
.filter-name { white-space: nowrap; }
.filter-count { color: var(--muted); }
.chip.filter.on .filter-count { color: var(--gold); }

.sections {
  display: flex;
  flex-wrap: wrap;
  column-gap: var(--gap-panel);
  row-gap: var(--gap-panel);
  align-content: flex-start;
}
.kit-sec {
  flex: 1 1 17rem;
  min-width: 0;
  display: grid;
  gap: var(--sp-3);
  padding-left: var(--sp-4);
  border-left: 2px solid color-mix(in srgb, var(--accent, var(--khaki)) 45%, var(--line-2));
}
.kit-sec.reserve {
  padding-left: var(--sp-5);
  border-left-style: dashed;
  border-left-color: var(--line-3);
}
.sec-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 16px;
}
.sec-mark {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  background: var(--accent, var(--khaki));
}
.sec-head .cap { color: var(--khaki); }
.sec-note { color: var(--dim); }
.sec-empty { margin: 0; }

.tiles {
  display: grid;
  gap: var(--gap-grid);
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}
.tile {
  --ban: var(--red);
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--line-2);
}
.tile.ban-misfortune { --ban: var(--gold); }
.tile.banned { border-color: var(--ban); }
.tile.reserve {
  border-style: dashed;
  border-color: var(--line-4);
}
.tile.banned.reserve {
  border-style: dashed;
  border-color: var(--ban);
}
.tile-media {
  position: relative;
  height: 100px;
  display: grid;
  place-items: center;
  background: var(--ground);
  border-bottom: 1px solid var(--line-1);
  overflow: hidden;
}
.tile-media img {
  max-width: 100%;
  max-height: 100%;
  padding: var(--sp-3);
  object-fit: contain;
  filter: brightness(0.9) contrast(1.08);
}
.tile.banned .tile-media img {
  filter: grayscale(1);
  opacity: 0.45;
}
.tile-empty { color: var(--line-4); }
.tile-wash {
  position: absolute;
  inset: 0;
  opacity: 0.26;
  pointer-events: none;
}
.tile .tier-badge {
  position: absolute;
  top: var(--sp-2);
  right: var(--sp-2);
  background: var(--ground);
}
.tile-tag {
  position: absolute;
  top: var(--sp-2);
  left: var(--sp-2);
  padding: 2px var(--sp-2);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: var(--ground);
  color: var(--khaki);
  border: 1px solid var(--line-4);
}
.tile.reserve .tile-tag {
  border-style: dashed;
  color: var(--text);
}
.tile-reason {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  height: 22px;
  padding: 0 var(--sp-2);
  background: var(--ground);
  border: 1px solid var(--ban);
  color: var(--ban);
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.tile-reason span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tile-foot {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) var(--sp-3);
}
.tile-name {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1.15;
  text-transform: uppercase;
  color: var(--text);
}
.tile.banned .tile-name { color: var(--muted); }
.tile-cat {
  align-self: flex-start;
  padding: 2px var(--sp-2);
  border: 1px solid var(--line-3);
  color: var(--khaki);
}

.keybar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-3) var(--sp-5);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--line-1);
  background: var(--rail);
}
.key-tiers { display: flex; gap: var(--sp-3); }
.key-item {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--khaki);
  white-space: nowrap;
}
.key-swatch {
  width: 22px;
  height: 14px;
  opacity: 0.7;
}
.key-reserve { border: 1px dashed var(--line-5); }
.key-personal { margin-left: auto; }

.inv-move,
.inv-enter-active { transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out); }
.inv-enter-from { opacity: 0; transform: scale(0.85); }
.inv-leave-active { position: absolute; }
.inv-leave-active,
.inv-leave-to { transition: opacity 180ms ease-in, transform 180ms ease-in; }
.inv-leave-to { opacity: 0; transform: scale(0.8); }

/* The Armory lives in a drawer, so its layout tracks its own width — not the
   viewport. Container queries keep the two-column rail/readiness only when the
   panel is actually wide enough. */
@container armory (min-width: 760px) {
  .armory-grid { grid-template-columns: 216px minmax(0, 1fr); }
  .readiness { grid-template-columns: minmax(0, 1fr) minmax(0, 340px); }
  .rules { justify-items: end; }
  .rules-row { justify-content: flex-end; }
}
</style>
