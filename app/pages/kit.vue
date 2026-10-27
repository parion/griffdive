<script setup lang="ts">
import { kitAllowedOnHost } from '~~/shared/kit-access'
import { ALL_ITEMS, CATALOG_VERSION, ITEMS_BY_ID, WARBONDS } from '~~/shared/data/catalog'
import { MISFORTUNES, PACTS } from '~~/shared/data/conditions'
import { FRONTS } from '~~/shared/data/fronts'
import { factionImageUrl, itemImageUrl, warbondImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import { REWARD_TOKEN_CAP, conditionRiskAt, missionsPerOperation } from '~~/shared/engine/config'
import { STARTING_KITS } from '~~/shared/engine/progression'
import type { RewardOption } from '~~/shared/engine/rewards'
import { tierZones } from '~~/shared/engine/rewards'
import type { DivePhase, RewardTier } from '~~/shared/engine/types'
import { deriveMisfortune } from '~~/shared/engine/wheel'
import { CURRENT_RELEASE } from '~/utils/release'

definePageMeta({ middleware: 'kit-gate' })

useHead({ meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

// The design sheet is a living reference: tokens and catalog facts are read at
// runtime, and the interactive specimens wrap the same components the app
// ships. It is reachable on a dev server and the Fly staging app only; the
// page middleware and server gate keep production on a 404.

const GOLD = '#FFD642'
const ORANGE = '#FF9F43'
const RED = '#FF4B3E'
const TEAL = '#4AD7C8'
const KHAKI = '#B8B08D'
const MUTED = '#9A9B82'
const DIM = '#85876F'
const TEXT = '#ECEADA'
const GROUND = '#0B0C09'
const PANEL = '#13150F'

const TIER: Record<RewardTier, string> = { 'C': '#9A9B82', 'B': '#6FBF73', 'A': '#4AD7C8', 'S': '#FFD642', 'S+': '#FF4B3E' }
const TIERS: RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

// ---- Live facts -----------------------------------------------------------

const facts = computed(() => [
  { n: ALL_ITEMS.length, label: 'items' },
  { n: WARBONDS.length, label: 'warbonds' },
  { n: PACTS.length, label: 'pacts' },
  { n: MISFORTUNES.length, label: 'directives' },
  { n: `v${CATALOG_VERSION}`, label: 'catalog' },
  { n: CURRENT_RELEASE.label, label: 'release' },
])

const onStaging = computed(() =>
  !import.meta.dev && kitAllowedOnHost(false, import.meta.client ? window.location.hostname : undefined))

// ---- Tokens ---------------------------------------------------------------

interface TokenSpec { name: string, var: string, role: string }
interface TokenGroup { label: string, items: TokenSpec[] }

const TOKEN_GROUPS: TokenGroup[] = [
  {
    label: 'Surface',
    items: [
      { name: 'Ground', var: '--ground', role: 'Stage' },
      { name: 'Rail', var: '--rail', role: 'Rails' },
      { name: 'Panel', var: '--panel', role: 'Panels' },
      { name: 'Raised', var: '--raised', role: 'Raised' },
    ],
  },
  {
    label: 'Lines',
    items: [
      { name: 'Line 1', var: '--line-1', role: 'Hairline' },
      { name: 'Line 2', var: '--line-2', role: 'Divider' },
      { name: 'Line 3', var: '--line-3', role: 'Frame' },
      { name: 'Line 4', var: '--line-4', role: 'Ghost' },
      { name: 'Line 5', var: '--line-5', role: 'Pip off' },
    ],
  },
  {
    label: 'Ink',
    items: [
      { name: 'Text', var: '--text', role: 'Primary' },
      { name: 'Khaki', var: '--khaki', role: 'Secondary' },
      { name: 'Muted', var: '--muted', role: 'Min body' },
      { name: 'Dim', var: '--dim', role: 'Large only' },
      { name: 'On gold', var: '--on-gold', role: 'On gold' },
    ],
  },
  {
    label: 'Signal',
    items: [
      { name: 'Gold', var: '--gold', role: 'Act now' },
      { name: 'Gold bright', var: '--gold-bright', role: 'Gain' },
      { name: 'Red', var: '--red', role: 'Danger' },
      { name: 'Orange', var: '--orange', role: 'Strain · MO' },
      { name: 'Teal', var: '--teal', role: 'Ready' },
      { name: 'Purple', var: '--purple', role: 'Illuminate' },
    ],
  },
  {
    label: 'Samples',
    items: [
      { name: 'Common', var: '--sample-common', role: 'Sample' },
      { name: 'Rare', var: '--sample-rare', role: 'Sample' },
      { name: 'Super', var: '--sample-super', role: 'Sample' },
    ],
  },
  {
    label: 'Category',
    items: [
      { name: 'Supply', var: '--cat-supply', role: 'Supply' },
      { name: 'Eagle', var: '--cat-eagle', role: 'Eagle' },
      { name: 'Orbital', var: '--cat-orbital', role: 'Orbital' },
      { name: 'Defense', var: '--cat-defense', role: 'Defense' },
      { name: 'Armor', var: '--cat-armor', role: 'Armor' },
      { name: 'Booster', var: '--cat-booster', role: 'Booster' },
      { name: 'Primary', var: '--cat-primary', role: 'Primary' },
      { name: 'Gear', var: '--cat-gear', role: 'Gear' },
    ],
  },
]

const tokenValues = ref<Record<string, string>>({})
const copiedToken = ref<string | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | undefined

function tokenValue(spec: TokenSpec): string {
  return tokenValues.value[spec.var] ?? ''
}

async function copyToken(spec: TokenSpec): Promise<void> {
  const value = tokenValue(spec)
  if (!value) {
    return
  }
  const text = `var(${spec.var}) /* ${value} */`
  try {
    await navigator.clipboard?.writeText(text)
  }
  catch {
    // Clipboard permission is a browser setting; the sheet still shows the value.
    return
  }
  copiedToken.value = spec.var
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copiedToken.value = null
  }, 1400)
}

// ---- Type & frames --------------------------------------------------------

const typeSpecimen = ref('Risk buys rarity.')

// ---- Controls -------------------------------------------------------------

const holdAccepted = ref(false)
const floatingBanner = ref(false)
let holdReset: ReturnType<typeof setTimeout> | undefined
function onHoldConfirm(): void {
  holdAccepted.value = true
  clearTimeout(holdReset)
  holdReset = setTimeout(() => {
    holdAccepted.value = false
  }, 1600)
}

const stars = ref(4)
const samples = ref(14)
const toggleA = ref(false)
const toggleB = ref(true)
const demoDialog = ref(false)
const { push: pushToast } = useToasts()

// ---- Atoms ----------------------------------------------------------------

function itemById(id: string): Item {
  return ITEMS_BY_ID.get(id) ?? ALL_ITEMS[0]!
}

const tokenRows = Array.from({ length: REWARD_TOKEN_CAP + 1 }, (_, n) => ({
  n,
  max: n === REWARD_TOKEN_CAP,
  dots: Array.from({ length: REWARD_TOKEN_CAP }, (_, i) => ({ on: i < n })),
}))

const tags = [
  {
    name: 'Griffon', serial: 'SES 07·1188', status: 'AT THE WHEEL', host: true, you: true,
    lightC: GOLD, lightText: GOLD, edge: GOLD, inset: '2px', bg: '#1F2216', hole: GOLD, nameC: GOLD, pulse: true, tokens: 1,
  },
  {
    name: 'Vox', serial: 'SES 07·2913', status: 'READY', host: false, you: false,
    lightC: TEAL, lightText: TEAL, edge: '#3A3F2E', inset: '1px', bg: PANEL, hole: '#454A36', nameC: TEXT, pulse: false, tokens: 2,
  },
  {
    name: 'Birdie', serial: 'SES 07·0561', status: 'RECONNECTING', host: false, you: false,
    lightC: DIM, lightText: MUTED, edge: '#2C3022', inset: '1px', bg: '#0F110C', hole: '#3A3F2E', nameC: DIM, pulse: true, tokens: 1,
  },
]

const REGISTRY = [
  { g: 'A', label: 'Citizens', c: GOLD, tint: 'rgba(255,214,66,.08)' },
  { g: 'B', label: 'Residents', c: KHAKI, tint: 'rgba(184,176,141,.07)' },
  { g: 'C', label: 'Conscripts', c: KHAKI, tint: 'rgba(184,176,141,.07)' },
  { g: 'D', label: 'Debtors', c: ORANGE, tint: 'rgba(255,159,67,.08)' },
  { g: 'E', label: 'Griffdivers', c: RED, tint: 'rgba(255,75,62,.09)' },
]

const regBefore = REGISTRY.map((r, i) => ({
  ...r,
  tc: i === 0 ? '#141410' : r.c,
  cbd: r.c,
  cbg: i === 0 ? r.c : 'transparent',
  fg: i === 0 ? TEXT : MUTED,
  strike: false,
  bg: i === 0 ? r.tint : 'transparent',
  hell: i === 0,
  you: false,
}))
const regAfter = REGISTRY.map((r, i) => ({
  ...r,
  tc: i === 4 ? '#141410' : '#5A5E45',
  cbd: i < 4 ? '#3A3F2E' : r.c,
  cbg: i === 4 ? r.c : 'transparent',
  fg: i === 4 ? TEXT : DIM,
  strike: i < 4,
  bg: i === 4 ? r.tint : 'transparent',
  hell: i === 0,
  hellFg: '#85876F',
  hellBg: 'transparent',
  hellBd: '#3A3F2E',
  you: i === 4,
}))

const STAMPS = [
  { t: 'Accepted', c: GOLD },
  { t: 'Opted out', c: KHAKI },
  { t: 'Sworn', c: RED },
  { t: 'Voided', c: RED },
  { t: 'Banked', c: GOLD },
  { t: 'Banned', c: RED },
  { t: 'Confiscated', c: RED },
  { t: 'Locked', c: TEXT },
]

const CONTRAST = [
  { fg: TEXT, bg: GROUND, pair: '#ECEADA / #0B0C09', r: '16.2', pass: true },
  { fg: MUTED, bg: PANEL, pair: '#9A9B82 / #13150F', r: '6.5', pass: true },
  { fg: '#141410', bg: GOLD, pair: '#141410 / #FFD642', r: '13.1', pass: true },
  { fg: '#5A5E45', bg: PANEL, pair: '#5A5E45 / #13150F', r: '2.7', pass: false },
]

const kitStratagems = STARTING_KITS.medium.stratagems.map((id) => {
  const item = itemById(id)
  return { id, name: item.displayName, img: itemImageUrl(item) }
})

// ---- Live gameplay specimens ---------------------------------------------

// Pact hand: the real ConditionCards, with risk read at the chosen rung. The
// odds line below is the engine's own preview for the sworn risk.
const pactDifficulty = ref(7)
const pactSelection = ref<string[]>([])
const PACT_DEMO = [
  { id: 'packLight', stamp: '', stampTone: 'gold' as const, selectable: true },
  { id: 'primaryConcern', stamp: '', stampTone: 'gold' as const, selectable: true },
  { id: 'untouchable', stamp: 'Sworn', stampTone: 'red' as const, selectable: false },
  { id: 'openField', stamp: '', stampTone: 'gold' as const, selectable: true },
]

const pactCards = computed(() => PACT_DEMO.map(entry => ({
  ...entry,
  condition: PACTS.find(condition => condition.id === entry.id)!,
  risk: conditionRiskAt(entry.id, pactDifficulty.value),
})))

const pactRiskTotal = computed(() =>
  pactSelection.value.reduce((sum, id) => sum + conditionRiskAt(id, pactDifficulty.value), 0))

const PACT_BASE_VALOR = 2
const pactBaseZones = computed(() => tierZones(pactDifficulty.value, PACT_BASE_VALOR))
const pactPreviewZones = computed(() => tierZones(pactDifficulty.value, PACT_BASE_VALOR + pactRiskTotal.value))
const pactDeltas = computed<Partial<Record<RewardTier, number>>>(() => {
  const deltas: Partial<Record<RewardTier, number>> = {}
  for (const zone of pactPreviewZones.value) {
    const base = pactBaseZones.value.find(entry => entry.tier === zone.tier)
    deltas[zone.tier] = (zone.chance - (base?.chance ?? 0)) * 100
  }
  return deltas
})

function togglePact(id: string): void {
  pactSelection.value = pactSelection.value.includes(id)
    ? pactSelection.value.filter(entry => entry !== id)
    : [...pactSelection.value, id]
}

// Wheel: the landing is a seed, exactly like the dive. Re-rolling writes a new
// integer and every part of the caption re-derives from it.
const wheelDifficulty = ref(7)
const wheelSeed = ref<number | null>(null)
const wheelDraw = computed(() => (wheelSeed.value === null ? null : deriveMisfortune(wheelSeed.value)))
const wheelRisk = computed(() => (wheelDraw.value ? conditionRiskAt(wheelDraw.value.id, wheelDifficulty.value) : 0))

function spinWheel(): void {
  wheelSeed.value = Math.floor(Math.random() * 2_000_000_000)
}

// The current four-beat dive rail, driven by real phase values.
const demoPhase = ref<DivePhase>('pacts')
const PHASE_OPTIONS: { id: DivePhase, label: string }[] = [
  { id: 'spin', label: 'Call' },
  { id: 'pacts', label: 'Pacts' },
  { id: 'diving', label: 'Dive' },
  { id: 'rewards', label: 'Loot' },
  { id: 'forfeit', label: 'Failure' },
]

// ---- Warbonds, seats, strip, reveal ---------------------------------------

const warbondTiles = computed(() => WARBONDS.map(warbond => ({
  code: warbond.code,
  name: warbond.displayName,
  count: ALL_ITEMS.filter(item => item.warbondCode === warbond.code).length,
  image: warbondImageUrl(warbond),
  special: warbond.code === 'warbond0' || warbond.code === 'warbond1',
})))
const warbonds = ref<Record<string, boolean>>(
  Object.fromEntries(WARBONDS.map((warbond, index) => [warbond.code, index < 4])),
)
const ownedWarbondCount = computed(() => Object.values(warbonds.value).filter(Boolean).length)

const diverName = ref('')
const seats = computed(() => {
  const base = [
    { init: 'G', label: 'GRIFFON', host: true, cls: '', stroke: '#5A5E45', avBg: '#2C3022', avFg: TEXT, fg: KHAKI },
    { init: 'V', label: 'VOX', host: false, cls: '', stroke: '#5A5E45', avBg: '#2C3022', avFg: TEXT, fg: KHAKI },
    { init: 'T', label: 'TALLOW', host: false, cls: '', stroke: '#5A5E45', avBg: '#2C3022', avFg: TEXT, fg: KHAKI },
  ]
  const initial = diverName.value.trim() ? diverName.value.trim()[0]!.toUpperCase() : 'B'
  base.push({ init: initial, label: 'YOU', host: false, cls: 'seat-live', stroke: GOLD, avBg: GOLD, avFg: '#141410', fg: GOLD })
  return base
})

// Liberty's Cross specimen: bumping the key remounts the band so the unfurl replays.
const crossRun = ref(0)
const crossClaimed = ref<string | null>(null)

// Reward reveal specimen: one pull per tier, dealt out of order, each pinned
// mid-zone on a difficulty 10 line so the whole ladder lands in one replay.
const lootRun = ref(0)
const LOOT_DIFFICULTY = 10
const LOOT_VALOR = 60
const lootOptions = computed<RewardOption[]>(() => {
  const zones = tierZones(LOOT_DIFFICULTY, LOOT_VALOR)
  const rollIn = (tier: RewardTier) => {
    const zone = zones.find(entry => entry.tier === tier)!
    return Math.round((zone.start + zone.end) / 2)
  }
  const deal: RewardTier[] = ['B', 'S', 'C', 'A', 'S+']
  return deal.map((tier, index) => ({
    optionId: `kit-loot-${index}`,
    item: ALL_ITEMS.find(item => item.tier === (tier === 'S+' ? 's' : tier.toLowerCase()))!,
    choice: tier === 'S+',
    roll: rollIn(tier),
    tier,
  }))
})

const stripDiff = ref(10)
const stripMission = ref(1)
const stripFailed = ref(false)
const stripAchieved = ref(false)
const stripRoute = ref(false)
const stripOpLength = computed(() => missionsPerOperation(stripDiff.value))
watch(stripDiff, () => {
  stripMission.value = Math.min(stripMission.value, stripOpLength.value)
})

onMounted(() => {
  const style = getComputedStyle(document.documentElement)
  for (const group of TOKEN_GROUPS) {
    for (const spec of group.items) {
      tokenValues.value[spec.var] = style.getPropertyValue(spec.var).trim()
    }
  }
})

onBeforeUnmount(() => {
  clearTimeout(copyTimer)
  clearTimeout(holdReset)
})
</script>

<template>
  <main
    id="main-content"
    class="page kit"
    tabindex="-1"
  >
    <header class="kit-head">
      <div class="kit-head-l">
        <div class="kit-crumb">
          <svg
            width="16"
            height="16"
            viewBox="0 0 512 512"
            aria-hidden="true"
          ><g
            fill="none"
            stroke="#FFD642"
            stroke-width="56"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M256 96 L256 206" /><path d="M160 226 L256 322 L352 226" /><path d="M188 362 L256 430 L324 362" /></g></svg>
          <span class="disp sn">01</span>
          <span
            class="lbl"
            style="color: var(--text)"
          >Griffdive · design system</span>
          <span
            class="lbl"
            style="font-size: 10px"
          >Destroyer Terminal · live sheet</span>
          <span
            v-if="onStaging"
            class="kit-stage"
          >STAGING</span>
        </div>
        <h1 class="disp kit-title">
          Destroyer <span style="color: var(--gold)">Terminal</span>
        </h1>
        <p class="kit-lede">
          Tokens, components and the game surfaces they power. This sheet reads the same catalog,
          engine odds and shared components the app ships — no mock numbers, no retired mechanics.
        </p>
        <div
          class="kit-facts"
          role="list"
          aria-label="Live catalog facts"
        >
          <span
            v-for="f in facts"
            :key="f.label"
            role="listitem"
            class="kit-fact"
          >
            <b class="disp">{{ f.n }}</b><span>{{ f.label }}</span>
          </span>
        </div>
        <nav
          class="kit-jump"
          aria-label="Sheet sections"
        >
          <a href="#tokens">Tokens</a>
          <a href="#type">Type</a>
          <a href="#frames">Frames</a>
          <a href="#controls">Controls</a>
          <a href="#banners">Banners</a>
          <a href="#atoms">Atoms</a>
          <a href="#console">Console</a>
          <a href="#wheel">Wheel</a>
          <a href="#briefing">Briefing</a>
          <a href="#liberty">Liberty’s Cross</a>
        </nav>
        <NuxtLink
          class="kit-back"
          to="/"
        >← Back to the Bridge</NuxtLink>
      </div>
      <ol
        class="maxims"
        aria-label="Maxims"
      >
        <li class="maxim">
          <span
            class="disp maxim-n"
            style="color: var(--gold); border-right: 1px solid #2C3022"
          >1</span>
          <span class="maxim-t">SHOW THE MECHANIC</span>
          <span
            class="maxim-viz"
            aria-hidden="true"
          >
            <span style="width: 6px; height: 12px; background: #FFD642" />
            <span style="width: 6px; height: 12px; background: #FFD642" />
            <span style="width: 6px; height: 12px; background: #FF9F43" />
            <span style="width: 6px; height: 12px; background: #FF4B3E" />
            <span style="width: 6px; height: 12px; background: #FF4B3E" />
            <span style="width: 6px; height: 12px; border: 1px solid #3A3F2E" />
          </span>
        </li>
        <li class="maxim">
          <span
            class="disp maxim-n"
            style="color: #141410; background: #FFD642"
          >2</span>
          <span class="maxim-t">ONE GOLD ACTION PER MOMENT</span>
          <span
            class="maxim-viz"
            aria-hidden="true"
          >
            <span style="width: 11px; height: 11px; border: 1px solid #454A36" />
            <span style="width: 11px; height: 11px; background: #FFD642" />
            <span style="width: 11px; height: 11px; border: 1px solid #454A36" />
          </span>
        </li>
        <li class="maxim">
          <span
            class="disp maxim-n"
            style="color: var(--gold); border-right: 1px solid #2C3022"
          >3</span>
          <span class="maxim-t">COMMIT WITH A HOLD</span>
          <span
            class="maxim-viz"
            aria-hidden="true"
          >
            <span class="maxim-hold">
              <span
                class="hazard crawl"
                style="position: absolute; left: 0; top: 0; bottom: 0; width: 60%; opacity: .8"
              />
            </span>
          </span>
        </li>
        <li class="maxim">
          <span
            class="disp maxim-n"
            style="color: var(--gold); border-right: 1px solid #2C3022"
          >4</span>
          <span class="maxim-t">RISK READS AS SKULLS</span>
          <span
            class="maxim-viz"
            aria-hidden="true"
          >
            <svg
              v-for="(s, i) in [RED, RED, '#2C3022']"
              :key="i"
              width="13"
              height="13"
              viewBox="0 0 16 16"
            ><path
              :fill="s"
              d="M8 1C4.4 1 2 3.5 2 6.8c0 1.9.9 3.3 2.2 4.1V14h1.9v-1.6h1V14h1.8v-1.6h1V14h1.9v-3.1C13.1 10.1 14 8.7 14 6.8 14 3.5 11.6 1 8 1Z"
            /><circle
              cx="5.6"
              cy="7.2"
              r="1.5"
              fill="#13150F"
            /><circle
              cx="10.4"
              cy="7.2"
              r="1.5"
              fill="#13150F"
            /></svg>
          </span>
        </li>
      </ol>
    </header>

    <!-- 02 · Tokens -->
    <section
      id="tokens"
      class="sec sec-live"
      aria-labelledby="tokens-h"
    >
      <div class="sh">
        <span class="disp sn">02</span><h2
          id="tokens-h"
          class="lbl"
        >
          Tokens
        </h2><span class="dash" /><span class="sub">Live CSS custom properties · click a swatch to copy</span>
      </div>
      <div class="token-groups">
        <div
          v-for="group in TOKEN_GROUPS"
          :key="group.label"
          class="token-group"
        >
          <span class="vl">{{ group.label }}</span>
          <div class="token-row">
            <button
              v-for="token in group.items"
              :key="token.var"
              class="sw"
              type="button"
              :aria-label="`Copy ${token.var} ${tokenValue(token) || 'value not loaded'}`"
              @click="copyToken(token)"
            >
              <span
                class="sw-b"
                :style="{ background: `var(${token.var})` }"
              >
                <span
                  v-if="copiedToken === token.var"
                  class="sw-copied"
                >COPIED</span>
              </span>
              <span class="sw-n">{{ token.name }}</span>
              <span class="sw-h">{{ tokenValue(token) || '—' }}</span>
              <span class="sw-r">{{ token.role }}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="token-foot">
        <div class="grp">
          <span class="vl">Tiers</span>
          <div
            v-for="tier in TIERS"
            :key="tier"
            class="tier-col"
          >
            <span
              class="tier-swatch"
              :style="{ background: `var(--tier-${tier === 'S+' ? 'splus' : tier.toLowerCase()})` }"
            />
            <span
              class="tb tier-chip"
              :style="{ color: TIER[tier], border: `1px solid ${TIER[tier]}` }"
            >{{ tier }}</span>
            <span class="sw-h">{{ TIER[tier] }}</span>
          </div>
        </div>
        <div class="grp">
          <span class="vl">Fronts</span>
          <div
            v-for="front in FRONTS"
            :key="front.id"
            class="front-col"
          >
            <img
              :src="factionImageUrl(front.id)"
              alt=""
              width="34"
              height="34"
            >
            <span
              class="sw-n"
              :style="{ color: front.accent }"
            >{{ front.displayName }}</span>
            <span class="sw-h">{{ front.accent.toUpperCase() }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 03 · Type -->
    <section
      id="type"
      class="sec"
      aria-labelledby="type-h"
    >
      <div class="sh">
        <span class="disp sn">03</span><h2
          id="type-h"
          class="lbl"
        >
          Type
        </h2><span class="dash" /><span class="sub">Archivo display · Chakra Petch body · live sample</span>
      </div>
      <div class="type-grid">
        <div class="type-ramp">
          <span
            class="sub"
            style="color: #FFD642; margin-bottom: 3px"
          >Archivo · 800 · wdth 125</span>
          <div
            v-for="line in [{ s: '56', t: 'Dive', c: '#ECEADA' }, { s: '38', t: 'Odds line', c: '#FFD642' }, { s: '26', t: 'Automatons', c: '#FF4B3E' }, { s: '17', t: 'Super Helldive', c: '#ECEADA' }]"
            :key="line.t"
            class="type-line"
          >
            <span class="cap type-line-s">{{ line.s }}</span>
            <span
              class="disp"
              :style="{ fontSize: `${line.s}px`, lineHeight: '.85', color: line.c, letterSpacing: line.s === '17' ? '.06em' : '0' }"
            >{{ line.t }}</span>
          </div>
          <div class="type-line">
            <span class="cap type-line-s">Num</span>
            <span
              class="disp"
              style="font-size: 26px; color: #B8B08D"
            >0123456789</span>
          </div>
        </div>
        <div class="type-body">
          <span
            class="sub"
            style="color: #FFD642; margin-bottom: 2px"
          >Chakra Petch · 400–700</span>
          <div class="type-spec">
            <span class="cap">16 · 500 · rule</span>
            <span style="font-size: 16px; font-weight: 500; line-height: 20px">I bring no backpack.</span>
          </div>
          <div class="type-spec">
            <span class="cap">14 · 700 · name</span>
            <span style="font-size: 14px; font-weight: 700; letter-spacing: .08em; line-height: 18px; text-transform: uppercase">Jet Brigade <span style="color: #FF9F43">+2</span></span>
          </div>
          <div class="type-spec">
            <span class="cap">12 · 400 · meta</span>
            <span style="font-size: 12px; font-weight: 400; line-height: 16px; color: #B8B08D">Code or link only</span>
          </div>
          <div class="type-spec">
            <span class="cap">11 · 600 · .18em · lbl</span>
            <span
              class="lbl"
              style="line-height: 14px"
            >Odds line</span>
          </div>
        </div>
      </div>
      <div class="type-live">
        <label
          class="sub"
          for="type-sample"
        >Live sample · type anything</label>
        <div class="type-live-row">
          <input
            id="type-sample"
            v-model="typeSpecimen"
            class="nb"
            type="text"
            maxlength="48"
            spellcheck="false"
            placeholder="Risk buys rarity."
          >
          <span class="cap">{{ typeSpecimen.length }} / 48</span>
        </div>
        <div class="type-live-pair">
          <span class="disp type-live-display">{{ typeSpecimen || 'Risk buys rarity.' }}</span>
          <span class="type-live-body">{{ typeSpecimen || 'Risk buys rarity.' }}</span>
        </div>
      </div>
      <div class="directive-sample">
        <div class="directive-copy">
          <span class="lbl">Squad Directive · whole squad</span>
          <span class="disp directive-name">No Orbitals</span>
          <span class="directive-rule">No orbital stratagems.</span>
        </div>
        <RiskPips
          :value="2"
          :max="2"
        />
      </div>
    </section>

    <!-- 04 · Frames and motifs -->
    <section
      id="frames"
      class="sec"
      aria-label="Frames and motifs"
    >
      <div class="sh">
        <span class="disp sn">04</span><h2 class="lbl">
          Frames &amp; motifs
        </h2><span class="dash" /><span class="sub">Square · 1px · no shadows</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; height: 72px">
        <div style="display: flex; flex-direction: column; justify-content: space-between; padding: 10px 12px; background: #13150F; border: 1px solid #3A3F2E">
          <span
            class="lbl"
            style="color: #ECEADA"
          >Panel</span><span class="cap">#13150F · 1px</span>
        </div>
        <div
          class="ticks"
          style="display: flex; flex-direction: column; justify-content: space-between; padding: 10px 12px; background-color: #13150F; border: 1px solid #3A3F2E"
        >
          <span
            class="lbl"
            style="color: #FFD642"
          >Focal</span><span class="cap">ticks · 14px</span>
        </div>
        <div
          class="ticks ticks-red"
          style="display: flex; flex-direction: column; justify-content: space-between; padding: 10px 12px; background-color: rgba(255,75,62,.07); border: 1px solid rgba(255,75,62,.45)"
        >
          <span
            class="lbl"
            style="color: #FF4B3E"
          >Alert</span><span class="cap">ticks-red · tint</span>
        </div>
        <div
          class="grid-bg scan"
          style="position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 10px 12px; background-color: #0B0C09; border: 1px solid #23261C"
        >
          <span
            aria-hidden="true"
            style="position: absolute; left: 0; right: 0; top: 0; height: 8px; background: linear-gradient(180deg, transparent, rgba(255,214,66,.14)); animation: sweep 4.5s linear infinite"
          />
          <span
            class="lbl"
            style="position: relative; color: #ECEADA"
          >Stage</span><span
            class="cap"
            style="position: relative"
          >grid 40 · scan 3</span>
        </div>
      </div>
      <div style="display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap">
        <div class="cell">
          <span
            class="hazard"
            style="display: block; width: 84px; height: 32px"
          /><span class="cap"><b>hazard</b></span><span class="cap">Commit</span>
        </div>
        <div class="cell">
          <span
            class="hazard-red"
            style="display: block; width: 84px; height: 32px"
          /><span class="cap"><b>hazard-red</b></span><span class="cap">Danger</span>
        </div>
        <div class="cell">
          <span
            class="hazard-soft"
            style="display: block; width: 84px; height: 32px; background-color: #13150F; border: 1px solid rgba(255,214,66,.5)"
          /><span class="cap"><b>hazard-soft</b></span><span class="cap">Pending</span>
        </div>
        <div class="cell">
          <span
            class="cut"
            style="display: block; width: 84px; height: 32px; background: #FFD642"
          /><span class="cap"><b>cut · 10</b></span><span class="cap">Filled btn</span>
        </div>
        <div class="cell">
          <span
            class="cut-sm disp"
            style="display: grid; place-items: center; width: 32px; height: 32px; background: #FFD642; color: #141410; font-size: 15px"
          >G</span><span class="cap"><b>cut-sm</b></span><span class="cap">Avatar</span>
        </div>
        <div class="cell">
          <span style="display: flex; flex-direction: column; justify-content: space-around; width: 64px; height: 32px">
            <span style="height: 1px; background: repeating-linear-gradient(90deg, #454A36 0 6px, transparent 6px 10px)" />
            <span style="height: 14px; border: 1px dashed #454A36" />
          </span><span class="cap"><b>dash</b></span><span class="cap">Rule · slot</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; max-width: 560px">
        <div style="display: flex; gap: 4px">
          <div
            class="chev-first"
            style="flex: 1 1 0; height: 34px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #23261C; color: #B8B08D"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            ><path d="M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0M12 3v18M3 12h18" /></svg>
            <span style="font-size: 11px; font-weight: 700; letter-spacing: .2em">CALL</span>
          </div>
          <div
            class="chev"
            aria-current="step"
            style="flex: 1 1 0; height: 34px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #FFD642; color: #141410"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            ><path d="M12 21v-8M12 13L6 7M12 13l6-6M4 3h5v5M20 3h-5v5" /></svg>
            <span style="font-size: 11px; font-weight: 700; letter-spacing: .2em">PACTS</span>
          </div>
          <div
            class="chev"
            style="flex: 1 1 0; height: 34px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #13150F; color: #85876F"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            ><path d="M6 3h12v14l-6 4-6-4zM9 8h6M9 12h6" /></svg>
            <span style="font-size: 11px; font-weight: 700; letter-spacing: .2em">DIVE</span>
          </div>
          <div
            class="chev"
            style="flex: 1 1 0; height: 34px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #FF4B3E; color: #141410"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            ><path d="M12 3l10 18H2zM12 10v5M12 18v.01" /></svg>
            <span style="font-size: 11px; font-weight: 700; letter-spacing: .2em">FORFEIT</span>
          </div>
        </div>
        <div style="display: flex; gap: 4px">
          <span
            class="cap"
            style="flex: 1 1 0; text-align: center"
          >Done</span><span
            class="cap"
            style="flex: 1 1 0; text-align: center; color: #FFD642"
          >Current · aria-current</span><span
            class="cap"
            style="flex: 1 1 0; text-align: center"
          >Next</span><span
            class="cap"
            style="flex: 1 1 0; text-align: center; color: #FF4B3E"
          >Failed</span>
        </div>
      </div>
    </section>

    <!-- 05 · Controls -->
    <section
      id="controls"
      class="sec"
      aria-label="Controls"
    >
      <div class="sh">
        <span class="disp sn">05</span><h2 class="lbl">
          Controls
        </h2><span class="dash" /><span class="sub">Real components · hold, rate, focus, overlay</span>
      </div>
      <div class="control-grid">
        <div class="cell">
          <AppHoldButton
            label="Accept +2"
            hint="Hold to lock"
            @confirm="onHoldConfirm"
          />
          <span
            class="cap"
            aria-live="polite"
          ><b>{{ holdAccepted ? 'Accepted' : 'Idle' }}</b> · {{ holdAccepted ? 'real AppHoldButton · resets' : 'hold 0.65s · try it' }}</span>
        </div>
        <div class="cell">
          <AppStarRating v-model="stars" />
          <span class="cap"><b>Star radio</b> · real AppStarRating · {{ stars }}/5</span>
        </div>
        <div class="cell overlay-demos">
          <div class="overlay-row">
            <button
              class="ghost"
              type="button"
              @click="demoDialog = true"
            >
              OPEN DIALOG
            </button>
            <AppTooltip content="Focus trap, Escape and focus return are handled by Reka.">
              <button
                class="icon-btn"
                aria-label="Tooltip example"
                type="button"
              >
                ?
              </button>
            </AppTooltip>
            <button
              class="ghost"
              type="button"
              @click="pushToast('Toast · squad synced')"
            >
              TOAST
            </button>
          </div>
          <span class="cap"><b>Overlays</b> · AppDialog · AppTooltip · toast queue</span>
        </div>
      </div>
      <AppDialog
        v-model:open="demoDialog"
        title="AppDialog"
        description="The shared modal wrapper: focus trap, Escape and focus return."
      >
        <p class="dialog-copy">
          Dialogs are Reka primitives behind one themed wrapper. This one is live — close it with
          Escape, the X, or the button.
        </p>
        <template #footer>
          <button
            class="btn cut"
            style="height: 44px; padding: 0 18px; background: #FFD642; color: #141410"
            type="button"
            @click="demoDialog = false"
          >
            Close
          </button>
        </template>
      </AppDialog>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px">
        <div class="cell">
          <button
            class="btn cut"
            style="display: flex; align-items: center; gap: 14px; height: 44px; padding: 0 16px; background: #FFD642; color: #141410"
            type="button"
          >
            <span
              class="disp"
              style="font-size: 14px"
            >File report</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button><span class="cap"><b>Primary</b> · cut</span>
        </div>
        <div class="cell">
          <button
            class="ghost"
            style="height: 44px; padding: 0 14px; font-size: 11px; font-weight: 700; letter-spacing: .16em; color: #ECEADA"
            type="button"
          >
            OPT OUT
          </button><span class="cap"><b>Ghost</b></span>
        </div>
        <div class="cell">
          <button
            class="ghost ghost-red"
            style="display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 14px; border-color: #FF4B3E; color: #FF4B3E"
            type="button"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            ><path d="M6 3h12v14l-6 4-6-4zM3 3l18 18" /></svg><span style="font-size: 12px; font-weight: 700; letter-spacing: .14em">MARK BROKEN</span>
          </button><span class="cap"><b>Danger</b> · outline</span>
        </div>
        <div class="cell">
          <button
            class="btn cut"
            disabled
            style="height: 44px; padding: 0 20px; background: #FFD642; color: #141410"
            type="button"
          >
            <span
              class="disp"
              style="font-size: 14px"
            >Spin</span>
          </button><span class="cap"><b>Disabled</b> · 40%</span>
        </div>
        <div class="cell">
          <div style="display: flex; align-items: center; gap: 10px">
            <button
              class="icon-btn"
              aria-label="Copy invite link"
              style="width: 44px; height: 44px; display: grid; place-items: center; border-color: #2C3022"
              type="button"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              ><rect
                x="8"
                y="8"
                width="12"
                height="12"
              /><path d="M16 8V4H4v12h4" /></svg>
            </button>
            <span
              aria-hidden="true"
              style="display: flex; flex-direction: column; gap: 3px"
            ><span class="cap">aria-label</span><span style="font-size: 12px; font-weight: 600; color: #ECEADA; white-space: nowrap">"Copy invite link"</span></span>
          </div><span class="cap"><b>Icon</b> · 44 · labelled</span>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px">
        <div class="cell">
          <button
            class="chip"
            :aria-pressed="toggleA"
            :style="{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 12px', background: toggleA ? 'rgba(255,214,66,.08)' : 'transparent', border: `1px solid ${toggleA ? '#FFD642' : '#2C3022'}`, color: toggleA ? '#FFD642' : '#B8B08D' }"
            type="button"
            @click="toggleA = !toggleA"
          >
            <span
              aria-hidden="true"
              :style="{ width: '12px', height: '12px', border: `1px solid ${toggleA ? '#FFD642' : '#2C3022'}`, display: 'grid', placeItems: 'center' }"
            ><span :style="{ width: '6px', height: '6px', background: toggleA ? '#FFD642' : 'transparent' }" /></span><span style="font-size: 12px; font-weight: 700; letter-spacing: .12em; white-space: nowrap">PRIMARY</span><span style="font-size: 12px; font-weight: 700">2</span>
          </button><span class="cap"><b>Toggle</b> · {{ toggleA ? 'pressed · true' : 'pressed · false' }}</span>
        </div>
        <div class="cell">
          <button
            class="chip"
            :aria-pressed="toggleB"
            :style="{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 12px', background: toggleB ? 'rgba(255,214,66,.08)' : 'transparent', border: `1px solid ${toggleB ? '#FFD642' : '#2C3022'}`, color: toggleB ? '#FFD642' : '#B8B08D' }"
            type="button"
            @click="toggleB = !toggleB"
          >
            <span
              aria-hidden="true"
              :style="{ width: '12px', height: '12px', border: `1px solid ${toggleB ? '#FFD642' : '#2C3022'}`, display: 'grid', placeItems: 'center' }"
            ><span :style="{ width: '6px', height: '6px', background: toggleB ? '#FFD642' : 'transparent' }" /></span><span style="font-size: 12px; font-weight: 700; letter-spacing: .12em; white-space: nowrap">STRATAGEMS</span><span style="font-size: 12px; font-weight: 700">9</span>
          </button><span class="cap"><b>Toggle</b> · {{ toggleB ? 'pressed · true' : 'pressed · false' }}</span>
        </div>
        <div class="cell">
          <button
            class="ghost ring-demo"
            type="button"
          >
            TAB TO FOCUS
          </button>
          <span class="cap"><b>Focus</b> · 2px gold ring · 3px offset</span>
        </div>
        <div class="cell">
          <MissionSampleCanister
            v-model="samples"
            :max="40"
            tone="common"
            label="Common"
            icon="/images/svgs/Common_Sample_Icon.svg"
          /><span class="cap"><b>Tube slider</b> · {{ samples }}/40</span>
        </div>
      </div>
    </section>

    <!-- 05b · Banners -->
    <section
      id="banners"
      class="sec"
      aria-label="Banners"
    >
      <div class="sh">
        <span class="disp sn">05b</span><h2 class="lbl">
          Banners
        </h2><span class="dash" /><span class="sub">Real AppBanner · info · warn · error · locked · floating</span>
      </div>
      <p class="sec-note">
        One standing message, one shape: a tone glyph, a tone edge, the copy, then optional actions.
        Errors are <code>role="alert"</code>; the rest are <code>role="status"</code>. Each banner sizes
        itself by its container, so the actions drop under the copy in a narrow room. Toasts are the
        transient twin (same edge language) and leave on their own.
      </p>
      <div class="banner-grid">
        <AppBanner title="Field Promotion waiting.">
          The squad has already climbed, so you'll be offered catch-up gear the moment you land.
        </AppBanner>
        <AppBanner tone="warn">
          The squad is mid-mission. Keep this page open and try again in a moment.
        </AppBanner>
        <AppBanner tone="error">
          Only the host can do that.
          <template #actions>
            <button
              class="btn tiny ghost"
              type="button"
            >
              Dismiss
            </button>
          </template>
        </AppBanner>
        <AppBanner tone="locked">
          Opens after your first operation
        </AppBanner>
      </div>
      <div class="banner-narrow">
        <span class="sub">Narrow container · 320px</span>
        <AppBanner tone="error">
          You were removed from this dive by the host. This dive will not seat you again.
          <template #actions>
            <button
              class="btn tiny ghost"
              type="button"
            >
              Back to base
            </button>
          </template>
        </AppBanner>
      </div>
      <div class="surface-actions">
        <button
          class="ghost"
          type="button"
          :aria-pressed="floatingBanner"
          @click="floatingBanner = !floatingBanner"
        >
          {{ floatingBanner ? 'HIDE' : 'SHOW' }} FLOATING
        </button>
        <button
          class="ghost"
          type="button"
          @click="pushToast('Back online — your dive picked up right where it left off.')"
        >
          TOAST · INFO
        </button>
        <button
          class="ghost"
          type="button"
          @click="pushToast('Connection lost — reconnecting…', 'warn')"
        >
          TOAST · WARN
        </button>
        <span class="cap"><b>Floating + live</b> · app-level state pinned over any layout (server restart)</span>
      </div>
      <AppBanner
        v-if="floatingBanner"
        floating
        live
        title="Griffdive is doing a quick restart."
      >
        Your dive is saved and picks up right where it left off — hang tight.
      </AppBanner>
    </section>

    <!-- 06 · Game atoms -->
    <section
      id="atoms"
      class="sec"
      aria-label="Game atoms"
    >
      <div class="sh">
        <span class="disp sn">06</span><h2 class="lbl">
          Game atoms
        </h2><span class="dash" /><span class="sub">Risk pips · tier badges · lamps · tokens · seats · stamps</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px">
        <div class="cell">
          <span class="sub">Risk pips · 1–5</span>
          <div class="pip-rows">
            <span
              v-for="n in 5"
              :key="n"
              class="pip-row"
            >
              <RiskPips
                :value="n"
                :max="5"
              />
              <b>+{{ n }}</b>
            </span>
          </div>
        </div>
        <div class="cell">
          <span class="sub">Tier badge · letter always</span>
          <div style="display: flex; align-items: center; gap: 5px">
            <ItemTierBadge
              v-for="t in TIERS"
              :key="t"
              :tier="t"
            />
            <span
              class="cap"
              style="margin-left: 6px"
            >Rail</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px">
            <span
              v-for="t in TIERS"
              :key="t"
              :style="{ display: 'grid', placeItems: 'center', minWidth: '18px', height: '18px', padding: '0 3px', fontSize: '11px', fontWeight: '700', color: TIER[t], border: `1px solid ${TIER[t]}` }"
            >{{ t }}</span><span
              class="cap"
              style="margin-left: 6px"
            >Ladder</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px">
            <span
              v-for="t in TIERS"
              :key="t"
              class="tb"
              :style="{ minWidth: '32px', height: '24px', padding: '0 4px', fontSize: '12px', color: '#141410', background: TIER[t] }"
            >{{ t }}</span><span
              class="cap"
              style="margin-left: 6px"
            >Rolled</span>
          </div>
        </div>
        <div class="cell">
          <span class="sub">Status light</span>
          <div style="display: flex; flex-direction: column; gap: 6px">
            <span style="display: flex; align-items: center; gap: 9px; height: 13px; font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #FFD642"><span
              class="pulse"
              style="width: 8px; height: 8px; background: #FFD642"
            />NEEDS ACTION</span>
            <span style="display: flex; align-items: center; gap: 9px; height: 13px; font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #4AD7C8"><span
              class="sq"
              style="background: #4AD7C8"
            />READY</span>
            <span style="display: flex; align-items: center; gap: 9px; height: 13px; font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #9A9B82"><span style="width: 8px; height: 8px; border: 1px solid #85876F" />OFFLINE</span>
            <span style="display: flex; align-items: center; gap: 9px; height: 13px; font-size: 11px; font-weight: 700; letter-spacing: .12em; color: #FF4B3E"><span
              class="sq"
              style="background: #FF4B3E"
            />FAILED</span>
          </div>
        </div>
        <div class="cell">
          <span class="sub">Reward tokens · cap {{ REWARD_TOKEN_CAP }}</span>
          <div style="display: flex; flex-direction: column; gap: 5px">
            <div
              v-for="r in tokenRows"
              :key="r.n"
              :aria-label="`${r.n} of ${REWARD_TOKEN_CAP} reward tokens${r.max ? ', max' : ''}`"
              role="img"
              style="display: flex; align-items: center; gap: 3px; height: 15px"
            >
              <span
                v-for="(d, i) in r.dots"
                :key="i"
                class="hex"
                :style="{ width: '12px', height: '14px', background: d.on ? '#FFD642' : '#2C3022' }"
              />
              <span
                v-if="!r.max"
                style="margin-left: 8px; font-size: 12px; font-weight: 700; color: #B8B08D"
              >{{ r.n }}/{{ REWARD_TOKEN_CAP }}</span>
              <span
                v-else
                style="margin-left: 8px; padding: 1px 6px; border: 1px solid #FFD642; background: rgba(255,214,66,.1); font-size: 10px; font-weight: 700; letter-spacing: .16em; color: #FFD642"
              >MAX {{ REWARD_TOKEN_CAP }}</span>
            </div>
          </div>
        </div>
        <div class="cell">
          <span class="sub">Dog tag · host + you · ready · reconnecting</span>
          <div style="display: flex; gap: 10px; flex-wrap: wrap">
            <div
              v-for="t in tags"
              :key="t.name"
              :aria-label="`${t.name}${t.host ? ', host' : ''}${t.you ? ', you' : ''}, ${t.status.toLowerCase()}, ${t.tokens} of ${REWARD_TOKEN_CAP} reward tokens`"
              role="group"
              style="position: relative; width: 190px; height: 80px"
            >
              <span
                class="tag-shape"
                aria-hidden="true"
                :style="{ position: 'absolute', inset: 0, background: t.edge }"
              />
              <span
                class="tag-shape"
                aria-hidden="true"
                :style="{ position: 'absolute', inset: t.inset, background: t.bg }"
              />
              <span
                aria-hidden="true"
                :style="{ position: 'absolute', left: '11px', top: '50%', width: '12px', height: '12px', marginTop: '-6px', borderRadius: '50%', background: '#0B0C09', border: `2px solid ${t.hole}` }"
              />
              <div style="position: absolute; left: 34px; right: 14px; top: 12px; bottom: 11px; display: flex; flex-direction: column; justify-content: space-between">
                <div style="display: flex; align-items: center; gap: 6px; height: 17px">
                  <span
                    class="disp"
                    style="font-size: 15px; white-space: nowrap"
                    :style="{ color: t.nameC }"
                  >{{ t.name }}</span>
                  <svg
                    v-if="t.host"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="#FFD642"
                    role="img"
                    aria-label="host"
                  ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
                  <span
                    v-if="t.you"
                    style="margin-left: auto; padding: 1px 5px; border: 1px solid #FFD642; font-size: 9px; font-weight: 700; letter-spacing: .16em; color: #FFD642"
                  >YOU</span>
                </div>
                <span style="font-size: 10px; font-weight: 600; letter-spacing: .26em; color: #9A9B82; white-space: nowrap">{{ t.serial }}</span>
                <div style="display: flex; align-items: center; gap: 7px; height: 12px">
                  <span
                    :class="{ pulse: t.pulse }"
                    :style="{ width: '7px', height: '7px', background: t.lightC }"
                  />
                  <span
                    style="font-size: 10px; font-weight: 700; letter-spacing: .12em; white-space: nowrap"
                    :style="{ color: t.lightText }"
                  >{{ t.status }}</span>
                  <span
                    aria-hidden="true"
                    style="margin-left: auto; display: flex; gap: 2px"
                  ><span
                    v-for="i in 3"
                    :key="i"
                    class="hex"
                    :style="{ width: '8px', height: '10px', background: i <= t.tokens ? (t.name === 'Birdie' ? '#85876F' : '#FFD642') : '#2C3022' }"
                  /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px">
        <div class="cell">
          <span class="sub">Ladder rung</span>
          <div
            class="ladder-scroll"
            style="display: flex; gap: 6px; height: 56px"
          >
            <div style="width: 138px; display: flex; flex-direction: column; justify-content: space-between; padding: 8px 12px; border: 1px solid #3A3F2E; color: #B8B08D">
              <div style="display: flex; align-items: baseline; gap: 8px">
                <span
                  class="disp"
                  style="font-size: 22px"
                >6</span><span style="font-size: 10px; font-weight: 700; letter-spacing: .14em">EXTREME</span><svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#B8B08D"
                  stroke-width="3"
                  role="img"
                  aria-label="cleared"
                  style="margin-left: auto; align-self: center"
                ><path d="M5 12l5 5 9-10" /></svg>
              </div>
              <span style="display: inline-grid; place-items: center; width: 18px; height: 18px; font-size: 11px; font-weight: 700; color: #6FBF73; border: 1px solid #6FBF73">B</span>
            </div>
            <div style="width: 198px; display: flex; flex-direction: column; justify-content: space-between; padding: 8px 12px; background: #1A1D15; border: 1px solid #FFD642; color: #FFD642">
              <div style="display: flex; align-items: baseline; gap: 8px">
                <span
                  class="disp"
                  style="font-size: 22px"
                >7</span><span style="font-size: 10px; font-weight: 700; letter-spacing: .14em; white-space: nowrap">SUICIDE MISSION</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-grid; place-items: center; width: 18px; height: 18px; font-size: 11px; font-weight: 700; color: #6FBF73; border: 1px solid #6FBF73">B</span>
                <div
                  role="img"
                  aria-label="Mission 1 of 3"
                  style="display: flex; gap: 4px"
                >
                  <span
                    class="pulse"
                    style="width: 20px; height: 6px; background: #FFD642; border: 1px solid #FFD642"
                  /><span style="width: 20px; height: 6px; border: 1px solid #5A5E45" /><span style="width: 20px; height: 6px; border: 1px solid #5A5E45" />
                </div>
                <span style="margin-left: auto; font-size: 10px; font-weight: 700; letter-spacing: .12em; color: #ECEADA; white-space: nowrap">OP 5 · 1/3</span>
              </div>
            </div>
            <div style="width: 132px; display: flex; flex-direction: column; justify-content: space-between; padding: 8px 12px; border: 1px solid #2C3022; color: #9A9B82">
              <div style="display: flex; align-items: baseline; gap: 8px">
                <span
                  class="disp"
                  style="font-size: 22px"
                >8</span><span style="font-size: 10px; font-weight: 700; letter-spacing: .14em">IMPOSSIBLE</span>
              </div>
              <span style="display: inline-grid; place-items: center; width: 18px; height: 18px; font-size: 11px; font-weight: 700; color: #4AD7C8; border: 1px solid #4AD7C8; opacity: .55">A</span>
            </div>
            <div style="width: 200px; display: flex; flex-direction: column; justify-content: space-between; padding: 8px 12px; border: 1px solid #2C3022; color: #9A9B82">
              <div style="display: flex; align-items: baseline; gap: 8px">
                <span
                  class="disp"
                  style="font-size: 22px"
                >10</span><span style="font-size: 10px; font-weight: 700; letter-spacing: .14em; white-space: nowrap">SUPER HELLDIVE</span><svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9A9B82"
                  stroke-width="2"
                  role="img"
                  aria-label="goal"
                  style="margin-left: auto; align-self: center"
                ><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
              </div>
              <span style="display: inline-grid; place-items: center; width: 18px; height: 18px; font-size: 11px; font-weight: 700; color: #4AD7C8; border: 1px solid #4AD7C8; opacity: .55">A</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px">
            <span
              class="cap"
              style="width: 138px"
            >Cleared</span><span
              class="cap"
              style="width: 198px; color: #FFD642"
            >Current · op pips</span><span
              class="cap"
              style="width: 132px"
            >Next</span><span
              class="cap"
              style="width: 200px"
            >Goal · flag</span>
          </div>
        </div>
        <div class="cell">
          <span class="sub">Accountability channel</span>
          <div style="display: flex; flex-direction: column; gap: 5px">
            <div style="display: flex; align-items: center; gap: 10px">
              <span
                class="chan"
                style="width: 100px"
              >LOADOUT</span><span class="cap">Pre-dive check</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px">
              <span
                class="chan"
                style="width: 100px"
              >FIELD</span><span class="cap">Watched live</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px">
              <span
                class="chan"
                style="width: 100px"
              >STATS</span><span class="cap">End stats</span>
            </div>
          </div>
        </div>
        <div class="cell">
          <span class="sub">Decision stamp</span>
          <div style="display: flex; flex-wrap: wrap; gap: 12px 7px; max-width: 422px; padding: 5px 0 0 4px">
            <span
              v-for="s in STAMPS"
              :key="s.t"
              class="disp stp"
              :style="{ color: s.c, borderColor: s.c }"
            >{{ s.t }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 07 · Live console -->
    <section
      id="console"
      class="sec sec-live"
      aria-labelledby="console-h"
    >
      <div class="sh">
        <span class="disp sn">07</span><h2
          id="console-h"
          class="lbl"
        >
          Live console
        </h2><span class="dash" /><span class="sub">The Bridge's odds console · real ladder · real d100</span>
      </div>
      <p class="sec-note">
        The rung and the skulls range are wired to <code>tierZones</code>; the four faces are fixed so
        you can watch the same rolls move up the ladder. This is the component the Bridge ships.
      </p>
      <BridgeOdds :lit="true" />
    </section>

    <!-- 07b · Wheel and pacts -->
    <section
      id="wheel"
      class="sec sec-live"
      aria-labelledby="wheel-h"
    >
      <div class="sh">
        <span class="disp sn">07b</span><h2
          id="wheel-h"
          class="lbl"
        >
          Wheel &amp; pacts
        </h2><span class="dash" /><span class="sub">Seed in → directive out · risk in → odds out</span>
      </div>
      <div class="live-grid">
        <div class="live-panel wheel-panel">
          <div class="live-panel-head">
            <span class="sub">Wheel of Adversity</span>
            <div
              class="live-controls"
              role="group"
              aria-label="Wheel difficulty"
            >
              <button
                v-for="d in [5, 7, 10]"
                :key="d"
                class="ghost"
                type="button"
                :aria-pressed="wheelDifficulty === d"
                @click="wheelDifficulty = d"
              >
                {{ d }}
              </button>
            </div>
          </div>
          <WheelOfAdversity
            :difficulty="wheelDifficulty"
            :seed="wheelSeed"
            can-control
            @spin="spinWheel"
          />
          <div
            class="draw-caption"
            aria-live="polite"
          >
            <template v-if="wheelDraw">
              <span class="lbl">Drawn directive</span>
              <span class="disp draw-name">{{ wheelDraw.name }}</span>
              <span class="draw-rule">{{ wheelDraw.rule }}</span>
              <span class="draw-meta"><RiskPips
                :value="wheelRisk"
                :max="5"
              /> risk {{ wheelRisk }} · seed {{ wheelSeed }}</span>
            </template>
            <template v-else>
              <span class="lbl">Wheel ready</span>
              <span class="draw-rule">Spin to draw a squad directive, then read its rule and risk here.</span>
            </template>
          </div>
          <button
            class="ghost"
            type="button"
            @click="spinWheel"
          >
            {{ wheelSeed === null ? 'SPIN' : 'SPIN AGAIN' }}
          </button>
        </div>

        <div class="live-panel pacts-panel">
          <div class="live-panel-head">
            <span class="sub">Pact hand · risk at difficulty {{ pactDifficulty }}</span>
            <div
              class="live-controls"
              role="group"
              aria-label="Pact risk difficulty"
            >
              <button
                v-for="d in [3, 5, 7, 10]"
                :key="d"
                class="ghost"
                type="button"
                :aria-pressed="pactDifficulty === d"
                @click="pactDifficulty = d; pactSelection = []"
              >
                {{ d }}
              </button>
            </div>
          </div>
          <div class="pact-hand">
            <ConditionCard
              v-for="card in pactCards"
              :key="card.id"
              :condition="card.condition"
              :risk="card.risk"
              :selected="pactSelection.includes(card.id)"
              :selectable="card.selectable"
              :stamp="card.stamp"
              :stamp-tone="card.stampTone"
              @select="togglePact(card.id)"
            />
          </div>
          <ValorRoll
            :zones="pactPreviewZones"
            :deltas="pactDeltas"
            label="Pact odds preview"
            :note="`${pactRiskTotal} skulls sworn`"
          />
          <p class="live-note">
            Click an available pact to preview the line. Reserve utility is exempt from pact bans, so
            a pact hand can always field four; a directive that strips reserve can still strand an
            early squad.
          </p>
        </div>
      </div>
    </section>

    <!-- 08 · Motion -->
    <section
      class="sec"
      aria-label="Motion"
    >
      <div class="sh">
        <span class="disp sn">08</span><h2 class="lbl">
          Motion
        </h2><span class="dash" />
        <span
          class="hazard-soft"
          style="display: flex; align-items: center; gap: 7px; height: 20px; padding: 0 8px; border: 1px solid rgba(255,214,66,.45); font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #FFD642; white-space: nowrap"
        >REDUCED MOTION → STATES, NOT MOVES</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px">
        <div class="cell">
          <div
            class="demo grid-bg"
            aria-hidden="true"
          >
            <span
              class="ticks"
              style="width: 64px; height: 26px; background-color: #13150F; border: 1px solid #3A3F2E; animation: riseLoop 2.4s cubic-bezier(.22,1,.36,1) infinite"
            />
          </div>
          <span class="cap"><b>rise</b></span><span class="cap">.45s · out-quint</span>
        </div>
        <div class="cell">
          <div
            class="demo grid-bg"
            aria-hidden="true"
          >
            <span
              class="disp"
              style="display: inline-block; padding: 3px 8px; font-size: 13px; border: 2px solid #FF4B3E; color: #FF4B3E; animation: stampLoop 2.4s cubic-bezier(.22,1,.36,1) infinite"
            >Sworn</span>
          </div>
          <span class="cap"><b>stamp</b></span><span class="cap">.42s · out-quint</span>
        </div>
        <div class="cell">
          <div
            class="demo grid-bg"
            aria-hidden="true"
          >
            <span style="display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; letter-spacing: .12em; color: #FFD642"><span
              class="pulse"
              style="width: 9px; height: 9px; background: #FFD642"
            />WAITING</span>
          </div>
          <span class="cap"><b>pulse</b></span><span class="cap">1.6s · in-out · ∞</span>
        </div>
        <div class="cell">
          <div
            class="demo grid-bg"
            aria-hidden="true"
          >
            <span
              class="cut-sm"
              style="position: relative; overflow: hidden; width: 80px; height: 26px; background: #FFD642"
            ><span
              class="hazard"
              style="position: absolute; inset: 0; opacity: .45; background-size: 22.6px 22.6px; transform-origin: left; animation: crawl .6s linear infinite, fillLoop 2.2s linear infinite"
            /></span>
          </div>
          <span class="cap"><b>crawl</b></span><span class="cap">.9s hold · linear</span>
        </div>
        <div class="cell">
          <div
            class="demo grid-bg"
            aria-hidden="true"
          >
            <span style="width: 28px; height: 28px; border-radius: 50%; background: #FFD642; box-shadow: 0 0 0 3px #0B0C09, 0 0 0 4px #FFD642; animation: glow 2.4s ease-in-out infinite" />
          </div>
          <span class="cap"><b>glow</b></span><span class="cap">2.4s · in-out · ∞</span>
        </div>
        <div class="cell">
          <div
            class="demo grid-bg"
            aria-hidden="true"
          >
            <span style="position: absolute; left: 50%; bottom: 7px; width: 34px; height: 8px; margin-left: -17px; border-radius: 50%; border: 1px solid rgba(255,159,67,.7); animation: ringLoop 2.4s ease-out infinite" />
          </div>
          <span class="cap"><b>pod drop</b></span><span class="cap">1.6s · fall-in</span>
        </div>
        <div class="cell">
          <div
            class="demo grid-bg scan"
            aria-hidden="true"
          >
            <span style="position: absolute; left: 0; right: 0; top: 0; height: 5px; background: linear-gradient(180deg, transparent, rgba(255,214,66,.4)); animation: sweep 9s linear infinite" />
          </div>
          <span class="cap"><b>sweep</b></span><span class="cap">9s · linear · ∞</span>
        </div>
      </div>
    </section>

    <!-- 09 · Accessibility -->
    <section
      class="sec"
      aria-label="Accessibility"
    >
      <div class="sh">
        <span class="disp sn">09</span><h2 class="lbl">
          Accessibility
        </h2><span class="dash" />
        <span style="display: flex; align-items: center; gap: 7px; height: 20px; padding: 0 8px; border: 1px solid #454A36; font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #ECEADA; white-space: nowrap">HOLD = POINTER · <span style="padding: 0 5px; border: 1px solid #B8B08D; border-bottom-width: 2px; line-height: 13px">ENTER</span> COMMITS</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap">
        <div class="cell">
          <div style="padding: 5px">
            <button
              class="ghost fring"
              style="height: 44px; padding: 0 14px; font-size: 11px; font-weight: 700; letter-spacing: .16em; color: #ECEADA"
              type="button"
            >
              OPT OUT
            </button>
          </div>
          <span class="cap"><b>Focus</b> · 2px +3</span>
        </div>
        <div class="cell">
          <div style="padding-top: 5px">
            <div style="position: relative; display: flex; width: 132px; height: 44px; background-image: linear-gradient(90deg, rgba(74,215,200,.55) 1px, transparent 1px), linear-gradient(rgba(74,215,200,.55) 1px, transparent 1px); background-size: 44px 44px; outline: 1px dashed rgba(74,215,200,.7)">
              <button
                class="icon-btn"
                aria-label="Armory"
                style="width: 44px; height: 44px; display: grid; place-items: center"
                type="button"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  aria-hidden="true"
                ><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></svg>
              </button>
              <button
                class="icon-btn"
                aria-label="Codex"
                style="width: 44px; height: 44px; display: grid; place-items: center"
                type="button"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  aria-hidden="true"
                ><path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" /></svg>
              </button>
              <button
                class="icon-btn"
                aria-label="Field manual"
                style="width: 44px; height: 44px; display: grid; place-items: center"
                type="button"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  aria-hidden="true"
                ><circle
                  cx="12"
                  cy="12"
                  r="9"
                /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14" /><path d="M12 17.5v.01" /></svg>
              </button>
            </div>
          </div>
          <span
            class="cap"
            style="margin-top: 5px"
          ><b style="color: #4AD7C8">44 × 44</b> · target</span>
        </div>
        <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
          <span
            class="cap"
            style="margin-bottom: 1px"
          ><b>Contrast</b> · body ≥ 4.5 : 1</span>
          <div
            v-for="p in CONTRAST"
            :key="p.pair"
            style="display: flex; align-items: center; gap: 6px; height: 15px"
          >
            <span
              style="width: 24px; height: 15px; flex-shrink: 0; display: grid; place-items: center; border: 1px solid #3A3F2E; font-size: 11px; font-weight: 700"
              :style="{ background: p.bg, color: p.fg }"
            >Aa</span>
            <span style="font-size: 10px; font-weight: 600; color: #B8B08D; white-space: nowrap">{{ p.pair }}</span>
            <span
              class="disp"
              style="margin-left: auto; font-size: 13px"
              :style="{ color: p.pass ? '#4AD7C8' : '#FF4B3E' }"
            >{{ p.r }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 10 · Briefing and lore -->
    <section
      id="briefing"
      class="sec"
      aria-label="Briefing and lore"
    >
      <div class="sh">
        <span class="disp sn">10</span><h2 class="lbl">
          Briefing &amp; lore
        </h2><span class="dash" /><span class="sub">Four-beat dive rail · registry · dossier · warbonds · orders</span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px">
        <div class="cell briefing-rail-demo">
          <span class="sub">Dive rail · the current four beats</span>
          <div class="phase-demo">
            <div
              class="live-controls"
              role="group"
              aria-label="Dive phase"
            >
              <button
                v-for="phase in PHASE_OPTIONS"
                :key="phase.id"
                class="ghost"
                type="button"
                :aria-pressed="demoPhase === phase.id"
                @click="demoPhase = phase.id"
              >
                {{ phase.label }}
              </button>
            </div>
            <DivePhaseTabs :phase="demoPhase" />
          </div>
          <span class="cap">
            The shared <b>DivePhaseTabs</b>: finished beats check, the current beat lights gold,
            and nothing here is a hand-rolled copy.
          </span>
        </div>

        <div class="cell">
          <span class="sub">Citizen registry · before → after the fall · A–E track</span>
          <div style="display: flex; gap: 10px; flex-wrap: wrap">
            <div
              role="img"
              aria-label="Citizen registry before the fall: subject Birdie, Class A, Helldiver"
              style="position: relative; width: 234px; height: 148px; display: flex; flex-direction: column; background: #0E100B; border: 1px solid #3A3F2E"
            >
              <div style="display: flex; align-items: center; gap: 7px; height: 24px; padding: 0 10px; border-bottom: 1px solid #23261C">
                <span style="font-size: 9px; font-weight: 700; letter-spacing: .16em; color: #ECEADA">CITIZEN REGISTRY</span><span style="margin-left: auto; font-size: 9px; font-weight: 700; letter-spacing: .14em; color: #85876F">FORM 5-E</span>
              </div>
              <div style="display: flex; align-items: center; gap: 7px; height: 24px; padding: 0 10px; border-bottom: 1px dashed #2C3022">
                <span style="font-size: 9px; font-weight: 700; letter-spacing: .16em; color: #9A9B82">SUBJECT</span><span style="color: #5A5E45">·</span><span
                  class="disp"
                  style="font-size: 13px; color: #ECEADA"
                >Birdie</span>
              </div>
              <div style="flex-grow: 1; display: grid; grid-template-columns: 52px 1fr; gap: 10px; padding: 8px 10px">
                <div style="display: flex; flex-direction: column; gap: 5px">
                  <div style="height: 58px; display: grid; place-items: center; border: 2px solid #FFD642; background: rgba(255,214,66,.06)">
                    <span
                      class="disp"
                      style="font-size: 42px; line-height: 1; color: #FFD642"
                    >A</span>
                  </div>
                  <span style="height: 17px; display: grid; place-items: center; font-size: 7.5px; font-weight: 700; letter-spacing: .06em; color: #FFD642; border: 1px solid #FFD642">HELLDIVER</span>
                </div>
                <div style="display: flex; flex-direction: column">
                  <div
                    v-for="c in regBefore"
                    :key="c.g"
                    style="display: flex; align-items: center; gap: 6px; height: 16px; padding-left: 4px"
                    :style="{ background: c.bg }"
                  >
                    <span
                      class="tb"
                      style="width: 13px; height: 13px; font-size: 8px"
                      :style="{ color: c.tc, border: `1px solid ${c.cbd}`, background: c.cbg }"
                    >{{ c.g }}</span>
                    <span
                      style="font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; white-space: nowrap"
                      :style="{ color: c.fg, textDecoration: c.strike ? 'line-through' : 'none', textDecorationColor: '#FF4B3E', textDecorationThickness: '1.5px' }"
                    >{{ c.label }}</span>
                    <span
                      v-if="c.hell"
                      style="margin-left: auto; margin-right: 3px; padding: 0 4px; font-size: 7.5px; font-weight: 700; letter-spacing: .12em; line-height: 11px; color: #141410; background: #FFD642; border: 1px solid #FFD642"
                    >HELLDIVERS</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              role="img"
              aria-label="Citizen registry after the fall: subject Birdie, Class E, stamped Griffdiver"
              style="position: relative; width: 234px; height: 148px; display: flex; flex-direction: column; background: #0E100B; border: 1px solid rgba(255,75,62,.6)"
            >
              <div style="display: flex; align-items: center; gap: 7px; height: 24px; padding: 0 10px; border-bottom: 1px solid #23261C">
                <span style="font-size: 9px; font-weight: 700; letter-spacing: .16em; color: #ECEADA">CITIZEN REGISTRY</span><span style="margin-left: auto; font-size: 9px; font-weight: 700; letter-spacing: .14em; color: #85876F">FORM 5-E</span>
              </div>
              <div style="display: flex; align-items: center; gap: 7px; height: 24px; padding: 0 10px; border-bottom: 1px dashed #2C3022">
                <span style="font-size: 9px; font-weight: 700; letter-spacing: .16em; color: #9A9B82">SUBJECT</span><span style="color: #5A5E45">·</span><span
                  class="disp"
                  style="font-size: 13px; color: #ECEADA"
                >Birdie</span>
              </div>
              <div style="flex-grow: 1; display: grid; grid-template-columns: 52px 1fr; gap: 10px; padding: 8px 10px">
                <div style="display: flex; flex-direction: column; gap: 5px">
                  <div style="height: 58px; display: grid; place-items: center; border: 2px solid #FF4B3E; background: rgba(255,75,62,.08)">
                    <span
                      class="disp"
                      style="font-size: 42px; line-height: 1; color: #FF4B3E"
                    >E</span>
                  </div>
                  <span style="height: 17px; display: grid; place-items: center; font-size: 7.5px; font-weight: 700; letter-spacing: .03em; color: #FF4B3E; border: 1px solid #FF4B3E">GRIFFDIVER</span>
                </div>
                <div style="display: flex; flex-direction: column">
                  <div
                    v-for="c in regAfter"
                    :key="c.g"
                    style="display: flex; align-items: center; gap: 6px; height: 16px; padding-left: 4px"
                    :style="{ background: c.bg }"
                  >
                    <span
                      class="tb"
                      style="width: 13px; height: 13px; font-size: 8px"
                      :style="{ color: c.tc, border: `1px solid ${c.cbd}`, background: c.cbg }"
                    >{{ c.g }}</span>
                    <span
                      style="font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; white-space: nowrap"
                      :style="{ color: c.fg, textDecoration: c.strike ? 'line-through' : 'none', textDecorationColor: '#FF4B3E', textDecorationThickness: '1.5px' }"
                    >{{ c.label }}</span>
                    <span
                      v-if="c.hell"
                      style="margin-left: auto; margin-right: 3px; padding: 0 4px; font-size: 7.5px; font-weight: 700; letter-spacing: .12em; line-height: 11px"
                      :style="{ color: c.hellFg, background: c.hellBg, border: `1px solid ${c.hellBd}` }"
                    >HELLDIVERS</span>
                    <span
                      v-if="c.you"
                      style="margin-left: auto; margin-right: 3px; padding: 0 4px; font-size: 7.5px; font-weight: 700; letter-spacing: .12em; line-height: 11px; color: #141410; background: #FF4B3E"
                    >YOU</span>
                  </div>
                </div>
              </div>
              <span
                class="disp"
                aria-hidden="true"
                style="position: absolute; left: 66px; top: 74px; padding: 4px 9px; font-size: 15px; border: 3px solid #FF4B3E; color: #FF4B3E; background: rgba(11,12,9,.86); transform: rotate(-7deg)"
              >Griffdiver</span>
            </div>
          </div>
        </div>

        <div
          class="cell"
          style="width: 232px"
        >
          <span
            class="sub"
            style="color: #4AD7C8"
          >Joining dossier · room card</span>
          <section
            aria-label="The squad you are joining"
            style="height: 148px; display: flex; flex-direction: column; gap: 6px; padding: 9px 12px; background: #13150F; border: 1px solid #2C3022"
          >
            <div style="display: flex; align-items: center; justify-content: space-between; height: 20px">
              <span
                class="disp"
                style="font-size: 20px; letter-spacing: .14em; color: #ECEADA"
              >K7QZPD</span><span style="display: flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: .16em; color: #4AD7C8"><span
                class="pulse"
                style="width: 6px; height: 6px; background: #4AD7C8"
              />LIVE</span>
            </div>
            <span style="font-size: 10px; font-weight: 700; letter-spacing: .1em; color: #B8B08D; line-height: 12px">GRIFFON · STANDARD</span>
            <div
              role="list"
              aria-label="Hellpod bays, 3 of 4 seated, bay 4 is yours"
              style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px"
            >
              <div
                v-for="d in seats"
                :key="d.label"
                role="listitem"
                style="display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0"
              >
                <div
                  :class="d.cls"
                  style="position: relative; width: 34px; height: 51px"
                >
                  <svg
                    width="34"
                    height="51"
                    viewBox="0 0 84 126"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 40 L4 50 V80 L12 88 Z M72 40 L80 50 V80 L72 88 Z"
                      fill="#15170F"
                      :stroke="d.stroke"
                      stroke-width="3"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M30 6 V2 H54 V6"
                      fill="none"
                      :stroke="d.stroke"
                      stroke-width="3"
                    />
                    <path
                      d="M22 6 H62 L72 20 V88 L42 122 L12 88 V20 Z"
                      fill="#1A1D15"
                      :stroke="d.stroke"
                      stroke-width="3"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M12 70 H72 M16 80 H68"
                      stroke="#3A3F2E"
                      stroke-width="2.4"
                    />
                    <rect
                      x="22.5"
                      y="18.5"
                      width="39"
                      height="39"
                      fill="#0B0C09"
                      stroke="#3A3F2E"
                      stroke-width="2"
                    />
                  </svg>
                  <span
                    class="cut-sm disp"
                    style="position: absolute; left: 9px; top: 8px; width: 16px; height: 16px; display: grid; place-items: center; font-size: 9px"
                    :style="{ background: d.avBg, color: d.avFg }"
                  >{{ d.init }}</span>
                </div>
                <span
                  style="max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; font-weight: 700; letter-spacing: .06em"
                  :style="{ color: d.fg }"
                >{{ d.label }}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 700; letter-spacing: .14em; color: #FFD642; white-space: nowrap">
              <span
                class="pulse"
                style="width: 6px; height: 6px; background: #FFD642"
              />AT THE WHEEL · SEATING OPEN
            </div>
          </section>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px">
        <div
          class="cell"
          style="width: 290px"
        >
          <div style="display: flex; align-items: center; justify-content: space-between; height: 12px">
            <label
              for="fd-name"
              class="sub"
              style="color: #FFD642"
            >Diver name · input</label><span class="cap">32 max · required</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px">
            <span
              class="cap"
              style="width: 44px; flex-shrink: 0"
            ><b>{{ diverName ? 'Live' : 'Empty' }}</b></span>
            <div style="position: relative; flex-grow: 1; min-width: 0">
              <input
                id="fd-name"
                v-model="diverName"
                class="nb"
                type="text"
                maxlength="32"
                placeholder="Birdie"
                autocomplete="nickname"
                spellcheck="false"
                aria-required="true"
              >
            </div>
            <span
              class="cap"
              aria-hidden="true"
              style="width: 36px; flex-shrink: 0; text-align: right"
            >{{ diverName.length }} / 32</span>
          </div>
          <div
            aria-hidden="true"
            style="display: flex; align-items: center; gap: 8px"
          >
            <span
              class="cap"
              style="width: 44px; flex-shrink: 0; color: #FFD642"
            >Focus</span>
            <div style="position: relative; flex-grow: 1; min-width: 0">
              <div class="nb nb-f">
                Bir<span
                  class="blinkc"
                  style="width: 9px; height: 18px; margin-left: 2px; background: #FFD642"
                />
              </div>
            </div>
            <span
              class="cap"
              style="width: 36px; flex-shrink: 0; text-align: right"
            >3 / 32</span>
          </div>
          <div
            aria-hidden="true"
            style="display: flex; align-items: center; gap: 8px"
          >
            <span
              class="cap"
              style="width: 44px; flex-shrink: 0"
            ><b>Typed</b></span>
            <div style="position: relative; flex-grow: 1; min-width: 0">
              <div class="nb">
                Birdie
              </div>
            </div>
            <span
              class="cap"
              style="width: 36px; flex-shrink: 0; text-align: right; color: #ECEADA"
            >6 / 32</span>
          </div>
        </div>

        <div class="cell warbond-cell">
          <div class="warbond-head">
            <span class="sub">Warbonds · live catalog · press to own</span>
            <span class="cap"><b>{{ ownedWarbondCount }}</b> / {{ warbondTiles.length }}</span>
          </div>
          <div
            class="warbond-grid"
            role="group"
            aria-label="Warbond tiles"
          >
            <button
              v-for="warbond in warbondTiles"
              :key="warbond.code"
              :class="['wbk', warbonds[warbond.code] ? 'wb-on' : 'wb-off']"
              :aria-pressed="warbonds[warbond.code]"
              :aria-label="`${warbond.name}, ${warbond.count} items${warbond.special ? ', acquisition special' : ''}`"
              type="button"
              @click="warbonds[warbond.code] = !warbonds[warbond.code]"
            >
              <span
                class="ban"
                :style="warbond.image ? { backgroundImage: `url(${warbond.image})` } : undefined"
              >
                <span
                  v-if="warbond.special"
                  class="hatch"
                  style="position: absolute; inset: 0; display: grid; place-items: center; border-bottom: 1px dashed #3A3F2E"
                >
                  <span style="padding: 2px 6px; background: #0B0C09; border: 1px solid #454A36; font-size: 8px; font-weight: 700; letter-spacing: .16em; color: #B8B08D">ACQUISITION</span>
                </span>
              </span>
              <span
                style="position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; display: grid; place-items: center; color: #141410"
                :style="{ background: warbonds[warbond.code] ? '#FFD642' : 'rgba(11,12,9,.82)', border: `1px solid ${warbonds[warbond.code] ? '#FFD642' : '#85876F'}` }"
              >
                <svg
                  v-if="warbonds[warbond.code]"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3.4"
                  aria-hidden="true"
                ><path d="M5 12l5 5 9-10" /></svg>
              </span>
              <span class="wb-kit">
                <span
                  class="wbname"
                  style="font-size: 11px; font-weight: 700; letter-spacing: .05em; line-height: 13px; text-transform: uppercase; color: #ECEADA"
                >{{ warbond.name }}</span>
                <span class="wb-count">{{ warbond.count }} items</span>
              </span>
            </button>
          </div>
          <span class="cap">Owned is lit · unowned is dim · acquisition specials carry the hatch</span>
        </div>
        <div
          class="cell"
          style="width: 510px"
        >
          <span class="sub">Order of deployment · compact · join mode</span>
          <article
            class="order-demo"
            aria-label="Order of deployment, compact"
            style="position: relative; height: 150px; display: flex; flex-direction: column; background: #0E100B; border: 1px solid #454A36"
          >
            <header style="flex-shrink: 0; display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 12px; border-bottom: 2px solid #2C3022">
              <svg
                width="18"
                height="18"
                viewBox="0 0 512 512"
                aria-hidden="true"
              ><g
                fill="none"
                stroke="#FFD642"
                stroke-width="48"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><path d="M256 96 L256 206" /><path d="M160 226 L256 322 L352 226" /><path d="M188 362 L256 430 L324 362" /></g></svg>
              <span style="display: flex; flex-direction: column; gap: 3px"><span class="odl">Super Earth · Ministry of Truth</span><span
                class="disp"
                style="font-size: 14px; color: #ECEADA"
              >Order of Deployment</span></span>
              <span style="margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 3px"><span class="odl">File</span><span style="font-size: 11px; font-weight: 700; letter-spacing: .2em; color: #ECEADA">E-K7QZPD-04</span></span>
              <span
                class="disp"
                aria-hidden="true"
                style="position: absolute; left: 276px; top: 7px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 3px 8px; font-size: 13px; border: 2px solid #FFD642; color: #FFD642; background: rgba(11,12,9,.86); transform: rotate(-7deg)"
              >Cleared<span style="font-family: 'Chakra Petch', sans-serif; font-size: 6.5px; font-weight: 700; letter-spacing: .18em">FOR DROP</span></span>
            </header>
            <div style="flex-grow: 1; min-height: 0; display: grid; grid-template-columns: 164px minmax(0, 1fr)">
              <div style="position: relative; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; padding: 7px 10px 8px 12px">
                <span style="display: flex; flex-direction: column; gap: 3px"><span class="odl">Griffdiver</span><span style="display: flex; align-items: center; gap: 6px; white-space: nowrap"><span
                  class="disp"
                  style="font-size: 14px; color: #ECEADA"
                >Birdie</span><span
                  class="disp"
                  style="padding: 2px 4px; font-size: 8px; border: 2px solid #FF4B3E; color: #FF4B3E; white-space: nowrap"
                >Class E</span></span></span>
                <span style="display: flex; flex-direction: column; gap: 4px"><span class="odl">Kit · {{ kitStratagems.length }} stratagems</span><span style="display: flex; gap: 4px">
                  <img
                    v-for="s in kitStratagems"
                    :key="s.id"
                    :src="s.img"
                    :alt="s.name"
                    width="24"
                    height="24"
                    style="width: 24px; height: 24px; padding: 2px; object-fit: contain; background: #0B0C09; border: 1px solid #2C3022"
                  >
                </span></span>
                <span style="display: flex; align-items: baseline; gap: 6px"><span class="odl">Warbonds</span><span
                  class="disp"
                  style="font-size: 14px; color: #FFD642"
                >{{ ownedWarbondCount }}</span><span style="font-size: 10px; font-weight: 700; color: #85876F">/ {{ warbondTiles.length }}</span></span>
              </div>
              <div style="display: flex; flex-direction: column; padding: 7px 12px 8px; border-left: 1px dashed #2C3022; min-width: 0">
                <div
                  role="group"
                  aria-label="Waiting for you: Field Promotion times 4, or a legacy cache"
                  style="flex-grow: 1; display: flex; flex-direction: column; gap: 7px; padding: 8px 10px; border: 1px solid #FFD642; background: rgba(255,214,66,.05)"
                >
                  <div style="display: flex; align-items: center; gap: 7px">
                    <span
                      class="pulse"
                      style="width: 6px; height: 6px; background: #FFD642"
                    /><span style="font-size: 9px; font-weight: 700; letter-spacing: .18em; color: #FFD642">WAITING FOR YOU</span><span
                      class="odl"
                      style="margin-left: auto"
                    >One or the other</span>
                  </div>
                  <div style="flex-grow: 1; display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr)">
                    <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 4px; min-width: 0">
                      <span
                        class="disp"
                        style="font-size: 10px; color: #FFD642; white-space: nowrap"
                      >Field promotion</span>
                      <span
                        role="img"
                        aria-label="Times 4: 4 picks at base tier B, zero Valor"
                        style="display: flex; align-items: center; gap: 3px"
                      ><span
                        class="disp"
                        style="margin-right: 4px; font-size: 16px; color: #FFD642"
                      >×4</span><span
                        v-for="i in 4"
                        :key="i"
                        class="tb"
                        style="width: 18px; height: 18px; font-size: 9px; color: #6FBF73; border: 1px solid #6FBF73; background: rgba(111,191,115,.1)"
                      >B</span></span>
                      <span
                        class="odl"
                        style="line-height: 11px; letter-spacing: .08em"
                      ><span style="color: #ECEADA">0 Valor</span> · 4 ops behind<br>Altitude, never rarity</span>
                    </div>
                    <div
                      aria-hidden="true"
                      style="position: relative; display: flex; justify-content: center"
                    >
                      <span style="width: 1px; height: 100%; background: repeating-linear-gradient(180deg, #5A5E45 0 5px, transparent 5px 9px)" />
                      <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 3px 4px; background: #16180F; border: 1px solid #5A5E45; font-size: 9px; font-weight: 700; letter-spacing: .1em; color: #ECEADA">OR</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px; min-width: 0">
                      <span style="display: flex; align-items: center; gap: 6px"><span
                        class="disp"
                        style="font-size: 10px; color: #ECEADA; white-space: nowrap"
                      >Legacy cache</span></span>
                      <span style="font-size: 10px; line-height: 13px; color: #B8B08D">A fallen Griffdiver's kit, salvaged from the line.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px">
        <div
          class="cell"
          style="width: 1052px"
        >
          <div style="display: flex; align-items: center; gap: 10px; height: 12px">
            <span class="sub">Ministry notice · three tones</span><span class="dash" /><span class="lore-chip">LORE ADDS, NEVER REPLACES THE RULE</span>
          </div>
          <div class="ministry-grid">
            <p style="margin: 0; padding: 7px 11px; border: 1px dashed #2C3022; font-size: 11px; line-height: 1.35; color: #B8B08D; text-wrap: pretty">
              <span style="display: flex; justify-content: space-between; margin-bottom: 4px"><span
                class="lbl"
                style="font-size: 9px"
              >Ministry notice</span><span
                class="cap"
                style="font-size: 9px"
              >Khaki · briefing + dossier</span></span>Their mercy: the Wheel of Adversity. Chosen risk raises your Valor, and Valor buys rarer armaments — nothing here is free.
            </p>
            <p style="margin: 0; padding: 7px 11px; border: 1px dashed rgba(255,75,62,.55); background: rgba(255,75,62,.06); font-size: 11px; line-height: 1.35; color: #B8B08D; text-wrap: pretty">
              <span style="display: flex; justify-content: space-between; margin-bottom: 4px"><span
                class="lbl"
                style="font-size: 9px; color: #FF4B3E"
              >Ministry notice</span><span
                class="cap"
                style="font-size: 9px; color: #FF4B3E"
              >Red · forfeit</span></span>Failure is a debt against liberty, and the Ministry does not forgive — it compounds.
            </p>
            <p style="margin: 0; padding: 7px 11px; border: 1px dashed rgba(255,214,66,.45); background: rgba(255,214,66,.04); font-size: 11px; line-height: 1.35; color: #B8B08D; text-wrap: pretty">
              <span style="display: flex; justify-content: space-between; margin-bottom: 4px"><span
                class="lbl"
                style="font-size: 9px; color: #FFD642"
              >Ministry notice · Pardon</span><span
                class="cap"
                style="font-size: 9px; color: #FFD642"
              >Gold · achieved</span></span>The Ministry has reviewed your file and finds your debt to liberty settled. Griffdiver, you are pardoned — restored to the franchise you squandered. Do not squander it again.
            </p>
          </div>
        </div>
        <div
          class="cell"
          style="width: 272px"
        >
          <span class="sub">Stamps · briefing</span>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 2px 0 0 4px">
            <span
              class="disp stp"
              style="font-size: 14px; border-width: 3px; color: #FF4B3E; border-color: #FF4B3E"
            >Griffdiver</span>
            <span
              class="disp stp"
              style="color: #FFD642; border-color: #FFD642"
            >Claimed</span>
            <span
              class="disp stp"
              style="display: inline-flex; flex-direction: column; align-items: center; gap: 2px; padding: 3px 9px; font-size: 14px; border-width: 3px; color: #FFD642; border-color: #FFD642"
            >Cleared<span style="font-family: 'Chakra Petch', sans-serif; font-size: 7.5px; font-weight: 700; letter-spacing: .2em">FOR DROP · MIN. OF TRUTH</span></span>
          </div>
        </div>
      </div>
    </section>

    <section
      id="liberty"
      class="sec"
      aria-label="Liberty's Cross"
    >
      <div class="sh">
        <span class="disp sn">11</span><h2 class="lbl">
          Liberty’s Cross
        </h2><span class="dash" /><span class="sub">S+ bonus band · unfurl · crest</span>
      </div>

      <div class="surface-actions">
        <button
          class="ghost"
          type="button"
          style="height: 40px; padding: 0 16px"
          @click="crossRun++; crossClaimed = null"
        >
          Replay unfurl
        </button>
        <span class="sub">{{ crossClaimed ? `Claimed ${ITEMS_BY_ID.get(crossClaimed)?.displayName}` : 'Claim opens the codex; nothing is banked here' }}</span>
      </div>
      <LibertyCrossBand
        :key="crossRun"
        :pool="[...ALL_ITEMS]"
        :owned-ids="[]"
        @choose="itemId => crossClaimed = itemId"
      />
    </section>

    <section
      class="sec"
      aria-label="Reward reveal"
    >
      <div class="sh">
        <span class="disp sn">11b</span><h2 class="lbl">
          Reward reveal
        </h2><span class="dash" /><span class="sub">left to right · drama by tier · Cross unfurls last</span>
      </div>

      <div class="surface-actions">
        <button
          class="ghost"
          type="button"
          style="height: 40px; padding: 0 16px"
          @click="lootRun++"
        >
          Replay reveal
        </button>
        <span class="sub">Picking and banking are inert here</span>
      </div>
      <RewardDraft
        :key="lootRun"
        :options="lootOptions"
        :picked-id="null"
        :pool="[...ALL_ITEMS]"
        :owned-ids="[]"
        :stars="5"
        :difficulty="LOOT_DIFFICULTY"
        :team-risk="LOOT_VALOR"
      />
    </section>

    <section
      class="sec"
      aria-label="Crusade strip"
    >
      <div class="sh">
        <span class="disp sn">12</span><h2 class="lbl">
          Crusade strip
        </h2><span class="dash" /><span class="sub">ladder · tier edge · difficulty 10 apex</span>
      </div>

      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px">
        <button
          v-for="d in 8"
          :key="d"
          class="ghost"
          type="button"
          style="height: 36px; padding: 0 12px"
          :aria-pressed="stripDiff === d + 2"
          @click="stripDiff = d + 2"
        >
          {{ d + 2 }}
        </button>
        <span class="sub">mission</span>
        <button
          v-for="m in stripOpLength"
          :key="`m${m}`"
          class="ghost"
          type="button"
          style="height: 36px; padding: 0 12px"
          :aria-pressed="stripMission === m"
          @click="stripMission = m"
        >
          {{ m }}
        </button>
        <label class="sub"><input
          v-model="stripFailed"
          type="checkbox"
        > failed</label>
        <label class="sub"><input
          v-model="stripAchieved"
          type="checkbox"
        > achieved</label>
        <label class="sub"><input
          v-model="stripRoute"
          type="checkbox"
        > route</label>
      </div>
      <CrusadeStrip
        :difficulty="stripDiff"
        :mission-in-operation="stripMission"
        :op-length="stripOpLength"
        :failed="stripFailed"
        :achieved="stripAchieved"
        :route="stripRoute"
      />
      <div
        style="width: 390px; max-width: 100%; margin-top: 12px"
      >
        <CrusadeStrip
          :difficulty="stripDiff"
          :mission-in-operation="stripMission"
          :op-length="stripOpLength"
          :failed="stripFailed"
          :achieved="stripAchieved"
          :route="stripRoute"
        />
      </div>
    </section>
  </main>
</template>

<style scoped>
.kit { max-width: 1320px; gap: 12px; overflow-x: clip; }
.kit section[id] { scroll-margin-top: 76px; }

.sh h2 { color: var(--text); }

.kit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  flex-wrap: wrap;
}
.kit-head-l { display: flex; flex-direction: column; gap: 9px; min-width: 0; max-width: 100%; }
.kit-crumb { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.kit-title {
  margin: 0;
  max-width: 100%;
  font-size: clamp(30px, 9vw, 44px);
  color: var(--text);
  overflow-wrap: normal;
}

.maxims {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 296px));
  gap: 8px;
  flex-shrink: 0;
}
.maxim {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 31px;
  padding-right: 10px;
  border: 1px solid #2C3022;
  background: #13150F;
}
.maxim-n {
  display: grid;
  place-items: center;
  width: 30px;
  height: 29px;
  font-size: 13px;
  flex-shrink: 0;
}
.maxim-t { font-size: 11px; font-weight: 700; letter-spacing: .16em; white-space: nowrap; }
.maxim-viz { margin-left: auto; display: flex; gap: 2px; align-items: center; }
.maxim-hold {
  position: relative;
  width: 46px;
  height: 11px;
  overflow: hidden;
  border: 1px solid #FFD642;
}

.crow { display: flex; gap: 16px; flex-wrap: wrap; }
.grp { display: flex; gap: 6px; }
.sw {
  display: flex;
  flex-direction: column;
  width: 72px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: copy;
}
.sw:hover .sw-b { border-color: var(--line-5); }
.sw-b { position: relative; display: block; height: 36px; border: 1px solid #3A3F2E; margin-bottom: 6px; }
.sw-copied {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(11, 12, 9, 0.82);
  color: var(--gold);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
}
.sw-a { display: flex; align-items: center; padding-left: 7px; font-size: 15px; font-weight: 700; }
.sw-line { display: block; flex-grow: 1; }
.sw-n { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; line-height: 13px; white-space: nowrap; }
.sw-h { font-size: 11px; font-weight: 600; letter-spacing: .04em; color: #B8B08D; line-height: 13px; white-space: nowrap; }
.sw-r { font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #9A9B82; line-height: 12px; margin-top: 2px; white-space: nowrap; }
.tier-chip {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 26px;
  margin-bottom: 6px;
  font-size: 13px;
  font-stretch: 125%;
  font-weight: 800;
  line-height: 1;
}

.kit .cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 100%; }
.demo {
  position: relative;
  height: 50px;
  overflow: hidden;
  background-color: #0B0C09;
  border: 1px solid #23261C;
  display: grid;
  place-items: center;
}

.pact-name { margin-top: 9px; font-size: 12px; color: var(--text); white-space: nowrap; }

.railbtn { cursor: pointer; border: 0; padding: 0; transition: filter .15s; }
.railbtn:hover:not(:disabled) { filter: brightness(1.15); }
.railbtn:disabled { cursor: not-allowed; }
.railbtn:focus-visible { outline: 2px solid #ECEADA; outline-offset: -7px; }
.rail-cur:focus-visible { outline-color: #141410; }

.node { position: relative; width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; padding: 0; margin: 0; background: transparent; border: 0; cursor: pointer; }
.node:disabled { cursor: not-allowed; }
.nsq { font-stretch: 125%; font-weight: 800; line-height: 1; }

.fring { outline: 2px solid #FFD642; outline-offset: 3px; }
.nb-f { border-color: #FFD642; box-shadow: 0 0 0 1px #FFD642, 0 0 22px rgba(255, 214, 66, 0.16); }

.wbk {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  text-align: left;
  background: #13150F;
  border: 1px solid #2C3022;
  border-radius: 0;
  color: #ECEADA;
  cursor: pointer;
  transition: border-color .15s, background-color .15s;
}
.wbk * { pointer-events: none; }
.wbk:hover { border-color: #8A8C6E; }
.wb-on { border-color: #5A5E45; background-color: #1A1D15; }
.wbk .ban { position: relative; display: block; height: 52px; flex-shrink: 0; background-color: #0B0C09; background-size: cover; background-position: center; transition: filter .25s; }
.wb-off .ban { filter: grayscale(1) brightness(.38) blur(.6px); }
.wb-off:hover .ban, .wb-off:focus-visible .ban, .wb-f.wb-off .ban { filter: grayscale(.1) brightness(.92) blur(0); }
.wb-on:hover .ban, .wb-on:focus-visible .ban { filter: brightness(1.14); }
.wb-off .wbname { color: #9A9B82; }
.wb-f { outline: 2px solid #FFD642; outline-offset: 3px; border-color: #8A8C6E; }

@keyframes riseLoop {
  0% { transform: translateY(14px); opacity: 0; }
  19%, 100% { transform: none; opacity: 1; }
}
@keyframes stampLoop {
  0% { transform: scale(1.5) rotate(-7deg); opacity: 0; }
  10.5% { transform: scale(.96) rotate(-7deg); opacity: 1; }
  17.5%, 100% { transform: scale(1) rotate(-7deg); opacity: 1; }
}
@keyframes fillLoop {
  0% { transform: scaleX(0); }
  41%, 100% { transform: scaleX(1); }
}
@keyframes ringLoop {
  0%, 35% { transform: scale(.2); opacity: 0; }
  37% { opacity: 1; }
  62%, 100% { transform: scale(1); opacity: 0; }
}
@keyframes podLoop {
  0% { transform: translateY(-56px); animation-timing-function: cubic-bezier(.5, 0, .95, .7); }
  36% { transform: translateY(0); }
  40% { transform: translateY(2px) scale(1.08, .88); }
  46%, 100% { transform: none; }
}
@keyframes shard {
  0% { transform: translate(0, 0) rotate(0); opacity: 0; background-color: #FF4B3E; }
  10% { opacity: 1; }
  45% { transform: translate(56px, -20px) rotate(170deg); background-color: #FF4B3E; }
  80% { transform: translate(118px, 10px) rotate(330deg); opacity: 1; background-color: #FFD642; }
  100% { transform: translate(124px, 14px) rotate(360deg) scale(.5); opacity: 0; background-color: #FFD642; }
}
/* ---- Header refresh ------------------------------------------------------ */
.kit-stage {
  padding: 1px 6px;
  border: 1px solid var(--gold);
  color: var(--gold);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 14px;
}
.kit-lede {
  max-width: 62ch;
  margin: 0;
  color: var(--khaki);
  font-size: 13px;
  line-height: 1.45;
}
.kit-facts { display: flex; flex-wrap: wrap; gap: 6px; }
.kit-fact {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 8px;
  border: 1px solid var(--line-2);
  background: var(--rail);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.kit-fact b { font-size: 14px; color: var(--text); }
.kit-jump { display: flex; flex-wrap: wrap; gap: 5px 12px; }
.kit-jump a {
  color: var(--khaki);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.kit-jump a:hover { color: var(--gold); }
.kit-back {
  align-self: flex-start;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.kit-back:hover { color: var(--gold); }

/* ---- Tokens -------------------------------------------------------------- */
.token-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px 24px;
  align-items: start;
}
.token-group { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.token-group .vl {
  writing-mode: horizontal-tb;
  transform: none;
  border-left: 0;
  padding-left: 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--line-2);
  color: var(--text);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-align: left;
}
.token-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 6px;
}
.token-row .sw { width: auto; }
.token-foot { display: flex; flex-wrap: wrap; gap: 20px; }
.tier-col { display: flex; flex-direction: column; width: 56px; gap: 4px; }
.tier-swatch { display: block; height: 4px; }
.tier-col .tier-chip { width: 34px; }
.front-col { display: flex; flex-direction: column; width: 86px; gap: 3px; }
.front-col img { width: 34px; height: 34px; object-fit: contain; }

/* ---- Type ---------------------------------------------------------------- */
.type-grid { display: grid; grid-template-columns: minmax(300px, 360px) minmax(0, 1fr); gap: 16px; }
.type-ramp, .type-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.type-ramp { overflow: hidden; }
.type-line { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.type-line .disp { min-width: 0; overflow: hidden; text-overflow: clip; white-space: nowrap; }
.type-line-s { width: 26px; flex-shrink: 0; }
.type-spec { display: flex; flex-direction: column; gap: 3px; }
.type-live {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px;
  border: 1px solid var(--line-3);
  background: var(--rail);
}
.type-live-row { display: flex; align-items: center; gap: 10px; }
.type-live-row .nb { flex-grow: 1; min-width: 0; }
.type-live-pair { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.type-live-display {
  overflow: hidden;
  font-size: clamp(22px, 3.4cqi, 40px);
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.type-live-body { overflow: hidden; font-size: 14px; color: var(--khaki); text-overflow: ellipsis; white-space: nowrap; }
.directive-sample {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 7px 12px;
  border: 1px solid var(--line-3);
  background: var(--panel);
}
.directive-copy { display: flex; flex-direction: column; gap: 3px; flex-grow: 1; min-width: 0; }
.directive-name { font-size: 26px; line-height: 25px; color: var(--gold); }
.directive-rule { font-size: 15px; font-weight: 500; line-height: 18px; }

/* ---- Controls ------------------------------------------------------------ */
.control-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; max-width: 920px; }
.ministry-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.surface-actions { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.lore-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
  padding: 0 8px;
  border: 1px solid #454A36;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #ECEADA;
  white-space: nowrap;
}
.overlay-demos { justify-content: center; }
.overlay-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ring-demo { height: 44px; padding: 0 14px; }
.dialog-copy { margin: 0; color: var(--khaki); font-size: 14px; line-height: 1.5; }

/* ---- Banners ------------------------------------------------------------- */
.banner-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 12px; margin-block: 12px; }
.banner-narrow { display: grid; gap: 6px; max-width: 320px; margin-bottom: 12px; }

/* ---- Atoms --------------------------------------------------------------- */
.pip-rows { display: flex; flex-direction: column; gap: 3px; }
.pip-row { display: flex; align-items: center; gap: 8px; min-height: 18px; }
.pip-row b { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: var(--red); }

/* ---- Live gameplay ------------------------------------------------------- */
.sec-note { max-width: 78ch; margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
.sec-note code { color: var(--khaki); font-family: var(--font-body); }
.live-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 16px; align-items: start; }
.live-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: var(--pad-panel);
  border: 1px solid var(--line-2);
  background: var(--rail);
}
.live-panel-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.live-panel-head .sub { flex-grow: 1; }
.live-controls { display: flex; gap: 4px; flex-wrap: wrap; }
.live-controls .ghost { height: 32px; padding: 0 9px; font-size: 11px; }
.live-controls .ghost[aria-pressed='true'] {
  border-color: var(--gold);
  color: var(--gold);
  background: rgba(255, 214, 66, 0.07);
}
.pact-hand { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.draw-caption {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 96px;
  padding: 10px 12px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.draw-name { font-size: 24px; line-height: 1; color: var(--gold); }
.draw-rule { font-size: 13px; line-height: 1.4; color: var(--khaki); }
.draw-meta { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.live-note { margin: 0; color: var(--dim); font-size: 11px; line-height: 1.45; }

/* The band's mobile layout assumes a wider column than this specimen's mobile
   card; shrink its type so the unfurl stays inside the cut. */
#liberty :deep(.cross-title) { font-size: clamp(16px, 4cqi, 2.1rem); }
#liberty :deep(.cross-sub) { font-size: clamp(12px, 2.2cqi, 17px); }
#liberty :deep(.cross-copy) { min-width: 0; }

/* ---- Briefing ------------------------------------------------------------ */
.briefing-rail-demo { min-width: 0; }
.phase-demo {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--line-2);
  background: var(--rail);
}

/* ---- Warbonds ------------------------------------------------------------ */
.warbond-cell { min-width: 0; }
.warbond-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.warbond-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
  gap: 10px;
  max-height: 320px;
  overflow: auto;
  padding-right: 4px;
}
.warbond-grid .wbk { height: 118px; }
.wb-kit {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  padding: 7px 8px 8px;
}
.wb-count { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted); }

@media (max-width: 760px) {
  .kit { padding-inline: 8px; }
  .kit .sec { padding: 10px 10px 12px; }
  .kit-head { flex-direction: column; align-items: stretch; gap: 16px; }
  .kit-head-l { flex: 1 1 auto; }
  .maxims { width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .maxim { gap: 8px; padding-right: 6px; }
  .maxim-t { font-size: 9px; letter-spacing: 0.1em; white-space: normal; }
  .type-grid, .control-grid, .live-grid { grid-template-columns: minmax(0, 1fr); }
  .pact-hand { grid-template-columns: minmax(0, 1fr); }
  .sh { flex-wrap: wrap; }
  .sh .sub { white-space: normal; }
  .cap, .sub { white-space: normal; }
  .kit .nb { min-width: 0; width: 100%; }
  .ministry-grid { grid-template-columns: minmax(0, 1fr); }
  .order-demo { overflow: auto; }
  .lore-chip { white-space: normal; }
  .kit .cell > * { max-width: 100%; }
  .ladder-scroll { overflow-x: auto; padding-bottom: 4px; }
  .ladder-scroll > * { flex-shrink: 0; }
}
</style>
