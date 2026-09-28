<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { sortKitItems } from '~~/shared/data/ordering'
import { RESERVE_STRATAGEMS, STRATAGEM_SLOTS_REQUIRED } from '~~/shared/engine/config'
import type { Item, ItemCategory } from '~~/shared/data/types'
import type { DiveState, ItemRef } from '~~/shared/engine/types'

interface TypeGroup { id: string, label: string, accent: string, items: Item[], empty?: string }
interface DiverKit { diverId: string, diverName: string, items: Item[], groups: TypeGroup[] }

const props = withDefaults(defineProps<{
  state: DiveState
  selfId?: string | null
  selectMode?: boolean
}>(), { selfId: null, selectMode: false })

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()

const view = ref('mine')
const activeFilter = ref('all')

// Category filter chips mirror the type groups: same ids, same order.
const FILTER_META = [
  { id: 'weapons', label: 'Weapons' },
  { id: 'throwables', label: 'Throwables' },
  { id: 'stratagems', label: 'Stratagems' },
  { id: 'armor', label: 'Armor' },
  { id: 'boosters', label: 'Boosters' },
] as const

const ACCENT_BY_GROUP: Readonly<Record<string, string>> = {
  weapons: 'var(--cat-primary)',
  throwables: 'var(--cat-gear)',
  stratagems: 'var(--teal)',
  armor: 'var(--cat-armor)',
  boosters: 'var(--cat-booster)',
}

const slotCount = STRATAGEM_SLOTS_REQUIRED

function resolve(ids: readonly string[]): Item[] {
  return ids
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}

function typeGroupsFor(items: Item[]): TypeGroup[] {
  const sorted = sortKitItems(items)
  const inCategories = (categories: readonly ItemCategory[]): Item[] =>
    sorted.filter(item => categories.includes(item.category))
  const groups: TypeGroup[] = []
  const add = (id: string, label: string, entries: Item[], empty?: string) => {
    groups.push({ id, label, accent: ACCENT_BY_GROUP[id] ?? 'var(--khaki)', items: entries, empty })
  }
  const weapons = inCategories(['primary', 'secondary'])
  const throwables = inCategories(['throwable'])
  const stratagems = sorted.filter(item => item.type === 'stratagem')
  const armor = inCategories(['armorPassive'])
  const boosters = inCategories(['booster'])
  if (weapons.length) add('weapons', 'Weapons', weapons)
  if (throwables.length) add('throwables', 'Throwables', throwables)
  if (stratagems.length) add('stratagems', 'Stratagems', stratagems)
  if (armor.length) add('armor', 'Armor', armor)
  // Boosters always render their group, even when empty — a boosterless diver
  // needs to see the slot exists and that rewards can fill it.
  add('boosters', 'Boosters', boosters, 'No boosters available yet — rewards can unlock one.')
  return groups
}

function kitFor(diver: DiveState['divers'][number]): DiverKit {
  const items = resolve(props.state.personalInventories[diver.id] ?? [])
  return { diverId: diver.id, diverName: diver.name, items, groups: typeGroupsFor(items) }
}

// The loadout floor is the self kit's stratagem count against HD2's required
// four. Presentation only — the engine owns the hard floor (hasLegalLoadout).
const selfItems = computed<Item[]>(() =>
  resolve(props.state.personalInventories[props.selfId ?? ''] ?? []))
const selfStratagems = computed<Item[]>(() =>
  sortKitItems(selfItems.value.filter(item => item.type === 'stratagem')))
const selfStratagemCount = computed(() => selfStratagems.value.length)
const fieldable = computed(() => Math.min(selfStratagemCount.value, slotCount))
const floorMet = computed(() => selfStratagemCount.value >= slotCount)
const floorAria = computed(() =>
  `${fieldable.value} of ${slotCount} stratagem slots fieldable, ${selfStratagemCount.value} owned`)

const reserveItems = computed<Item[]>(() =>
  RESERVE_STRATAGEMS
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined))

// The four floor slots, resolved to media once so the template never indexes a
// possibly-empty array (noUncheckedIndexedAccess).
const slotViews = computed(() =>
  Array.from({ length: slotCount }, (_, index) => {
    const item = selfStratagems.value[index]
    const image = item ? itemImageUrl(item) : undefined
    return { filled: index < fieldable.value, image }
  }))

const filterDefs = computed(() =>
  FILTER_META.map(meta => ({
    ...meta,
    accent: ACCENT_BY_GROUP[meta.id] ?? 'var(--khaki)',
    count: selfItems.value.filter(item => groupOfItem(item) === meta.id).length,
  })))

