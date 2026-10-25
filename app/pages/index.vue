<script setup lang="ts">
import { MAX_DIFFICULTY, MIN_DIFFICULTY, SQUAD_SIZE_MAX } from '~~/shared/engine/config'
import { STARTING_KITS } from '~~/shared/engine/progression'
import { createDiveState } from '~~/shared/engine/reducer'
import { createSaveDoc } from '~~/shared/engine/saves'
import { MISFORTUNES, PACTS } from '~~/shared/data/conditions'
import type { CrusadeMode, CrusadeSettings, CrusadeVariant, DiveState, FrontPlan } from '~~/shared/engine/types'
import type { DiveSaveInfo } from '~~/shared/types/messages'
import type { SaveDoc, SessionSave } from '~~/shared/types/save'
import type { OnlineDive } from '~/components/bridge/BridgeRecord.vue'
import { storeSeat, storedDiverName, storedSeat } from '~/composables/useGameSocket'

const saves = useSaves()
const sessions = useSessionSaves()
const recentRooms = useRecentRooms()
const { push: pushToast } = useToasts()
const { ownedWarbonds: myWarbonds, setOwned: setMyWarbonds } = useOwnedWarbonds()
const { openCodex } = useDrawers()
const { openFeedback, hasBoard, boardUrl } = useFeedback()

const variant = ref<CrusadeVariant>('medium')
const mode = ref<CrusadeMode>('seaf')
const slotList = ref<{ id: string, doc: SaveDoc }[]>([])
const sessionList = ref<SessionSave[]>([])
const variantOpen = ref(false)
const hosting = ref(false)

const {
  plan: frontPlan,
  lockedFront,
  choose: chooseFrontPlan,
  order: liveOrder,
  status: moStatus,
  pending: moPending,
  refresh: refreshOrder,
} = useFrontPlan()

const onlineDives = ref<OnlineDive[]>([])
const onlineLoading = ref(true)
const awaitingRooms = ref(false)
const mounted = ref(false)

onMounted(() => {
  slotList.value = saves.listSaves()
  sessionList.value = sessions.listSessions()
  awaitingRooms.value = recentRooms.listRooms().length > 0
  mounted.value = true
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
      const res = await $fetch<{ code: string, state: DiveState, saved: DiveSaveInfo | null, online: string[] }>(`/api/rooms/${code}`)
      return { code, state: res.state, saved: res.saved, online: res.online ?? [] }
    }
    catch (error) {
      const err = error as { status?: number, statusCode?: number }
      // Server pruned or lost the room — drop it from the list.
      if ((err.status ?? err.statusCode) === 404) {
        recentRooms.forgetRoom(code)
        return null
      }
      return { code, state: null, saved: null, online: [] }
    }
  }))
  onlineDives.value = results.filter((entry): entry is OnlineDive => {
    // An unlaunched lobby nobody ever joined, or a crusade that is already
    // achieved, has nothing to resume: the room record is still on the server
    // but the card would only open a dead end. A personal session mirror can
    // still host that crusade as a new session.
    if (entry?.state && (entry.state.phase === 'complete' || (entry.state.phase === 'lobby' && entry.state.divers.length === 0))) {
      recentRooms.forgetRoom(entry.code)
      return false
    }
    return entry !== null
  })
  onlineLoading.value = false
}

// Personal session saves: the browser-local mirrors every seated diver keeps.
// A live card carries the New session action; mirrors whose room is gone (or
// unreachable) stand on their own.
const sessionByCode = computed(() => new Map(sessionList.value.map(save => [save.roomCode, save])))
const mirroredCodes = computed(() => new Set(sessionByCode.value.keys()))
const staleSessions = computed(() =>
  sessionList.value.filter(save => !onlineDives.value.some(dive => dive.code === save.roomCode && dive.state)))
const recordCount = computed(() => onlineDives.value.length + slotList.value.length + staleSessions.value.length)
// Anything to resume takes the hero's showcase slot from the wheel. Saves live
// in this browser, so the slot stays empty until mount rather than flashing
// the wheel at a returning squad.
const heroSide = computed<'none' | 'record' | 'wheel'>(() => {
  if (!mounted.value) {
    return 'none'
  }
  return recordCount.value > 0 || (onlineLoading.value && awaitingRooms.value) ? 'record' : 'wheel'
})

