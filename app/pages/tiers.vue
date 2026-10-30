<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { RadioGroupItem, RadioGroupRoot, Toggle } from 'reka-ui'
import { TIER_LIST_PRESETS } from '~~/shared/data/tierLists'
import type { Tier } from '~~/shared/data/types'
import { TIER_LIST_NAME_MAX } from '~~/shared/engine/config'
import {
  TIERS,
  cleanTierListName,
  defaultTierList,
  encodeTierList,
  parseTierList,
  sameTierList,
  tierCounts,
  tierListFromGroups,
  tierListToJson,
  tieredItem,
  unratedItems,
} from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'
import { TIER_MAKER_SECTIONS } from '~/utils/kit'
import type { KitSectionId, TileSize } from '~/utils/kit'

// The Tier Maker: a drag-and-drop tier board for the whole catalog. Every list
// is complete on its own — a new one starts as a copy of the default tiers or
// a featured list, never as edits to it. Lists live in this browser's library
// and travel as share links or JSON files; no server — a list reaches a
// crusade when its host picks it.
interface Draft extends TierList {
  id: string | null
}

const NEW_ID = 'new'
const route = useRoute()
const router = useRouter()
const { push: pushToast } = useToasts()
const library = useTierLists()
const recentRooms = useRecentRooms()

const { standalone, mainOrigin } = useTiersSite()
// A lobby this host has open in another tab (the Tier Maker opens in a new
// one from setup): the list, and the diver, go back to it.
const lobbyPath = useOpenLobby()

const draft = ref<Draft>(blank())
const baseline = ref<TierList>(snapshot(draft.value))
const source = ref<string>(NEW_ID)
const notice = ref<string | null>(null)

function blank(): Draft {
  return { id: null, ...defaultTierList('My tier list') }
}

function snapshot(list: TierList): TierList {
  return { name: cleanTierListName(list.name), tiers: { ...list.tiers } }
}

const cleaned = computed(() => snapshot(draft.value))
const dirty = computed(() => !sameTierList(cleaned.value, baseline.value))
const counts = computed(() => tierCounts(draft.value))
const unrated = computed(() => unratedItems(draft.value).length)
const isPicked = computed(() => draft.value.id !== null && library.pickedId.value === draft.value.id)

function load(next: Draft, from: string): void {
  selection.value = []
  draft.value = next
  baseline.value = snapshot(next)
  source.value = from
}

function open(id: string): void {
  notice.value = null
  if (id === NEW_ID) {
    load(blank(), NEW_ID)
    return
  }
  const preset = TIER_LIST_PRESETS.find(entry => `preset:${entry.id}` === id)
  const list = preset ? tierListFromGroups(`${preset.name} (copy)`, preset.tiers) : null
  if (list) {
    load({ id: null, ...list }, id)
    return
  }
  const saved = library.find(id)
  if (saved) {
    load({ id: saved.id, name: saved.name, tiers: { ...saved.tiers } }, id)
  }
}

// Switching away from unsaved edits asks first; everything else switches at once.
const pendingSwitch = ref<string | null>(null)
const discardOpen = computed({
  get: () => pendingSwitch.value !== null,
  set: (value: boolean) => {
    if (!value) {
      pendingSwitch.value = null
    }
  },
})

function requestOpen(id: string): void {
  if (dirty.value) {
    pendingSwitch.value = id
    return
  }
  open(id)
}

function confirmSwitch(): void {
  const id = pendingSwitch.value
  pendingSwitch.value = null
  if (id) {
    open(id)
  }
}

// The tile that just moved plays its landing; the counter restarts it when the
// same tile moves twice in a row.
const landed = ref<{ ids: string[], n: number } | null>(null)
const announcement = ref('')
let landedTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(landedTimer))

