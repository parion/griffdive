<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import { STARTING_KITS, VARIANTS } from '~~/shared/engine/progression'
import type { CrusadeMode, CrusadeSettings, CrusadeVariant, DiveState, MajorOrderSelection } from '~~/shared/engine/types'

// The room's setup screen. It stands alone — no dive header or squad dock,
// since there is no crusade to report on yet — on phone and desktop alike:
// a slim hangar bar, the four bays, the shared crusade setup for the host (a
// stand-by card for everyone else) and one pinned launch bar.
const props = defineProps<{
  state: DiveState
  selfId: string | null
  canControl: boolean
  roomCode: string
  lastError: string | null
}>()

const emit = defineEmits<{
  start: [settings: CrusadeSettings, majorOrder: MajorOrderSelection | null]
  copyInvite: []
  openMenu: []
  transferHost: [playerId: string]
  kick: [playerId: string]
  dismissError: []
}>()

const { ownedWarbonds } = useOwnedWarbonds()
const { openWarbonds } = useDrawers()

const variant = ref<CrusadeVariant>('medium')
const mode = ref<CrusadeMode>('seaf')
const {
  plan: frontPlan,
  lockedFront,
  choose: chooseFrontPlan,
  pin,
  order,
  status: orderStatus,
  pending: orderPending,
  refresh: refreshOrder,
} = useFrontPlan()

const launched = ref(false)
let launchTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(launchTimer))

const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'The host')

const selectedVariant = computed(() => VARIANTS.find(entry => entry.id === variant.value) ?? VARIANTS[0]!)
const startDifficulty = computed(() => STARTING_KITS[variant.value].startDifficulty)
const modeActive = computed(() => startDifficulty.value >= 5)

const settings = computed<CrusadeSettings>(() => ({
  variant: variant.value,
  ...(modeActive.value ? { mode: mode.value } : {}),
  front: frontPlan.value,
}))

const frontSummary = computed(() => {
  if (frontPlan.value === 'majorOrder') {
    return 'Major Order'
  }
  if (frontPlan.value === 'locked') {
    return FRONTS.find(front => front.id === lockedFront.value)?.displayName ?? 'Locked'
  }
  return 'Rolled fronts'
})
const summary = computed(() => [
  `${selectedVariant.value.name} · ${startDifficulty.value}`,
  ...(modeActive.value ? [mode.value === 'penance' ? 'Super Penance' : 'SEAF'] : []),
  frontSummary.value,
].join(' · '))

interface Bay {
  id: string | null
  index: number
  label: string
  seated: boolean
  name: string
  initial: string
  host: boolean
  you: boolean
  warbonds: number
}

const bays = computed<Bay[]>(() => Array.from({ length: 4 }, (_, i) => {
  const diver = props.state.divers[i]
  return {
    id: diver?.id ?? null,
    index: i,
    label: `Bay 0${i + 1}`,
    seated: Boolean(diver),
    name: diver?.name ?? '',
    initial: (diver?.name.trim()[0] ?? '?').toUpperCase(),
    host: diver?.id === props.state.hostId,
    you: Boolean(diver) && diver?.id === props.selfId,
    warbonds: diver?.warbondCodes.length ?? 0,
  }
}))

function bayLabel(bay: Bay): string {
  if (!bay.seated) {
    return `${bay.label} open — copy the invite link`
  }
  const role = bay.host ? ', host' : ''
  if (bay.you) {
    return `${bay.label}, you${role} — warbonds, ${bay.warbonds} declared`
  }
  const label = `${bay.label}, ${bay.name}${role}, ${bay.warbonds} warbonds`
  return props.canControl ? `${label} — manage` : label
}

// The host manages a squadmate from their bay: hand over the host role or
// clear the seat before launch.
const managing = ref<Bay | null>(null)
const manageOpen = computed({
  get: () => managing.value !== null,
  set: (open: boolean) => {
    if (!open) {
      managing.value = null
    }
  },
})

function manage(action: 'transferHost' | 'kick'): void {
  const id = managing.value?.id
  managing.value = null
  if (!id) {
    return
  }
  if (action === 'kick') {
    emit('kick', id)
  }
  else {
    emit('transferHost', id)
  }
}

function interactive(bay: Bay): boolean {
  return !bay.seated || bay.you || props.canControl
}

function pressBay(bay: Bay): void {
  if (!bay.seated) {
    emit('copyInvite')
  }
  else if (bay.you) {
    openWarbonds()
  }
  else if (props.canControl) {
    managing.value = bay
  }
}

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function launch(): void {
  if (!props.canControl || launched.value) {
    return
  }
  launched.value = true
  const launchSettings = settings.value
  const majorOrder = pin.value
  launchTimer = setTimeout(() => emit('start', launchSettings, majorOrder), reduced ? 0 : 650)
}
</script>

