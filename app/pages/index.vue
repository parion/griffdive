<script setup lang="ts">
import {
  MAJOR_ORDER_REROLL_BONUS,
  VALOR_METER_MAX,
  baseTierFor,
  missionsPerOperation,
} from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { createDiveState } from '~~/shared/engine/reducer'
import { oddsToReach } from '~~/shared/engine/rewards'
import { factionImageUrl } from '~~/shared/data/images'
import { isRoomCode } from '~~/shared/utils/room-code'
import type { CrusadeSettings, CrusadeVariant, DiveState, RewardTier } from '~~/shared/engine/types'
import type { DiveSaveInfo } from '~~/shared/types/messages'
import type { SaveDoc } from '~~/shared/types/save'

const saves = useSaves()
const recentRooms = useRecentRooms()
const { ownedWarbonds: myWarbonds, setOwned: setMyWarbonds } = useOwnedWarbonds()

const diverName = ref('Griffin')
const variant = ref<CrusadeVariant>('standard')
const slotList = ref<{ id: string, doc: SaveDoc }[]>([])
const joinCode = ref('')
const codeFocused = ref(false)
const variantOpen = ref(false)
const hosting = ref(false)

// The live Major Order band at the foot of the Bridge: pass-through metadata
// from the war proxy (never the engine).
const { order: liveOrder, status: moStatus } = useMajorOrder()

interface OnlineDive { code: string, state: DiveState | null, saved: DiveSaveInfo | null }

const onlineDives = ref<OnlineDive[]>([])
const onlineLoading = ref(true)

let moTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  slotList.value = saves.listSaves()
  refreshOnlineDives()
  moTimer = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})
onBeforeUnmount(() => clearInterval(moTimer))

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
  const code = cleanCode(joinCode.value)
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

function forgetDive(code: string): void {
  recentRooms.forgetRoom(code)
  onlineDives.value = onlineDives.value.filter(dive => dive.code !== code)
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
    height: 56 + i * 12,
  }
}))

