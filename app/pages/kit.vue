<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item } from '~~/shared/data/types'
import type { RewardTier } from '~~/shared/engine/types'

useHead({ meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

const SURFACES = [
  ['Ground', '#0B0C09', 'Stage'],
  ['Rail', '#0E100B', 'Rails'],
  ['Panel', '#13150F', 'Panels'],
  ['Raised', '#1A1D15', 'Raised'],
] as const

const LINES = [
  ['Line 1', '#23261C', 'Hairline'],
  ['Line 2', '#2C3022', 'Divider'],
  ['Line 3', '#3A3F2E', 'Frame'],
  ['Line 4', '#454A36', 'Ghost'],
  ['Line 5', '#5A5E45', 'Pip off'],
] as const

const INKS = [
  ['Text', '#ECEADA', 'Primary'],
  ['Khaki', '#B8B08D', 'Secondary'],
  ['Muted', '#9A9B82', 'Min body'],
  ['Dim', '#85876F', 'Large only'],
  ['Ink', '#141410', 'On gold'],
] as const

const SIGNALS = [
  ['Gold', '#FFD642', 'Act now'],
  ['Red', '#FF4B3E', 'Danger'],
  ['Orange', '#FF9F43', 'Strain · MO'],
  ['Teal', '#4AD7C8', 'Ready'],
  ['Purple', '#B06BFF', 'Illuminate'],
] as const

const TIERS: RewardTier[] = ['C', 'B', 'A', 'S', 'S+']
const STAMPS = ['Accepted', 'Opted out', 'Sworn', 'Voided', 'Banked', 'Banned', 'Confiscated', 'Locked']

const fallbackItem = [...ITEMS_BY_ID.values()][0] as Item
const sampleItem = computed(() => ITEMS_BY_ID.get('eagle500kgbomb') ?? fallbackItem)
const reserveItem = computed(() => ITEMS_BY_ID.get('eaglesmokestrike') ?? sampleItem.value)

const stars = ref(4)
const samples = ref(14)
const tokenCount = ref(2)
</script>

<template>
  <main
    id="main-content"
    class="page kit"
    tabindex="-1"
  >
    <header class="page-header">
      <div>
        <span class="lbl">Internal</span>
        <h1 class="disp">
          Destroyer Terminal Kit
        </h1>
      </div>
      <span class="chip gold">Hidden route</span>
    </header>

    <p class="muted small">
      A living specimen sheet for the redesign's tokens and atoms. Not linked in
      the ship's nav — reachable directly at <code class="mono">/kit</code>.
    </p>

    <section class="sec">
      <div class="sec-h">
        <h2 class="lbl">
          <span class="sn">01</span> · Maxims
        </h2>
        <span class="dash" />
      </div>
      <ul class="maxims">
        <li>Risk is chosen, never forced.</li>
        <li>Risk is legible — the ceiling is shown before the dive.</li>
        <li>Reward scales with stakes; rarity class, never a shopping list.</li>
        <li>Misfortunes reshape decisions, not stats.</li>
        <li>Failure is a setback, not a wipe.</li>
      </ul>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="lbl">
          <span class="sn">02</span> · Color
        </h2>
        <span class="dash" />
      </div>
      <div class="swatches">
        <div
          v-for="[name, hex, role] in SURFACES"
          :key="name"
          class="sw"
        >
          <span
            class="sw-b"
            :style="{ background: hex }"
          />
          <span class="sw-n">{{ name }}</span>
          <span class="sw-h">{{ hex }}</span>
          <span class="sw-r">{{ role }}</span>
        </div>
      </div>
      <div class="swatches">
        <div
          v-for="[name, hex, role] in [...LINES, ...INKS, ...SIGNALS]"
          :key="name"
          class="sw"
        >
          <span
            class="sw-b"
            :style="{ background: hex }"
          />
          <span class="sw-n">{{ name }}</span>
          <span class="sw-h">{{ hex }}</span>
          <span class="sw-r">{{ role }}</span>
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="lbl">
          <span class="sn">03</span> · Type
        </h2>
        <span class="dash" />
      </div>
      <p class="disp sample-disp">
        Griffdive · Super Helldive
      </p>
      <p class="lbl">
        .lbl — section label · 18em tracking
      </p>
      <p class="cap">
        .cap — micro caption · tabular numerals
      </p>
      <p class="sub">
        .sub — sub label
      </p>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="lbl">
          <span class="sn">04</span> · Frames and motifs
        </h2>
        <span class="dash" />
      </div>
      <div class="motif-grid">
        <span class="motif cut">.cut</span>
        <span class="motif cut-sm">.cut-sm</span>
        <span class="motif chev">.chev</span>
        <span class="motif ticks">.ticks</span>
        <span class="motif hazard">.hazard</span>
        <span class="motif ticks-red">.ticks-red</span>
        <span class="motif hazard-red">.hazard-red</span>
        <span class="motif hatch">.hatch</span>
      </div>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="lbl">
          <span class="sn">05</span> · Controls
        </h2>
        <span class="dash" />
      </div>
      <div class="row">
        <button class="btn primary">
          Primary
        </button>
        <button class="btn">
          Secondary
        </button>
        <button class="btn ghost">
          Ghost
        </button>
        <button class="btn danger">
          Danger
        </button>
        <button
          class="btn"
          disabled
        >
          Disabled
        </button>
      </div>
      <div class="row">
        <span class="chip">Chip</span>
        <span class="chip gold">Gold</span>
        <span class="chip warn">Warn</span>
        <span class="chan"><span
          class="lamp teal pulse"
          aria-hidden="true"
        />Uplink live</span>
      </div>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="lbl">
          <span class="sn">06</span> · Game atoms
        </h2>
        <span class="dash" />
      </div>
      <div class="row">
        <TierBadge
          v-for="t in TIERS"
          :key="t"
          :tier="t"
        />
      </div>
      <div class="row">
        <RiskPips :value="2" />
        <RiskPips :value="4" />
        <span class="chits"><span
          v-for="i in 3"
          :key="i"
          class="chit"
          :class="{ on: i <= tokenCount }"
        /></span>
        <span
          v-for="s in STAMPS"
          :key="s"
          class="stp"
          :style="{ color: s === 'Opted out' ? 'var(--khaki)' : s === 'Banked' || s === 'Accepted' ? 'var(--gold)' : 'var(--red)' }"
        >{{ s }}</span>
      </div>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="lbl">
          <span class="sn">07</span> · Composite components
        </h2>
        <span class="dash" />
      </div>
      <div class="composite">
        <ItemCard
          :item="sampleItem"
          showcase
          lead
        />
        <ItemCard
          :item="reserveItem"
          reserve
        />
        <div class="stack">
          <StarRating v-model="stars" />
          <RangeField
            v-model="samples"
            :max="40"
            label="Common samples"
            aria-label="Common samples"
          />
          <span class="cap">Stars <b>{{ stars }}</b> · samples <b>{{ samples }}</b></span>
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-h">
        <h2 class="lbl">
          <span class="sn">08</span> · Motion
        </h2>
        <span class="dash" />
      </div>
      <p class="muted small">
        Ambient loops are CSS classes; one-shot reveals use the presets in
        <code class="mono">app/utils/motion.ts</code>. Every animation is
        disabled under <code class="mono">prefers-reduced-motion</code>.
      </p>
      <div class="row">
        <span class="demo-box rise">.rise</span>
        <span class="demo-box slam">.slam</span>
        <span class="demo-box pulse">.pulse</span>
        <span class="demo-box glow">.glow</span>
        <span class="demo-box stamp">.stamp</span>
      </div>
    </section>
  </main>
</template>

<style scoped>
.kit { max-width: 1200px; }

.maxims {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.25rem;
  color: var(--khaki);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sw {
  display: flex;
  flex-direction: column;
  width: 84px;
}
.sw-b {
  display: block;
  height: 34px;
  border: 1px solid var(--line-3);
  margin-bottom: 5px;
}
.sw-n { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.sw-h { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: var(--khaki); }
.sw-r { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--muted); text-transform: uppercase; }

.sample-disp { font-size: clamp(1.6rem, 5vw, 3rem); color: var(--text); }

.motif-grid { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.motif {
  display: grid;
  place-items: center;
  min-width: 7rem;
  height: 44px;
  padding: 0 0.7rem;
  border: 1px solid var(--line-3);
  background: var(--rail);
  color: var(--khaki);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.motif.ticks,
.motif.ticks-red { background: var(--panel); }
.motif.hazard,
.motif.hazard-red,
.motif.hatch { color: var(--text); }

.composite {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  align-items: start;
}

.demo-box {
  display: grid;
  place-items: center;
  min-width: 5rem;
  height: 40px;
  padding: 0 0.7rem;
  border: 1px solid var(--line-3);
  background: var(--panel);
  color: var(--khaki);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
