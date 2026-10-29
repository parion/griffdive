<script setup lang="ts">
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
} from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'

// The Tier Maker: re-tier the catalog for your squad, keep lists in this
// browser's library, and pass them around as share links. No server: a list
// reaches a crusade when its host picks it at setup.
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

// Every edit replaces the draft object: resolved catalogs are cached per list
// object, so mutating one in place would serve stale tiers.
function setTier(itemId: string, tier: Tier): void {
  const { [itemId]: _previous, ...rest } = draft.value.tiers
  const tiers = ITEMS_BY_ID.get(itemId)?.tier === tier ? rest : { ...rest, [itemId]: tier }
  draft.value = { ...draft.value, tiers }
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
</script>

<template>
  <main
    id="main-content"
    class="page tiers-page"
    tabindex="-1"
  >
    <header class="page-header">
      <div class="tiers-head">
        <h1>Tier Maker</h1>
        <p class="muted small tiers-lede">
          Move any item to the tier your squad thinks it deserves. Loot rolls, Brasch's prices and
          the SEAF pack all follow the list the host launches with, and the whole squad can read it.
        </p>
      </div>
    </header>

    <AppBanner
      v-if="notice"
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

    <section
      class="panel tiers-desk"
      aria-label="Tier list"
    >
      <div class="desk-row">
        <label class="desk-field">
          <span class="lbl">Open</span>
          <select
            :value="source"
            @change="requestOpen(($event.target as HTMLSelectElement).value)"
          >
            <option :value="NEW_ID">
              New list (from the community default)
            </option>
            <optgroup label="Start from a featured list">
              <option
                v-for="preset in TIER_LIST_PRESETS"
                :key="preset.id"
                :value="`preset:${preset.id}`"
              >
                {{ preset.name }}
              </option>
            </optgroup>
            <optgroup
              v-if="libraryOptions.length"
              label="Your lists"
            >
              <option
                v-for="entry in libraryOptions"
                :key="entry.id"
                :value="entry.id"
              >
                {{ entry.name }}
              </option>
            </optgroup>
          </select>
        </label>
        <label class="desk-field">
          <span class="lbl">Name</span>
          <input
            :value="draft.name"
            type="text"
            :maxlength="TIER_LIST_NAME_MAX"
            @input="rename(($event.target as HTMLInputElement).value)"
          >
        </label>
      </div>

      <div
        class="desk-counts"
        aria-label="Items per tier"
      >
        <span
          v-for="tier in TIERS"
          :key="tier"
          class="desk-count"
        >
          <span
            class="tb"
            :data-tier="tier"
          >{{ tier.toUpperCase() }}</span>
          <b>{{ counts[tier] }}</b>
        </span>
        <span class="desk-moved">
          <b>{{ changes }}</b> moved
          <span
            v-if="dirty"
            class="chip orange"
          >Unsaved</span>
          <span
            v-else-if="isPicked"
            class="chip gold"
          >Next crusade</span>
        </span>
      </div>

      <div class="desk-actions">
        <button
          type="button"
          class="btn primary cut-sm"
          :disabled="!dirty && draft.id !== null"
          @click="save"
        >
          {{ draft.id ? 'Save changes' : 'Save to my lists' }}
        </button>
        <button
          v-if="draft.id && !dirty && !isPicked"
          type="button"
          class="btn cut-sm"
          @click="usePicked"
        >
          Use for next crusade
        </button>
        <button
          type="button"
          class="btn ghost cut-sm"
          :disabled="!shareable"
          @click="copyShare"
        >
          Copy share link
        </button>
        <button
          type="button"
          class="btn ghost cut-sm"
          @click="importOpen = true"
        >
          Import
        </button>
        <button
          type="button"
          class="btn ghost cut-sm"
          :disabled="changes === 0"
          @click="resetAll"
        >
          Reset to default
        </button>
        <button
          v-if="draft.id"
          type="button"
          class="btn danger ghost cut-sm"
          @click="deleteOpen = true"
        >
          Delete
        </button>
      </div>
    </section>

    <TierListBoard
      :draft="draft"
      @set="setTier"
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
.tiers-head { display: grid; gap: 4px; }
.tiers-head h1 { margin: 0; }
.tiers-lede { margin: 0; max-width: 64ch; line-height: 1.45; }

.tiers-desk { display: grid; gap: 12px; container: desk / inline-size; }
.desk-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
.desk-field { display: grid; gap: 0.3rem; min-width: 0; }
.desk-field select,
.desk-field input { width: 100%; min-width: 0; }
.desk-counts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; font-size: 0.85rem; }
.desk-count { display: inline-flex; align-items: center; gap: 6px; }
.desk-count .tb { min-width: 1.4rem; font-size: 0.7rem; padding: 0.05rem 0.25rem; }
.desk-moved { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; color: var(--khaki); }
.desk-actions { display: flex; flex-wrap: wrap; gap: 6px; }

.import-form { display: grid; gap: 10px; }
.import-form input { width: 100%; min-width: 0; }
.import-error { margin: 0; color: var(--red); font-size: 0.82rem; }
.confirm-row { display: flex; justify-content: flex-end; gap: 8px; }

@container desk (max-width: 520px) {
  .desk-row { grid-template-columns: minmax(0, 1fr); }
  .desk-moved { margin-left: 0; }
}
</style>