function land(itemIds: string[]): void {
  const items = itemIds.map(id => tieredItem(id, draft.value)).filter(item => item !== undefined)
  const tier = items[0]?.tier
  if (!tier) {
    return
  }
  landed.value = { ids: itemIds, n: (landed.value?.n ?? 0) + 1 }
  clearTimeout(landedTimer)
  landedTimer = setTimeout(() => {
    landed.value = null
  }, 1400)
  const what = items.length > 1 ? `${items.length} items` : items[0]!.displayName
  announcement.value = items.every(item => item.tier === tier)
    ? `${what} moved to ${tier.toUpperCase()} tier`
    : `${what} back to their saved tiers`
  if (tier === 's') {
    navigator.vibrate?.([10, 40, 18])
  }
}

// Every edit replaces the draft object: resolved catalogs are cached per list
// object, so mutating one in place would serve stale tiers.
function setTiers(itemIds: string[], tier: Tier): void {
  const known = itemIds.filter(id => tieredItem(id, null))
  if (!known.length) {
    return
  }
  draft.value = { ...draft.value, tiers: { ...draft.value.tiers, ...Object.fromEntries(known.map(id => [id, tier])) } }
  land(known)
}

// Back to the tiers they had at the last save — unrated again if they were.
function revertItems(itemIds: string[]): void {
  const reverting = new Set(itemIds)
  const kept = Object.entries(draft.value.tiers).filter(([id]) => !reverting.has(id))
  const restored = itemIds.flatMap((id) => {
    const saved = baseline.value.tiers[id]
    return saved ? [[id, saved] as const] : []
  })
  draft.value = { ...draft.value, tiers: Object.fromEntries([...kept, ...restored]) }
  land(itemIds)
}

function revertAll(): void {
  draft.value = { ...draft.value, ...snapshot(baseline.value) }
}

const section = ref<KitSectionId | 'all'>('all')
const query = ref('')
// Click selects one item; Ctrl/⌘-click gathers several, which move together.
const selection = ref<string[]>([])
const selectedItems = computed(() =>
  selection.value.map(id => tieredItem(id, draft.value)).filter(item => item !== undefined))
const selectedSaved = computed(() =>
  selection.value.length === 1 ? tieredItem(selection.value[0]!, baseline.value)?.tier ?? null : null)
const selectedUnrated = computed(() =>
  selection.value.length === 1 && draft.value.tiers[selection.value[0]!] === undefined)

function select(id: string | null, additive: boolean): void {
  if (!id) {
    selection.value = []
  }
  else if (!additive) {
    selection.value = [id]
  }
  else {
    selection.value = selection.value.includes(id)
      ? selection.value.filter(entry => entry !== id)
      : [...selection.value, id]
  }
}
const viewOpen = ref(false)
const deskOpen = ref(false)
const board = ref<{ focusTile: (id: string) => void } | null>(null)

// How the board reads is the diver's own preference, kept across visits.
const view = useLocalStorage<{ names: boolean, size: TileSize }>(
  'griffdive:tier-maker-view',
  { names: true, size: 'm' },
  { mergeDefaults: true },
)
const SIZES: readonly { id: TileSize, label: string }[] = [
  { id: 's', label: 'Small tiles' },
  { id: 'm', label: 'Medium tiles' },
  { id: 'l', label: 'Large tiles' },
]

const FILTERS = computed(() => [
  { id: 'all' as const, label: 'All', accent: 'var(--khaki)' },
  ...TIER_MAKER_SECTIONS.map(entry => ({ id: entry.id, label: entry.nav, accent: entry.accent })),
])

function closeInspector(): void {
  const id = selection.value[selection.value.length - 1]
  selection.value = []
  if (id) {
    board.value?.focusTile(id)
  }
}

function rename(name: string): void {
  draft.value = { ...draft.value, name }
}

function save(): void {
  const entry = library.save(cleaned.value, draft.value.id ?? undefined)
  if (!entry) {
    pushToast('Your library is full. Delete a list to make room.', 'warn')
    return
  }
  library.pick(entry.id)
  load({ id: entry.id, name: entry.name, tiers: { ...entry.tiers } }, entry.id)
  pushToast(standalone
    ? `Saved ${entry.name} to your lists in this browser.`
    : lobbyPath.value ? `Saved. Your lobby now uses ${entry.name}.` : `Saved. Your next crusade will use ${entry.name}.`)
}

