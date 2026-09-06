<script setup lang="ts">
import { ALL_WARBOND_CODES } from '~~/shared/data/catalog'
import { difficultyName } from '~~/shared/engine/progression'
import { createDiveState } from '~~/shared/engine/reducer'
import { isRoomCode } from '~~/shared/utils/room-code'
import type { CrusadeSettings, CrusadeVariant, DiveState } from '~~/shared/engine/types'
import type { SaveDoc } from '~~/shared/types/save'

const saves = useSaves()
const recentRooms = useRecentRooms()

const diverName = ref('Griffin')
const variant = ref<CrusadeVariant>('standard')
const myWarbonds = ref<string[]>([])
const slotList = ref<{ id: string, doc: SaveDoc }[]>([])
const joinCode = ref('')
const hosting = ref(false)

interface OnlineDive { code: string, state: DiveState | null }

const onlineDives = ref<OnlineDive[]>([])
const onlineLoading = ref(true)

onMounted(() => {
  myWarbonds.value = [...ALL_WARBOND_CODES]
  slotList.value = saves.listSaves()
  refreshOnlineDives()
})

async function refreshOnlineDives(): Promise<void> {
  const rooms = recentRooms.listRooms()
  if (rooms.length === 0) {
    onlineLoading.value = false
    return
  }
  const results = await Promise.all(rooms.map(async ({ code }) => {
    try {
      const res = await $fetch<{ code: string, state: DiveState }>(`/api/rooms/${code}`)
      return { code, state: res.state }
    }
    catch (error) {
      const err = error as { status?: number, statusCode?: number }
      // Server pruned or lost the room — drop it from the list.
      if ((err.status ?? err.statusCode) === 404) {
        recentRooms.forgetRoom(code)
        return null
      }
      return { code, state: null }
    }
  }))
  onlineDives.value = results.filter((entry): entry is OnlineDive => entry !== null)
  onlineLoading.value = false
}

const VARIANTS_LABELS: Record<CrusadeVariant, string> = {
  standard: 'Standard',
  soloDuo: 'Solo/Duo',
  super: 'Super',
  soloDuoSuper: 'Solo/Duo Super',
  quickplay: 'Quickplay',
}

const startLabel = computed(() =>
  variant.value === 'standard' ? 'Start solo crusade' : `Start ${VARIANTS_LABELS[variant.value]} crusade`,
)

function startCrusade(): void {
  const name = diverName.value.trim() || 'Diver'
  const settings: CrusadeSettings = { variant: variant.value }
  const state = createDiveState(
    settings,
    crypto.randomUUID(),
    name,
    [...myWarbonds.value],
  )
  const variantName = VARIANTS_LABELS[variant.value] ?? 'Crusade'
  const id = saves.createSlot(state, `${name} · ${variantName}`)
  navigateTo(`/dive/${id}`)
}

async function hostOnlineDive(): Promise<void> {
  hosting.value = true
  try {
    const created = await $fetch<{ code: string }>('/api/rooms', { method: 'POST' })
    recentRooms.rememberRoom(created.code)
    navigateTo(`/dive/${created.code}`)
  }
  catch {
    hosting.value = false
  }
}

function joinDive(): void {
  const code = joinCode.value.trim().toUpperCase()
  if (isRoomCode(code)) {
    navigateTo(`/dive/${code}`)
  }
}

async function onImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  await saves.importSave(file)
  slotList.value = saves.listSaves()
  input.value = ''
}

function removeSlot(id: string): void {
  saves.deleteSlot(id)
  slotList.value = saves.listSaves()
}

const PHASE_LABELS: Record<string, string> = {
  lobby: 'In lobby',
  spin: 'Awaiting spin',
  decision: 'Deciding the wheel',
  pacts: 'Picking pacts',
  diving: 'Diving',
  rewards: 'Reward draft',
  forfeit: 'Forfeit pick',
  complete: 'Complete',
}

function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? phase
}

function forgetDive(code: string): void {
  recentRooms.forgetRoom(code)
  onlineDives.value = onlineDives.value.filter(dive => dive.code !== code)
}

function formatSavedAt(doc: SaveDoc): string {
  return new Date(doc.savedAt).toLocaleString()
}
</script>

