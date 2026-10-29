<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { TIER_LIST_PRESETS } from '~~/shared/data/tierLists'
import type { Tier } from '~~/shared/data/types'
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { TIER_LIST_NAME_MAX } from '~~/shared/engine/config'
import {
  TIERS,
  cleanTierListName,
  decodeTierList,
  encodeTierList,
  normalizeTierList,
  tierCounts,
  tierListChangeCount,
  tieredItem,
} from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'
import { KIT_SECTIONS } from '~/utils/kit'
import type { KitSectionId } from '~/utils/kit'

// The Tier Maker: a drag-and-drop tier board for the whole catalog. Lists
// live in this browser's library and travel as share links; no server — a
// list reaches a crusade when its host picks it at setup.
interface Draft extends TierList {
  id: string | null
}

const NEW_ID = 'new'
const route = useRoute()
const router = useRouter()
const { push: pushToast } = useToasts()
const library = useTierLists()

const draft = ref<Draft>(blank())
const baseline = ref(codeOf(draft.value))
const source = ref<string>(NEW_ID)
const notice = ref<string | null>(null)

function blank(): Draft {
  return { id: null, name: 'My tier list', tiers: {} }
}

function codeOf(list: TierList): string {
  const clean = normalizeTierList(list)
  return clean ? encodeTierList(clean) : ''
}

const dirty = computed(() => codeOf(draft.value) !== baseline.value)
const changes = computed(() => tierListChangeCount(draft.value))
const counts = computed(() => tierCounts(draft.value))
const shareable = computed(() => normalizeTierList(draft.value))
const isPicked = computed(() => draft.value.id !== null && library.pickedId.value === draft.value.id)

function load(next: Draft, from: string): void {
  selectedId.value = null
  draft.value = next
  baseline.value = next.id ? codeOf(next) : codeOf(blank())
  source.value = from
}