// Once a list is saved and unchanged, the Save button turns into the next
// step: back to the lobby open in another tab, a fresh crusade, or — on the
// standalone site — over to Griffdive to play it.
type NextStep = 'save' | 'lobby' | 'host' | 'play'
const step = computed<NextStep>(() => {
  if (draft.value.id === null || dirty.value) {
    return 'save'
  }
  return standalone ? 'play' : lobbyPath.value ? 'lobby' : 'host'
})
const launching = ref(false)
const BAR_LABEL: Readonly<Record<NextStep, string>> = {
  save: 'Save',
  lobby: 'Back to lobby',
  host: 'Host crusade',
  play: 'Play it ↗',
}

function primary(): void {
  if (step.value === 'save') {
    save()
  }
  else if (step.value === 'lobby') {
    backToLobby()
  }
  else if (step.value === 'play') {
    window.location.assign(`${mainOrigin}/tiers?play=1#${encodeTierList(cleaned.value)}`)
  }
  else {
    void hostCrusade()
  }
}

// The lobby's tab hears the pick and syncs the list to the squad. This tab
// was opened from setup, so closing it lands the diver back in the lobby;
// a browser that won't close it navigates to the lobby instead.
function backToLobby(): void {
  const path = lobbyPath.value
  if (!draft.value.id || !path) {
    return
  }
  library.pick(draft.value.id)
  window.close()
  setTimeout(() => navigateTo(path), 250)
}

async function hostCrusade(): Promise<void> {
  if (!draft.value.id) {
    return
  }
  library.pick(draft.value.id)
  launching.value = true
  try {
    const created = await $fetch<{ code: string }>('/api/rooms', { method: 'POST' })
    recentRooms.rememberRoom(created.code)
    await navigateTo(`/dive/${created.code}`)
  }
  catch {
    launching.value = false
    pushToast(`Couldn't open a lobby. ${draft.value.name} is still picked for your next crusade.`, 'warn')
  }
}

const deleteOpen = ref(false)
function confirmDelete(): void {
  deleteOpen.value = false
  if (draft.value.id) {
    const name = draft.value.name
    library.remove(draft.value.id)
    load(blank(), NEW_ID)
    pushToast(`Deleted ${name}.`)
  }
}

async function copyText(text: string, done: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    pushToast('Copying isn\'t available in this browser.', 'warn')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    pushToast(done)
  }
  catch {
    pushToast('Could not copy — your browser blocked the clipboard.', 'warn')
  }
}

function copyShare(): void {
  void copyText(
    `${window.location.origin}${route.path}#${encodeTierList(cleaned.value)}`,
    'Share link copied. Anyone who opens it can save the list.',
  )
}

function copyJson(): void {
  void copyText(tierListToJson(cleaned.value), 'JSON copied. Paste it into Import to load it.')
}

function download(): void {
  const blob = new Blob([tierListToJson(cleaned.value)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `griffdive-tiers-${cleaned.value.name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

// Import accepts a share link, a bare code, pasted JSON or a JSON file.
const importOpen = ref(false)
const importText = ref('')
const importError = ref<string | null>(null)

function importFrom(text: string): boolean {
  const list = parseTierList(text)
  if (!list) {
    return false
  }
  load({ id: null, ...list }, NEW_ID)
  const missing = unratedItems(list).length
  notice.value = missing
    ? `Imported ${list.name}. ${missing} items aren't rated in it yet — they're flagged New. Save it to keep it.`
    : `Imported ${list.name}. Save it to keep it in your library.`
  return true
}

function finishImport(ok: boolean): void {
  if (ok) {
    importOpen.value = false
    importText.value = ''
    importError.value = null
  }
  else {
    importError.value = 'That isn\'t a Griffdive tier list link, code or JSON.'
  }
}

function submitImport(): void {
  finishImport(importFrom(importText.value))
}

async function importFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    finishImport(importFrom(await file.text()))
  }
}

onMounted(() => {
  if (library.picked.value.source === 'library') {
    open(library.picked.value.id)
  }
  // The raw hash: the router's is decoded, which would mangle a name with a `%`.
  const hash = window.location.hash.slice(1)
  if (hash && importFrom(hash)) {
    // Sent over from the standalone Tier Maker to be played: keep it at once,
    // so the next step is hosting a crusade with it.
    if (route.query.play === '1' && !standalone) {
      save()
      notice.value = `${draft.value.name} came over from the Tier Maker and is saved to your lists. Host a crusade with it whenever you're ready.`
    }
    router.replace({ hash: '', query: {} })
  }
})