// The six beats of a mission, mirroring the dive's PhaseRail. Each cell lights
// in sequence (the `.lit` loop overlay) to read as a cycle.
const loopSteps = [
  { label: 'Spin', cap: 'Draw a directive', d: 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M12 3v18M3 12h18', ic: 'var(--gold)' },
  { label: 'Decide', cap: 'Accept or opt out', d: 'M12 21v-8M12 13L6 7M12 13l6-6M4 3h5v5M20 3h-5v5', ic: 'var(--gold)' },
  { label: 'Pacts', cap: 'Swear personal risk', d: 'M6 3h12v14l-6 4-6-4zM9 8h6M9 12h6', ic: 'var(--red)' },
  { label: 'Dive', cap: 'Play the mission', d: 'M12 3v12M7 10l5 5 5-5M5 21h14', ic: 'var(--khaki)' },
  { label: 'Report', cap: 'Stars + samples', d: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z', ic: 'var(--teal)' },
  { label: 'Rewards', cap: 'Draft your loot', d: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10', ic: 'var(--gold)' },
]

// The Bridge Valor panel is an illustration: a representative strong build at a
// mid difficulty so the odds ladder is legible before any crusade exists. The
// example stakes are fixed display copy; the odds come from the engine.
const PREVIEW_DIFFICULTY = 7
const PREVIEW_SOURCES = [
  { key: 'TEAM', name: 'Directive', value: 2, color: 'var(--gold)' },
  { key: 'TEAM', name: 'Strain', value: 2, color: 'var(--orange)' },
  { key: 'PACT', name: 'Pacts', value: 4, color: 'var(--red)' },
  { key: 'PERF', name: 'Performance', value: 0.16, color: 'var(--teal)' },
]
const PREVIEW_VALOR = PREVIEW_SOURCES.reduce((sum, src) => sum + src.value, 0)
const TIER_LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

const previewBase = computed(() => baseTierFor(PREVIEW_DIFFICULTY))
// Odds top-down (S+ → floor); the base tier is the difficulty's hard floor and
// everything below it is unreachable.
const oddsRungs = computed(() => {
  const baseIndex = TIER_LADDER.indexOf(previewBase.value)
  return [...TIER_LADDER].reverse().map((tier) => {
    const index = TIER_LADDER.indexOf(tier)
    const odds = index < baseIndex
      ? 0
      : index === baseIndex
        ? 1
        : oddsToReach(PREVIEW_DIFFICULTY, PREVIEW_VALOR, tier)
    return {
      tier,
      pct: Math.round(odds * 1000) / 10,
      tag: index === baseIndex ? 'BASE' : index < baseIndex ? 'FLOOR' : null,
    }
  })
})

// The 11-cell meter, each cell coloured by the source that filled it; a
// fractional stake shows as a sliver. Rendered bottom-up (column-reverse).
const meterCells = computed(() => {
  const cells: { color: string, filled: boolean, sliver: number }[] = []
  for (const src of PREVIEW_SOURCES) {
    const whole = Math.floor(src.value)
    for (let i = 0; i < whole; i++) {
      cells.push({ color: src.color, filled: true, sliver: 0 })
    }
    const frac = src.value - whole
    if (frac > 0.001) {
      cells.push({ color: src.color, filled: false, sliver: frac })
    }
  }
  while (cells.length < VALOR_METER_MAX) {
    cells.push({ color: 'var(--ground)', filled: false, sliver: 0 })
  }
  return cells.slice(0, VALOR_METER_MAX)
})
const previewValorLabel = computed(() => PREVIEW_VALOR.toFixed(2))

// Major Order band: pass-through war metadata. `now` ticks so the countdown
// stays honest while the page sits open.
const now = ref(Date.now())
const moFront = computed(() => liveOrder.value?.fronts[0] ?? null)
const moFrontImage = computed(() => (moFront.value ? factionImageUrl(moFront.value) : undefined))
const moPlanet = computed(() => liveOrder.value?.planets?.[0] ?? null)
const moCountdown = computed(() => {
  const expires = liveOrder.value?.expiresAt ? Date.parse(liveOrder.value.expiresAt) : Number.NaN
  if (!Number.isFinite(expires)) {
    return ''
  }
  const ms = expires - now.value
  if (ms <= 0) {
    return 'ending'
  }
  const totalHours = Math.floor(ms / 3_600_000)
  return `${Math.floor(totalHours / 24)}D ${String(totalHours % 24).padStart(2, '0')}H`
})

// The join control: six code cells with a live caret and n/6 counter.
function cleanCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}
const codeCells = computed(() => {
  const code = cleanCode(joinCode.value)
  return Array.from({ length: 6 }, (_, i) => {
    const ch = code[i] ?? ''
    return {
      ch,
      active: i === Math.min(code.length, 5) && code.length < 6,
      filled: Boolean(ch),
    }
  })
})
const codeLen = computed(() => cleanCode(joinCode.value).length)

// Service record cards: live rooms and local saves share one shape.
function opNumber(state: DiveState): number {
  return catchUpOpsBehind(state.difficulty, state.settings?.variant ?? 'standard') + 1
}
function missionLabel(state: DiveState): string {
  return `M${state.missionInOperation}/${missionsPerOperation(state.difficulty)}`
}
function ladderCells(difficulty: number): ('cleared' | 'current' | 'locked')[] {
  return Array.from({ length: 8 }, (_, i) => {
    const n = 3 + i
    if (n < difficulty) return 'cleared'
    return n === difficulty ? 'current' : 'locked'
  })
}
const variantLabel = computed(() => VARIANTS_LABELS[variant.value])
</script>

<template>
  <main
    id="main-content"
    class="page bridge"
    tabindex="-1"
  >
    <div class="bridge-grid">
      <div class="bridge-main">
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
              v-for="(s, i) in loopSteps"
              :key="s.label"
              class="loop-step"
            >
              <div
                class="loop-cell"
                :class="i === 0 ? 'chev-first' : 'chev'"
              >
                <span class="loop-face">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    :stroke="s.ic"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path :d="s.d" />
                  </svg>
                  <span class="loop-label cap">{{ s.label }}</span>
                </span>
                <span
                  class="loop-lit"
                  aria-hidden="true"
                  :style="{ animationDelay: `${2.4 + i * 1.1}s` }"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path :d="s.d" />
                  </svg>
                  <span class="loop-label cap">{{ s.label }}</span>
                </span>
              </div>
              <span class="loop-cap">{{ s.cap }}</span>
            </li>
            <li
              class="loop-step loop-next"
              aria-label="Then the next mission"
            >
              <div class="loop-cell loop-next-cell cut-sm">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4" />
                </svg>
              </div>
              <span class="loop-cap">NEXT</span>
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
                v-for="(v, i) in PREVIEW_SOURCES"
                :key="v.name"
                class="src rise"
                :style="{ animationDelay: `${1.16 + i * 0.07}s` }"
              >
                <span
                  class="src-chip"
                  :style="{ '--c': v.color }"
                  aria-hidden="true"
                />
                <span
                  class="src-val disp"
                  :style="{ color: v.color }"
                >+{{ v.value }}</span>
                <span class="src-name">{{ v.name }}</span>
              </li>
            </ul>
            <span
              class="valor-arrow"
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--line-5)"
                stroke-width="2"
              ><path d="M4 12h15M13 6l6 6-6 6" /></svg>
            </span>
            <div
              class="meter-col"
              role="progressbar"
              aria-label="Valor"
              :aria-valuemin="0"
              :aria-valuemax="VALOR_METER_MAX"
              :aria-valuenow="PREVIEW_VALOR"
              :aria-valuetext="`${previewValorLabel} of ${VALOR_METER_MAX}`"
            >
              <span
                v-for="(c, i) in meterCells"
                :key="i"
                class="meter-cell"
                :style="{ background: c.filled ? c.color : 'var(--ground)', animationDelay: `${1.3 + i * 0.05}s` }"
              >
                <span
                  v-if="c.sliver > 0"
                  class="meter-sliver"
                  :style="{ height: `${c.sliver * 100}%`, background: c.color }"
                />
              </span>
            </div>
            <span
              class="valor-arrow"
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--line-5)"
                stroke-width="2"
              ><path d="M4 12h15M13 6l6 6-6 6" /></svg>
            </span>
            <div class="valor-num rise">
              <span class="lbl gold">Valor</span>
              <span class="disp valor-big">{{ previewValorLabel }}</span>
              <span class="valor-diff">AT DIFFICULTY {{ PREVIEW_DIFFICULTY }}</span>
            </div>
            <div
              class="odds"
              role="img"
              :aria-label="`Ceiling odds at difficulty ${PREVIEW_DIFFICULTY} with Valor ${previewValorLabel}`"
            >
              <div
                v-for="(r, i) in oddsRungs"
                :key="r.tier"
                class="odds-row"
                :class="{ floor: r.tag === 'FLOOR' }"
              >
                <span
                  class="odds-tier disp"
                  :data-tier="r.tier"
                >{{ r.tier }}</span>
                <div class="odds-track">
                  <span
                    class="odds-fill"
                    :style="{ width: `${r.pct}%`, animationDelay: `${1.5 + i * 0.09}s` }"
                  />
                </div>
                <span class="odds-pct">{{ r.tag ?? `${r.pct}%` }}</span>
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
            <div class="join-head">
              <label
                for="room-code"
                class="lbl"
              >Join · room code</label>
              <span
                class="join-count"
                :class="{ full: codeLen === 6 }"
                aria-hidden="true"
              >{{ codeLen }}/6</span>
            </div>
            <div class="join-row">
              <div class="code-wrap">
                <div
                  class="code-cells"
                  :class="{ focus: codeFocused }"
                  aria-hidden="true"
                >
                  <span
                    v-for="(c, i) in codeCells"
                    :key="i"
                    class="code-cell"
                    :class="{ filled: c.filled, active: c.active, focus: codeFocused }"
                  >
                    <span class="disp code-ch">{{ c.ch }}</span>
                    <span
                      v-if="c.active"
                      class="code-caret"
                      :class="{ blink: codeFocused }"
                    />
                  </span>
                </div>
                <input
                  id="room-code"
                  class="code-in"
                  type="text"
                  :value="joinCode"
                  maxlength="6"
                  autocomplete="off"
                  spellcheck="false"
                  autocapitalize="characters"
                  aria-label="Room code"
                  aria-describedby="room-code-hint"
                  @input="joinCode = cleanCode(($event.target as HTMLInputElement).value)"
                  @focus="codeFocused = true"
                  @blur="codeFocused = false"
                >
              </div>
              <button
                class="btn primary cut-sm join-btn"
                type="submit"
                :disabled="codeLen < 6"
              >
                <span class="disp">Join</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.6"
                  aria-hidden="true"
                ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <span
              id="room-code-hint"
              class="sr-only"
            >Six letters or digits from the host's invite</span>
          </form>
        </section>

        <section
          class="sec solo"
          aria-label="Solo drop"
        >
          <label
            for="diver-name"
            class="lbl"
          >Solo drop · diver name</label>
          <div class="solo-row">
            <input
              id="diver-name"
              v-model="diverName"
              class="nb solo-name"
              type="text"
              maxlength="32"
              autocomplete="nickname"
              spellcheck="false"
            >
            <button
              class="btn ghost solo-drop"
              type="button"
              @click="startCrusade"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              ><path d="M12 3v11M7 10l5 5 5-5M6 21h12" /></svg>
              <span>SOLO DROP</span>
            </button>
          </div>
          <button
            class="btn ghost variant-btn"
            type="button"
            aria-haspopup="dialog"
            :aria-label="`Variant and warbonds: ${variantLabel}, ${myWarbonds.length} warbonds`"
            @click="variantOpen = true"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--khaki)"
              stroke-width="1.8"
              aria-hidden="true"
            ><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><rect
              x="14"
              y="4"
              width="4"
              height="4"
            /><rect
              x="8"
              y="10"
              width="4"
              height="4"
            /><rect
              x="16"
              y="16"
              width="4"
              height="4"
            /></svg>
            <span>VARIANT &amp; WARBONDS</span>
            <span class="variant-meta">{{ variantLabel }} · {{ myWarbonds.length }}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--muted)"
              stroke-width="2.2"
              aria-hidden="true"
            ><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </section>

        <section
          class="sec record"
          aria-labelledby="rec-h"
        >
          <div class="record-head">
            <h2
              id="rec-h"
              class="lbl"
            >
              Service record <span class="muted">· {{ onlineDives.length + slotList.length }}</span>
            </h2>
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
            <ul
              v-if="onlineDives.length > 0"
              class="slot-list"
            >
              <li
                v-for="dive in onlineDives"
                :key="dive.code"
                class="record-card"
              >
                <template v-if="dive.state">
                  <div class="rc-head">
                    <span class="rc-name">{{ dive.state.divers[0]?.name ?? 'Crusade' }} · {{ VARIANTS_LABELS[dive.state.settings?.variant ?? 'standard'] }}</span>
                    <span class="rc-live"><span
                      class="pulse rc-dot"
                      aria-hidden="true"
                    />LIVE ROOM {{ dive.code }}</span>
                    <span
                      v-if="dive.saved"
                      class="chip gold"
                      :title="`Saved as “${dive.saved.name}” — kept past the idle timeout`"
                    >saved</span>
                    <div
                      class="rc-squad"
                      role="img"
                      :aria-label="`Squad: ${dive.state.divers.map(d => d.name).join(', ')}`"
                    >
                      <span
                        v-for="d in dive.state.divers"
                        :key="d.id"
                        class="rc-avatar disp"
                        :class="{ host: d.id === dive.state.hostId }"
                      >{{ d.name.slice(0, 1).toUpperCase() }}</span>
                    </div>
                  </div>
                  <div class="rc-body">
                    <span class="disp rc-diff">{{ dive.state.difficulty }}</span>
                    <div class="rc-meta">
                      <span class="rc-diffname">{{ difficultyName(dive.state.difficulty) }}</span>
                      <div class="rc-op">
                        <span>OP {{ opNumber(dive.state) }}</span>
                        <span
                          class="rc-pips"
                          aria-hidden="true"
                        ><i
                          v-for="i in missionsPerOperation(dive.state.difficulty)"
                          :key="i"
                          :class="{ on: i <= dive.state.missionInOperation }"
                        /></span>
                        <span>{{ missionLabel(dive.state) }}</span>
                      </div>
                    </div>
                    <NuxtLink
                      class="btn ghost rc-resume"
                      :to="`/dive/${dive.code}`"
                    >
                      <span>RESUME</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.4"
                        aria-hidden="true"
                      ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </NuxtLink>
                  </div>
                  <div
                    class="rc-ladder"
                    role="img"
                    :aria-label="`Ladder: on difficulty ${dive.state.difficulty} of 10`"
                  >
                    <span class="rc-lad-end">3</span>
                    <div class="rc-lad">
                      <i
                        v-for="(c, i) in ladderCells(dive.state.difficulty)"
                        :key="i"
                        :class="c"
                      />
                    </div>
                    <span class="rc-lad-end">10</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--muted)"
                      stroke-width="2"
                      aria-hidden="true"
                    ><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
                  </div>
                </template>
                <div
                  v-else
                  class="rc-unreachable"
                >
                  <span class="mono slot-code">{{ dive.code }}</span>
                  <span class="muted small">Unreachable right now — the dive server may be down.</span>
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

            <ul
              v-if="slotList.length > 0"
              class="slot-list"
            >
              <li
                v-for="{ id, doc } in slotList"
                :key="id"
                class="record-card local"
              >
                <div class="rc-local-body">
                  <div class="rc-local-head">
                    <span class="rc-name">{{ doc.slotName }}</span>
                    <span
                      v-if="doc.state.achieved"
                      class="chip gold"
                    >ACHIEVED</span>
                    <span class="rc-local-tag">LOCAL SAVE</span>
                  </div>
                  <div
                    class="rc-ladder"
                    role="img"
                    :aria-label="`Ladder: on difficulty ${doc.state.difficulty} of 10`"
                  >
                    <div class="rc-lad">
                      <i
                        v-for="(c, i) in ladderCells(doc.state.difficulty)"
                        :key="i"
                        :class="c"
                      />
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="var(--gold)"
                      stroke="var(--gold)"
                      stroke-width="2"
                      aria-hidden="true"
                    ><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
                  </div>
                </div>
                <NuxtLink
                  class="btn ghost rc-open"
                  :to="`/dive/${id}`"
                >OPEN</NuxtLink>
                <button
                  class="icon-btn rc-icon"
                  type="button"
                  :aria-label="`Export ${doc.slotName}`"
                  @click="saves.exportSave(id)"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    aria-hidden="true"
                  ><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
                </button>
                <button
                  class="icon-btn rc-icon danger"
                  type="button"
                  :aria-label="`Delete ${doc.slotName}`"
                  @click="removeSlot(id)"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    aria-hidden="true"
                  ><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </li>
            </ul>

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

    <section
      v-if="liveOrder"
      class="mo-band mo-in"
      aria-label="Major Order"
    >
      <div class="mo-radar">
        <span
          class="hazard mo-radar-bar"
          aria-hidden="true"
        />
        <svg
          class="pulse"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gold)"
          stroke-width="1.8"
          aria-hidden="true"
        ><path d="M5 12a7 7 0 0 1 14 0M8.5 12a3.5 3.5 0 0 1 7 0" /><circle
          cx="12"
          cy="12"
          r="1"
        /><path d="M12 13v8" /></svg>
      </div>
      <div class="mo-title">
        <span class="lbl gold">Major Order</span>
        <span class="mo-name">{{ liveOrder.title ?? 'Play the live war front' }}</span>
      </div>
      <div
        v-if="moPlanet"
        class="mo-planet"
      >
        <img
          v-if="moFrontImage"
          :src="moFrontImage"
          alt=""
          width="32"
          height="32"
        >
        <div class="mo-planet-body">
          <div class="mo-planet-head">
            <span>{{ moPlanet.name }}</span>
            <span class="mo-pct">{{ moPlanet.liberation }}%</span>
          </div>
          <div
            class="mo-track"
            role="progressbar"
            :aria-label="`${moPlanet.name} liberation`"
            :aria-valuenow="moPlanet.liberation"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span
              class="mo-fill"
              :style="{ width: `${moPlanet.liberation}%` }"
            />
          </div>
        </div>
      </div>
      <div
        v-if="moCountdown"
        class="mo-count"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--khaki)"
          stroke-width="1.8"
          aria-hidden="true"
        ><circle
          cx="12"
          cy="13"
          r="8"
        /><path d="M12 9v4l3 2M9 2h6" /></svg>
        <span class="disp mo-count-n">{{ moCountdown }}</span>
        <span class="sr-only">remaining</span>
      </div>
      <div class="mo-play">
        <span class="lbl">Play it:</span>
        <span class="mo-carrot">
          <span
            class="hex"
            aria-hidden="true"
          />+{{ MAJOR_ORDER_REROLL_BONUS }} REROLL
        </span>
      </div>
    </section>
    <section
      v-else
      class="mo-band mo-empty"
      aria-label="Major Order"
    >
      <span class="lbl gold">Major Order</span>
      <span class="muted small">
        {{ moStatus === 'none' ? 'No active Major Order — the wheel picks the front' : moStatus === 'no-front' ? 'Major Order has no front — the wheel picks the front' : 'War feed unavailable — the wheel picks the front' }}
      </span>
    </section>

    <footer class="bridge-foot">
      <span>FAN PROJECT · NOT AFFILIATED WITH ARROWHEAD GAME STUDIOS OR SONY</span>
      <span
        class="foot-marks"
        aria-hidden="true"
      ><i /><i /><i /></span>
    </footer>

    <AppDialog
      v-model:open="variantOpen"
      title="Variant & warbonds"
      description="Your starting kit and the warbonds you own. Rewards roll from your warbonds only."
    >
      <CrusadeSetup
        v-model:variant="variant"
        :show-start="false"
      />
      <WarbondPicker
        :warbond-codes="myWarbonds"
        @update:warbond-codes="setMyWarbonds"
      />
    </AppDialog>
  </main>
