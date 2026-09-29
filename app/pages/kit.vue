<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { FRONTS } from '~~/shared/data/fronts'
import { factionImageUrl, itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardTier } from '~~/shared/engine/types'

useHead({ meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

// Foundations specimen — a port of the redesign's "Foundations" page. It
// specimens the terminal tokens, atoms and composite components so contributors
// can sanity-check the language. Dev reference only, reachable at /kit.

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

const SURF = [
  { n: 'Ground', h: GROUND, r: 'Stage' },
  { n: 'Rail', h: '#0E100B', r: 'Rails' },
  { n: 'Panel', h: PANEL, r: 'Panels' },
  { n: 'Raised', h: '#1A1D15', r: 'Raised' },
]
const LINES = [
  { n: 'Line 1', h: '#23261C', r: 'Hairline', t: '1px' },
  { n: 'Line 2', h: '#2C3022', r: 'Divider', t: '1px' },
  { n: 'Line 3', h: '#3A3F2E', r: 'Frame', t: '2px' },
  { n: 'Line 4', h: '#454A36', r: 'Ghost', t: '2px' },
  { n: 'Line 5', h: '#5A5E45', r: 'Pip off', t: '3px' },
]
const INKS = [
  { n: 'Text', h: TEXT, r: 'Primary', bg: PANEL },
  { n: 'Khaki', h: KHAKI, r: 'Secondary', bg: PANEL },
  { n: 'Muted', h: MUTED, r: 'Min body', bg: PANEL },
  { n: 'Dim', h: DIM, r: 'Large only', bg: PANEL },
  { n: 'Ink', h: '#141410', r: 'On gold', bg: GOLD },
]
const SIGNALS = [
  { n: 'Gold', h: GOLD, r: 'Act now' },
  { n: 'Red', h: RED, r: 'Danger' },
  { n: 'Orange', h: ORANGE, r: 'Strain · MO' },
  { n: 'Teal', h: TEAL, r: 'Ready' },
  { n: 'Purple', h: '#B06BFF', r: 'Illuminate' },
]
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
const REGISTRY = [
  { g: 'A', label: 'Citizens', c: GOLD, tint: 'rgba(255,214,66,.08)' },
  { g: 'B', label: 'Residents', c: KHAKI, tint: 'rgba(184,176,141,.07)' },
  { g: 'C', label: 'Conscripts', c: KHAKI, tint: 'rgba(184,176,141,.07)' },
  { g: 'D', label: 'Debtors', c: ORANGE, tint: 'rgba(255,159,67,.08)' },
  { g: 'E', label: 'Griffdivers', c: RED, tint: 'rgba(255,75,62,.09)' },
]
const WARBOND_TILES = [
  { code: 'mob', name: 'Helldivers Mobilize', items: '33 ITEMS', tier: 'S' as RewardTier | '', focus: false },
  { code: 'polar', name: 'Polar Patriots', items: '9 ITEMS', tier: 'B' as RewardTier | '', focus: false },
  { code: 'viper', name: 'Viper Commandos', items: '7 ITEMS', tier: 'B' as RewardTier | '', focus: true },
  { code: 'store', name: 'Superstore', items: '43 ITEMS', tier: '' as RewardTier | '', focus: false },
]
const warbondTiles = WARBOND_TILES.map(w => ({ ...w, tc: w.tier ? TIER[w.tier] : DIM }))

const fallbackItem = [...ITEMS_BY_ID.values()][0] as Item
function byId(id: string): Item {
  return ITEMS_BY_ID.get(id) ?? fallbackItem
}

interface TileSpec { id: string, t: RewardTier, cat: string, tag?: string, reserve?: boolean, out?: boolean, lead?: boolean }
const TILE_SPECS: TileSpec[] = [
  { id: 'ac8autocannon', t: 'A', cat: 'SUPPORT' },
  { id: 'las99quasarcannon', t: 'S', cat: 'SUPPORT', tag: 'NEW' },
  { id: 'eaglesmokestrike', t: 'C', cat: 'EAGLE', tag: 'RESERVE', reserve: true },
  { id: 'sh20shieldgeneratorpack', t: 'A', cat: 'BACKPACK', out: true },
  { id: 'eagle500kgbomb', t: 'S', cat: 'EAGLE', tag: 'CEILING', lead: true },
]

const skirt = (c: string) => `repeating-linear-gradient(-45deg, ${c} 0 3px, transparent 3px 7px)`

interface Skull { c: string }
function skulls(n: number, max: number, on: string, off: string): Skull[] {
  return Array.from({ length: max }, (_, k) => ({ c: k < n ? on : off }))
}
const pk1 = skulls(1, 3, RED, '#2C3022')
const pk2 = skulls(2, 3, RED, '#2C3022')
const pk3 = skulls(3, 3, RED, '#2C3022')
const pkOff = skulls(0, 3, RED, '#23261C')
const riskRows = [1, 2, 3, 4, 5].map(n => ({ k: skulls(n, 5, RED, '#2C3022'), t: `+${n}` }))
const tokenRows = [0, 1, 2, 3].map(n => ({ n, dots: [0, 1, 2].map(i => ({ on: i < n })), max: n === 3 }))

interface Cell { bg: string, bgi: string, bd: string, part: string, cls: string, rot?: string, tr?: string }
function cells(parts: { c: string, n: number, pending?: boolean }[], extra?: (cell: Cell, i: number) => void): Cell[] {
  const flat: { c: string, n: number, pending?: boolean }[] = []
  parts.forEach((p) => {
    for (let k = 0; k < p.n; k++) flat.push(p)
  })
  const out: Cell[] = []
  for (let i = 0; i < 11; i++) {
    const x = flat[i]
    const cell: Cell = {
      bg: x ? (x.pending ? 'transparent' : x.c) : '#15170F',
      bgi: x && x.pending ? skirt(x.c) : 'none',
      bd: x ? x.c : '#23261C',
      part: '0%',
      cls: '',
    }
    if (extra) extra(cell, i)
    out.push(cell)
  }
  return out.reverse()
}

interface Rung { t: RewardTier, tc: string, tbg: string, w: string, txt: string, fg: string, op: string, luck: string, fed: boolean }
function rung(t: RewardTier, p: number, opts: { below?: boolean, base?: boolean, luck?: string } = {}): Rung {
  return {
    t,
    tc: TIER[t],
    tbg: opts.below ? 'transparent' : (p > 0 ? 'rgba(255,255,255,.03)' : 'transparent'),
    w: opts.below ? '0%' : (opts.base ? '100%' : `${Math.max(p, p > 0 ? 2 : 0)}%`),
    txt: opts.below ? 'FLOOR' : (opts.base ? 'BASE' : `${p}%`),
    fg: opts.below ? '#5A5E45' : (p > 0 ? TEXT : DIM),
    op: opts.below ? '.4' : '1',
    luck: opts.luck || '',
    fed: !!opts.luck,
  }
}

const gPrev = cells([{ c: GOLD, n: 2 }, { c: ORANGE, n: 2 }, { c: RED, n: 4, pending: true }])
const gLock = cells([{ c: GOLD, n: 2 }, { c: ORANGE, n: 2 }, { c: RED, n: 4 }])
const gPerf = cells([{ c: GOLD, n: 2 }, { c: ORANGE, n: 2 }, { c: RED, n: 4 }], (cell, i) => {
  if (i === 8) {
    cell.part = '16%'
    cell.bd = 'rgba(74,215,200,.6)'
  }
})
const gBroke = cells([{ c: GOLD, n: 4 }, { c: ORANGE, n: 2 }, { c: RED, n: 5 }], (cell, i) => {
  cell.rot = i === 10 ? '-7deg' : (i === 9 ? '2deg' : '0deg')
  cell.tr = i === 10 ? '3px -4px' : (i === 9 ? '-1px -1px' : '0 0')
  if (i >= 9) cell.cls = 'glitch'
})
const rungsPerf = [rung('S+', 4.8), rung('S', 45.8), rung('A', 80), rung('B', 100, { base: true }), rung('C', 0, { below: true })]
const rungsBroke = [rung('S+', 11.7, { luck: '+3%' }), rung('S', 72, { luck: '+10%' }), rung('A', 80), rung('B', 100, { base: true })]

const tiles = TILE_SPECS.map((s) => {
  const it = byId(s.id)
  return {
    ...s,
    name: it.displayName,
    img: itemImageUrl(it),
    tc: TIER[s.t],
    bg: s.reserve ? '#0E100B' : PANEL,
    bs: s.reserve ? 'dashed' : 'solid',
    bd: s.lead ? GOLD : (s.out ? RED : (s.reserve ? '#5A5E45' : '#2C3022')),
    stripeOp: s.out ? '.4' : '1',
    iop: s.out ? '.45' : '1',
    filt: s.out ? 'grayscale(.8)' : 'none',
    nc: s.out ? MUTED : TEXT,
    tagBg: s.tag === 'NEW' ? GOLD : (s.tag === 'CEILING' ? 'rgba(11,12,9,.85)' : GROUND),
    tagFg: s.tag === 'NEW' ? '#141410' : (s.tag === 'CEILING' ? GOLD : KHAKI),
    tagBd: s.tag === 'NEW' ? GOLD : (s.tag === 'CEILING' ? GOLD : '#5A5E45'),
  }
})

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

const kitStratagems = ['eaglesmokestrike', 'orbitalemsstrike', 'shieldgeneratorrelay', 'emsmortarsentry'].map((id) => {
  const it = byId(id)
  return { id, name: it.displayName, img: itemImageUrl(it) }
})

const holdDone = ref(false)
const holdFill = ref(0)
let holdTimer: ReturnType<typeof setTimeout> | undefined
let resetTimer: ReturnType<typeof setTimeout> | undefined

function reduced(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function clearHold(): void {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = undefined
  holdFill.value = 0
}
function holdDown(): void {
  if (holdDone.value) return
  clearHold()
  holdFill.value = 1
  holdTimer = setTimeout(commit, reduced() ? 10 : 900)
}
function holdEnd(): void {
  clearHold()
}
function holdKey(e: MouseEvent): void {
  if (e.detail === 0 && !holdDone.value) commit()
}
function commit(): void {
  clearHold()
  if (resetTimer) clearTimeout(resetTimer)
  holdDone.value = true
  resetTimer = setTimeout(() => {
    holdDone.value = false
  }, reduced() ? 900 : 1800)
}

const toggleA = ref(false)
const toggleB = ref(true)
const stars = ref(4)
const samples = ref(14)
const diverName = ref('')
const warbonds = ref<Record<string, boolean>>({ mob: true, polar: false, viper: false, store: false })

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

onBeforeUnmount(() => {
  if (holdTimer) clearTimeout(holdTimer)
  if (resetTimer) clearTimeout(resetTimer)
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
          >Griffdive · kit sheet</span>
          <span
            class="lbl"
            style="font-size: 10px"
          >Foundations · every screen</span>
        </div>
        <h1 class="disp kit-title">
          Destroyer <span style="color: var(--gold)">Terminal</span>
        </h1>
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

    <!-- 02 · Color -->
    <section
      class="sec"
      aria-label="Color"
    >
      <div class="sh">
        <span class="disp sn">02</span><h2 class="lbl">
          Color
        </h2><span class="dash" /><span class="sub">Tokens · exact hex · gold is the only act-now</span>
      </div>
      <div class="crow">
        <div class="grp">
          <span class="vl">Surface</span>
          <div
            v-for="w in SURF"
            :key="w.n"
            class="sw"
          >
            <span
              class="sw-b"
              :style="{ background: w.h }"
            />
            <span class="sw-n">{{ w.n }}</span>
            <span class="sw-h">{{ w.h }}</span>
            <span class="sw-r">{{ w.r }}</span>
          </div>
        </div>
        <div class="grp">
          <span class="vl">Lines</span>
          <div
            v-for="w in LINES"
            :key="w.n"
            class="sw"
          >
            <span
              class="sw-b"
              style="background: #0E100B; border-color: #23261C; display: flex; align-items: center; padding: 0 6px"
            >
              <span
                class="sw-line"
                :style="{ height: w.t, background: w.h }"
              />
            </span>
            <span class="sw-n">{{ w.n }}</span>
            <span class="sw-h">{{ w.h }}</span>
            <span class="sw-r">{{ w.r }}</span>
          </div>
        </div>
      </div>
      <div class="crow">
        <div class="grp">
          <span class="vl">Text</span>
          <div
            v-for="w in INKS"
            :key="w.n"
            class="sw"
          >
            <span
              class="sw-b sw-a"
              :style="{ background: w.bg, color: w.h }"
            >Aa</span>
            <span class="sw-n">{{ w.n }}</span>
            <span class="sw-h">{{ w.h }}</span>
            <span class="sw-r">{{ w.r }}</span>
          </div>
        </div>
        <div class="grp">
          <span class="vl">Signal</span>
          <div
            v-for="w in SIGNALS"
            :key="w.n"
            class="sw"
          >
            <span
              class="sw-b"
              :style="{ background: w.h, borderColor: w.h }"
            />
            <span
              class="sw-n"
              :style="{ color: w.h }"
            >{{ w.n }}</span>
            <span class="sw-h">{{ w.h }}</span>
            <span class="sw-r">{{ w.r }}</span>
          </div>
        </div>
      </div>
      <div class="crow">
        <div class="grp">
          <span class="vl">Tiers</span>
          <div
            v-for="t in TIERS"
            :key="t"
            style="display: flex; flex-direction: column; width: 56px"
          >
            <span :style="{ display: 'block', height: '4px', marginBottom: '6px', background: TIER[t] }" />
            <span
              class="tb tier-chip"
              :style="{ color: TIER[t], border: `1px solid ${TIER[t]}` }"
            >{{ t }}</span>
            <span
              class="sw-h"
              style="font-size: 10px; letter-spacing: 0"
            >{{ TIER[t] }}</span>
          </div>
        </div>
        <div class="grp">
          <span class="vl">Valor</span>
          <div
            role="img"
            aria-label="Valor sources stacked: directive, strain or Major Order, pacts, performance"
            style="display: flex; gap: 12px"
          >
            <div style="display: flex; flex-direction: column; gap: 2px; width: 20px; padding: 2px; border: 1px solid #2C3022">
              <span style="height: 5px; border: 1px solid #23261C" />
              <span style="height: 5px; border: 1px solid #23261C" />
              <span style="height: 5px; background: #4AD7C8" />
              <span style="height: 5px; background: #FF4B3E" />
              <span style="height: 5px; background: #FF4B3E" />
              <span style="height: 5px; background: #FF4B3E" />
              <span style="height: 5px; background: #FF4B3E" />
              <span style="height: 5px; background: #FF9F43" />
              <span style="height: 5px; background: #FF9F43" />
              <span style="height: 5px; background: #FFD642" />
              <span style="height: 5px; background: #FFD642" />
            </div>
            <div style="display: flex; flex-direction: column; justify-content: space-between; width: 136px; padding: 1px 0">
              <span
                v-for="s in [{ n: 'Performance', c: '#4AD7C8' }, { n: 'Pacts', c: '#FF4B3E' }, { n: 'Strain · MO', c: '#FF9F43' }, { n: 'Directive', c: '#FFD642' }]"
                :key="s.n"
                style="display: flex; align-items: center; gap: 7px"
              >
                <span
                  class="sq"
                  :style="{ background: s.c }"
                /><span
                  class="sw-n"
                  style="font-size: 10px; letter-spacing: .04em"
                >{{ s.n }}</span><span
                  class="sw-h"
                  style="margin-left: auto; font-size: 10px; letter-spacing: 0"
                >{{ s.c.toUpperCase() }}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="grp">
          <span class="vl">Fronts</span>
          <div
            v-for="f in FRONTS"
            :key="f.id"
            style="display: flex; flex-direction: column; width: 80px"
          >
            <img
              :src="factionImageUrl(f.id)"
              alt=""
              width="34"
              height="34"
              style="width: 34px; height: 34px; object-fit: contain; margin-bottom: 6px"
            >
            <span
              class="sw-n"
              style="font-size: 10px; letter-spacing: .04em"
              :style="{ color: f.accent }"
            >{{ f.displayName }}</span>
            <span class="sw-h">{{ f.accent.toUpperCase() }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 03 · Type -->
    <section
      class="sec"
      aria-label="Type"
    >
      <div class="sh">
        <span class="disp sn">03</span><h2 class="lbl">
          Type
        </h2><span class="dash" /><span class="sub">Two families · nothing else</span>
      </div>
      <div style="display: grid; grid-template-columns: 282px 1fr; gap: 14px">
        <div style="display: flex; flex-direction: column; gap: 5px; min-width: 0">
          <span
            class="sub"
            style="color: #FFD642; margin-bottom: 3px"
          >Archivo · 800 · wdth 125</span>
          <div
            v-for="l in [{ s: '72', t: 'Dive', c: '#ECEADA', ls: '0' }, { s: '38', t: 'Valor', c: '#FFD642', ls: '0' }, { s: '26', t: 'Automatons', c: '#FF4B3E', ls: '0' }, { s: '17', t: 'Super Helldive', c: '#ECEADA', ls: '.06em' }]"
            :key="l.t"
            style="display: flex; align-items: baseline; gap: 4px"
          >
            <span
              class="cap"
              style="width: 22px; flex-shrink: 0"
            >{{ l.s }}</span>
            <span
              class="disp"
              :style="{ fontSize: `${l.s}px`, lineHeight: '.85', color: l.c, letterSpacing: l.ls }"
            >{{ l.t }}</span>
          </div>
          <div style="display: flex; align-items: baseline; gap: 4px">
            <span
              class="cap"
              style="width: 22px; flex-shrink: 0"
            >Num</span>
            <span
              class="disp"
              style="font-size: 26px; color: #B8B08D"
            >0123456789</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 11px; min-width: 0">
          <span
            class="sub"
            style="color: #FFD642; margin-bottom: 2px"
          >Chakra Petch · 400–700</span>
          <div style="display: flex; flex-direction: column; gap: 3px">
            <span class="cap">16 · 500 · rule</span>
            <span style="font-size: 16px; font-weight: 500; line-height: 20px">I bring no backpack.</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px">
            <span class="cap">14 · 700 · name</span>
            <span style="font-size: 14px; font-weight: 700; letter-spacing: .08em; line-height: 18px; text-transform: uppercase">Jet Brigade <span style="color: #FF9F43">+2</span></span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px">
            <span class="cap">12 · 400 · meta</span>
            <span style="font-size: 12px; font-weight: 400; line-height: 16px; color: #B8B08D">Code or link only</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px">
            <span class="cap">11 · 600 · .18em · lbl</span>
            <span
              class="lbl"
              style="line-height: 14px"
            >Ceiling odds</span>
          </div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 14px; padding: 7px 12px; background: #13150F; border: 1px solid #3A3F2E">
        <div style="display: flex; flex-direction: column; gap: 3px; flex-grow: 1; min-width: 0">
          <span
            class="lbl"
            style="line-height: 13px"
          >Squad Directive · whole squad</span>
          <span
            class="disp"
            style="font-size: 26px; color: #FFD642; line-height: 25px"
          >No Orbitals</span>
          <span style="font-size: 15px; font-weight: 500; line-height: 18px">No orbital stratagems.</span>
        </div>
        <div
          aria-hidden="true"
          style="display: flex; flex-direction: column; gap: 3px; align-items: flex-end"
        >
          <span
            class="cap"
            style="height: 13px; display: flex; align-items: center"
          >Chakra 11 · lbl</span>
          <span
            class="cap"
            style="height: 25px; display: flex; align-items: center; color: #FFD642"
          >Archivo 26 · disp</span>
          <span
            class="cap"
            style="height: 18px; display: flex; align-items: center"
          >Chakra 15 · body</span>
        </div>
      </div>
    </section>

    <!-- 04 · Frames and motifs -->
    <section
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
            <span style="font-size: 11px; font-weight: 700; letter-spacing: .2em">SPIN</span>
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
            <span style="font-size: 11px; font-weight: 700; letter-spacing: .2em">DECIDE</span>
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
            <span style="font-size: 11px; font-weight: 700; letter-spacing: .2em">PACTS</span>
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
            <span style="font-size: 11px; font-weight: 700; letter-spacing: .2em">FAILED</span>
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
      class="sec"
      aria-label="Controls"
    >
      <div class="sh">
        <span class="disp sn">05</span><h2 class="lbl">
          Controls
        </h2><span class="dash" /><span class="sub">Real buttons · 44px · hold commits</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; max-width: 900px">
        <div class="cell">
          <button
            class="btn cut"
            :style="{ position: 'relative', overflow: 'hidden', width: '100%', height: '50px', background: holdDone ? '#13150F' : '#FFD642', color: '#141410' }"
            :aria-label="holdDone ? 'No Orbitals accepted, plus 2 team risk' : 'Accept No Orbitals, plus 2 team risk. Press and hold.'"
            type="button"
            @pointerdown="holdDown"
            @pointerup="holdEnd"
            @pointerleave="holdEnd"
            @click="holdKey"
          >
            <template v-if="!holdDone">
              <span
                aria-hidden="true"
                class="hazard crawl"
                style="position: absolute; inset: 0; opacity: .4; transform-origin: left"
                :style="{ transform: `scaleX(${holdFill})` }"
              />
              <span style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px">
                <span
                  class="disp"
                  style="font-size: 18px"
                >Accept +2</span>
                <span style="font-size: 10px; font-weight: 700; letter-spacing: .24em">HOLD TO LOCK</span>
              </span>
            </template>
            <template v-else>
              <span
                class="hazard-soft"
                aria-hidden="true"
                style="position: absolute; inset: 0; opacity: .5"
              />
              <span
                class="disp stamp"
                style="position: relative; display: inline-block; padding: 5px 14px; font-size: 18px; border: 3px solid #FFD642; color: #FFD642; background: rgba(11,12,9,.85)"
              >Accepted</span>
            </template>
          </button>
          <span
            class="cap"
            aria-live="polite"
          ><b>{{ holdDone ? 'Accepted' : 'Idle' }}</b> · {{ holdDone ? 'resets for the demo' : 'hold 0.9s · try it' }}</span>
        </div>
        <div class="cell">
          <div
            role="img"
            aria-label="Hold button mid-hold, 60 percent filled"
            class="cut"
            style="position: relative; overflow: hidden; height: 50px; display: grid; place-items: center; background: #FFD642; color: #141410"
          >
            <span
              aria-hidden="true"
              class="hazard"
              style="position: absolute; inset: 0; opacity: .4; background-size: 22.6px 22.6px; transform-origin: left; transform: scaleX(.6)"
            />
            <span
              aria-hidden="true"
              style="position: absolute; left: 60%; top: 0; bottom: 0; width: 2px; background: #141410"
            />
            <span style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px">
              <span
                class="disp"
                style="font-size: 18px"
              >Accept +2</span>
              <span style="font-size: 10px; font-weight: 700; letter-spacing: .24em">HOLD TO LOCK</span>
            </span>
          </div>
          <span class="cap"><b>Mid-hold</b> · 60% · static</span>
        </div>
        <div class="cell">
          <div style="height: 50px; display: flex; align-items: center; justify-content: space-between; padding-left: 6px">
            <span
              class="disp"
              style="display: inline-block; padding: 5px 10px; font-size: 15px; border: 3px solid #FFD642; color: #FFD642; transform: rotate(-7deg)"
            >Accepted</span>
            <button
              class="ghost"
              style="height: 44px; padding: 0 9px; font-size: 10px; font-weight: 700; letter-spacing: .12em; color: #B8B08D; white-space: nowrap"
              type="button"
            >
              CHANGE CALL
            </button>
          </div>
          <span class="cap"><b>Committed</b> · stamp + undo</span>
        </div>
      </div>
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
          <div
            role="radiogroup"
            aria-label="Stars earned"
            style="display: flex; gap: 4px"
          >
            <button
              v-for="k in [1, 2, 3, 4, 5]"
              :key="k"
              class="btn"
              role="radio"
              :aria-checked="k === stars"
              :aria-label="`${k}${k === 1 ? ' star' : ' stars'}`"
              :style="{ width: '44px', height: '44px', display: 'grid', placeItems: 'center', background: k <= stars ? '#1F2216' : '#13150F', border: `1px solid ${k === stars ? '#FFD642' : '#2C3022'}` }"
              type="button"
              @click="stars = k"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                aria-hidden="true"
                :style="{ filter: k <= stars ? 'drop-shadow(0 0 5px rgba(255,214,66,.5))' : 'none' }"
              ><path
                d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
                :fill="k <= stars ? '#FFD642' : 'transparent'"
                :stroke="k <= stars ? '#FFD642' : '#5A5E45'"
                stroke-width="1.4"
                stroke-linejoin="round"
              /></svg>
            </button>
          </div><span class="cap"><b>Star radio</b> · {{ stars }}/5</span>
        </div>
        <div class="cell">
          <div
            role="group"
            :aria-label="`Common samples, ${samples}`"
            style="display: flex; align-items: center; gap: 4px"
          >
            <button
              class="ghost step"
              aria-label="Remove a common sample"
              :disabled="samples <= 0"
              type="button"
              @click="samples = Math.max(0, samples - 1)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                aria-hidden="true"
              ><path d="M5 12h14" /></svg>
            </button><span
              class="disp"
              style="width: 50px; text-align: center; font-size: 24px"
            >{{ samples }}</span><button
              class="ghost step"
              aria-label="Add a common sample"
              type="button"
              @click="samples += 1"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                aria-hidden="true"
              ><path d="M5 12h14M12 5v14" /></svg>
            </button>
          </div><span class="cap"><b>−/+ stepper</b> · 44</span>
        </div>
      </div>
    </section>

    <!-- 06 · Game atoms -->
    <section
      class="sec"
      aria-label="Game atoms"
    >
      <div class="sh">
        <span class="disp sn">06</span><h2 class="lbl">
          Game atoms
        </h2><span class="dash" /><span class="sub">Every mechanic has a shape</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px">
        <div class="cell">
          <span class="sub">Risk pips · 1–5</span>
          <div style="display: flex; flex-direction: column; gap: 2px">
            <div
              v-for="r in riskRows"
              :key="r.t"
              :aria-label="`Risk ${r.t.slice(1)} of 5`"
              role="img"
              style="display: flex; align-items: center; gap: 2px; height: 14px"
            >
              <svg
                v-for="(k, i) in r.k"
                :key="i"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                aria-hidden="true"
              ><path
                :fill="k.c"
                d="M8 1C4.4 1 2 3.5 2 6.8c0 1.9.9 3.3 2.2 4.1V14h1.9v-1.6h1V14h1.8v-1.6h1V14h1.9v-3.1C13.1 10.1 14 8.7 14 6.8 14 3.5 11.6 1 8 1Z"
              /><circle
                cx="5.6"
                cy="7.2"
                r="1.5"
                fill="#0E100B"
              /><circle
                cx="10.4"
                cy="7.2"
                r="1.5"
                fill="#0E100B"
              /></svg>
              <span style="margin-left: 6px; font-size: 11px; font-weight: 700; letter-spacing: .1em; color: #FF4B3E">{{ r.t }}</span>
            </div>
          </div>
        </div>
        <div class="cell">
          <span class="sub">Tier badge · letter always</span>
          <div style="display: flex; align-items: center; gap: 5px">
            <span
              v-for="t in TIERS"
              :key="t"
              class="tb"
              :style="{ minWidth: '32px', height: '24px', padding: '0 4px', fontSize: '12px', color: TIER[t], border: `1px solid ${TIER[t]}` }"
            >{{ t }}</span><span
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
          <span class="sub">Reward tokens · cap 3</span>
          <div style="display: flex; flex-direction: column; gap: 5px">
            <div
              v-for="r in tokenRows"
              :key="r.n"
              :aria-label="`${r.n} of 3 reward tokens${r.max ? ', max' : ''}`"
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
              >{{ r.n }}/3</span>
              <span
                v-else
                style="margin-left: 8px; padding: 1px 6px; border: 1px solid #FFD642; background: rgba(255,214,66,.1); font-size: 10px; font-weight: 700; letter-spacing: .16em; color: #FFD642"
              >MAX 3</span>
            </div>
          </div>
        </div>
        <div class="cell">
          <span class="sub">Dog tag · host + you · ready · reconnecting</span>
          <div style="display: flex; gap: 10px; flex-wrap: wrap">
            <div
              v-for="t in tags"
              :key="t.name"
              :aria-label="`${t.name}${t.host ? ', host' : ''}${t.you ? ', you' : ''}, ${t.status.toLowerCase()}, ${t.tokens} of 3 reward tokens`"
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
          <div style="display: flex; gap: 6px; height: 56px">
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

    <!-- 07 · Composite components -->
    <section
      class="sec"
      aria-label="Composite components"
    >
      <div class="sh">
        <span class="disp sn">07</span><h2 class="lbl">
          Composite components
        </h2><span class="dash" /><span class="sub">States side by side</span>
      </div>
      <div style="display: grid; grid-template-columns: 770px 1fr; gap: 20px; min-height: 0">
        <div style="display: flex; flex-direction: column; gap: 12px">
          <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px">
            <span class="sub"><span style="color: #ECEADA">Pact card</span> · offered</span><span
              class="sub"
              style="color: #FF4B3E"
            >Sworn</span><span class="sub">Voided</span><span class="sub">Unavailable</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px">
            <article
              aria-label="Primary Concern pact, offered, plus 2 Valor"
              style="position: relative; display: flex; flex-direction: column; padding: 10px 12px; background: #13150F; border: 1px solid #454A36"
            >
              <div style="display: flex; align-items: center; justify-content: space-between; height: 22px">
                <span class="chan">LOADOUT</span>
                <div
                  role="img"
                  aria-label="Risk 2 of 3"
                  style="display: flex; gap: 2px"
                >
                  <svg
                    v-for="(k, i) in pk2"
                    :key="i"
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  ><path
                    :fill="k.c"
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
                </div>
              </div>
              <span class="disp pact-name">Primary Concern</span>
              <span style="margin-top: 5px; font-size: 12px; line-height: 15px">I bring no support weapon.</span>
              <div style="flex-grow: 1" />
              <div style="height: 1px; background: repeating-linear-gradient(90deg, #454A36 0 6px, transparent 6px 10px)" />
              <div style="display: flex; align-items: center; gap: 6px; height: 28px; margin-top: 6px">
                <span
                  class="disp"
                  style="font-size: 22px; color: #FF4B3E"
                >+2</span><span
                  class="lbl"
                  style="font-size: 9px"
                >Valor</span>
                <span style="margin-left: auto; padding: 3px 7px; border: 1px solid #454A36; font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #B8B08D">OFFERED</span>
              </div>
            </article>

            <article
              aria-label="Pack Light pact, sworn, plus 1 Valor"
              style="position: relative; display: flex; flex-direction: column; padding: 10px 12px; background: #13150F; background-image: linear-gradient(180deg, rgba(255,75,62,.08), transparent 70%); border: 1px solid #FF4B3E"
            >
              <div style="display: flex; align-items: center; justify-content: space-between; height: 22px">
                <span class="chan">LOADOUT</span>
                <div
                  role="img"
                  aria-label="Risk 1 of 3"
                  style="display: flex; gap: 2px"
                >
                  <svg
                    v-for="(k, i) in pk1"
                    :key="i"
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  ><path
                    :fill="k.c"
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
                </div>
              </div>
              <span class="disp pact-name">Pack Light</span>
              <span style="margin-top: 5px; font-size: 12px; line-height: 15px">I bring no backpack.</span>
              <div style="flex-grow: 1" />
              <div style="height: 1px; background: repeating-linear-gradient(90deg, rgba(255,75,62,.5) 0 6px, transparent 6px 10px)" />
              <div style="display: flex; align-items: center; gap: 6px; height: 28px; margin-top: 6px">
                <span
                  class="disp"
                  style="font-size: 22px; color: #FF4B3E"
                >+1</span><span
                  class="lbl"
                  style="font-size: 9px"
                >Valor</span>
                <span
                  class="disp"
                  style="margin-left: auto; display: inline-block; padding: 3px 8px; font-size: 13px; border: 2px solid #FF4B3E; color: #FF4B3E; transform: rotate(-7deg)"
                >Sworn</span>
              </div>
            </article>

            <article
              aria-label="Untouchable pact, voided, plus 3 Valor lost"
              style="position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 10px 12px; background: #13150F; border: 1px solid rgba(255,75,62,.6)"
            >
              <div style="display: flex; flex-direction: column; flex-grow: 1; opacity: .45">
                <div style="display: flex; align-items: center; justify-content: space-between; height: 22px">
                  <span class="chan">FIELD</span>
                  <div
                    role="img"
                    aria-label="Risk 3 of 3"
                    style="display: flex; gap: 2px"
                  >
                    <svg
                      v-for="(k, i) in pk3"
                      :key="i"
                      width="15"
                      height="15"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                    ><path
                      :fill="k.c"
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
                  </div>
                </div>
                <span class="disp pact-name tc-text">Untouchable</span>
                <span style="margin-top: 5px; font-size: 12px; line-height: 15px">I finish the mission without dying.</span>
              </div>
              <div style="height: 1px; background: repeating-linear-gradient(90deg, #454A36 0 6px, transparent 6px 10px)" />
              <div style="display: flex; align-items: center; gap: 6px; height: 28px; margin-top: 6px">
                <span
                  class="disp"
                  style="font-size: 22px; color: #85876F; text-decoration: line-through; text-decoration-thickness: 3px; text-decoration-color: #FF4B3E"
                >+3</span>
                <span
                  class="hazard-soft-red"
                  style="margin-left: auto; padding: 4px 7px; border: 1px solid rgba(255,75,62,.6); font-size: 10px; font-weight: 700; letter-spacing: .1em; color: #FF4B3E; white-space: nowrap"
                >−3 VALOR</span>
              </div>
              <span
                class="disp"
                style="position: absolute; left: 0; right: 0; top: 44px; margin: 0 auto; width: max-content; padding: 5px 12px; font-size: 22px; border: 3px solid #FF4B3E; color: #FF4B3E; background: rgba(11,12,9,.82); transform: rotate(-7deg)"
              >Voided</span>
            </article>

            <article
              aria-label="Grounded pact, unavailable: leaves too few stratagems"
              style="position: relative; display: flex; flex-direction: column; padding: 10px 12px; background: transparent; border: 1px dashed #3A3F2E"
            >
              <div style="display: flex; align-items: center; justify-content: space-between; height: 22px">
                <span
                  class="chan"
                  style="color: #85876F; border-color: #23261C"
                >LOADOUT</span>
                <div
                  role="img"
                  aria-label="Risk 2 of 3"
                  style="display: flex; gap: 2px"
                >
                  <svg
                    v-for="(k, i) in pkOff"
                    :key="i"
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  ><path
                    :fill="k.c"
                    d="M8 1C4.4 1 2 3.5 2 6.8c0 1.9.9 3.3 2.2 4.1V14h1.9v-1.6h1V14h1.8v-1.6h1V14h1.9v-3.1C13.1 10.1 14 8.7 14 6.8 14 3.5 11.6 1 8 1Z"
                  /><circle
                    cx="5.6"
                    cy="7.2"
                    r="1.5"
                    fill="#0E100B"
                  /><circle
                    cx="10.4"
                    cy="7.2"
                    r="1.5"
                    fill="#0E100B"
                  /></svg>
                </div>
              </div>
              <span
                class="disp pact-name"
                style="color: #85876F"
              >Grounded</span>
              <span style="margin-top: 5px; font-size: 12px; line-height: 15px; color: #9A9B82">I bring no offensive Eagle stratagems.</span>
              <div style="flex-grow: 1" />
              <div style="display: flex; align-items: center; justify-content: center; gap: 7px; height: 28px; border: 1px dashed #454A36; font-size: 10px; font-weight: 700; letter-spacing: .12em; color: #9A9B82; white-space: nowrap">
                FLOOR · 4 STRATAGEMS
              </div>
            </article>
          </div>

          <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px">
            <span class="sub"><span style="color: #ECEADA">Item tile</span> · normal</span><span
              class="sub"
              style="color: #FFD642"
            >New</span><span class="sub">Reserve</span><span
              class="sub"
              style="color: #FF4B3E"
            >Ruled out</span><span
              class="sub"
              style="color: #FFD642"
            >Ceiling lead</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px">
            <div
              v-for="t in tiles"
              :key="t.name"
              :class="t.lead ? 'ticks' : ''"
              :aria-label="`${t.name}, tier ${t.t}${t.tag ? `, ${t.tag.toLowerCase()}` : ''}${t.out ? ', ruled out by Pack Light' : ''}`"
              role="img"
              :style="{ position: 'relative', display: 'flex', flexDirection: 'column', backgroundColor: t.bg, border: `1px ${t.bs} ${t.bd}`, animation: t.lead ? 'glow 2.6s ease-in-out infinite' : 'none' }"
            >
              <span
                style="display: block; height: 4px; flex-shrink: 0"
                :style="{ background: t.tc, opacity: t.stripeOp }"
              />
              <div
                class="grid-bg"
                style="position: relative; height: 62px; flex-shrink: 0; overflow: hidden; background-color: #0B0C09; border-bottom: 1px solid #23261C; display: grid; place-items: center"
              >
                <img
                  :src="t.img"
                  alt=""
                  width="44"
                  height="44"
                  style="width: 44px; height: 44px; object-fit: contain"
                  :style="{ opacity: t.iop, filter: t.filt }"
                >
                <template v-if="t.out">
                  <span
                    class="hazard-red"
                    style="position: absolute; inset: 0; opacity: .26"
                  />
                  <span style="position: absolute; left: 5px; right: 5px; bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 5px; height: 20px; background: #0B0C09; border: 1px solid #FF4B3E; color: #FF4B3E; font-size: 10px; font-weight: 700; letter-spacing: .12em; white-space: nowrap">PACK LIGHT</span>
                </template>
                <span
                  class="tb"
                  style="position: absolute; top: 5px; right: 5px; min-width: 22px; height: 20px; padding: 0 3px; font-size: 11px; background: #0B0C09"
                  :style="{ color: t.tc, border: `1px solid ${t.tc}` }"
                >{{ t.t }}</span>
                <span
                  v-if="t.tag"
                  style="position: absolute; top: 5px; left: 5px; padding: 2px 5px; font-size: 9px; font-weight: 700; letter-spacing: .16em"
                  :style="{ background: t.tagBg, color: t.tagFg, border: `1px solid ${t.tagBd}` }"
                >{{ t.tag }}</span>
              </div>
              <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 5px; padding: 6px 9px 7px">
                <span
                  style="font-size: 12px; font-weight: 700; letter-spacing: .05em; line-height: 14px; text-transform: uppercase"
                  :style="{ color: t.nc }"
                >{{ t.name }}</span>
                <span style="align-self: flex-start; padding: 2px 6px; border: 1px solid #3A3F2E; font-size: 10px; font-weight: 700; letter-spacing: .12em; color: #B8B08D; white-space: nowrap">{{ t.cat }}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 84px 84px 170px 1fr; gap: 8px; min-width: 0">
          <div style="display: flex; flex-direction: column; gap: 8px">
            <span
              class="sub"
              style="color: #ECEADA"
            >Preview</span>
            <div style="height: 32px; display: flex; align-items: baseline; gap: 5px">
              <span
                class="disp"
                style="font-size: 32px; color: #FFD642"
              >4</span><span style="font-size: 13px; font-weight: 700; color: #FFD642">→ 8</span>
            </div>
            <div
              role="progressbar"
              aria-label="Valor preview"
              aria-valuemin="0"
              aria-valuemax="11"
              aria-valuenow="4"
              aria-valuetext="4 of 11, 8 if both pacts are sworn"
              style="width: 40px; display: flex; flex-direction: column; gap: 3px; padding: 3px; border: 1px solid #2C3022"
            >
              <span
                v-for="(c, i) in gPrev"
                :key="i"
                style="position: relative; height: 18px"
                :style="{ backgroundColor: c.bg, backgroundImage: c.bgi, border: `1px solid ${c.bd}` }"
              />
            </div>
            <span
              class="hazard-soft"
              style="align-self: flex-start; padding: 3px 6px; font-size: 10px; font-weight: 700; letter-spacing: .1em; color: #FFD642; white-space: nowrap"
            >+4 PENDING</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px">
            <span
              class="sub"
              style="color: #ECEADA"
            >Locked</span>
            <div style="height: 32px; display: flex; align-items: baseline; gap: 5px">
              <span
                class="disp"
                style="font-size: 32px; color: #FFD642"
              >8</span><span style="font-size: 12px; font-weight: 700; color: #85876F">/ 11</span>
            </div>
            <div
              role="progressbar"
              aria-label="Valor locked"
              aria-valuemin="0"
              aria-valuemax="11"
              aria-valuenow="8"
              aria-valuetext="8 of 11, locked: directive 2, strain 2, pacts 4"
              style="width: 40px; display: flex; flex-direction: column; gap: 3px; padding: 3px; border: 1px solid #2C3022"
            >
              <span
                v-for="(c, i) in gLock"
                :key="i"
                style="position: relative; height: 18px"
                :style="{ backgroundColor: c.bg, border: `1px solid ${c.bd}` }"
              />
            </div>
            <span style="align-self: flex-start; display: flex; align-items: center; gap: 5px; padding: 3px 6px; border: 1px solid #2C3022; font-size: 10px; font-weight: 700; letter-spacing: .12em; color: #B8B08D">LOCKED</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px">
            <span
              class="sub"
              style="color: #ECEADA"
            >+ Performance · odds</span>
            <div style="height: 32px; display: flex; align-items: baseline; gap: 5px">
              <span
                class="disp"
                style="font-size: 32px; color: #FFD642"
              >8.16</span><span style="font-size: 12px; font-weight: 700; color: #85876F">/ 11</span>
            </div>
            <div style="display: flex; gap: 12px">
              <div
                role="progressbar"
                aria-label="Valor with performance"
                aria-valuemin="0"
                aria-valuemax="11"
                aria-valuenow="8.16"
                aria-valuetext="8.16 of 11: directive 2, strain 2, pacts 4, performance 0.16"
                style="width: 40px; flex-shrink: 0; display: flex; flex-direction: column; gap: 3px; padding: 3px; border: 1px solid #2C3022"
              >
                <span
                  v-for="(c, i) in gPerf"
                  :key="i"
                  style="position: relative; height: 18px"
                  :style="{ backgroundColor: c.bg, border: `1px solid ${c.bd}` }"
                ><span
                  style="position: absolute; left: 0; right: 0; bottom: 0; background: #4AD7C8"
                  :style="{ height: c.part }"
                /></span>
              </div>
              <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 2px 0">
                <div
                  v-for="r in rungsPerf"
                  :key="r.t"
                  style="display: flex; flex-direction: column; gap: 5px"
                  :style="{ opacity: r.op }"
                >
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span
                      class="tb"
                      style="min-width: 32px; height: 24px; padding: 0 4px; font-size: 12px"
                      :style="{ color: r.tc, border: `1px solid ${r.tc}`, background: r.tbg }"
                    >{{ r.t }}</span>
                    <span
                      style="margin-left: auto; font-size: 14px; font-weight: 700"
                      :style="{ color: r.fg }"
                    >{{ r.txt }}</span>
                  </div>
                  <div style="height: 4px; background: #1A1D15">
                    <div
                      style="height: 4px"
                      :style="{ width: r.w, background: r.tc }"
                    />
                  </div>
                </div>
              </div>
            </div>
            <span style="align-self: flex-start; padding: 3px 6px; border: 1px solid rgba(74,215,200,.6); font-size: 10px; font-weight: 700; letter-spacing: .12em; color: #4AD7C8; white-space: nowrap">+0.16 PERFORMANCE</span>
          </div>

          <div
            class="ticks ticks-red"
            style="position: relative; padding: 9px 12px 8px; background-color: #13150F; background-image: none; border: 1px solid rgba(255,75,62,.55); overflow: hidden"
          >
            <span
              aria-hidden="true"
              class="ticks ticks-red"
              style="position: absolute; inset: 0; pointer-events: none"
            />
            <span
              aria-hidden="true"
              class="hazard-soft-red"
              style="position: absolute; left: 0; right: 0; top: 0; height: 58px; opacity: .6"
            />
            <div style="position: relative; display: flex; flex-direction: column; gap: 4px; padding-left: 52px">
              <span
                class="flick"
                style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .2em; color: #FF4B3E; white-space: nowrap"
              ><span
                class="hazard-red"
                style="width: 14px; height: 10px"
              />METER BROKEN</span>
              <div style="display: flex; align-items: baseline; gap: 6px">
                <span
                  class="disp"
                  style="font-size: 32px; color: #FFD642"
                >13</span><span style="font-size: 12px; font-weight: 700; color: #85876F; text-decoration: line-through; text-decoration-color: #FF4B3E; text-decoration-thickness: 2px">/ 11</span>
              </div>
            </div>
            <div style="position: relative; margin-top: 8px; display: flex; gap: 8px">
              <div
                role="progressbar"
                aria-label="Valor, meter broken"
                aria-valuemin="0"
                aria-valuemax="11"
                aria-valuenow="11"
                aria-valuetext="Valor 13, past the 11 cap: meter broken, 2 banked as Luck"
                style="width: 40px; flex-shrink: 0; display: flex; flex-direction: column; gap: 3px; padding: 3px; border: 1px solid #2C3022; border-top-color: transparent"
              >
                <span
                  v-for="(c, i) in gBroke"
                  :key="i"
                  :class="c.cls"
                  style="position: relative; height: 17px"
                  :style="{ rotate: c.rot, translate: c.tr, backgroundColor: c.bg, border: `1px solid ${c.bd}` }"
                />
              </div>
              <div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px">
                <div
                  role="img"
                  aria-label="Luck plus 2, banked from overflow"
                  style="height: 50px; display: flex; align-items: center; gap: 8px; padding: 0 8px; border: 1px dashed #FFD642; background: rgba(255,214,66,.06)"
                >
                  <div style="display: flex; flex-direction: column; gap: 3px">
                    <span style="font-size: 10px; font-weight: 700; letter-spacing: .2em; color: #FFD642">LUCK</span><span
                      class="disp"
                      style="font-size: 22px; color: #FFD642"
                    >+2</span>
                  </div>
                  <span style="margin-left: auto; display: flex; gap: 3px"><span style="width: 14px; height: 14px; background: #FFD642" /><span style="width: 14px; height: 14px; background: #FFD642" /></span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px">
                  <div
                    v-for="r in rungsBroke"
                    :key="r.t"
                    style="position: relative; display: flex; flex-direction: column; gap: 5px"
                  >
                    <span
                      v-if="r.fed"
                      aria-hidden="true"
                      style="position: absolute; left: -8px; top: 11px; width: 8px; height: 2px; background: #FFD642"
                    />
                    <div style="display: flex; align-items: center; gap: 6px">
                      <span
                        class="tb"
                        style="min-width: 32px; height: 24px; padding: 0 4px; font-size: 12px"
                        :style="{ color: r.tc, border: `1px solid ${r.tc}` }"
                      >{{ r.t }}</span>
                      <span style="font-size: 10px; font-weight: 700; letter-spacing: .06em; color: #FFD642; white-space: nowrap">{{ r.luck }}</span>
                      <span
                        style="margin-left: auto; font-size: 14px; font-weight: 700"
                        :style="{ color: r.fg }"
                      >{{ r.txt }}</span>
                    </div>
                    <div style="height: 4px; background: #1A1D15">
                      <div
                        style="height: 4px"
                        :style="{ width: r.w, background: r.tc }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <span
              class="hazard-soft"
              style="position: relative; display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 3px 7px; font-size: 10px; font-weight: 700; letter-spacing: .1em; color: #FFD642; white-space: nowrap"
            >OVERFLOW → LUCK<span style="color: #ECEADA">+2</span></span>
          </div>
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
      class="sec"
      aria-label="Briefing and lore"
    >
      <div class="sh">
        <span class="disp sn">10</span><h2 class="lbl">
          Briefing &amp; lore
        </h2><span class="dash" /><span class="sub">Griffdiver welcome · first run + join · six beats</span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px">
        <div
          class="cell"
          style="width: 560px"
        >
          <span class="sub">Briefing rail · desktop chevrons</span>
          <div
            role="group"
            aria-label="Briefing rail specimen, desktop"
            style="display: flex; gap: 4px"
          >
            <button
              class="chev-first railbtn"
              aria-label="Beat 1 of 6, Identify, done"
              style="flex: 1 1 0; height: 44px; display: flex; align-items: center; justify-content: center; gap: 7px; background: #23261C; color: #B8B08D"
              type="button"
            >
              <span
                class="disp"
                style="font-size: 13px"
              >01</span><span style="font-size: 10px; font-weight: 700; letter-spacing: .12em">IDENTIFY</span><svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                aria-hidden="true"
              ><path d="M5 12l5 5 9-10" /></svg>
            </button>
            <button
              class="chev railbtn rail-cur"
              aria-current="step"
              aria-label="Beat 2 of 6, Spin, current"
              style="flex: 1 1 0; height: 44px; display: flex; align-items: center; justify-content: center; gap: 7px; background: #FFD642; color: #141410"
              type="button"
            >
              <span
                class="disp"
                style="font-size: 13px"
              >02</span><span style="font-size: 10px; font-weight: 700; letter-spacing: .12em">SPIN</span>
            </button>
            <button
              class="chev railbtn"
              aria-label="Beat 3 of 6, Pact, reachable"
              style="flex: 1 1 0; height: 44px; display: flex; align-items: center; justify-content: center; gap: 7px; background: #1F2219; color: #ECEADA"
              type="button"
            >
              <span
                class="disp"
                style="font-size: 13px"
              >03</span><span style="font-size: 10px; font-weight: 700; letter-spacing: .12em">PACT</span>
            </button>
            <button
              class="chev railbtn"
              disabled
              aria-label="Beat 4 of 6, Reward, locked"
              style="flex: 1 1 0; height: 44px; display: flex; align-items: center; justify-content: center; gap: 7px; background: #13150F; color: #85876F"
              type="button"
            >
              <span
                class="disp"
                style="font-size: 13px"
              >04</span><span style="font-size: 10px; font-weight: 700; letter-spacing: .12em">REWARD</span><svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              ><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>
            </button>
          </div>
          <div style="display: flex; gap: 4px">
            <span
              class="cap"
              style="flex: 1 1 0; text-align: center"
            ><b>Done</b> · ✓</span><span
              class="cap"
              style="flex: 1 1 0; text-align: center; color: #FFD642"
            >Current · aria</span><span
              class="cap"
              style="flex: 1 1 0; text-align: center"
            ><b>Reachable</b></span><span
              class="cap"
              style="flex: 1 1 0; text-align: center"
            ><b>Locked</b> · disabled</span>
          </div>
          <span
            class="sub"
            style="margin-top: 5px"
          >Briefing rail · phone squares</span>
          <div style="display: flex; align-items: center; gap: 24px">
            <div
              role="group"
              aria-label="Briefing rail specimen, phone"
              style="display: flex; align-items: center; width: 300px; height: 44px"
            >
              <button
                class="node"
                aria-label="Step 1 of 6, Identify, done"
                type="button"
              >
                <span
                  class="nsq disp"
                  style="position: relative; display: grid; place-items: center; width: 30px; height: 30px; font-size: 13px; background: #2C3022; border: 1px solid #8A8C6E; color: #ECEADA"
                >1<span style="position: absolute; right: -6px; top: -6px; width: 14px; height: 14px; display: grid; place-items: center; background: #B8B08D; color: #141410"><svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="4"
                  aria-hidden="true"
                ><path d="M5 12l5 5 9-10" /></svg></span></span>
              </button>
              <span
                aria-hidden="true"
                style="flex-grow: 1; height: 2px; background: rgba(255,214,66,.7)"
              />
              <button
                class="node"
                aria-current="step"
                aria-label="Step 2 of 6, Spin, current"
                type="button"
              >
                <span
                  class="nsq disp"
                  style="display: grid; place-items: center; width: 36px; height: 36px; font-size: 13px; background: #FFD642; border: 1px solid #FFD642; color: #141410; box-shadow: 0 0 16px rgba(255,214,66,.35)"
                >2</span>
              </button>
              <span
                aria-hidden="true"
                style="flex-grow: 1; height: 2px; background: #6A6F52"
              />
              <button
                class="node"
                aria-label="Step 3 of 6, Pact, visited"
                type="button"
              >
                <span
                  class="nsq disp"
                  style="display: grid; place-items: center; width: 30px; height: 30px; font-size: 13px; background: #0B0C09; border: 1px solid #B8B08D; color: #ECEADA"
                >3</span>
              </button>
              <span
                aria-hidden="true"
                style="flex-grow: 1; height: 2px; background: #2C3022"
              />
              <button
                class="node"
                disabled
                aria-label="Step 4 of 6, Reward, locked"
                type="button"
              >
                <span
                  class="nsq disp"
                  style="display: grid; place-items: center; width: 30px; height: 30px; font-size: 13px; background: #0B0C09; border: 1px dashed #3A3F2E; color: #85876F"
                >4</span>
              </button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px">
              <span class="cap"><b>Done</b> · ✓ badge · <span style="color: #FFD642">current</span> 36px glow</span>
              <span class="cap"><b>Reached</b> · solid · <b>locked</b> · dashed, disabled</span>
              <span class="cap">Links fill gold up to the current beat</span>
            </div>
          </div>
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

        <div
          class="cell"
          style="width: 486px"
        >
          <span class="sub">Warbond banner tile · pressed = owned</span>
          <div
            role="group"
            aria-label="Warbond tile specimens"
            style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; height: 124px"
          >
            <button
              v-for="w in warbondTiles"
              :key="w.code"
              :class="['wbk', warbonds[w.code] ? 'wb-on' : 'wb-off', w.focus ? 'wb-f' : '']"
              :aria-pressed="warbonds[w.code]"
              :aria-label="`${w.name}, ${w.items.toLowerCase()}, ${w.tier ? `warbond tier ${w.tier}` : 'acquisition special'}`"
              type="button"
              @click="warbonds[w.code] = !warbonds[w.code]"
            >
              <span class="ban">
                <span
                  v-if="!w.tier"
                  class="hatch"
                  style="position: absolute; inset: 0; display: grid; place-items: center; border-bottom: 1px dashed #3A3F2E"
                >
                  <span style="padding: 2px 6px; background: #0B0C09; border: 1px solid #454A36; font-size: 8px; font-weight: 700; letter-spacing: .16em; color: #B8B08D">ACQUISITION</span>
                </span>
              </span>
              <span
                style="position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; display: grid; place-items: center; color: #141410"
                :style="{ background: warbonds[w.code] ? '#FFD642' : 'rgba(11,12,9,.82)', border: `1px solid ${warbonds[w.code] ? '#FFD642' : '#85876F'}` }"
              >
                <svg
                  v-if="warbonds[w.code]"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3.4"
                  aria-hidden="true"
                ><path d="M5 12l5 5 9-10" /></svg>
              </span>
              <span style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 4px; padding: 7px 8px 8px">
                <span
                  class="wbname"
                  style="font-size: 11px; font-weight: 700; letter-spacing: .05em; line-height: 13px; text-transform: uppercase; color: #ECEADA"
                >{{ w.name }}</span>
                <span style="display: flex; align-items: center; justify-content: space-between">
                  <span style="font-size: 9px; font-weight: 700; letter-spacing: .12em; color: #9A9B82">{{ w.items }}</span>
                  <span
                    class="wbtier"
                    style="display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 3px; font-size: 10px; font-weight: 700"
                    :style="{ color: w.tc, border: `1px solid ${w.tc}` }"
                  >{{ w.tier || '—' }}</span>
                </span>
              </span>
            </button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px">
            <span class="cap"><b>Owned</b></span><span class="cap"><b>Unowned</b> · dim</span><span
              class="cap"
              style="color: #FFD642"
            >Focus · lit</span><span class="cap"><b>Special</b></span>
          </div>
        </div>

        <div
          class="cell"
          style="width: 510px"
        >
          <span class="sub">Order of deployment · compact · join mode</span>
          <article
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
                <span style="display: flex; flex-direction: column; gap: 4px"><span class="odl">Kit · 4 stratagems</span><span style="display: flex; gap: 4px">
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
                >24</span><span style="font-size: 10px; font-weight: 700; color: #85876F">/ 26</span></span>
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
            <span class="sub">Ministry notice · three tones</span><span class="dash" /><span style="display: flex; align-items: center; gap: 6px; height: 18px; padding: 0 8px; border: 1px solid #454A36; font-size: 9px; font-weight: 700; letter-spacing: .16em; color: #ECEADA; white-space: nowrap">LORE ADDS, NEVER REPLACES THE RULE</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
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
  </main>
</template>

<style scoped>
.kit { max-width: 1180px; gap: 12px; }

.sh h2 { color: var(--text); }

.kit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  flex-wrap: wrap;
}
.kit-head-l { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.kit-crumb { display: flex; align-items: center; gap: 10px; height: 14px; }
.kit-title { margin: 0; font-size: 44px; color: var(--text); white-space: nowrap; }

.maxims {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 318px));
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
.sw { display: flex; flex-direction: column; width: 69px; flex-shrink: 0; }
.sw-b { display: block; height: 36px; border: 1px solid #3A3F2E; margin-bottom: 6px; }
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

.cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
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
.wb-off .wbtier { opacity: .55; }
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
</style>