// Continue any save as a brand-new session: the server seats the saver as host
// where the crusade stopped and parks the missing divers' kits as claimable
// legacy caches for whoever comes aboard next.
async function hostNewSession(state: DiveState, ownerId: string | null, label: string): Promise<void> {
  if (state.phase === 'complete') {
    pushToast('This crusade is already achieved — start a fresh one', 'warn')
    return
  }
  hosting.value = true
  try {
    // The continuing diver's name wins; a local save's owner keeps the name it
    // was played under when this browser never introduced itself.
    const stored = storedDiverName()
    const owner = state.divers.find(diver => diver.id === ownerId)
      ?? state.divers.find(diver => diver.id === state.hostId)
      ?? state.divers[0]
    const fallback = owner?.name?.trim() || 'Diver'
    const name = stored.trim() && stored !== 'Diver' ? stored : fallback
    const save = { ...createSaveDoc(state, label, new Date().toISOString()), ...(ownerId ? { ownerId } : {}) }
    const res = await $fetch<{ code: string, selfId: string | null }>('/api/rooms', {
      method: 'POST',
      body: { save, name },
    })
    if (res.selfId) {
      storeSeat(res.code, res.selfId)
    }
    recentRooms.rememberRoom(res.code)
    navigateTo(`/dive/${res.code}`)
  }
  catch {
    hosting.value = false
    pushToast('Could not start a new session', 'warn')
  }
}

function hostFromLive(dive: OnlineDive): void {
  if (!dive.state) {
    return
  }
  const mirror = sessionByCode.value.get(dive.code)
  void hostNewSession(dive.state, storedSeat(dive.code) ?? mirror?.ownerId ?? null, dive.saved?.name ?? mirror?.slotName ?? 'Session')
}

function hostFromSession(save: SessionSave): void {
  void hostNewSession(save.state, save.ownerId, save.slotName)
}

function hostFromLocal(doc: SaveDoc): void {
  void hostNewSession(doc.state, null, doc.slotName)
}

function removeSession(roomCode: string): void {
  sessions.deleteSession(roomCode)
  sessionList.value = sessions.listSessions()
}

const VARIANTS_LABELS: Record<CrusadeVariant, string> = {
  medium: 'Medium',
  hard: 'Hard',
  suicide: 'Suicide Mission',
}