const libraryOptions = computed(() => library.tierLists.value)

function deskAction(run: () => void): void {
  deskOpen.value = false
  run()
}

useHead({ title: standalone ? 'Helldivers 2 Tier List Maker · Griffdive' : 'Tier Maker · Griffdive' })
</script>

<template>
  <main
    id="main-content"
    class="tm-page"
    :class="{ inspecting: selectedItems.length > 0 }"
    tabindex="-1"
  >
    <header class="tm-head">
      <div class="tm-title">
        <h1 class="lbl tm-kicker">
          {{ standalone ? 'Helldivers 2 Tier List Maker' : 'Tier Maker' }}
        </h1>
        <input
          class="tm-name disp"
          :value="draft.name"
          type="text"
          aria-label="List name"
          :maxlength="TIER_LIST_NAME_MAX"
          spellcheck="false"
          @input="rename(($event.target as HTMLInputElement).value)"
        >
      </div>
      <div
        class="tm-tally"
        aria-label="Items per tier"
      >
        <span
          v-for="tier in TIERS"
          :key="tier"
          class="tm-tally-tier"
          :style="{ '--tier': `var(--tier-${tier})` }"
        >
          <b class="disp">{{ tier.toUpperCase() }}</b>{{ counts[tier] }}
        </span>
        <span
          v-if="unrated"
          class="chip gold"
          :title="`${unrated} items this list hasn't rated yet play at their default tier`"
        >{{ unrated }} new</span>
        <button
          type="button"
          class="tm-overview"
          @click="viewOpen = true"
        >
          Overview
        </button>
        <span
          v-if="dirty"
          class="chip orange"
        >Unsaved</span>
        <span
          v-else-if="isPicked && !standalone"
          class="chip gold"
        >{{ lobbyPath ? 'In your lobby' : 'Next crusade' }}</span>
      </div>
      <p
        v-if="standalone"
        class="tm-pitch"
      >
        Rank every weapon, stratagem, booster and armor passive, then share it with a link. Want to
        play by it? <a :href="mainOrigin">Griffdive</a> turns your tier list into a squad roguelike:
        climb the difficulties, and the higher an item's tier, the rarer it drops.
      </p>
    </header>

    <AppBanner
      v-if="notice"
      class="tm-notice"
      tone="info"
    >
      {{ notice }}
      <template #actions>
        <button
          type="button"
          class="btn tiny ghost"
          @click="notice = null"
        >
          Dismiss
        </button>
      </template>
    </AppBanner>

    <div class="tm-shell">
      <div class="tm-main">
        <div class="tm-filters">
          <RadioGroupRoot
            v-model="section"
            orientation="horizontal"
            class="tm-chips"
            aria-label="Show items"
          >
            <RadioGroupItem
              v-for="filter in FILTERS"
              :key="filter.id"
              :value="filter.id"
              class="tm-chip"
              :style="{ '--accent': filter.accent }"
            >
              <i
                v-if="filter.id !== 'all'"
                class="tm-chip-swatch"
                aria-hidden="true"
              />{{ filter.label }}
            </RadioGroupItem>
          </RadioGroupRoot>
          <div class="tm-tools">
            <label class="tm-search">
              <span class="sr-only">Find an item</span>
              <input
                v-model="query"
                type="search"
                placeholder="Find item"
                autocomplete="off"
              >
            </label>
            <Toggle
              v-model="view.names"
              class="tm-tool tm-names"
              aria-label="Show item names"
            >
              <span aria-hidden="true">Aa</span>
            </Toggle>
            <RadioGroupRoot
              v-model="view.size"
              orientation="horizontal"
              class="tm-sizes"
              aria-label="Tile size"
            >
              <RadioGroupItem
                v-for="(option, index) in SIZES"
                :key="option.id"
                :value="option.id"
                class="tm-tool"
                :aria-label="option.label"
              >
                <i
                  class="tm-size-glyph"
                  :style="{ '--n': index }"
                  aria-hidden="true"
                />
              </RadioGroupItem>
            </RadioGroupRoot>
          </div>
        </div>

        <TierListBoard
          ref="board"
          :draft="draft"
          :baseline="baseline"
          :named="view.names"
          :size="view.size"
          :section="section"
          :query="query"
          :selection="selection"
          :landed="landed"
          @set="setTiers"
          @revert="revertItems"
          @select="select"
        />
      </div>

      <aside
        class="tm-dock"
        aria-label="List"
      >
        <div class="tm-dock-panel panel">
          <TierListDesk
            :source="source"
            :new-id="NEW_ID"
            :library="libraryOptions"
            :saved="draft.id !== null"
            :dirty="dirty"
            :step="step"
            :launching="launching"
            @open="requestOpen"
            @primary="primary"
            @share="copyShare"
            @download="download"
            @copy-json="copyJson"
            @import="importOpen = true"
            @revert="revertAll"
            @remove="deleteOpen = true"
          />
        </div>
        <div class="tm-dock-panel panel tm-dock-insp">
          <TierListInspector
            v-if="selectedItems.length"
            :items="selectedItems"
            :saved-tier="selectedSaved"
            :unrated="selectedUnrated"
            @set="setTiers(selection, $event)"
            @close="closeInspector"
          />
          <p
            v-else
            class="tm-dock-empty"
          >
            <b>Drag any item to a row.</b> Click one to see its name and move it with a tap;
            <kbd>Ctrl</kbd>-click to gather several and move them together. Or use the keyboard:
            arrows to walk, <kbd>S</kbd> <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> to move, <kbd>D</kbd> to
            undo.
          </p>
        </div>
      </aside>
    </div>

    <section
      class="tm-bar"
      aria-label="Tier list actions"
    >
      <TierListInspector
        v-if="selectedItems.length"
        :items="selectedItems"
        :saved-tier="selectedSaved"
        :unrated="selectedUnrated"
        @set="setTiers(selection, $event)"
        @close="closeInspector"
      />
      <div
        v-else
        class="tm-bar-row"
      >
        <button
          type="button"
          class="btn ghost cut-sm"
          @click="deskOpen = true"
        >
          List ▾
        </button>
        <button
          type="button"
          class="btn ghost cut-sm"
          @click="copyShare"
        >
          Share
        </button>
        <button
          type="button"
          class="btn primary cut-sm tm-bar-save"
          :class="{ 'cta-sweep': dirty, 'tm-next': step !== 'save' }"
          :disabled="launching"
          @click="primary"
        >
          {{ BAR_LABEL[step] }}
        </button>
      </div>
    </section>

    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ announcement }}
    </p>

    <AppDialog
      v-model:open="deskOpen"
      title="Tier list"
      size="sm"
    >
      <TierListDesk
        :source="source"
        :new-id="NEW_ID"
        :library="libraryOptions"
        :saved="draft.id !== null"
        :dirty="dirty"
        :step="step"
        :launching="launching"
        @open="deskAction(() => requestOpen($event))"
        @primary="deskAction(primary)"
        @share="deskAction(copyShare)"
        @download="deskAction(download)"
        @copy-json="deskAction(copyJson)"
        @import="deskAction(() => importOpen = true)"
        @revert="deskAction(revertAll)"
        @remove="deskAction(() => deleteOpen = true)"
      />
    </AppDialog>

    <TierListView
      v-model:open="viewOpen"
      :list="cleaned"
      description="This list as it stands on the board, unsaved moves included."
    />

    <AppDialog
      v-model:open="importOpen"
      title="Import a tier list"
      description="Paste a share link, a code or a list's JSON, or open a saved file. It replaces the list on the board, so save any edits first."
      size="sm"
    >
      <form
        class="import-form"
        @submit.prevent="submitImport"
      >
        <textarea
          v-model="importText"
          rows="4"
          aria-label="Share link, code or JSON"
          placeholder="https://…/tiers#GD2… or { &quot;tiers&quot;: … }"
          autocomplete="off"
          spellcheck="false"
        />
        <p
          v-if="importError"
          class="import-error"
          role="alert"
        >
          {{ importError }}
        </p>
        <div class="import-row">
          <label class="btn ghost cut-sm import-file">
            Open a file…
            <input
              type="file"
              accept="application/json,.json,text/plain"
              class="sr-only"
              @change="importFile"
            >
          </label>
          <button
            type="submit"
            class="btn primary cut-sm"
            :disabled="!importText.trim()"
          >
            Import
          </button>
        </div>
      </form>
    </AppDialog>

    <AppDialog
      v-model:open="discardOpen"
      title="Discard unsaved changes?"
      description="Your edits to this list haven't been saved."
      size="sm"
    >
      <div class="confirm-row">
        <button
          type="button"
          class="btn ghost cut-sm"
          @click="discardOpen = false"
        >
          Keep editing
        </button>
        <button
          type="button"
          class="btn danger cut-sm"
          @click="confirmSwitch"
        >
          Discard
        </button>
      </div>
    </AppDialog>

    <AppDialog
      v-model:open="deleteOpen"
      :title="`Delete ${draft.name}?`"
      description="It leaves this browser's library. Crusades already launched with it keep their tiers."
      size="sm"
    >
      <div class="confirm-row">
        <button
          type="button"
          class="btn ghost cut-sm"
          @click="deleteOpen = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn danger cut-sm"
          @click="confirmDelete"
        >
          Delete list
        </button>
      </div>
    </AppDialog>
  </main>
