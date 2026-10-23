<script setup lang="ts">
import { WARBONDS } from '~~/shared/data/catalog'
import { PENANCE_VALOR, SEAF_SUPPORT_VALOR, baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { STARTING_KITS, VARIANTS, difficultyName } from '~~/shared/engine/progression'
import type { FrontId } from '~~/shared/data/fronts'
import type { CrusadeMode, CrusadeSettings, CrusadeVariant, DiveState, FrontPlan, MajorOrderSelection } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  canControl: boolean
  // Phone shell: the launch summary and button live in the pinned action bar.
  phone?: boolean
}>()

const emit = defineEmits<{ start: [settings: CrusadeSettings, majorOrder: MajorOrderSelection | null] }>()

const { ownedWarbonds } = useOwnedWarbonds()

// The host configures and launches the crusade here. The bays mirror the squad
// rail live; the variant cards mirror the difficulty ladder.
const variant = ref<CrusadeVariant>('medium')
// The hard/suicide mode toggle: the SEAF Support Package (assisted, default)
// or Super Penance (hellish). Only meaningful on the top two difficulties.
const mode = ref<CrusadeMode>('seaf')
// Where the run fights, locked at launch with the variant: the live Major
// Order, one locked faction, or a fresh roll every operation.
const frontPlan = ref<FrontPlan>('rolled')
const lockedFront = ref<FrontId>('terminids')
const { order: liveOrder } = useMajorOrder()
const frontLabel = computed(() => FRONT_PLAN_LABELS[frontPlan.value].toUpperCase())
const launched = ref(false)
let launchTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(launchTimer))

// Display kit lines (the design's copy; the real kit is STARTING_KITS).
const VARIANT_KIT: Record<CrusadeVariant, { m: string, t: string }[]> = {
  medium: [{ m: '·', t: 'Surplus kit' }],
  hard: [{ m: '·', t: 'Surplus kit' }, { m: '±', t: 'SEAF / Penance' }],
  suicide: [{ m: '·', t: 'Surplus kit' }, { m: '±', t: 'SEAF / Penance' }],
}

const MODES: readonly { id: CrusadeMode, name: string, blurb: string, kit: string }[] = [
  {
    id: 'seaf',
    name: 'SEAF Support Package',
    blurb: 'Assisted ride: extra gear and a small Valor boost.',
    kit: 'Extra stratagems + boosters',
  },
  {
    id: 'penance',
    name: 'Super Penance',
    blurb: 'No aid. A larger Valor stake for the wicked.',
    kit: 'Bare surplus kit',
  },
]

const seated = computed(() => props.state.divers.length)
const warbondCount = computed(() => ownedWarbonds.value.length)

interface BayView {
  index: number
  label: string
  seated: boolean
  name: string
  init: string
  host: boolean
  you: boolean
  warbonds: number
  light: string
  status: string
  pulse: boolean
  delay: string
  aria: string
}

const bays = computed<BayView[]>(() => {
  const seatedBays = props.state.divers.map((diver, i) => ({
    index: i,
    label: `BAY 0${i + 1}`,
    seated: true,
    name: diver.name,
    init: (diver.name.trim()[0] ?? '?').toUpperCase(),
    host: diver.id === props.state.hostId,
    you: diver.id === props.selfId,
    warbonds: diver.warbondCodes.length,
    light: launched.value ? 'var(--gold)' : 'var(--teal)',
    status: launched.value ? 'LAUNCHED' : 'READY',
    pulse: false,
    delay: `${0.3 + i * 0.14}s`,
    aria: `Bay ${i + 1}, ${diver.name}${diver.id === props.state.hostId ? ', host' : ''}, ${launched.value ? 'launched' : 'ready'}, ${diver.warbondCodes.length} warbonds`,
  }))
  const empty: BayView[] = []
  for (let i = seatedBays.length; i < 4; i++) {
    empty.push({
      index: i,
      label: `BAY 0${i + 1}`,
      seated: false,
      name: '',
      init: '',
      host: false,
      you: false,
      warbonds: 0,
      light: 'var(--dim)',
      status: 'OPEN',
      pulse: !launched.value,
      delay: '0s',
      aria: `Bay ${i + 1}, empty, awaiting diver`,
    })
  }
  return [...seatedBays, ...empty]
})