<template>
  <div
    class="hangar"
    :class="{ launched }"
  >
    <header class="bar">
      <NuxtLink
        to="/"
        class="bar-back"
        aria-label="Back to the Bridge"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          aria-hidden="true"
        ><path d="M15 6l-6 6 6 6" /></svg>
      </NuxtLink>
      <div class="bar-id">
        <span class="lbl">Destroyer hangar</span>
        <h1 class="disp bar-title">
          Hellpod Bays
        </h1>
      </div>
      <button
        class="bar-room"
        type="button"
        :aria-label="`Copy invite link, room ${roomCode}`"
        @click="emit('copyInvite')"
      >
        <span class="bar-room-code">{{ roomCode }}</span>
        <IconCopy aria-hidden="true" />
      </button>
      <button
        class="bar-icon"
        type="button"
        aria-label="Session menu"
        aria-haspopup="dialog"
        @click="emit('openMenu')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        ><circle
          cx="5"
          cy="12"
          r="1.8"
        /><circle
          cx="12"
          cy="12"
          r="1.8"
        /><circle
          cx="19"
          cy="12"
          r="1.8"
        /></svg>
      </button>
    </header>

    <main
      id="main-content"
      class="body grid-bg"
      tabindex="-1"
    >
      <div class="inner">
        <p
          v-if="lastError"
          class="error"
          role="alert"
        >
          {{ lastError }}
          <button
            class="btn tiny ghost"
            type="button"
            @click="emit('dismissError')"
          >
            Dismiss
          </button>
        </p>

        <section
          class="bays"
          aria-label="Squad"
        >
          <component
            :is="interactive(bay) ? 'button' : 'article'"
            v-for="bay in bays"
            :key="bay.index"
            class="bay"
            :class="{ seated: bay.seated, open: !bay.seated, you: bay.you }"
            :type="interactive(bay) ? 'button' : undefined"
            :aria-label="bayLabel(bay)"
            @click="pressBay(bay)"
          >
            <span
              class="well"
              aria-hidden="true"
            >
              <span class="well-lamp" />
              <i class="clamp l" />
              <i class="clamp r" />
              <span
                class="pod"
                :style="{ animationDelay: `${bay.index * 110}ms` }"
              >
                <svg
                  v-if="bay.seated"
                  viewBox="0 0 84 126"
                >
                  <path
                    class="pod-fin"
                    d="M12 40 L4 50 V80 L12 88 Z M72 40 L80 50 V80 L72 88 Z"
                  />
                  <path
                    class="pod-hull"
                    d="M22 6 H62 L72 20 V88 L42 122 L12 88 V20 Z"
                  />
                  <path
                    class="pod-seam"
                    d="M12 66 H72 M42 66 V118"
                  />
                  <rect
                    class="pod-window"
                    x="22.5"
                    y="18.5"
                    width="39"
                    height="39"
                  />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 84 126"
                >
                  <path
                    class="pod-ghost"
                    d="M22 6 H62 L72 20 V88 L42 122 L12 88 V20 Z"
                  />
                  <rect
                    class="pod-ghost"
                    x="22.5"
                    y="18.5"
                    width="39"
                    height="39"
                  />
                  <path
                    class="pod-plus"
                    d="M42 30 V46 M34 38 H50"
                  />
                </svg>
                <span
                  v-if="bay.seated"
                  class="pod-face disp"
                >{{ bay.initial }}</span>
              </span>
              <span class="streak" />
            </span>
            <span
              class="doors hazard-soft"
              aria-hidden="true"
            />
            <span
              class="tag"
              aria-hidden="true"
            >
              <span class="tag-bay">{{ bay.label }}</span>
              <span class="tag-name">{{ bay.seated ? bay.name : 'Open bay' }}</span>
              <span
                v-if="bay.seated"
                class="tag-meta"
              >
                <span
                  v-if="bay.host"
                  class="tag-host"
                >Host</span>
                <span :class="{ 'tag-wb': bay.you }">
                  <IconWarbond class="tag-wb-icon" />{{ bay.warbonds }}
                </span>
              </span>
              <span
                v-else
                class="tag-meta"
              >Invite</span>
            </span>
          </component>
        </section>

        <CrusadeSetup
          v-if="canControl"
          v-model:variant="variant"
          v-model:mode="mode"
          v-model:locked-front="lockedFront"
          :front-plan="frontPlan"
          :order="order"
          :order-status="orderStatus"
          :order-pending="orderPending"
          :disabled="launched"
          :show-risk="false"
          @update:front-plan="chooseFrontPlan"
          @refresh-order="refreshOrder"
        />

        <section
          v-else
          class="standby cut"
          aria-labelledby="standby-h"
        >
          <span class="lbl">Stand by</span>
          <h2
            id="standby-h"
            class="disp standby-title"
          >
            {{ hostName }} is setting the crusade
          </h2>
          <p class="standby-copy">
            The host picks where the squad fights and where it starts, then launches everyone together.
            Rewards roll from the warbonds you own — declare them before the drop.
          </p>
          <button
            class="btn ghost cut-sm standby-cta"
            type="button"
            @click="openWarbonds()"
          >
            <IconWarbond aria-hidden="true" />
            Declare warbonds · {{ ownedWarbonds.length }}
          </button>
        </section>
      </div>
    </main>

    <footer
      class="launch"
      aria-label="Launch"
    >
      <span
        class="launch-notch"
        aria-hidden="true"
      />
      <SetupRisk
        v-if="canControl"
        class="launch-risk"
        :settings="settings"
        compact
      />
      <div
        v-else
        class="launch-sum"
      >
        <span class="lbl">Waiting on the host</span>
        <span class="launch-line">{{ hostName }} launches the crusade</span>
      </div>
      <HoldButton
        v-if="canControl"
        class="launch-btn"
        :class="{ 'cta-sweep': !launched }"
        label="Launch crusade"
        :hint="launched ? 'DROPPING' : 'HOLD TO LAUNCH'"
        tone="gold"
        :disabled="launched"
        :aria-label="`Launch crusade: ${summary}. Press and hold.`"
        @confirm="launch"
      />
    </footer>

    <AppDialog
      v-model:open="manageOpen"
      :title="managing ? `${managing.label} · ${managing.name}` : 'Manage diver'"
      description="Hand over the host role or clear the seat before launch."
      size="sm"
    >
      <div class="manage">
        <button
          class="btn cut-sm"
          type="button"
          @click="manage('transferHost')"
        >
          Make host
        </button>
        <button
          class="btn danger cut-sm"
          type="button"
          @click="manage('kick')"
        >
          Kick diver
        </button>
      </div>
    </AppDialog>
  </div>