<template>
  <main class="page">
    <section class="panel hero">
      <div class="row chips">
        <span class="chip">1–4 divers</span>
        <span class="chip">live-synced</span>
      </div>
      <h1>Squad up online</h1>
      <p class="muted">
        Griffdive is built for squads: host a crusade, share the link, and run the Wheel of
        Misfortune together — climb from difficulty 3 to 10, carry personal pacts, and let risk
        buy rarer rewards.
      </p>
      <div class="row hero-actions">
        <button
          class="btn primary"
          type="button"
          :disabled="hosting"
          @click="hostOnlineDive"
        >
          {{ hosting ? 'Opening dive…' : 'Host an online dive' }}
        </button>
        <form
          class="row"
          @submit.prevent="joinDive"
        >
          <input
            v-model="joinCode"
            type="text"
            maxlength="6"
            placeholder="CODE"
            class="join-input mono"
            autocapitalize="characters"
            aria-label="Room code"
          >
          <button
            class="btn"
            type="submit"
            :disabled="!isRoomCode(joinCode.trim().toUpperCase())"
          >
            Join
          </button>
        </form>
        <NuxtLink
          class="btn ghost"
          to="/lobby"
        >Browse open dives</NuxtLink>
      </div>
      <ul class="perks">
        <li>
          <strong>Live sync</strong>
          <span>Wheel, pacts and reward drafts mirror to every diver in real time.</span>
        </li>
        <li>
          <strong>Host-proof</strong>
          <span>Host drops mid-dive? Authority migrates — divers reconnect with one tap.</span>
        </li>
        <li>
          <strong>Open lobby</strong>
          <span>Flag your dive public and anyone can join from the lobby in one click.</span>
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2>Solo crusade</h2>
      <p class="muted small">
        Prefer diving alone? Hop in with sensible defaults — Standard variant, every warbond
        owned. Customize below if you like.
      </p>
      <div class="row">
        <label class="field">
          <span class="muted small">Diver name</span>
          <input
            v-model="diverName"
            type="text"
            maxlength="32"
          >
        </label>
        <button
          class="btn primary"
          type="button"
          @click="startCrusade"
        >
          {{ startLabel }}
        </button>
      </div>
      <details class="adv">
        <summary>Customize variant &amp; your warbonds</summary>
        <CrusadeSetup
          v-model:variant="variant"
          :show-start="false"
        />
        <p class="muted small">
          Warbonds are personal — reward offers only include items you own.
        </p>
        <WarbondPicker
          v-model:warbond-codes="myWarbonds"
        />
      </details>
    </section>

    <section class="panel">
      <h2>Continue</h2>
      <div
        v-if="onlineLoading"
        class="muted small"
      >
        Checking for live dives…
      </div>
      <template v-else>
        <div
          v-if="onlineDives.length > 0"
          class="group"
        >
          <h3>Online</h3>
          <ul class="slot-list">
            <li
              v-for="dive in onlineDives"
              :key="dive.code"
              class="slot"
            >
              <div class="row spread">
                <div>
                  <div class="row">
                    <strong class="mono">{{ dive.code }}</strong>
                    <span
                      v-if="dive.state?.settings"
                      class="chip"
                    >{{ VARIANTS_LABELS[dive.state.settings.variant] }}</span>
                  </div>
                  <p
                    v-if="dive.state"
                    class="muted small"
                  >
                    {{ difficultyName(dive.state.difficulty) }} ({{ dive.state.difficulty }})
                    · {{ phaseLabel(dive.state.phase) }}
                    · {{ dive.state.divers.length }} {{ dive.state.divers.length === 1 ? 'diver' : 'divers' }}
                  </p>
                  <p
                    v-else
                    class="muted small"
                  >
                    Unreachable right now — the dive server may be down.
                  </p>
                </div>
                <div class="row">
                  <NuxtLink
                    class="btn primary"
                    :to="`/dive/${dive.code}`"
                  >Rejoin</NuxtLink>
                  <button
                    class="btn ghost tiny"
                    type="button"
                    @click="forgetDive(dive.code)"
                  >
                    Forget
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div
          v-if="slotList.length > 0"
          class="group"
        >
          <h3>Local saves</h3>
          <ul class="slot-list">
            <li
              v-for="{ id, doc } in slotList"
              :key="id"
              class="slot"
            >
              <div class="row spread">
                <div>
                  <strong>{{ doc.slotName }}</strong>
                  <p class="muted small">
                    {{ difficultyName(doc.state.difficulty) }} ({{ doc.state.difficulty }})
                    · {{ phaseLabel(doc.state.phase) }}
                    · {{ formatSavedAt(doc) }}
                  </p>
                </div>
                <div class="row">
                  <NuxtLink
                    class="btn primary"
                    :to="`/dive/${id}`"
                  >Open</NuxtLink>
                  <button
                    class="btn ghost tiny"
                    type="button"
                    @click="saves.exportSave(id)"
                  >
                    Export
                  </button>
                  <button
                    class="btn danger tiny"
                    type="button"
                    @click="removeSlot(id)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <p
          v-if="onlineDives.length === 0 && slotList.length === 0"
          class="muted"
        >
          Nothing here yet. Host or start a crusade above — it shows up here.
        </p>

        <label class="row small muted">
          Import save file
          <input
            type="file"
            accept="application/json"
            @change="onImport"
          >
        </label>
      </template>
    </section>
  </main>
</template>

<style scoped>
.hero {
  border-color: color-mix(in srgb, var(--gold) 32%, var(--border));
  background:
    radial-gradient(640px 240px at 12% -10%, color-mix(in srgb, var(--gold) 9%, transparent), transparent 70%),
    var(--bg-raised);
}

.chips { gap: 0.4rem; }

.hero-actions .btn.primary {
  padding: 0.7rem 1.4rem;
  font-size: 1rem;
}

.join-input { width: 7rem; text-transform: uppercase; letter-spacing: 0.2em; }

.perks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem 1.2rem;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}

.perks li {
  display: grid;
  gap: 0.1rem;
  border-left: 2px solid color-mix(in srgb, var(--gold) 45%, var(--border));
  padding-left: 0.7rem;
}

.perks strong {
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--khaki);
}

.perks span { font-size: 0.8rem; color: var(--muted); }

.field { display: grid; gap: 0.4rem; }

.adv {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
}

.adv summary {
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--khaki);
}

.slot-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
.slot { border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem 0.8rem; }
.group { display: grid; gap: 0.5rem; }
.group h3 { margin: 0; }
</style>