interface VariantView {
  id: CrusadeVariant
  name: string
  start: number
  tier: string
  missions: number
  hasMode: boolean
  checked: boolean
  off: boolean
  diffName: string
  ticks: { h: string, bg: string }[]
  kit: { m: string, t: string }[]
  aria: string
}

const variants = computed<VariantView[]>(() => VARIANTS.map((entry) => {
  const start = STARTING_KITS[entry.id].startDifficulty
  const tier = baseTierFor(start)
  const missions = missionsPerOperation(start)
  const hasMode = start >= 5
  const checked = variant.value === entry.id
  const off = launched.value && !checked
  const startIndex = start - 3
  const kit = VARIANT_KIT[entry.id]
  return {
    id: entry.id,
    name: entry.name,
    start,
    tier,
    missions,
    hasMode,
    checked,
    off,
    diffName: `START · ${difficultyName(start).toUpperCase()}`,
    ticks: Array.from({ length: 8 }, (_, k) => ({
      h: k === startIndex ? '20px' : k < startIndex ? '4px' : '6px',
      bg: k === startIndex ? (checked ? 'var(--gold)' : 'var(--khaki)') : k < startIndex ? 'transparent' : 'var(--line-3)',
    })),
    kit,
    aria: `${entry.name}, start difficulty ${start} ${difficultyName(start)}, ${kit.map(k => k.t).join(', ')}`,
  }
}))

const selected = computed(() => variants.value.find(v => v.checked) ?? variants.value[0]!)
const opMissions = computed(() => selected.value.missions)
const modeActive = computed(() => selected.value.hasMode)

function pick(id: CrusadeVariant): void {
  const entry = variants.value.find(v => v.id === id)
  if (!props.canControl || launched.value || !entry || entry.off) {
    return
  }
  variant.value = id
}

function pickMode(id: CrusadeMode): void {
  if (!props.canControl || launched.value || !modeActive.value) {
    return
  }
  mode.value = id
}

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function launchNow(): void {
  if (!props.canControl || launched.value) {
    return
  }
  launched.value = true
  const settings: CrusadeSettings = modeActive.value
    ? { variant: variant.value, mode: mode.value, front: frontPlan.value }
    : { variant: variant.value, front: frontPlan.value }
  const pin = frontPinFor(frontPlan.value, lockedFront.value, liveOrder.value)
  launchTimer = setTimeout(() => emit('start', settings, pin), reduced ? 0 : 750)
}

interface CheckView {
  label: string
  v: string
  ok: boolean
  wait: boolean
}

const checks = computed<CheckView[]>(() => [
  { label: 'Squad', v: `${seated.value} / 4`, ok: true, wait: false },
  { label: 'Ready', v: `${seated.value} / ${seated.value}`, ok: true, wait: false },
  { label: 'Variant', v: selected.value.name.toUpperCase(), ok: true, wait: false },
  ...(modeActive.value
    ? [{ label: 'Mode', v: mode.value === 'penance' ? 'SUPER PENANCE' : 'SEAF SUPPORT', ok: true, wait: false }]
    : []),
  { label: 'Front', v: frontLabel.value, ok: true, wait: false },
  { label: 'Warbonds', v: `${warbondCount.value} / ${WARBONDS.length} DECLARED`, ok: true, wait: false },
  launched.value
    ? { label: 'Operation 1', v: 'SPIN NEXT', ok: true, wait: false }
    : { label: 'Host launch', v: 'HOLD', ok: false, wait: true },
])
</script>