</template>

<style scoped>
.tm-page {
  --tm-top: 60px;
  --bar-h: 64px;
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 1680px;
  margin: 0 auto;
  padding: 14px clamp(8px, 2vw, 24px) calc(var(--bar-h) + 28px + env(safe-area-inset-bottom));
}
.tm-page.inspecting { --bar-h: 210px; }

.tm-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 20px;
  min-width: 0;
}
.tm-title { display: grid; gap: 2px; min-width: 0; flex: 1 1 18rem; }
.tm-kicker { margin: 0; color: var(--gold); }
.tm-name {
  width: 100%;
  min-width: 0;
  padding: 2px 0 4px;
  font-size: clamp(1.5rem, 4.6vw, 2.6rem);
  line-height: 1.05;
  text-transform: uppercase;
  color: var(--text);
  background: transparent;
  border: 0;
  border-bottom: 1px dashed var(--line-3);
  border-radius: 0;
}
.tm-name:hover { border-bottom-color: var(--line-4); }
.tm-name:focus-visible { outline: none; border-bottom: 1px solid var(--gold); }

.tm-pitch { flex-basis: 100%; max-width: 62ch; margin: 0; font-size: 0.86rem; line-height: 1.5; color: var(--khaki); }
.tm-pitch a { color: var(--gold); }
.tm-tally { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; font-size: 0.9rem; font-weight: 700; }
.tm-tally-tier { display: inline-flex; align-items: baseline; gap: 5px; color: var(--khaki); }
.tm-tally-tier b { font-size: 1.05rem; color: var(--tier); }
.tm-overview {
  font: inherit;
  font-size: 0.82rem;
  color: var(--khaki);
  background: none;
  border: 0;
  border-bottom: 1px dotted var(--line-4);
  padding: 0 0 1px;
  cursor: pointer;
}
.tm-overview:hover { color: var(--gold); }

