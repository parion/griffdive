<script setup lang="ts">
import { baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import { createDiveState } from '~~/shared/engine/reducer'
import { isRoomCode } from '~~/shared/utils/room-code'
import type { CrusadeSettings, CrusadeVariant, DiveState } from '~~/shared/engine/types'
import type { DiveSaveInfo } from '~~/shared/types/messages'
import type { SaveDoc } from '~~/shared/types/save'

const saves = useSaves()
const recentRooms = useRecentRooms()
const { ownedWarbonds: myWarbonds, setOwned: setMyWarbonds } = useOwnedWarbonds()

const diverName = ref('Griffin')
const variant = ref<CrusadeVariant>('standard')
const slotList = ref<{ id: string, doc: SaveDoc }[]>([])
const joinCode = ref('')
const hosting = ref(false)

interface OnlineDive { code: string, state: DiveState | null, saved: DiveSaveInfo | null }

const onlineDives = ref<OnlineDive[]>([])
const onlineLoading = ref(true)

onMounted(() => {
  slotList.value = saves.listSaves()
  refreshOnlineDives()
})

async function refreshOnlineDives(): Promise<void> {
  const rooms = recentRooms.listRooms()
  if (rooms.length === 0) {
    onlineLoading.value = false
    return
  }
  const results = await Promise.all(rooms.map(async ({ code }): Promise<OnlineDive | null> => {
    try {
      const res = await $fetch<{ code: string, state: DiveState, saved: DiveSaveInfo | null }>(`/api/rooms/${code}`)
      return { code, state: res.state, saved: res.saved }
    }
    catch (error) {
      const err = error as { status?: number, statusCode?: number }
      // Server pruned or lost the room — drop it from the list.
      if ((err.status ?? err.statusCode) === 404) {
        recentRooms.forgetRoom(code)
        return null
      }
      return { code, state: null, saved: null }
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
  strain: 'Deciding the strain',
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

// The climb is the game's own 3→10 ladder: each rung names its difficulty,
// base reward tier and operation length. The engine owns the numbers.
const ladder = computed(() => Array.from({ length: 8 }, (_, i) => {
  const n = 3 + i
  return {
    n,
    name: difficultyName(n),
    tier: baseTierFor(n),
    pips: missionsPerOperation(n),
    height: 40 + i * 14,
  }
}))

const loopSteps = [
  { n: '01', label: 'Identify', cap: 'Name + warbonds', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5' },
  { n: '02', label: 'Spin', cap: 'Misfortune + front', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 12l5-4M9 6l1 3-3 1' },
  { n: '03', label: 'Pact', cap: 'Private offer', d: 'M6 3h12v14l-6 4-6-4zM9 8h6M9 12h6' },
  { n: '04', label: 'Reward', cap: 'Risk buys the ceiling', d: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10' },
]

const valorSources = [
  { key: 'TEAM', label: 'Misfortune + strain', color: 'var(--red)' },
  { key: 'PACT', label: 'Your chosen restrictions', color: 'var(--orange)' },
  { key: 'PERF', label: 'Time + samples', color: 'var(--teal)' },
]
</script>

<template>
  <main
    id="main-content"
    class="page bridge"
    tabindex="-1"
  >
    <section
      class="hero grid-bg scan"
      aria-label="Griffdive"
    >
      <div class="hero-mark rise">
        <div class="ticks hero-mark-frame">
          <BrandMark
            :size="92"
            title="Griffdive mark"
            class="brand"
          />
        </div>
      </div>
      <div class="hero-copy">
        <span class="lbl rise">Destroyer bridge · crusade companion</span>
        <h1 class="disp hero-word slam">
          Griffdive
        </h1>
        <div
          class="hero-rule impact"
          aria-hidden="true"
        >
          <span class="hazard" />
          <span class="dash" />
          <span class="hero-node" />
        </div>
        <p class="hero-tag rise">
          CLIMB <span class="tag-strong">3 → 10</span>
          <span
            class="tag-dot"
            aria-hidden="true"
          />
          RISK BUYS <span class="tag-gold">RARITY</span>
        </p>
      </div>
    </section>

    <div class="bridge-grid">
      <div class="bridge-main">
        <section
          class="sec"
          aria-labelledby="climb-h"
        >
          <div class="sec-h">
            <h2
              id="climb-h"
              class="lbl"
            >
              <span class="sn">01</span> · The climb
            </h2>
            <span class="dash" />
            <span class="cap">Difficulty buys the floor</span>
          </div>
          <ol
            class="ladder"
            aria-label="Crusade ladder, difficulty 3 to 10"
          >
            <li
              v-for="r in ladder"
              :key="r.n"
              class="rung-item"
              :aria-label="`${r.name}, difficulty ${r.n}, tier ${r.tier}`"
            >
              <span class="rung-name cap">{{ r.name }}</span>
              <div
                class="rung cut-sm"
                :style="{ height: `${r.height}px` }"
              >
                <span class="disp rung-n">{{ r.n }}</span>
                <span
                  class="tb rung-t"
                  :data-tier="r.tier"
                >{{ r.tier }}</span>
                <span
                  class="rung-pips"
                  aria-hidden="true"
                >
                  <i
                    v-for="k in r.pips"
                    :key="k"
                  />
                </span>
              </div>
            </li>
            <li
              class="goal"
              aria-label="Goal: clear an operation at difficulty 10 and the crusade is achieved"
            >
              <span
                class="goal-flag"
                aria-hidden="true"
              />
            </li>
          </ol>
        </section>

        <section
          class="sec"
          aria-labelledby="loop-h"
        >
          <div class="sec-h">
            <h2
              id="loop-h"
              class="lbl"
            >
              <span class="sn">02</span> · Every mission
            </h2>
            <span class="dash" />
            <span class="cap">Clear the operation → +1 difficulty</span>
          </div>
          <ol
            class="loop"
            aria-label="Mission loop"
          >
            <li
              v-for="s in loopSteps"
              :key="s.n"
              class="loop-step"
            >
              <div class="loop-cell cut-sm">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path :d="s.d" />
                </svg>
                <span class="loop-label cap">{{ s.label }}</span>
              </div>
              <span class="loop-cap">{{ s.cap }}</span>
            </li>
          </ol>
        </section>

        <section
          class="sec"
          aria-labelledby="valor-h"
        >
          <div class="sec-h">
            <h2
              id="valor-h"
              class="lbl"
            >
              <span class="sn">03</span> · Valor
            </h2>
            <span class="dash" />
            <span class="cap">Risk buys odds, never guarantees</span>
          </div>
          <div class="valor">
            <ul
              class="valor-srcs"
              aria-label="Valor sources"
            >
              <li
                v-for="v in valorSources"
                :key="v.key"
                class="src"
              >
                <span
                  class="src-chip"
                  :style="{ '--c': v.color }"
                  aria-hidden="true"
                />
                <span
                  class="src-key disp"
                  :style="{ color: v.color }"
                >{{ v.key }}</span>
                <span class="src-name">{{ v.label }}</span>
              </li>
            </ul>
            <div class="valor-meter">
              <div
                class="meter-col"
                role="img"
                aria-label="Valor meter, capped at 11, overflow banks as Luck"
              >
                <i
                  v-for="n in 11"
                  :key="n"
                  :style="{ '--i': n }"
                />
              </div>
              <div class="meter-copy">
                <span class="lbl">Meter caps at 11</span>
                <span class="muted small">
                  Stacked risk rolls the ceiling — C→B→A→S→S+. Past 11, Valor banks as
                  <strong class="luck">Luck</strong> and buys flat odds on the top rungs.
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside
        class="bridge-deploy"
        aria-label="Deploy"
      >
        <section
          class="sec squad-dive"
          aria-label="Squad dive"
        >
          <button
            class="host-btn cut"
            type="button"
            :disabled="hosting"
            aria-label="Host an online dive"
            @click="hostOnlineDive"
          >
            <span class="disp host-label">{{ hosting ? 'Opening dive…' : 'Host a squad dive' }}</span>
            <span
              class="host-chev"
              aria-hidden="true"
            >
              <span class="pod-pips">
                <i class="on" /><i /><i /><i />
              </span>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.6"
              ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </button>

          <div class="row chips">
            <span class="chip">1–4 divers</span>
            <span class="chip"><span
              class="lamp teal"
              aria-hidden="true"
            />Live-synced</span>
            <span class="chip">Invite only</span>
          </div>

          <hr class="dash-rule">

          <form
            class="join"
            @submit.prevent="joinDive"
          >
            <label
              for="room-code"
              class="lbl"
            >Join · room code</label>
            <div class="join-row">
              <input
                id="room-code"
                v-model="joinCode"
                class="nb join-input"
                type="text"
                maxlength="6"
                placeholder="CODE"
                aria-label="Room code"
                autocapitalize="characters"
                spellcheck="false"
              >
              <button
                class="btn primary cut-sm join-btn"
                type="submit"
                :disabled="!isRoomCode(joinCode.trim().toUpperCase())"
              >
                Join
              </button>
            </div>
          </form>
        </section>

        <section
          class="sec solo"
          aria-label="Solo drop"
        >
          <div class="solo-head">
            <span class="cap">Solo drop</span>
            <label
              for="diver-name"
              class="lbl"
            >Diver name</label>
          </div>
          <input
            id="diver-name"
            v-model="diverName"
            class="nb"
            type="text"
            maxlength="32"
            autocomplete="nickname"
            spellcheck="false"
          >
          <button
            class="btn primary block cut-sm solo-btn"
            type="button"
            @click="startCrusade"
          >
            {{ startLabel }}
          </button>
          <details class="adv panel">
            <summary>Variant &amp; warbonds</summary>
            <CrusadeSetup
              v-model:variant="variant"
              :show-start="false"
            />
            <p class="muted small">
              Warbonds are personal — reward offers only include items you own.
            </p>
            <WarbondPicker
              :warbond-codes="myWarbonds"
              @update:warbond-codes="setMyWarbonds"
            />
          </details>
        </section>

        <section
          class="sec record"
          aria-labelledby="rec-h"
        >
          <div class="sec-h">
            <h2
              id="rec-h"
              class="lbl"
            >
              Continue <span class="muted">· {{ onlineDives.length + slotList.length }}</span>
            </h2>
            <span class="dash" />
            <label class="import small muted">
              <input
                type="file"
                accept="application/json"
                class="file-in"
                @change="onImport"
              >
              <span>Import save</span>
            </label>
          </div>

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
              <h3 class="cap">
                Online
              </h3>
              <ul class="slot-list">
                <li
                  v-for="dive in onlineDives"
                  :key="dive.code"
                  class="slot cut-sm"
                >
                  <div class="slot-head">
                    <span class="mono slot-code">{{ dive.code }}</span>
                    <span
                      v-if="dive.state?.settings"
                      class="chip"
                    >{{ VARIANTS_LABELS[dive.state.settings.variant] }}</span>
                    <span
                      v-if="dive.saved"
                      class="chip gold"
                      :title="`Saved as “${dive.saved.name}” — kept past the idle timeout`"
                    >saved</span>
                  </div>
                  <p
                    v-if="dive.state"
                    class="muted small slot-line"
                  >
                    {{ difficultyName(dive.state.difficulty) }} ({{ dive.state.difficulty }})
                    · {{ phaseLabel(dive.state.phase) }}
                    · {{ dive.state.divers.length }} {{ dive.state.divers.length === 1 ? 'diver' : 'divers' }}
                  </p>
                  <p
                    v-else
                    class="muted small slot-line"
                  >
                    Unreachable right now — the dive server may be down.
                  </p>
                  <div class="row slot-actions">
                    <NuxtLink
                      class="btn primary tiny cut-sm"
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
                </li>
              </ul>
            </div>

            <div
              v-if="slotList.length > 0"
              class="group"
            >
              <h3 class="cap">
                Local saves
              </h3>
              <ul class="slot-list">
                <li
                  v-for="{ id, doc } in slotList"
                  :key="id"
                  class="slot cut-sm"
                >
                  <div class="slot-head">
                    <span class="slot-name">{{ doc.slotName }}</span>
                    <span
                      v-if="doc.state.achieved"
                      class="chip gold"
                    >achieved</span>
                  </div>
                  <p class="muted small slot-line">
                    {{ difficultyName(doc.state.difficulty) }} ({{ doc.state.difficulty }})
                    · {{ phaseLabel(doc.state.phase) }}
                    · {{ formatSavedAt(doc) }}
                  </p>
                  <div class="row slot-actions">
                    <NuxtLink
                      class="btn primary tiny cut-sm"
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
                </li>
              </ul>
            </div>

            <div
              v-if="onlineDives.length === 0 && slotList.length === 0"
              class="empty cut-sm"
            >
              <BrandMark
                :size="38"
                class="empty-mark"
              />
              <span class="cap">No crusades on record</span>
              <span class="muted small">Host, join or drop solo</span>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.bridge { max-width: 1320px; gap: 1rem; }

/* Hero ------------------------------------------------------------------ */
.hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 1.6rem;
  padding: 1.5rem 1.6rem;
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--gold);
  background: radial-gradient(640px 260px at 8% -20%, rgba(255, 214, 66, 0.08), transparent 70%), var(--rail);
}

.hero-mark {
  position: relative;
  flex-shrink: 0;
}
.hero-mark-frame {
  display: grid;
  place-items: center;
  width: 10rem;
  height: 10rem;
  background: rgba(19, 21, 15, 0.85);
  border: 1px solid var(--line-2);
}
.brand {
  color: var(--gold);
  filter: drop-shadow(0 0 14px rgba(255, 214, 66, 0.28));
}

.hero-copy { display: grid; gap: 0.55rem; min-width: 0; }
.hero-word {
  margin: 0;
  font-size: clamp(2.6rem, 8vw, 5rem);
  color: var(--text);
}
.hero-rule {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 6px;
}
.hero-rule .hazard { width: 4.5rem; height: 6px; }
.hero-node {
  width: 6px;
  height: 6px;
  border: 1px solid var(--line-5);
}
.hero-tag {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--khaki);
  flex-wrap: wrap;
}
.tag-strong { color: var(--text); }
.tag-gold { color: var(--gold); }
.tag-dot {
  width: 5px;
  height: 5px;
  background: var(--line-5);
}

/* Layout ---------------------------------------------------------------- */
.bridge-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(20rem, 1fr);
  gap: 1rem;
  align-items: start;
}
.bridge-main { display: grid; gap: 1rem; min-width: 0; }
.bridge-deploy { display: grid; gap: 1rem; min-width: 0; }

/* Ladder ---------------------------------------------------------------- */
.ladder {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
  min-height: 12.5rem;
}
.rung-item {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.3rem;
  flex: 1 1 0;
  min-width: 0;
}
.rung-name {
  color: var(--khaki);
  white-space: normal;
  line-height: 1.15;
}
.rung {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.4rem 0.45rem 0.5rem;
  background: var(--rail);
  border: 1px solid var(--line-2);
  border-top: 3px solid currentColor;
  color: var(--khaki);
}
.rung-n { font-size: 1.5rem; color: var(--text); line-height: 1; }
.rung-t { font-size: 0.62rem; min-width: 1.1rem; align-self: flex-start; border: 1px solid currentColor; }
.rung-pips { display: flex; gap: 3px; }
.rung-pips i {
  width: 9px;
  height: 4px;
  border: 1px solid var(--line-4);
}
.goal {
  position: relative;
  flex: 0 0 2.2rem;
}
.goal-flag {
  position: absolute;
  right: 0.4rem;
  bottom: 0;
  width: 1.5rem;
  height: 100%;
  border-left: 3px solid var(--gold);
}
.goal-flag::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 1.5rem;
  height: 1.6rem;
  background: var(--gold);
  clip-path: polygon(0 0, 100% 0, 72% 50%, 100% 100%, 0 100%);
}

/* Loop ------------------------------------------------------------------ */
.loop {
  display: flex;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.loop-step {
  display: grid;
  gap: 0.35rem;
  flex: 1 1 0;
  min-width: 0;
}
.loop-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 3.6rem;
  background: var(--raised);
  border: 1px solid var(--line-2);
  color: var(--text);
}
.loop-label { color: var(--text); }
.loop-cap {
  text-align: center;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

/* Valor ----------------------------------------------------------------- */
.valor {
  display: grid;
  grid-template-columns: minmax(12rem, 15rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
}
.valor-srcs {
  display: grid;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.src { display: flex; align-items: center; gap: 0.5rem; }
.src-chip { width: 9px; height: 9px; background: var(--c); flex-shrink: 0; }
.src-key { font-size: 0.72rem; min-width: 2.6rem; }
.src-name { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--khaki); }

.valor-meter { display: flex; align-items: center; gap: 0.9rem; }
.meter-col {
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  padding: 2px;
  width: 1.6rem;
  height: 6rem;
  border: 1px solid var(--line-2);
  flex-shrink: 0;
}
.meter-col i {
  flex-grow: 1;
  background: var(--gold);
  opacity: calc(0.18 + var(--i) * 0.06);
}
.meter-copy { display: grid; gap: 0.25rem; }
.luck { color: var(--gold); }

/* Deploy ---------------------------------------------------------------- */
.host-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  width: 100%;
  padding: 0.9rem 1.1rem;
  background: var(--gold);
  border: 0;
  color: var(--on-gold);
  cursor: pointer;
  filter: drop-shadow(0 0 16px rgba(255, 214, 66, 0.16));
}
.host-btn:hover:not(:disabled) { filter: brightness(1.08) drop-shadow(0 0 16px rgba(255, 214, 66, 0.16)); }
.host-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.host-label { font-size: 1.15rem; }
.host-chev { display: flex; align-items: center; gap: 0.7rem; }
.pod-pips { display: flex; gap: 3px; }
.pod-pips i { width: 9px; height: 9px; border: 2px solid var(--on-gold); }
.pod-pips i.on { background: var(--on-gold); }

.dash-rule {
  height: 1px;
  border: 0;
  margin: 0;
  background: repeating-linear-gradient(90deg, var(--line-4) 0 6px, transparent 6px 10px);
}

.join { display: grid; gap: 0.45rem; }
.join-row { display: flex; gap: 0.5rem; }
.join-input { flex-grow: 1; letter-spacing: 0.28em; }
.join-btn { flex-shrink: 0; width: 5.5rem; }

.solo { gap: 0.6rem; }
.solo-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.solo-btn { margin-top: 0.15rem; }

.adv {
  border: 1px solid var(--line-2);
  padding: 0.6rem 0.75rem;
  gap: 0.7rem;
}
.adv summary { color: var(--khaki); }

/* Continue / record ----------------------------------------------------- */
.record { gap: 0.9rem; }
.import {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--khaki);
}
.import:hover { color: var(--gold); }
.file-in {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  clip-path: inset(50%);
}
.file-in:focus-visible + * { outline: 2px solid var(--gold); }

.group { display: grid; gap: 0.5rem; }
.slot-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.55rem; }
.slot {
  display: grid;
  gap: 0.35rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line-2);
  background: var(--rail);
}
.slot-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.slot-code { color: var(--gold); font-weight: 700; letter-spacing: 0.18em; }
.slot-name { font-weight: 700; }
.slot-line { margin: 0; }
.slot-actions { gap: 0.4rem; }

.empty {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 1.4rem;
  border: 1px dashed var(--line-3);
  text-align: center;
}
.empty-mark { color: var(--ghost-ink); }

@media (max-width: 960px) {
  .bridge-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 620px) {
  .hero { flex-direction: column; align-items: flex-start; }
  .hero-mark-frame { width: 6.5rem; height: 6.5rem; }
  .valor { grid-template-columns: minmax(0, 1fr); }
  /* Let the ladder scroll instead of squashing its columns into each other. */
  .ladder { overflow-x: auto; padding-bottom: 4px; }
  .rung-item { flex: 0 0 4.6rem; }
  .rung-name { overflow-wrap: anywhere; }
}
</style>