// The callsign is filed on the host tutorial that opens the dive; a returning
// diver's saved name seats them straight away.
function createCrusade(plan: FrontPlan): void {
  const name = storedDiverName()
  const base: CrusadeSettings = STARTING_KITS[variant.value].startDifficulty >= 5
    ? { variant: variant.value, mode: mode.value }
    : { variant: variant.value }
  const state = createDiveState(
    { ...base, front: plan },
    crypto.randomUUID(),
    name,
    [...myWarbonds.value],
    crypto.getRandomValues(new Uint32Array(1))[0],
    frontPinFor(plan, lockedFront.value, liveOrder.value),
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

const variantLabel = computed(() => VARIANTS_LABELS[variant.value])
const setupLabel = computed(() =>
  `Set warbonds and variant: ${variantLabel.value}, ${FRONT_PLAN_LABELS[frontPlan.value]} front, ${myWarbonds.value.length} warbonds`)

// The showcase difficulty for the wheel, directives and pacts: mid-climb, where
// every condition carries real weight.
const SHOWCASE_DIFFICULTY = 7

const BEATS = [
  { id: 'call', n: '01', label: 'Call' },
  { id: 'pacts', n: '02', label: 'Pacts' },
  { id: 'climb', n: '03', label: 'Climb' },
  { id: 'loot', n: '04', label: 'Loot' },
] as const

const facts = [
  { n: `${MIN_DIFFICULTY}→${MAX_DIFFICULTY}`, label: 'Difficulty climb' },
  { n: `${MISFORTUNES.length}`, label: 'Squad directives' },
  { n: `${PACTS.length}`, label: 'Personal pacts' },
  { n: `1–${SQUAD_SIZE_MAX}`, label: 'Divers per squad' },
]
</script>

<template>
  <main
    id="main-content"
    class="bridge"
    :class="{ 'has-mo': liveOrder }"
    tabindex="-1"
  >
    <section
      class="hero"
      aria-labelledby="hero-h"
    >
      <div
        class="hero-bg grid-bg"
        aria-hidden="true"
      />
      <div class="hero-copy">
        <span class="lbl hero-k rise">
          <span
            class="hazard hero-k-bar"
            aria-hidden="true"
          />
          Helldivers 2 · squad roguelike
        </span>
        <h1
          id="hero-h"
          class="disp hero-title slam"
          aria-label="Freedom is earned."
        >
          <span>Freedom</span>
          <span class="hero-title-is">is</span>
          <span class="gold">earned.</span>
        </h1>
        <p class="hero-lede rise">
          Griffdive wraps your Helldivers 2 missions in a roguelike crusade. Start on
          Medium with surplus gear, spin the <b>Wheel of Adversity</b> before every
          drop, swear <b>pacts</b> for rarer loot and climb all the way to
          <b>Super Helldive</b>.
        </p>
        <nav
          class="hero-beats rise"
          aria-label="How it plays"
        >
          <a
            v-for="beat in BEATS"
            :key="beat.id"
            :href="`#${beat.id}`"
            class="hero-beat chev"
          >
            <span class="disp">{{ beat.n }}</span>{{ beat.label }}
          </a>
        </nav>
        <BridgeDeploy
          class="hero-deploy rise"
          :hosting="hosting"
          :setup-label="setupLabel"
          @host="hostOnlineDive"
          @join="code => navigateTo(`/dive/${code}`)"
          @solo="createCrusade(frontPlan)"
          @codex="openCodex"
          @setup="variantOpen = true"
          @import="onImport"
        />
      </div>
      <div class="hero-side">
        <BridgeRecord
          v-if="heroSide === 'record'"
          class="hero-record"
          :loading="onlineLoading"
          :hosting="hosting"
          :online="onlineDives"
          :sessions="staleSessions"
          :slots="slotList"
          :mirrored-codes="mirroredCodes"
          @host-live="hostFromLive"
          @host-session="hostFromSession"
          @host-local="hostFromLocal"
          @export-session="sessions.exportSession"
          @remove-session="removeSession"
          @export-slot="saves.exportSave"
          @remove-slot="removeSlot"
          @forget="forgetDive"
        />
        <BridgeWheel
          v-else-if="heroSide === 'wheel'"
          class="hero-wheel"
          :difficulty="SHOWCASE_DIFFICULTY"
        />
      </div>
    </section>

    <ul
      class="facts"
      aria-label="At a glance"
    >
      <li
        v-for="fact in facts"
        :key="fact.label"
        class="fact"
      >
        <span class="disp fact-n">{{ fact.n }}</span>
        <span class="cap">{{ fact.label }}</span>
      </li>
    </ul>

    <BridgeBeat
      id="call"
      n="01"
      kicker="The call"
      title="The wheel picks your fight."
    >
      <p>
        Before every mission the host spins the <b>Wheel of Adversity</b>. It lands one
        <b>Squad Directive</b> — no stratagems, melee only, zero deaths — that the whole
        squad carries into the drop.
      </p>
      <p>
        Take it for better odds or skip it and play it safe. A faction <b>strain</b> can
        stack on top for the whole operation. The skulls show what each rule is worth.
      </p>
      <template #visual>
        <BridgeDirectives :difficulty="SHOWCASE_DIFFICULTY" />
      </template>
    </BridgeBeat>

    <BridgeBeat
      id="pacts"
      n="02"
      kicker="The pacts"
      title="Then bet on yourself."
      flip
    >
      <p>
        Every diver is dealt a hand of <b>personal pacts</b>: no stims, no backpack, never
        die. Swear as many as you dare — each one adds skulls to <b>your</b> odds only.
      </p>
      <p>
        Every pact is checked where the squad can see it: the loadout screen, the field or
        the end-of-mission stats. Break one and the squad marks it.
      </p>
      <template #visual="{ lit }">
        <BridgePacts
          :lit="lit"
          :difficulty="SHOWCASE_DIFFICULTY"
        />
      </template>
    </BridgeBeat>

    <BridgeBeat
      id="climb"
      n="03"
      kicker="The climb · the loot"
      title="Climb higher. Pull rarer."
    >
      <p>
        Clear an operation and the squad climbs one difficulty, from <b>Medium</b> to
        <b>Super Helldive</b>. Each rung raises the floor on every reward.
      </p>
      <p>
        After each extraction every diver drafts one item. Each option rolls a d100 on the
        odds line — the more skulls you carried, the further it reaches toward <b>S</b> and
        the one-of-a-kind <b>Liberty's Cross</b>. Fail, and you repeat the rung and forfeit
        an item. Never a wipe.
      </p>
      <p class="beat-try">
        Try it: pick a rung, drag the skulls.
      </p>
      <template #visual="{ lit }">
        <BridgeOdds
          id="loot"
          :lit="lit"
        />
      </template>
    </BridgeBeat>

    <ClientOnly>
      <Teleport
        to="#header-mid"
        defer
      >
        <BridgeMajorOrder
          :order="liveOrder"
          :status="moStatus"
          :pending="moPending"
          @start="createCrusade('majorOrder')"
        />
      </Teleport>
    </ClientOnly>

    <section
      class="close"
      aria-labelledby="close-h"
    >
      <AppBrandMark
        :size="64"
        class="close-mark"
      />
      <h2
        id="close-h"
        class="disp close-title"
      >
        Your squad is <span class="gold">waiting.</span>
      </h2>
      <p class="close-copy">
        No account, no install. Share a six-letter code and everyone is on the same wheel.
      </p>
      <a
        href="#deploy"
        class="btn primary cut close-cta cta-sweep"
      >
        <span class="disp">Suit up</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          aria-hidden="true"
        ><path d="M12 19V5M6 11l6-6 6 6" /></svg>
      </a>
    </section>

    <footer class="bridge-foot">
      <span>FAN PROJECT · NOT AFFILIATED WITH ARROWHEAD GAME STUDIOS OR SONY ·
        <button
          type="button"
          class="foot-link foot-btn"
          @click="openFeedback"
        >FEEDBACK</button> ·
        <a
          v-if="hasBoard"
          class="foot-link"
          :href="boardUrl"
          target="_blank"
          rel="noopener"
        >BOARD</a> ·
        <NuxtLink
          class="foot-link"
          to="/privacy"
        >PRIVACY</NuxtLink></span>
      <span
        class="foot-marks"
        aria-hidden="true"
      ><i /><i /><i /></span>
    </footer>

    <AppDialog
      v-model:open="variantOpen"
      title="Variant & warbonds"
      description="Your starting kit, the run's front plan and the warbonds you own. Rewards roll from your warbonds only."
    >
      <CrusadeSetup
        v-model:variant="variant"
        v-model:mode="mode"
        v-model:locked-front="lockedFront"
        :front-plan="frontPlan"
        :order="liveOrder"
        :order-status="moStatus"
        :order-pending="moPending"
        @update:front-plan="chooseFrontPlan"
        @refresh-order="refreshOrder"
      />
      <WarbondPicker
        class="setup-warbonds"
        :warbond-codes="myWarbonds"
        @update:warbond-codes="setMyWarbonds"
      />
    </AppDialog>
  </main>
</template>

<style scoped>
.bridge {
  width: 100%;
  max-width: 1440px;
  margin-inline: auto;
  padding: 0 var(--pad-page);
  overflow-x: clip;
}
.bridge:focus { outline: none; }
.gold { color: var(--gold); }

/* Hero ------------------------------------------------------------------- */
.hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(24px, 3vw, 48px);
  align-items: center;
  min-height: calc(100svh - 60px);
  padding-block: clamp(24px, 4vw, 48px);
}
@media (min-width: 1020px) {
  .hero { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
}
.hero-bg {
  position: absolute;
  inset: 0 calc(var(--pad-page) * -1);
  z-index: -1;
  background-color: transparent;
  mask-image: radial-gradient(80% 70% at 70% 45%, #000, transparent 75%);
}
.hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(40% 50% at 74% 46%, rgba(255, 214, 66, 0.1), transparent 70%);
}
.hero-copy { display: grid; gap: 18px; min-width: 0; }
.hero-k { display: inline-flex; align-items: center; gap: 12px; color: var(--gold); }
.hero-k-bar { width: 44px; height: 6px; }
.hero-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0;
  font-size: clamp(44px, 6.4vw, 96px);
  line-height: 0.92;
  color: var(--text);
}
.hero-title-is {
  display: flex;
  align-items: center;
  gap: 0.9em;
  margin-block: 0.3em 0.26em;
  font-family: var(--font-body);
  font-size: clamp(11px, 1.15vw, 14px);
  font-weight: 600;
  letter-spacing: 0.44em;
  line-height: 1;
  color: var(--khaki);
}
.hero-title-is::before,
.hero-title-is::after {
  content: '';
  width: clamp(18px, 2.2vw, 32px);
  height: 2px;
  background: var(--line-4);
}
.hero-lede {
  max-width: 36rem;
  margin: 0;
  font-size: clamp(15px, 1.2vw, 18px);
  line-height: 1.6;
  color: var(--khaki);
}
.hero-lede b { color: var(--text); }
.hero-beats { display: flex; gap: 2px; flex-wrap: wrap; animation-delay: 0.1s; }
.hero-beat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 24px 0 20px;
  background: var(--raised);
  color: var(--khaki);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: background-color var(--dur-fast), color var(--dur-fast);
}
.hero-beat:first-child { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%); }
.hero-beat .disp { font-size: 11px; color: var(--gold); }
.hero-beat:hover { background: var(--gold); color: var(--on-gold); text-decoration: none; }
.hero-beat:hover .disp { color: var(--on-gold); }
.hero-deploy { margin-top: 6px; animation-delay: 0.16s; }
.hero-side { display: grid; min-width: 0; }
.hero-record {
  --rec-max: min(720px, calc(100svh - 140px));
  animation: riseIn 0.5s var(--ease-out) both;
}
.hero-wheel { --bw-size: min(600px, 62svh); padding-right: 32px; animation: wheelIn 0.9s var(--ease-out) both; }
@keyframes wheelIn { from { opacity: 0; transform: scale(0.92) rotate(-8deg); } }