</template>

<style scoped>
/* The Bridge is one desktop view: hero, climb, loop and deploy all share the
   viewport. Columns scroll internally rather than the page. */
.bridge {
  max-width: 1500px;
  width: 100%;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
  padding: var(--gap-panel) var(--pad-page);
  overflow: hidden;
}

/* Hero ------------------------------------------------------------------ */
.hero {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  min-height: 148px;
  display: flex;
  align-items: center;
  gap: clamp(1rem, 2vw, 1.6rem);
  padding: var(--pad-panel) var(--pad-page);
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
  width: 8.5rem;
  height: 8.5rem;
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
  flex-grow: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 1fr);
  gap: var(--gap-panel);
  align-items: stretch;
}
.bridge-main,
.bridge-deploy {
  display: grid;
  grid-auto-rows: max-content;
  gap: var(--gap-panel);
  min-width: 0;
  min-height: 0;
  align-content: start;
  overflow-y: auto;
  padding-right: 2px;
}

/* Ladder ---------------------------------------------------------------- */
.ladder {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
  min-height: 10.75rem;
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
.loop-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: inherit;
}
.loop-cap {
  text-align: center;
  font-size: 10px;
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
.host-label { font-size: 1.375rem; }
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

/* Below the fixed desktop shell the Bridge flows and the page scrolls again. */
@media (max-width: 1020px) {
  .bridge { height: auto; overflow: visible; }
  .bridge-grid { grid-template-columns: minmax(0, 1fr); }
  .bridge-main,
  .bridge-deploy { overflow: visible; }
}
@media (max-width: 620px) {
  /* The phone Bridge is lean (spec 13): hero → deploy → record → MO, with the
     education panels (climb / loop / valor) dropped. */
  .bridge-grid { display: flex; flex-direction: column; }
  .bridge-main { order: 1; }
  .bridge-deploy { order: 2; }
  .bridge-main .sec { display: none; }
  .hero { flex-direction: column; align-items: flex-start; }
  .hero-word { font-size: 44px; }
  .hero-tag { font-size: 12px; }
  .host-label { font-size: 17px; }
  .hero-mark-frame { width: 6.5rem; height: 6.5rem; }
  .valor { grid-template-columns: minmax(0, 1fr); }
  /* Let the ladder scroll instead of squashing its columns into each other. */
  .ladder { overflow-x: auto; padding-bottom: 4px; }
  .rung-item { flex: 0 0 4.6rem; }
  .rung-name { overflow-wrap: anywhere; }
}

/* Loop — chevron cells + the cycling lit overlay + NEXT -------------------- */
.loop { gap: 2px; }
.loop-cell {
  position: relative;
  overflow: hidden;
  height: 3.6rem;
  border: 0;
  background: var(--raised);
}
.loop-face,
.loop-lit {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.7rem;
}
.loop-face { color: var(--text); }
.loop-lit {
  background: var(--gold);
  color: var(--on-gold);
  opacity: 0;
  animation: loopLit 6.6s linear infinite both;
}
.loop-next { flex: 0 0 3.25rem; }
.loop-next .loop-cap { font-size: 10px; text-transform: none; }
.loop-next-cell {
  display: grid;
  place-items: center;
  height: 3.6rem;
  border: 1px dashed var(--line-4);
  background: transparent;
  color: var(--khaki);
}

/* Valor — sources, meter, big number, odds ladder ------------------------- */
.valor { display: flex; align-items: center; gap: 1rem; }
.src-val { font-size: 0.72rem; min-width: 2.4rem; }
.valor-arrow { display: inline-flex; flex-shrink: 0; }
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
.meter-cell {
  position: relative;
  flex-grow: 1;
  animation: cellOn 0.22s ease-out both;
}
.meter-sliver { position: absolute; left: 0; right: 0; bottom: 0; }
.valor-num { display: flex; flex-direction: column; gap: 0.3rem; flex-shrink: 0; width: 7.5rem; }
.valor-big { font-size: 2.3rem; color: var(--gold); line-height: 1; }
.valor-diff { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted); white-space: nowrap; }
.odds { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.odds-row { display: flex; align-items: center; gap: 0.6rem; height: 1rem; }
.odds-row.floor { opacity: 0.45; }
.odds-tier {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 1rem;
  flex-shrink: 0;
  font-size: 10px;
  border: 1px solid currentColor;
}
.odds-tier[data-tier='C'] { color: var(--tier-c); }
.odds-tier[data-tier='B'] { color: var(--tier-b); }
.odds-tier[data-tier='A'] { color: var(--tier-a); }
.odds-tier[data-tier='S'] { color: var(--tier-s); }
.odds-tier[data-tier='S+'] { color: var(--tier-splus); }
.odds-track { flex-grow: 1; height: 5px; background: var(--raised); }
.odds-fill {
  display: block;
  height: 5px;
  background: currentColor;
  animation: growX 0.7s var(--ease-out) both;
  transform-origin: left center;
}
.odds-row[data-tier] .odds-fill { color: inherit; }
.odds-row:nth-child(1) .odds-fill { background: var(--tier-splus); }
.odds-row:nth-child(2) .odds-fill { background: var(--tier-s); }
.odds-row:nth-child(3) .odds-fill { background: var(--tier-a); }
.odds-row:nth-child(4) .odds-fill { background: var(--tier-b); }
.odds-row:nth-child(5) .odds-fill { background: var(--tier-c); }
.odds-pct { width: 3.2rem; flex-shrink: 0; text-align: right; font-size: 0.75rem; font-weight: 700; color: var(--text); }

/* Join — six code cells with a live caret --------------------------------- */
.join-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.join-count { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted); }
.join-count.full { color: var(--gold); }
.code-wrap { position: relative; flex-grow: 1; min-width: 0; height: 3.5rem; }
.code-cells { position: absolute; inset: 0; display: flex; gap: 4px; }
.code-cells .code-cell:nth-child(3) { margin-right: 0.7rem; }
.code-cell {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: grid;
  place-items: center;
  background: var(--ground);
  border: 1px solid var(--line-2);
  border-bottom: 2px solid var(--line-3);
}
.code-cell.filled { background: var(--raised); border-color: var(--line-5); }
.code-cell.active.focus { border-color: var(--gold); border-bottom-color: var(--gold); }
.code-cell.filled.active { border-bottom-color: var(--gold); }
.code-ch { font-size: 1.5rem; color: var(--text); }
.code-caret {
  position: absolute;
  left: 50%;
  bottom: 0.6rem;
  width: 1rem;
  height: 2px;
  margin-left: -0.5rem;
  background: var(--line-5);
}
.code-caret.blink { background: var(--gold); animation: caretBlink 1s steps(1) infinite; }
@keyframes caretBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.code-in {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  font-size: 1rem;
  text-transform: uppercase;
  cursor: text;
}
.code-in:focus { outline: none; }
.code-in::selection { background: transparent; }
.join-btn { flex-shrink: 0; width: 6.5rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
.join-btn .disp { font-size: 15px; }

/* Solo — split drop from variant & warbonds -------------------------------- */
.solo-row { display: flex; gap: 0.5rem; }
.solo-name { flex-grow: 1; min-width: 0; }
.solo-drop {
  flex-shrink: 0;
  width: 10.25rem;
  height: 3.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  border-color: var(--gold);
  color: var(--gold);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}
.variant-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  height: 2.75rem;
  padding: 0 0.75rem;
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  white-space: nowrap;
}
.variant-meta { margin-left: auto; color: var(--muted); }