</template>

<style scoped>
.hangar {
  height: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-columns: minmax(0, 1fr);
  overflow: hidden;
  background: var(--ground);
  container: hangar / inline-size;
}

/* Hangar bar -------------------------------------------------------------- */
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px var(--pad-page);
  border-bottom: 1px solid var(--line-2);
  background: var(--rail);
}
.bar-back,
.bar-icon,
.bar-room {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 44px;
  height: 44px;
  padding: 0 10px;
  border: 1px solid var(--line-3);
  background: var(--ground);
  color: var(--khaki);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--dur-fast), color var(--dur-fast);
}
.bar-back:hover,
.bar-icon:hover,
.bar-room:hover { border-color: var(--gold); color: var(--gold); }
.bar-icon svg,
.bar-room svg { width: 18px; height: 18px; }
.bar-id { display: grid; gap: 2px; min-width: 0; margin-right: auto; padding-left: 4px; }
.bar-id .lbl { white-space: nowrap; }
.bar-title {
  margin: 0;
  overflow: hidden;
  font-size: clamp(0.95rem, 3.4cqi, 1.6rem);
  line-height: 1.1;
  color: var(--text);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar-room-code { font-size: 0.9rem; font-weight: 700; letter-spacing: 0.2em; color: var(--text); }

/* Body -------------------------------------------------------------------- */
.body {
  display: flex;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background-size: 44px 44px;
}
.inner {
  width: 100%;
  max-width: 1000px;
  margin: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 20px;
  padding: clamp(14px, 2.4vh, 28px) var(--pad-page) 24px;
  min-width: 0;
}
.error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--red);
  color: var(--text);
}

/* Bays: four lit wells, a pod standing in each ------------------------- */
.bays { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: clamp(6px, 1.4cqi, 14px); }
.bay {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: inherit;
  font: inherit;
  text-align: left;
}
button.bay { cursor: pointer; transition: border-color var(--dur-fast); }
button.bay:hover { border-color: var(--gold); }
.bay.you { border-color: var(--line-5); }
.bay.open { border-style: dashed; border-color: var(--line-4); background: transparent; }

.well {
  position: relative;
  height: clamp(118px, 19vh, 176px);
  overflow: hidden;
  background:
    radial-gradient(70% 60% at 50% 0%, rgba(84, 230, 205, 0.08), transparent 70%),
    var(--ground);
}
.bay.you .well { background: radial-gradient(70% 60% at 50% 0%, rgba(255, 214, 66, 0.12), transparent 70%), var(--ground); }
.bay.open .well { background: none; }
.well-lamp {
  position: absolute;
  left: 50%;
  top: 0;
  width: 28%;
  height: 3px;
  transform: translateX(-50%);
  background: var(--teal);
  box-shadow: 0 0 12px var(--teal);
}
.bay.you .well-lamp { background: var(--gold); box-shadow: 0 0 12px var(--gold); }
.bay.open .well-lamp { background: var(--line-4); box-shadow: none; }
.clamp { position: absolute; top: 42%; width: 10%; height: 5px; background: var(--line-4); }
.clamp.l { left: 6%; }
.clamp.r { right: 6%; }
.bay.open .clamp { background: var(--line-2); }