function groupOfItem(item: Item): string {
  if (item.type === 'stratagem') return 'stratagems'
  switch (item.category) {
    case 'primary':
    case 'secondary':
      return 'weapons'
    case 'throwable':
      return 'throwables'
    case 'armorPassive':
    case 'armor':
      return 'armor'
    case 'booster':
      return 'boosters'
    default:
      return 'weapons'
  }
}

const mineGroups = computed<TypeGroup[]>(() => typeGroupsFor(selfItems.value))

const otherKits = computed<DiverKit[]>(() =>
  props.state.divers.filter(diver => diver.id !== props.selfId).map(kitFor))

const allKits = computed<DiverKit[]>(() => props.state.divers.map(kitFor))

const viewTabs = computed(() => otherKits.value.length
  ? [{ value: 'mine', label: 'My kit' }, { value: 'squad', label: 'Squad' }]
  : [{ value: 'mine', label: 'My kit' }])

watch(() => otherKits.value.length, (count) => {
  if (count === 0) {
    view.value = 'mine'
  }
})

function visibleGroups(groups: TypeGroup[]): TypeGroup[] {
  return activeFilter.value === 'all'
    ? groups
    : groups.filter(group => group.id === activeFilter.value)
}

function forfeit(ownerId: string, itemId: string): void {
  emit('forfeit', { ownerId, itemId })
}
</script>

<template>
  <div class="inventory">
    <section
      v-if="!selectMode && selfId"
      class="floor ticks"
      aria-label="Loadout readiness"
    >
      <div class="floor-left">
        <div class="floor-head">
          <span class="lbl floor-lbl">Stratagems fieldable <span class="dim">· {{ slotCount }} min</span></span>
          <span
            class="floor-chip"
            :class="floorMet ? 'ok' : 'warn'"
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
              <path :d="floorMet ? 'M5 12l5 5 9-10' : 'M6 6l12 12M18 6L6 18'" />
            </svg>
            {{ floorMet ? 'Floor met' : 'Below floor' }}
          </span>
        </div>

        <div class="floor-body">
          <div class="floor-count">
            <span class="disp floor-num">{{ fieldable }}</span>
            <span class="cap">/ {{ selfStratagemCount }} owned</span>
          </div>
          <div
            class="slots"
            role="progressbar"
            aria-label="Loadout floor"
            :aria-valuemin="0"
            :aria-valuemax="slotCount"
            :aria-valuenow="fieldable"
            :aria-valuetext="floorAria"
          >
            <span
              v-for="(slot, i) in slotViews"
              :key="i"
              class="slot cut-sm"
              :class="{ filled: slot.filled }"
            >
              <img
                v-if="slot.filled && slot.image"
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
            </span>
          </div>
        </div>
      </div>

      <div class="floor-reserve">
        <span class="lbl">Reserve <span class="dim">· every diver</span></span>
        <div class="reserve-mini">
          <span
            v-for="item in reserveItems"
            :key="item.id"
            class="mini"
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
          <span class="key ok">
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
          <span class="key bind">
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
    </section>

    <div
      v-if="!selectMode && selfId"
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
        <span class="filter-count">{{ selfItems.length }}</span>
      </button>
      <button
        v-for="f in filterDefs"
        :key="f.id"
        type="button"
        class="chip filter"
        :class="{ on: activeFilter === f.id }"
        :aria-pressed="activeFilter === f.id"
        @click="activeFilter = f.id"
      >
        <span
          class="filter-dot"
          :style="{ background: f.accent }"
          aria-hidden="true"
        />
        <span class="filter-name">{{ f.label }}</span>
        <span class="filter-count">{{ f.count }}</span>
      </button>
    </div>

    <AppTabs
      v-if="!selectMode"
      v-model="view"
      :tabs="viewTabs"
      label="Inventory view"
    >
      <template #mine>
        <div class="kit-categories">
          <section
            v-for="group in visibleGroups(mineGroups)"
            :key="group.id"
            class="inv-group"
            :style="{ '--accent': group.accent }"
          >
            <header class="group-head">
              <span
                class="group-mark"
                aria-hidden="true"
              />
              <h3>{{ group.label }}</h3>
              <span class="cap">{{ group.items.length }} items</span>
            </header>
            <p
              v-if="!group.items.length"
              class="muted small"
            >
              {{ group.empty }}
            </p>
            <TransitionGroup
              v-else
              tag="div"
              name="inv"
              class="showcase-grid"
            >
              <ItemCard
                v-for="item in group.items"
                :key="item.id"
                :item="item"
                showcase
                disabled
              />
            </TransitionGroup>
          </section>
        </div>
      </template>

      <template #squad>
        <div class="kit-categories">
          <section
            v-for="kit in otherKits"
            :key="kit.diverId"
            class="diver-kit"
          >
            <header class="diver-head">
              <span class="disp diver-name">{{ kit.diverName }}</span>
              <span class="dash" />
              <span class="cap">{{ kit.items.length }} items</span>
            </header>
            <div class="kit-types">
              <div
                v-for="group in visibleGroups(kit.groups)"
                :key="group.id"
                class="inv-group"
                :style="{ '--accent': group.accent }"
              >
                <header class="group-head">
                  <span
                    class="group-mark"
                    aria-hidden="true"
                  />
                  <h4>{{ group.label }}</h4>
                  <span class="cap">{{ group.items.length }} items</span>
                </header>
                <p
                  v-if="!group.items.length"
                  class="muted small"
                >
                  {{ group.empty }}
                </p>
                <TransitionGroup
                  v-else
                  tag="div"
                  name="inv"
                  class="showcase-grid"
                >
                  <ItemCard
                    v-for="item in group.items"
                    :key="item.id"
                    :item="item"
                    showcase
                    disabled
                  />
                </TransitionGroup>
              </div>
            </div>
          </section>
        </div>
      </template>
    </AppTabs>

    <template v-else>
      <section
        v-for="kit in allKits"
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
  </div>