.tm-shell { display: grid; gap: 12px; min-width: 0; }
.tm-main { display: grid; gap: 8px; min-width: 0; container: tm / inline-size; }

/* The filter strip sticks under the ship header so a long board stays
   filterable: category chips (scrolling sideways on phones), then search and
   the display toggles on a line of their own. */
.tm-filters {
  position: sticky;
  top: var(--tm-top);
  z-index: 6;
  display: grid;
  gap: 6px;
  min-width: 0;
  margin: 0 -2px;
  padding: 8px 2px;
  background: linear-gradient(180deg, var(--ground) 80%, transparent);
}
.tm-chips {
  display: flex;
  gap: 4px;
  min-width: 0;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  mask-image: linear-gradient(90deg, #000 92%, transparent);
}
.tm-chips::-webkit-scrollbar { display: none; }
.tm-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  height: 32px;
  padding: 0 11px;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--khaki);
  background: var(--panel);
  border: 1px solid var(--line-2);
  cursor: pointer;
  transition: border-color var(--dur-fast), color var(--dur-fast), background-color var(--dur-fast);
}
.tm-chip:hover { border-color: var(--line-4); }
.tm-chip[data-state='checked'] {
  color: var(--text);
  background: color-mix(in srgb, var(--accent) 14%, var(--raised));
  border-color: var(--accent);
  box-shadow: inset 0 -2px 0 var(--accent);
}
.tm-chip-swatch { width: 7px; height: 7px; background: var(--accent); }
.tm-tools { display: flex; align-items: center; gap: 6px; min-width: 0; }
.tm-search { flex: 1; min-width: 0; max-width: 28rem; }
.tm-search input { width: 100%; height: 36px; }
.tm-sizes { display: flex; }
.tm-sizes .tm-tool + .tm-tool { margin-left: -1px; }
.tm-tool {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  padding: 0;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  background: var(--panel);
  border: 1px solid var(--line-2);
  cursor: pointer;
  transition: border-color var(--dur-fast), color var(--dur-fast), background-color var(--dur-fast);
}
.tm-tool:hover { color: var(--khaki); border-color: var(--line-4); }
.tm-tool[data-state='on'],
.tm-tool[data-state='checked'] {
  position: relative;
  color: var(--gold);
  background: var(--raised);
  border-color: var(--gold);
}
.tm-size-glyph {
  width: calc(8px + var(--n) * 4px);
  aspect-ratio: 1;
  border: 1.5px solid currentColor;
}