.pod {
  position: absolute;
  left: 50%;
  bottom: 6px;
  height: 82%;
  aspect-ratio: 84 / 126;
  translate: -50% 0;
}
.pod svg { display: block; width: 100%; height: 100%; overflow: visible; }
.pod-fin,
.pod-hull { fill: var(--raised); stroke: var(--dim); stroke-width: 1.5; }
.pod-seam { fill: none; stroke: var(--line-3); stroke-width: 1; }
.pod-window { fill: var(--ground); stroke: var(--line-3); }
.bay.you .pod-fin,
.bay.you .pod-hull { stroke: var(--gold); }
.pod-ghost { fill: none; stroke: var(--line-5); stroke-width: 1.5; stroke-dasharray: 5 4; }
.pod-plus { stroke: var(--muted); stroke-width: 2; }
button.bay.open:hover .pod-ghost { stroke: var(--gold); }
button.bay.open:hover .pod-plus { stroke: var(--gold); }
.pod-face {
  position: absolute;
  left: 26.8%;
  top: 14.7%;
  width: 46.4%;
  height: 31%;
  display: grid;
  place-items: center;
  container-type: inline-size;
  font-size: clamp(0.8rem, 55cqi, 1.3rem);
  background: var(--line-2);
  color: var(--text);
}
.bay.you .pod-face { background: var(--gold); color: var(--on-gold); }
.streak {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  margin-left: -1px;
  background: linear-gradient(180deg, transparent, var(--gold));
  opacity: 0;
}

.doors { height: 8px; flex-shrink: 0; background-color: var(--raised); }
.bay.open .doors { opacity: 0.4; }

.tag { display: grid; gap: 3px; min-width: 0; padding: 8px 10px 10px; }
.tag-bay { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.tag-name {
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bay.open .tag-name { color: var(--khaki); font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; }
button.bay.open:hover .tag-name { color: var(--gold); }
.tag-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.tag-meta > span { display: inline-flex; align-items: center; gap: 4px; }
.tag-host { color: var(--gold); }
.tag-wb { color: var(--gold); }
.tag-wb-icon { width: 12px; height: 12px; }

.launched .bay.seated .pod { animation: podDrop 0.6s cubic-bezier(0.5, 0, 0.85, 0.25) both; }
.launched .bay.seated .streak { animation: streak 0.6s ease-out both; }

/* Manage ------------------------------------------------------------------ */
.manage { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.manage .btn { min-height: 48px; }

/* Stand by ---------------------------------------------------------------- */
.standby {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: clamp(16px, 3vw, 28px);
  border: 1px solid var(--line-3);
  background: var(--panel);
}
.standby-title { margin: 0; font-size: clamp(1.2rem, 4cqi, 1.9rem); color: var(--text); }
.standby-copy { margin: 0; max-width: 56ch; color: var(--khaki); line-height: 1.45; }
.standby-cta { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; }
.standby-cta svg { width: 18px; height: 18px; }

/* Launch ------------------------------------------------------------------ */
.launch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px var(--pad-page) calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line-2);
  background: var(--rail);
}
.launch-notch { position: absolute; left: 0; top: -1px; width: 64px; height: 3px; background: var(--gold); }
.launch-sum { display: grid; gap: 4px; min-width: 0; margin-right: auto; }
.launch-risk { flex: 1 1 auto; min-width: 0; margin-right: auto; }
.launch-line {
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text);
}
.launch-btn { flex-shrink: 0; width: min(24rem, 42cqi); min-height: 60px; }

@container hangar (max-width: 720px) {
  .well { height: clamp(100px, 15vh, 132px); }
  .launch { flex-direction: column; align-items: stretch; gap: 10px; }
  .launch-btn { width: 100%; min-height: 56px; }
  .launch-risk { margin-right: 0; }
  .launch-line { font-size: 0.8rem; }
}
@container hangar (max-width: 420px) {
  .bar { gap: 6px; padding-inline: 10px; }
  .bar-id .lbl { display: none; }
  .bar-room { padding: 0 8px; }
  .bar-room-code { font-size: 0.78rem; letter-spacing: 0.12em; }
  .bar-room svg { display: none; }
  .tag { padding: 6px 6px 8px; }
  .tag-bay { display: none; }
  .tag-name { font-size: 0.74rem; }
  .bay.open .tag-name { font-size: 0.66rem; }
  .tag-meta { font-size: 9px; letter-spacing: 0.08em; }
}
</style>