</template>

<style scoped>
.inventory { display: grid; gap: 1rem; }
.kit-categories,
.kit-types { display: grid; gap: 1rem; }
.inv-group {
  position: relative;
  display: grid;
  gap: 0.5rem;
  padding-left: 0.7rem;
  border-left: 2px solid color-mix(in srgb, var(--accent, var(--khaki)) 45%, var(--line-2));
}
.inv-group > p { margin: 0; }

.group-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.group-mark {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  align-self: center;
  background: var(--accent, var(--khaki));
}
.group-head h3,
.group-head h4 {
  margin: 0;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
}
.group-head .cap { margin-left: auto; }

.diver-kit { display: grid; gap: 0.6rem; }
.diver-head {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}
.diver-name {
  margin: 0;
  font-size: 1rem;
  color: var(--gold);
}
.diver-head .cap { flex-shrink: 0; }

.showcase-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
}

/* Loadout floor: the self kit's stratagems against HD2's required four. */
.floor {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background-color: var(--panel);
  border: 1px solid var(--line-3);
}
.floor-left { display: grid; gap: 0.55rem; min-width: 0; }
.floor-head { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.floor-lbl { white-space: nowrap; }
.floor-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.5rem;
  border: 1px solid currentColor;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}
.floor-chip.ok { color: var(--teal); background: color-mix(in srgb, var(--teal) 10%, transparent); }
.floor-chip.warn { color: var(--red); background: color-mix(in srgb, var(--red) 10%, transparent); }

.floor-body { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.floor-count { display: flex; align-items: baseline; gap: 0.4rem; }
.floor-num { font-size: 2.4rem; color: var(--teal); }
.floor-body .cap { color: var(--muted); }

.slots { display: flex; align-items: center; gap: 0.4rem; }
.slot {
  display: grid;
  place-items: center;
  width: 2.7rem;
  height: 2.7rem;
  background: var(--ground);
  border: 1px dashed var(--line-3);
  color: var(--ghost-ink);
}
.slot.filled { border-style: solid; border-color: var(--teal); color: var(--teal); }
.slot img { width: 1.9rem; height: 1.9rem; object-fit: contain; }

.floor-reserve {
  display: grid;
  gap: 0.45rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--line-2);
}
.reserve-mini {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.4rem, 1fr));
  gap: 0.3rem;
  max-width: 18rem;
}
.mini {
  display: grid;
  place-items: center;
  height: 2.3rem;
  background: var(--ground);
  border: 1px solid var(--line-1);
}
.mini img { width: 1.5rem; height: 1.5rem; object-fit: contain; opacity: 0.85; }
.reserve-key { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; }
.key {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}
.key.ok { color: var(--teal); }
.key.bind { color: var(--gold); }

.filters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip.filter {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  background: transparent;
  color: var(--khaki);
}
.chip.filter.on {
  color: var(--gold);
  border-color: var(--gold);
  background: color-mix(in srgb, var(--gold) 8%, transparent);
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

.inv-move,
.inv-enter-active { transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out); }
.inv-enter-from { opacity: 0; transform: scale(0.85); }
.inv-leave-active { position: absolute; }
.inv-leave-active,
.inv-leave-to { transition: opacity 180ms ease-in, transform 180ms ease-in; }
.inv-leave-to { opacity: 0; transform: scale(0.8); }

@media (min-width: 700px) {
  .floor { flex-direction: row; align-items: stretch; gap: 1.5rem; }
  .floor-left { flex: 1; }
  .floor-reserve {
    width: 15rem;
    flex-shrink: 0;
    padding-top: 0;
    padding-left: 1.5rem;
    border-top: 0;
    border-left: 1px dashed var(--line-2);
  }
}
</style>