function open(id: string): void {
  notice.value = null
  if (id === NEW_ID) {
    load(blank(), NEW_ID)
    return
  }
  const preset = TIER_LIST_PRESETS.find(entry => `preset:${entry.id}` === id)
  if (preset) {
    load({ id: null, name: `${preset.name} (copy)`, tiers: { ...preset.tiers } }, id)
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
const landed = ref<{ id: string, n: number } | null>(null)
const announcement = ref('')
let landedTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(landedTimer))

// Every edit replaces the draft object: resolved catalogs are cached per list
// object, so mutating one in place would serve stale tiers.
function setTier(itemId: string, tier: Tier): void {
  const item = ITEMS_BY_ID.get(itemId)
  if (!item) {
    return
  }
  const { [itemId]: _previous, ...rest } = draft.value.tiers
  const tiers = item.tier === tier ? rest : { ...rest, [itemId]: tier }
  draft.value = { ...draft.value, tiers }
  landed.value = { id: itemId, n: (landed.value?.n ?? 0) + 1 }
  clearTimeout(landedTimer)
  landedTimer = setTimeout(() => {
    landed.value = null
  }, 1400)
  announcement.value = `${item.displayName} moved to ${tier.toUpperCase()} tier`
  if (tier === 's') {
    navigator.vibrate?.([10, 40, 18])
  }
}

const section = ref<KitSectionId | 'all'>('all')
const query = ref('')
const selectedId = ref<string | null>(null)
const selected = computed(() => (selectedId.value ? tieredItem(selectedId.value, draft.value) ?? null : null))
const changesOpen = ref(false)
const deskOpen = ref(false)
const board = ref<{ focusTile: (id: string) => void } | null>(null)

const FILTERS = computed(() => [
  { id: 'all' as const, label: 'All', accent: 'var(--khaki)' },
  ...KIT_SECTIONS.map(entry => ({ id: entry.id, label: entry.nav, accent: entry.accent })),
])

function closeInspector(): void {
  const id = selectedId.value
  selectedId.value = null
  if (id) {
    board.value?.focusTile(id)
  }
}

function rename(name: string): void {
  draft.value = { ...draft.value, name }
}

function resetAll(): void {
  draft.value = { ...draft.value, tiers: {} }
}

function save(): void {
  const list = { name: cleanTierListName(draft.value.name), tiers: draft.value.tiers }
  if (!normalizeTierList(list)) {
    pushToast('Move at least one item first — a list with no changes plays as the default.', 'warn')
    return
  }
  const entry = library.save(list, draft.value.id ?? undefined)
  if (!entry) {
    pushToast('Your library is full. Delete a list to make room.', 'warn')
    return
  }
  library.pick(entry.id)
  load({ id: entry.id, name: entry.name, tiers: { ...entry.tiers } }, entry.id)
  pushToast(`Saved. Your next crusade will use ${entry.name}.`)
}

function usePicked(): void {
  if (draft.value.id) {
    library.pick(draft.value.id)
    pushToast(`Your next crusade will use ${draft.value.name}.`)
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

function shareLink(list: TierList): string {
  return `${window.location.origin}/tiers#${encodeURIComponent(encodeTierList(list))}`
}

async function copyShare(): Promise<void> {
  const list = shareable.value
  if (!list || !navigator.clipboard?.writeText) {
    return
  }
  try {
    await navigator.clipboard.writeText(shareLink(list))
    pushToast('Share link copied. Anyone who opens it can save the list.')
  }
  catch {
    pushToast('Could not copy the link — your browser blocked the clipboard.', 'warn')
  }
}

// Import accepts a raw share code or a whole share link.
const importOpen = ref(false)
const importText = ref('')
const importError = ref<string | null>(null)

function importFrom(text: string): boolean {
  const list = decodeTierList(text)
  if (!list) {
    return false
  }
  load({ id: null, name: list.name, tiers: list.tiers }, NEW_ID)
  notice.value = `Imported ${list.name}: ${tierListChangeCount(list)} items moved. Save it to keep it in your library.`
  return true
}

function submitImport(): void {
  if (importFrom(importText.value)) {
    importOpen.value = false
    importText.value = ''
    importError.value = null
  }
  else {
    importError.value = 'That isn\'t a Griffdive tier list code or link.'
  }
}

onMounted(() => {
  if (library.picked.value.source === 'library') {
    open(library.picked.value.id)
  }
  if (route.hash.length > 1 && importFrom(route.hash.slice(1))) {
    router.replace({ hash: '' })
  }
})

const libraryOptions = computed(() => library.tierLists.value)
const changesList = computed(() => normalizeTierList({ ...draft.value, name: cleanTierListName(draft.value.name) }))

function deskAction(run: () => void): void {
  deskOpen.value = false
  run()
}

useHead({ title: 'Tier Maker · Griffdive' })
</script>

<template>
  <main
    id="main-content"
    class="tm-page"
    :class="{ inspecting: selected !== null }"
    tabindex="-1"
  >
    <header class="tm-head">
      <div class="tm-title">
        <h1 class="lbl tm-kicker">
          Tier Maker
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
        <button
          type="button"
          class="tm-moved"
          :disabled="!changesList"
          :aria-label="`${changes} items moved from the default. View changes`"
          @click="changesOpen = true"
        >
          <b>{{ changes }}</b> moved
        </button>
        <span
          v-if="dirty"
          class="chip orange"
        >Unsaved</span>
        <span
          v-else-if="isPicked"
          class="chip gold"
        >Next crusade</span>
      </div>
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
          <label class="tm-search">
            <span class="sr-only">Find an item</span>
            <input
              v-model="query"
              type="search"
              placeholder="Find item"
              autocomplete="off"
            >
          </label>
        </div>

        <TierListBoard
          ref="board"
          :draft="draft"
          :section="section"
          :query="query"
          :selected-id="selectedId"
          :landed="landed"
          @set="setTier"
          @select="selectedId = $event"
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
            :picked="isPicked"
            :shareable="shareable !== null"
            :changes="changes"
            @open="requestOpen"
            @save="save"
            @use="usePicked"
            @share="copyShare"
            @import="importOpen = true"
            @reset="resetAll"
            @remove="deleteOpen = true"
          />
        </div>
        <div class="tm-dock-panel panel tm-dock-insp">
          <TierListInspector
            v-if="selected"
            :item="selected"
            @set="setTier(selected.id, $event)"
            @close="closeInspector"
          />
          <p
            v-else
            class="tm-dock-empty"
          >
            <b>Drag any item to a row.</b> Click one to see its name and move it with a tap, or use
            the keyboard: arrows to walk, <kbd>S</kbd> <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> to move.
          </p>
        </div>
      </aside>
    </div>

    <section
      class="tm-bar"
      aria-label="Tier list actions"
    >
      <TierListInspector
        v-if="selected"
        :item="selected"
        @set="setTier(selected.id, $event)"
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
          :disabled="!shareable"
          @click="copyShare"
        >
          Share
        </button>
        <button
          type="button"
          class="btn primary cut-sm tm-bar-save"
          :class="{ 'cta-sweep': dirty }"
          :disabled="draft.id !== null && !dirty"
          @click="save"
        >
          {{ draft.id !== null && !dirty ? 'Saved' : 'Save' }}
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
        :picked="isPicked"
        :shareable="shareable !== null"
        :changes="changes"
        @open="deskAction(() => requestOpen($event))"
        @save="deskAction(save)"
        @use="deskAction(usePicked)"
        @share="deskAction(copyShare)"
        @import="deskAction(() => importOpen = true)"
        @reset="deskAction(resetAll)"
        @remove="deskAction(() => deleteOpen = true)"
      />
    </AppDialog>

    <TierListChanges
      v-if="changesList"
      v-model:open="changesOpen"
      :list="changesList"
    />

    <AppDialog
      v-model:open="importOpen"
      title="Import a tier list"
      description="Paste a share link or code from a squadmate. It replaces the list on the board, so save any edits first."
      size="sm"
    >
      <form
        class="import-form"
        @submit.prevent="submitImport"
      >
        <input
          v-model="importText"
          type="text"
          aria-label="Share link or code"
          placeholder="https://…/tiers#GD1… or GD1:…"
          autocomplete="off"
          spellcheck="false"
        >
        <p
          v-if="importError"
          class="import-error"
          role="alert"
        >
          {{ importError }}
        </p>
        <button
          type="submit"
          class="btn primary cut-sm"
          :disabled="!importText.trim()"
        >
          Import
        </button>
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

.tm-tally { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; font-size: 0.9rem; font-weight: 700; }
.tm-tally-tier { display: inline-flex; align-items: baseline; gap: 5px; color: var(--khaki); }
.tm-tally-tier b { font-size: 1.05rem; color: var(--tier); }
.tm-moved {
  font: inherit;
  font-size: 0.82rem;
  color: var(--khaki);
  background: none;
  border: 0;
  border-bottom: 1px dotted var(--line-4);
  padding: 0 0 1px;
  cursor: pointer;
}
.tm-moved b { color: var(--gold); }
.tm-moved:disabled { cursor: default; border-bottom-color: transparent; color: var(--muted); }
.tm-moved:disabled b { color: inherit; }

.tm-shell { display: grid; gap: 12px; min-width: 0; }
.tm-main { display: grid; gap: 8px; min-width: 0; container: tm / inline-size; }

/* The filter strip sticks under the ship header so a long board stays
   filterable; on phones the chips scroll sideways. */
.tm-filters {
  position: sticky;
  top: var(--tm-top);
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
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
.tm-search { flex: none; width: clamp(6.5rem, 26vw, 13rem); }
.tm-search input { width: 100%; height: 32px; }

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
.import-form input { width: 100%; min-width: 0; }
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