/* Service record --------------------------------------------------------- */
.record-head { display: flex; align-items: center; gap: 0.75rem; height: 2.75rem; }
.record-head .import { margin-left: auto; }
.record-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: var(--panel);
  border: 1px solid var(--line-4);
}
.record-card.local {
  flex-direction: row;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.7rem 0.7rem 1rem;
  background: var(--rail);
  border-color: var(--line-2);
}
.rc-head { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.rc-name { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }
.rc-live {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 1.4rem;
  padding: 0 0.5rem;
  border: 1px solid color-mix(in srgb, var(--teal) 50%, transparent);
  background: color-mix(in srgb, var(--teal) 8%, transparent);
  color: var(--teal);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.rc-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); }
.rc-squad { margin-left: auto; display: flex; gap: 3px; }
.rc-avatar {
  width: 1.5rem;
  height: 1.5rem;
  display: grid;
  place-items: center;
  font-size: 11px;
  background: var(--line-2);
  color: var(--text);
}
.rc-avatar.host { background: var(--gold); color: var(--on-gold); }
.rc-body { display: flex; align-items: center; gap: 0.9rem; }
.rc-diff { font-size: 2.75rem; color: var(--gold); line-height: 1; }
.rc-meta { display: flex; flex-direction: column; gap: 0.35rem; flex-grow: 1; min-width: 0; }
.rc-diffname { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.12em; color: var(--gold); }
.rc-op { display: flex; align-items: center; gap: 0.5rem; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--khaki); }
.rc-pips { display: flex; gap: 3px; }
.rc-pips i { width: 1rem; height: 6px; border: 1px solid var(--line-5); }
.rc-pips i.on { background: var(--gold); border-color: var(--gold); }
.rc-resume {
  flex-shrink: 0;
  height: 2.75rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-color: var(--gold);
  color: var(--gold);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.rc-ladder { display: flex; align-items: center; gap: 0.5rem; }
.rc-lad-end { font-size: 10px; font-weight: 700; color: var(--muted); }
.rc-lad { flex-grow: 1; display: flex; gap: 3px; }
.rc-lad i { flex: 1 1 0; height: 4px; background: var(--line-3); }
.rc-lad i.cleared { background: var(--khaki); }
.rc-lad i.current { height: 8px; background: var(--gold); }
.rc-lad i.locked { background: var(--line-2); }
.rc-unreachable { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.rc-local-body { display: flex; flex-direction: column; gap: 0.6rem; flex-grow: 1; min-width: 0; }
.rc-local-head { display: flex; align-items: center; gap: 0.5rem; }
.rc-local-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted); }
.rc-open {
  flex-shrink: 0;
  height: 2.75rem;
  padding: 0 0.9rem;
  display: flex;
  align-items: center;
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.rc-icon {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-2);
  color: var(--khaki);
}
.rc-icon.danger:hover { color: var(--red); border-color: var(--red); }