.tm-dock { display: none; }
.tm-dock-empty { margin: 0; font-size: 12px; line-height: 1.5; color: var(--muted); }
.tm-dock-empty b { display: block; margin-bottom: 4px; color: var(--khaki); }
.tm-dock-empty kbd {
  display: inline-block;
  min-width: 1.3em;
  padding: 0 3px;
  font: inherit;
  font-weight: 700;
  text-align: center;
  color: var(--khaki);
  border: 1px solid var(--line-3);
}

/* Phones and tablets: actions live in a bar pinned to the thumb; picking a
   tile turns the bar into the inspector. */
.tm-bar {
  position: fixed;
  inset: auto 0 0;
  z-index: 30;
  padding: 10px clamp(10px, 3vw, 20px) calc(10px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--rail) 94%, transparent);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--line-3);
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
}
.tm-bar-row { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 8px; max-width: 720px; margin: 0 auto; }
.tm-bar > .tm-insp { max-width: 720px; margin: 0 auto; }

.import-form { display: grid; gap: 10px; }
.import-form textarea { width: 100%; min-width: 0; resize: vertical; font-size: 0.82rem; }
.import-row { display: flex; justify-content: space-between; gap: 8px; }
.import-file { position: relative; cursor: pointer; }
.import-error { margin: 0; color: var(--red); font-size: 0.82rem; }
.confirm-row { display: flex; justify-content: flex-end; gap: 8px; }

/* Landscape phones: the inspector folds into one row so the board keeps
   the screen. */
@media (orientation: landscape) and (max-height: 520px) {
  .tm-page.inspecting { --bar-h: 120px; }
  .tm-filters { position: static; }
}

/* Wide: the board takes the stage, the list desk and inspector dock beside it. */
@media (min-width: 1100px) {
  .tm-page { padding-bottom: 40px; }
  .tm-page.inspecting { --bar-h: 0px; }
  .tm-shell { grid-template-columns: minmax(0, 1fr) clamp(280px, 22vw, 340px); align-items: start; }
  .tm-dock {
    position: sticky;
    top: calc(var(--tm-top) + 12px);
    display: grid;
    gap: 10px;
  }
  .tm-bar { display: none; }
}
</style>