<template>
  <section class="panel lobby">
    <header class="lobby-head">
      <div class="lobby-head-l">
        <span class="lbl">{{ launched ? 'Crusade launched · first spin next' : 'Destroyer hangar · crusade not launched' }}</span>
        <h1 class="disp lobby-title">
          Hellpod Bays
        </h1>
      </div>
      <div class="lobby-counts">
        <div class="count">
          <span class="lbl">Seated</span>
          <span class="disp count-n">{{ seated }}<i>/4</i></span>
        </div>
        <span
          class="count-sep"
          aria-hidden="true"
        />
        <div class="count">
          <span class="lbl">Ready</span>
          <span class="disp count-n ready">{{ seated }}<i>/{{ seated }}</i></span>
        </div>
      </div>
    </header>

    <div class="bays">
      <article
        v-for="bay in bays"
        :key="bay.index"
        class="bay cut-sm"
        :class="{ seated: bay.seated, empty: !bay.seated, you: bay.you, launched }"
        :aria-label="bay.aria"
      >
        <div class="bay-head">
          <span class="lbl">{{ bay.label }}</span>
          <span
            class="bay-status"
            :style="{ color: bay.light }"
          >
            <span
              class="bay-dot"
              :class="{ pulse: bay.pulse }"
              :style="{ background: bay.light }"
            />{{ bay.status }}
          </span>
        </div>
        <div class="bay-body">
          <span
            class="clamp left"
            aria-hidden="true"
          />
          <span
            class="clamp right"
            aria-hidden="true"
          />
          <span
            class="clamp left mid"
            aria-hidden="true"
          />
          <span
            class="clamp right mid"
            aria-hidden="true"
          />
          <template v-if="bay.seated">
            <div
              class="pod"
              :class="{ dropping: launched, host: bay.you }"
              :style="{ animationDelay: bay.delay }"
            >
              <svg
                width="84"
                height="126"
                viewBox="0 0 84 126"
                aria-hidden="true"
              >
                <path
                  d="M12 40 L4 50 V80 L12 88 Z M72 40 L80 50 V80 L72 88 Z"
                  fill="var(--raised)"
                  :stroke="bay.you ? 'var(--gold)' : 'var(--dim)'"
                  stroke-width="1.5"
                />
                <path
                  d="M22 6 H62 L72 20 V88 L42 122 L12 88 V20 Z"
                  fill="var(--raised)"
                  :stroke="bay.you ? 'var(--gold)' : 'var(--dim)'"
                  stroke-width="1.5"
                />
                <rect
                  x="22.5"
                  y="18.5"
                  width="39"
                  height="39"
                  fill="var(--ground)"
                  stroke="var(--line-3)"
                />
              </svg>
              <span
                class="pod-avatar cut-sm disp"
                :class="{ you: bay.you }"
              >{{ bay.init }}</span>
            </div>
            <span
              v-if="launched"
              class="streak"
              aria-hidden="true"
            />
          </template>
          <div
            v-else
            class="pod empty pulse"
            aria-hidden="true"
          >
            <svg
              width="84"
              height="126"
              viewBox="0 0 84 126"
            >
              <path
                d="M22 6 H62 L72 20 V88 L42 122 L12 88 V20 Z"
                fill="none"
                stroke="var(--line-5)"
                stroke-width="1.5"
                stroke-dasharray="5 4"
              />
              <rect
                x="22.5"
                y="18.5"
                width="39"
                height="39"
                fill="none"
                stroke="var(--line-4)"
                stroke-dasharray="3 3"
              />
              <path
                d="M42 30 V46 M34 38 H50"
                stroke="var(--dim)"
                stroke-width="2"
              />
            </svg>
          </div>
          <div
            v-if="launched"
            class="deployed rise"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gold)"
              stroke-width="2"
              aria-hidden="true"
            ><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
            <span>DEPLOYED</span>
          </div>
        </div>
        <div
          class="bay-doors"
          aria-hidden="true"
        >
          <span
            class="hazard-soft door"
            :class="{ 'door-l': launched, 'crawl': !launched && canControl }"
          />
          <span
            class="hazard-soft door"
            :class="{ 'door-r': launched, 'crawl': !launched && canControl }"
          />
        </div>
        <div
          v-if="bay.seated"
          class="bay-foot"
        >
          <div class="bay-name-row">
            <span class="bay-name">{{ bay.name }}</span>
            <svg
              v-if="bay.host"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="var(--gold)"
              aria-label="host"
            ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
            <span
              v-if="bay.you"
              class="you-tag"
            >YOU</span>
          </div>
          <div class="bay-wb">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            ><circle
              cx="12"
              cy="9"
              r="6"
            /><path d="M8.5 13.8L7 22l5-3 5 3-1.5-8.2" /></svg>
            <span><b>{{ bay.warbonds }}</b> WARBONDS</span>
          </div>
        </div>
        <div
          v-else
          class="bay-foot"
        >
          <span
            class="await"
            :class="{ pulse: bay.pulse }"
          >AWAITING DIVER</span>
          <span class="await-sub">{{ launched ? 'JOINS WITH FIELD PROMOTION' : 'SHARE THE INVITE' }}</span>
        </div>
      </article>
    </div>

    <section
      class="variants"
      aria-labelledby="variant-h"
    >
      <div class="variants-head">
        <span
          id="variant-h"
          class="lbl"
        >Starting variant</span>
        <span class="variants-hint">{{ launched ? 'LOCKED FOR THIS CRUSADE' : 'HOST SETS · LOCKS AT LAUNCH' }}</span>
      </div>
      <div
        class="variant-grid"
        role="radiogroup"
        aria-labelledby="variant-h"
      >
        <button
          v-for="v in variants"
          :key="v.id"
          role="radio"
          type="button"
          class="vcard cut-sm"
          :class="{ on: v.checked, off: v.off }"
          :aria-checked="v.checked"
          :aria-disabled="v.off"
          :disabled="v.off || !canControl || launched"
          :aria-label="v.aria"
          @click="pick(v.id)"
        >
          <div class="vcard-top">
            <span class="vcard-name">{{ v.name }}</span>
            <span
              v-if="v.off"
              class="vcard-lock"
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>
            </span>
            <span
              v-else
              class="vcard-radio"
              aria-hidden="true"
            ><i :class="{ on: v.checked }" /></span>
          </div>
          <div
            class="vcard-num"
            aria-hidden="true"
          >
            <span class="disp vcard-start">{{ v.start }}</span>
            <div class="vcard-ticks">
              <i
                v-for="(t, k) in v.ticks"
                :key="k"
                :style="{ height: t.h, background: t.bg }"
              />
            </div>
          </div>
          <span class="vcard-diff">{{ v.diffName }}</span>
          <span
            v-if="v.hasMode"
            class="vcard-modes"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            ><path d="M12 3c1.5 3-1 4.2-1 6a2 2 0 0 0 4 .2C16.7 11 18 13 18 15a6 6 0 0 1-12 0c0-3.2 2.2-5.5 3.4-7.6C10.3 5.4 11.3 4 12 3Z" /></svg>
            SEAF / Super Penance
          </span>
          <span
            v-else
            class="vcard-modes plain"
          >No mode · play as-is</span>
          <div class="vcard-kit">
            <span
              v-for="(k, i) in v.kit"
              :key="i"
            ><b>{{ k.m }}</b>{{ k.t }}</span>
          </div>
        </button>
      </div>
    </section>

    <section
      v-if="modeActive"
      class="modes"
      aria-label="Starting mode"
    >
      <div class="variants-head">
        <span class="lbl">Starting mode</span>
        <span class="variants-hint">{{ launched ? 'LOCKED FOR THIS CRUSADE' : 'PICK ONE · SEAF ASSISTS · PENANCE PAYS' }}</span>
      </div>
      <div class="mode-grid">
        <button
          v-for="m in MODES"
          :key="m.id"
          type="button"
          class="mcard cut-sm"
          :class="{ on: mode === m.id, penance: m.id === 'penance', lit: m.id === 'penance' && mode === 'penance' }"
          :aria-pressed="mode === m.id"
          :disabled="!canControl || launched"
          @click="pickMode(m.id)"
        >
          <span class="mcard-head">
            <span class="mcard-name">{{ m.name }}</span>
            <span
              v-if="m.id === 'penance'"
              class="flames"
              aria-hidden="true"
            >
              <i /><i /><i />
            </span>
            <span
              v-else
              class="mcard-badge"
            >ASSIST</span>
          </span>
          <span class="mcard-blurb">{{ m.blurb }}</span>
          <span class="mcard-kit">
            +{{ m.id === 'penance' ? (PENANCE_VALOR[selected.start] ?? 0) : (SEAF_SUPPORT_VALOR[selected.start] ?? 0) }} VALOR/MISSION · {{ m.kit }}
          </span>
        </button>
      </div>
    </section>

    <section
      class="modes"
      aria-labelledby="front-plan-h"
    >
      <div class="variants-head">
        <span
          id="front-plan-h"
          class="lbl"
        >Front</span>
        <span class="variants-hint">{{ launched ? 'LOCKED FOR THIS CRUSADE' : 'HOST SETS · LOCKS AT LAUNCH' }}</span>
      </div>
      <FrontPlanPicker
        v-model:plan="frontPlan"
        v-model:locked-front="lockedFront"
        :disabled="!canControl || launched"
      />
    </section>

    <div
      class="launch-row"
      :class="{ docked: phone }"
    >
      <PhoneActionBar :inline="!phone">
        <template #detail>
          <div
            class="launch-sum"
            :class="{ docked: phone }"
          >
            <div class="sum">
              <span class="lbl">Preparing to launch</span>
              <span
                v-if="!phone"
                class="disp sum-name"
              >{{ selected.name }}</span>
            </div>
            <div class="sum-box">
              <span class="lbl">Start</span>
              <span class="sum-v">{{ selected.start }} · {{ difficultyName(selected.start).toUpperCase() }}</span>
            </div>
            <div
              v-if="modeActive"
              class="sum-box"
            >
              <span class="lbl">Mode</span>
              <span class="sum-v">{{ mode === 'penance' ? 'SUPER PENANCE' : 'SEAF SUPPORT' }}</span>
            </div>
            <div class="sum-box">
              <span class="lbl">Front</span>
              <span class="sum-v">{{ frontLabel }}</span>
            </div>
            <div class="sum-box">
              <span class="lbl">Operation 1</span>
              <span class="sum-v sum-pips">
                <i
                  v-for="i in opMissions"
                  :key="i"
                />{{ opMissions }} MISSIONS
              </span>
            </div>
            <div class="sum-box">
              <span class="lbl">Base tier</span>
              <span
                class="tb sum-tier"
                :data-tier="selected.tier"
              >{{ selected.tier }}</span>
            </div>
          </div>
        </template>

        <template #primary>
          <HoldButton
            v-if="!launched"
            class="cta-sweep"
            :class="{ cut: phone }"
            label="Launch crusade"
            hint="HOLD TO LAUNCH · HOST"
            tone="gold"
            :disabled="!canControl"
            :aria-label="`Launch crusade as ${selected.name}, start at difficulty ${selected.start}${modeActive ? `, ${mode === 'penance' ? 'Super Penance' : 'SEAF Support Package'}` : ''}. Press and hold.`"
            @confirm="launchNow"
          />
          <div
            v-else
            class="launched-row"
            :class="{ docked: phone }"
          >
            <span class="disp launched-stamp stamp">Launched</span>
            <span class="btn primary cut launched-next">
              <span class="disp">To the wheel</span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                aria-hidden="true"
              ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </div>
        </template>
      </PhoneActionBar>
    </div>

    <div
      class="checks"
      role="status"
      aria-label="Pre-launch checks"
    >
      <span
        class="checks-strip"
        :class="launched ? 'hazard' : 'hazard crawl'"
        aria-hidden="true"
      />
      <span class="checks-title disp">{{ launched ? 'Launched' : 'Pre-launch' }}</span>
      <span
        v-for="k in checks"
        :key="k.label"
        class="check"
        :class="{ wait: k.wait }"
      >
        <svg
          v-if="k.ok"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--teal)"
          stroke-width="3"
          aria-hidden="true"
        ><path d="M5 12l5 5 9-10" /></svg>
        <span
          v-else
          class="pulse check-wait"
          aria-hidden="true"
        />
        <span class="check-label">{{ k.label }}</span>
        <span class="check-v">{{ k.v }}</span>
      </span>
    </div>
  </section>