/* Facts ------------------------------------------------------------------ */
.facts {
  list-style: none;
  margin: 0 0 clamp(24px, 4vw, 48px);
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  border: 1px solid var(--line-2);
  background: var(--rail);
}
.fact {
  display: grid;
  gap: 4px;
  padding: 16px 20px;
  border-left: 1px solid var(--line-2);
}
.fact:first-child { border-left: 0; }
.fact-n { font-size: clamp(24px, 2.6vw, 36px); line-height: 1; color: var(--gold); }
.fact .cap { color: var(--khaki); }

.beat-try { color: var(--gold); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; }

/* Close ------------------------------------------------------------------ */
.close {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: clamp(56px, 9vw, 120px) 0;
  text-align: center;
}
.close-mark { color: var(--gold); filter: drop-shadow(0 0 22px rgba(255, 214, 66, 0.35)); }
.close-title { margin: 0; font-size: clamp(32px, 5vw, 72px); line-height: 0.95; color: var(--text); }
.close-copy { max-width: 32rem; margin: 0; color: var(--khaki); }
.close-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  margin-top: 8px;
  padding: 0 32px;
}
.close-cta .disp { font-size: 18px; }

.setup-warbonds { margin-top: 20px; }

.bridge-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0 20px;
  border-top: 1px solid var(--line-1);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--muted);
}
.foot-marks { display: flex; gap: 4px; }
.foot-marks i { width: 18px; height: 2px; background: var(--line-3); }
.foot-marks i:nth-child(2) { width: 6px; }
.foot-marks i:nth-child(3) { width: 2px; background: var(--line-5); }
.foot-link { color: var(--gold); }
.foot-link:hover { text-decoration: underline; }
.foot-btn {
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

/* Phones keep the pinned Major Order bar clear of the footer. */
@media (max-width: 860px) {
  .bridge.has-mo { padding-bottom: 84px; }
}

@media (max-width: 1019px) {
  .hero { min-height: 0; }
  .hero-record { --rec-max: 560px; }
  .hero-side { display: grid; min-width: 0; }
.hero-record {
  --rec-max: min(720px, calc(100svh - 140px));
  animation: riseIn 0.5s var(--ease-out) both;
}
.hero-wheel { --bw-size: min(460px, 100%); }
}
</style>