/* Major Order band + footer ---------------------------------------------- */
.mo-band {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  border-top: 1px solid var(--line-2);
  background: var(--rail);
}
.mo-band.mo-in { animation: moIn 0.55s var(--ease-out) both; }
.mo-empty { align-items: center; gap: 0.75rem; padding: 0.9rem var(--pad-page); }
.mo-radar {
  position: relative;
  flex-shrink: 0;
  width: 4rem;
  display: grid;
  place-items: center;
  background: var(--panel);
  border-right: 1px solid var(--line-2);
}
.mo-radar-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 5px; }
.mo-title {
  flex-shrink: 0;
  width: 24rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 1.5rem;
  border-right: 1px solid var(--line-1);
}
.mo-name { font-size: 1rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-planet { flex-grow: 1; min-width: 0; display: flex; align-items: center; gap: 0.9rem; padding: 0 1.5rem; }
.mo-planet img { width: 2rem; height: 2rem; object-fit: contain; flex-shrink: 0; }
.mo-planet-body { flex-grow: 1; display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
.mo-planet-head { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; }
.mo-pct { color: var(--red); }
.mo-track { height: 6px; background: var(--line-3); }
.mo-fill { display: block; height: 6px; background: var(--red); }
.mo-count {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 1.5rem;
  border-left: 1px solid var(--line-1);
}
.mo-count-n { font-size: 1.1rem; color: var(--text); }
.mo-play {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 1.5rem;
  border-left: 1px solid var(--line-1);
}
.mo-carrot {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 1.75rem;
  padding: 0 0.6rem;
  border: 1px solid var(--gold);
  background: var(--raised);
  color: var(--gold);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  white-space: nowrap;
}
.bridge-foot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1.5rem;
  background: var(--ground);
  border-top: 1px solid var(--raised);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--muted);
}
.foot-marks { display: flex; gap: 4px; }
.foot-marks i { width: 18px; height: 2px; background: var(--line-3); }
.foot-marks i:nth-child(2) { width: 6px; }
.foot-marks i:nth-child(3) { width: 2px; background: var(--line-5); }

@media (max-width: 1020px) {
  .mo-band { flex-wrap: wrap; }
  .mo-title,
  .mo-planet,
  .mo-count,
  .mo-play { width: auto; flex: 1 1 14rem; padding: 0.6rem 1rem; border: 0; }
  .rc-ladder { flex-wrap: wrap; }
}
</style>