</template>

<style scoped>
.lobby { gap: 0.7rem; min-height: 0; }

.lobby-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.lobby-head-l { display: flex; flex-direction: column; gap: 0.35rem; }
.lobby-title { margin: 0; font-size: var(--fs-h1); color: var(--text); }
.lobby-counts { display: flex; align-items: center; gap: 1.1rem; }
.count { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
.count-n { font-size: 1.6rem; color: var(--text); line-height: 1; }
.count-n i { font-style: normal; font-size: 1rem; color: var(--muted); }
.count-n.ready { color: var(--teal); }
.count-sep { width: 1px; height: 2.2rem; background: var(--line-2); }

/* Bays ------------------------------------------------------------------- */
.bays {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  min-height: 13.5rem;
}
.bay {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--line-2);
  overflow: hidden;
}
.bay.you { border-color: var(--line-4); }
.bay.empty { border-style: dashed; border-color: var(--line-4); }
.bay-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 2.1rem;
  padding: 0 0.75rem;
  border-bottom: 1px solid var(--line-1);
}
.bay-status { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; }
.bay-dot { width: 7px; height: 7px; }
.bay-body {
  position: relative;
  height: 7.5rem;
  background: var(--ground);
  overflow: hidden;
}
.clamp { position: absolute; height: 6px; width: 14px; background: var(--line-4); transition: width 0.22s ease-in; }
.clamp.left { left: 1.4rem; }
.clamp.right { right: 1.4rem; }
.clamp.left, .clamp.right { top: 3.4rem; }
.clamp.mid { top: 6rem; }
.pod {
  position: absolute;
  left: 50%;
  top: 0.35rem;
  width: 4.6rem;
  height: 6.9rem;
  margin-left: -2.3rem;
}
.pod svg { display: block; width: 100%; height: 100%; }
.pod-avatar {
  position: absolute;
  left: 1.25rem;
  top: 0.8rem;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  background: var(--line-2);
  color: var(--text);
}
.pod-avatar.you { background: var(--gold); color: var(--on-gold); }
.pod.dropping { animation: podDrop 0.78s cubic-bezier(0.5, 0, 0.85, 0.25) both; }
.streak {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 7.5rem;
  margin-left: -1px;
  background: linear-gradient(180deg, transparent, var(--gold));
  animation: streak 0.7s ease-out both;
}
.deployed {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
}
.bay-doors {
  position: relative;
  height: 10px;
  display: flex;
  overflow: hidden;
  background: var(--ground);
}
.bay-doors .door { width: 50%; height: 10px; background-color: var(--raised); }
.bay-doors .door-l { animation: doorL 0.28s ease-in both; }
.bay-doors .door-r { animation: doorR 0.28s ease-in both; }
.bay-foot { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.7rem 0.75rem 0.75rem; }
.bay-name-row { display: flex; align-items: center; gap: 0.45rem; }
.bay-name { font-size: 1rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.you-tag { margin-left: auto; padding: 2px 6px; border: 1px solid var(--gold); color: var(--gold); font-size: 9px; font-weight: 700; letter-spacing: 0.18em; }
.bay-wb { display: flex; align-items: center; gap: 0.45rem; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--khaki); }
.bay-wb b { color: var(--text); }
.await { font-size: 0.95rem; font-weight: 700; letter-spacing: 0.14em; color: var(--khaki); }
.await-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted); }

/* Variants --------------------------------------------------------------- */
.variants { display: flex; flex-direction: column; gap: 0.5rem; }
.variants-head { display: flex; align-items: center; justify-content: space-between; }
.variants-hint { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--muted); }
.variant-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
.vcard {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  padding: 0.85rem 0.85rem 0.8rem;
  background: var(--panel);
  border: 1px solid var(--line-2);
  color: var(--text);
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.vcard:hover:not(:disabled) { border-color: var(--line-4); }
.vcard.on { background: var(--raised); border-color: var(--line-5); }
.vcard.off { opacity: 0.45; cursor: not-allowed; }
.vcard-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.vcard-name { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap; }
.vcard-lock { color: var(--khaki); }
.vcard-radio { width: 1rem; height: 1rem; border: 1px solid var(--line-5); display: grid; place-items: center; }
.vcard-radio i { width: 0.5rem; height: 0.5rem; }
.vcard-radio i.on { background: var(--gold); }
.vcard-num { position: relative; height: 3.2rem; margin-top: 0.4rem; }
.vcard-start { position: absolute; left: 0; bottom: 1.4rem; font-size: 2.5rem; color: var(--text); }
.vcard.on .vcard-start { color: var(--gold); }
.vcard-ticks { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: flex-end; gap: 3px; height: 1.25rem; }
.vcard-ticks i { flex: 1 1 0; }
.vcard-diff { margin-top: 0.4rem; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--khaki); white-space: nowrap; }
.vcard.on .vcard-diff { color: var(--gold); }
.vcard-modes { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.6rem; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--khaki); white-space: nowrap; text-transform: uppercase; }
.vcard-modes.plain { color: var(--muted); }
.vcard-modes svg { color: var(--orange); flex-shrink: 0; }
.vcard-kit { display: flex; flex-direction: column; gap: 3px; margin-top: 0.45rem; }
.vcard-kit span { display: flex; align-items: baseline; gap: 0.4rem; font-size: 12px; line-height: 1.2; color: var(--khaki); }
.vcard-kit b { width: 8px; flex-shrink: 0; color: var(--line-5); }
.vcard-kit b:not(:empty) { color: var(--gold); }

/* Starting mode (hard/suicide) ------------------------------------------ */
.modes { display: flex; flex-direction: column; gap: 0.5rem; }
.mode-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.mcard {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-align: left;
  padding: 0.7rem 0.85rem;
  background: var(--panel);
  border: 1px solid var(--line-2);
  color: var(--text);
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.mcard:hover:not(:disabled) { border-color: var(--line-4); }
.mcard.on { background: var(--raised); border-color: var(--line-5); }
.mcard.penance.on { border-color: var(--orange); }
.mcard:disabled { opacity: 0.65; cursor: not-allowed; }
.mcard-head { display: flex; align-items: center; gap: 0.5rem; }
.mcard-name { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.mcard.on .mcard-name { color: var(--gold); }
.mcard.penance.on .mcard-name { color: var(--orange); }
.mcard-badge {
  margin-left: auto;
  padding: 1px 6px;
  border: 1px solid var(--teal);
  color: var(--teal);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
}
.mcard-blurb { font-size: 12px; line-height: 1.3; color: var(--khaki); }
.mcard-kit { margin-top: 0.15rem; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted); text-transform: uppercase; }
.mcard.on .mcard-kit { color: var(--khaki); }

/* Launch ----------------------------------------------------------------- */
.launch-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.launch-row :deep(.hold-btn) { width: 24.5rem; flex-shrink: 0; }
.launch-row :deep(.hold-label) { font-size: 21px; }
.launch-row.docked { display: none; }
.sum-box .lbl { font-size: 9px; }
.launch-sum { display: flex; align-items: center; gap: 0.5rem; }
.sum { display: flex; flex-direction: column; gap: 0.25rem; padding-right: 0.6rem; }
.sum-name { font-size: 1.25rem; color: var(--text); white-space: nowrap; }
.sum-box {
  height: 3.1rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--line-2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.sum-v { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; white-space: nowrap; }
.sum-pips i { width: 14px; height: 6px; border: 1px solid var(--khaki); margin-right: 3px; }
.sum-tier { min-width: 1.1rem; }
/* Pinned in the phone action bar: one compact strip of launch facts. */
.launch-sum.docked { display: grid; grid-template-columns: repeat(auto-fit, minmax(5.5rem, 1fr)); gap: 6px; }
.launch-sum.docked .sum { grid-column: 1 / -1; flex-direction: row; align-items: baseline; gap: 8px; padding: 0; }
.launch-sum.docked .sum-box { height: auto; gap: 4px; padding: 6px 8px; min-width: 0; }
.launch-sum.docked .sum-v { font-size: 0.7rem; letter-spacing: 0.06em; white-space: normal; }
.launch-sum.docked .sum-pips i { display: none; }
.launched-row { display: flex; align-items: center; gap: 1.4rem; }
.launched-row.docked { width: 100%; gap: 10px; }
.launched-row.docked .launched-next { flex: 1 1 auto; width: auto; min-width: 0; height: 56px; padding: 0 16px; }
.launched-row.docked .launched-stamp { padding: 0.35rem 0.6rem; font-size: 1rem; }
.launched-stamp {
  display: inline-block;
  padding: 0.5rem 0.9rem;
  font-size: 1.25rem;
  border: 3px solid var(--gold);
  color: var(--gold);
  animation-delay: 0.2s;
}
.launched-next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  width: 18.75rem;
  height: 3.875rem;
  padding: 0 1.5rem;
  animation: riseIn 0.45s var(--ease-out) both;
}

/* Checks ----------------------------------------------------------------- */
.checks {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0.5rem 0;
  border-top: 1px solid var(--line-1);
}
.checks-strip { width: 12px; height: 2.25rem; }
.checks-title { display: flex; align-items: center; height: 2.25rem; padding: 0 1rem 0 0.6rem; font-size: 0.9rem; color: var(--gold); white-space: nowrap; }
.check {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  height: 2.25rem;
  padding: 0 0.85rem;
  background: var(--panel);
  border: 1px solid var(--line-1);
  color: var(--khaki);
  white-space: nowrap;
}
.check.wait { background: transparent; border-color: var(--gold); color: var(--gold); }
.check-wait { width: 8px; height: 8px; background: var(--gold); }
.check-label { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
.check-v { margin-left: auto; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: var(--text); }
.check.wait .check-v { color: var(--gold); }

.waiting { display: flex; align-items: center; gap: 0.6rem; margin: 0; }

@media (max-width: 1020px) {
  .bays { grid-template-columns: repeat(2, minmax(0, 1fr)); min-height: 0; }
  .variant-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .launch-row { flex-direction: column; align-items: stretch; }
  .launch-sum { flex-wrap: wrap; }
  .checks { flex-wrap: wrap; }
  .check { flex: 1 1 8rem; }
}
</style>
