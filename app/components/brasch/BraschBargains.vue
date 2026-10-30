<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import { catchUpOpsBehind } from '~~/shared/engine/progression'
import { itemPrice } from '~~/shared/engine/rewards'
import type { BargainSlot } from '~~/shared/engine/rewards'
import { armorPackFor, armorPackItemsFor, armorPackOfferFor, bargainShelfFor, bargainsClosedReason, canBuyArmorPack, canBuyItem } from '~~/shared/engine/selectors'
import type { ArmorPackOffer } from '~~/shared/engine/selectors'
import type { BargainSlotKind, DiverState, DiveState, RewardTier } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  self: DiverState | null
}>()

const emit = defineEmits<{ buy: [itemId: string], openPack: [] }>()

const credits = computed(() => props.self?.credits ?? 0)
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const closed = computed(() => bargainsClosedReason(props.state))
const shelf = computed(() => (props.self ? bargainShelfFor(props.state, props.self) : []))

const pack = computed(() => (props.self ? armorPackFor(props.self) : null))
const packItems = computed(() => (props.self ? armorPackItemsFor(props.self) : []))
const packOffer = computed(() => (props.self ? armorPackOfferFor(props.state, props.self) : null))
const packVerdict = computed(() =>
  props.self ? canBuyArmorPack(props.state, props.self) : { allowed: false, reason: null })
const packOpen = ref(false)
const packInstant = ref(false)
const pendingPack = ref(false)

// The purchase round-trips through the engine, so open the reveal when the
// stored pull lands, not when the button is pressed.
watch(() => pack.value?.seed, (seed, previous) => {
  if (seed !== undefined && seed !== previous && pendingPack.value) {
    pendingPack.value = false
    packInstant.value = false
    packOpen.value = true
  }
})

function openPack(): void {
  if (!packVerdict.value.allowed) {
    return
  }
  pendingPack.value = true
  emit('openPack')
}

function viewPack(): void {
  if (packItems.value.length === 0) {
    return
  }
  packInstant.value = true
  packOpen.value = true
}

function sLabel(offer: ArmorPackOffer): string {
  if (offer.sChance === 0) {
    return 'S pool complete'
  }
  return offer.sChance >= 1 ? 'S guaranteed' : `S pull ${Math.round(offer.sChance * 100)}%`
}

function hitLabel(offer: ArmorPackOffer): string {
  if (offer.hitFloor === 'b') {
    return 'B+'
  }
  return offer.hitFloor.toUpperCase()
}

function slotLabel(kind: BargainSlotKind): string {
  return kind === 'stratagem' ? 'Stratagem' : categoryLabel(kind)
}

function tierOf(item: Item): RewardTier {
  return item.tier.toUpperCase() as RewardTier
}

// The engine's verdict (canBuyItem): the panel never invents a reason.
function verdict(slot: BargainSlot): { allowed: boolean, reason: string | null } {
  if (!props.self || !slot.item) {
    return { allowed: false, reason: null }
  }
  return canBuyItem(props.state, props.self, slot.item.id)
}
</script>

<template>
  <section
    class="bb"
    aria-label="Brasch's Bargains"
  >
    <header class="bb-head">
      <div class="bb-title">
        <span class="lbl">Operation {{ opNumber }} · Mission {{ state.missionInOperation }} stock</span>
        <span class="muted small">Brasch restocks every mission.</span>
      </div>
      <div class="bb-purse">
        <span class="lbl">Credits</span>
        <CreditAmount
          class="disp bb-purse-val"
          :value="credits"
        />
      </div>
    </header>

    <AppBanner
      v-if="closed"
      class="bb-closed"
      tone="locked"
    >
      {{ closed }}
    </AppBanner>

    <section
      v-if="self"
      class="bb-side"
      aria-label="Brasch's Armor Pack"
    >
      <header class="bb-side-head">
        <span class="lbl">Side stock</span>
        <span class="muted small">One pack per operation.</span>
      </header>

      <div
        class="bb-pack cut-sm"
        :class="{ bought: pack, empty: packOffer?.available === 0 }"
      >
        <div
          class="bb-pack-mark"
          aria-hidden="true"
        >
          <IconPack />
        </div>

        <div class="bb-pack-copy">
          <span class="bb-pack-title disp">Armor Pack</span>
          <p
            v-if="pack"
            class="bb-pack-line muted small"
          >
            Opened this operation · {{ packItems.length }} passive{{ packItems.length === 1 ? '' : 's' }}
          </p>
          <p
            v-else-if="packOffer"
            class="bb-pack-line muted small"
          >
            Up to {{ packOffer.size }} armor passives · one {{ hitLabel(packOffer) }} pull
            <span
              class="bb-pack-dot"
              aria-hidden="true"
            >·</span>
            {{ sLabel(packOffer) }}
          </p>

          <ul
            v-if="pack && packItems.length"
            class="bb-pulls"
          >
            <li
              v-for="item in packItems"
              :key="item.id"
              class="bb-pull"
              :data-tier="tierOf(item)"
            >
              <span class="bb-pull-tier disp">{{ tierOf(item) }}</span>
              <span class="bb-pull-name">{{ item.displayName }}</span>
            </li>
          </ul>
          <span
            v-else-if="packOffer && packOffer.available > 0 && packOffer.available < 3"
            class="muted small"
          >
            Only {{ packOffer.available }} passive{{ packOffer.available === 1 ? '' : 's' }} left in your warbonds.
          </span>
        </div>

        <div class="bb-pack-buy">
          <button
            v-if="!pack"
            class="btn primary cut bb-pack-btn"
            type="button"
            :disabled="!packVerdict.allowed"
            :title="packVerdict.reason ?? undefined"
            :aria-label="packOffer
              ? `Open Armor Pack for ${packOffer.price} credits`
              : 'Open Armor Pack'"
            @click="openPack"
          >
            <span class="disp">Open pack</span>
            <CreditAmount
              v-if="packOffer"
              class="bb-cost"
              :value="packOffer.price"
            />
          </button>
          <button
            v-else
            class="btn ghost cut bb-pack-btn"
            type="button"
            @click="viewPack"
          >
            <span class="disp">View pull</span>
          </button>
          <span
            v-if="!pack && packVerdict.reason"
            class="bb-pack-reason"
          >
            {{ packVerdict.reason }}
          </span>
        </div>
      </div>
    </section>

    <ul class="bb-grid">
      <li
        v-for="slot in shelf"
        :key="slot.slotId"
        class="bb-card cut-sm"
        :class="[slot.status, { empty: !slot.item }]"
        :data-edge="slot.item?.tier"
      >
        <header class="bb-card-head">
          <span class="lbl">{{ slotLabel(slot.kind) }}</span>
          <ItemTierBadge
            v-if="slot.item"
            :tier="tierOf(slot.item)"
            size="sm"
          />
        </header>

        <template v-if="slot.item">
          <div class="bb-stage grid-bg">
            <img
              v-if="itemImageUrl(slot.item)"
              class="bb-art"
              :src="itemImageUrl(slot.item)"
              alt=""
              loading="lazy"
              draggable="false"
            >
          </div>
          <span class="bb-item">{{ slot.item.displayName }}</span>
          <span
            v-if="slot.status === 'bought'"
            class="bb-stamp disp"
          >Requisitioned</span>
          <button
            v-else
            class="btn primary cut bb-buy"
            type="button"
            :disabled="!verdict(slot).allowed"
            :title="verdict(slot).reason ?? undefined"
            :aria-label="`Buy ${slot.item.displayName} for ${itemPrice(slot.item)} credits`"
            @click="emit('buy', slot.item.id)"
          >
            <span class="disp">Buy</span>
            <CreditAmount
              class="bb-cost"
              :value="itemPrice(slot.item)"
            />
          </button>
        </template>
        <div
          v-else
          class="bb-stage grid-bg"
        >
          <p
            v-if="slot.status !== 'heldBack'"
            class="muted small bb-sold"
          >
            Nothing left in your warbonds.
          </p>
        </div>

        <div
          v-if="slot.status === 'locked' || slot.status === 'heldBack'"
          class="bb-veil"
          role="note"
        >
          <IconLock class="bb-lock" />
          <span>{{ slot.status === 'locked' ? 'Brasch will be back next mission' : 'Restocked by Brasch next operation' }}</span>
        </div>
      </li>
    </ul>

    <BraschPackReveal
      :open="packOpen"
      :items="packItems"
      :pack-seed="pack?.seed ?? null"
      :instant="packInstant"
      @close="packOpen = false"
    />
  </section>
</template>

<style scoped>
.bb {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bb-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}
.bb-title { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.bb-purse {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 12px;
  border: 1px solid var(--gold);
  color: var(--gold);
}
.bb-purse .lbl { color: var(--gold); }
.bb-purse-val { font-size: 1.4rem; line-height: 1; }

.bb-lock { width: 16px; height: 16px; }

.bb-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
@container (min-width: 560px) {
  .bb-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@container (min-width: 600px) {
  .bb-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.bb-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--line-3);
  border-top: 2px solid var(--tier-edge, var(--line-3));
  background: var(--rail);
}
.bb-card[data-edge='c'] { --tier-edge: var(--tier-c); }
.bb-card[data-edge='b'] { --tier-edge: var(--tier-b); }
.bb-card[data-edge='a'] { --tier-edge: var(--tier-a); }
.bb-card[data-edge='s'] { --tier-edge: var(--tier-s); }
.bb-card.empty { border-style: dashed; background: transparent; }
.bb-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
/* The art leads each slot, letterboxed whole like the loot cards. */
.bb-stage {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--line-2);
}
.bb-art {
  position: absolute;
  inset: 10%;
  width: 80%;
  height: 80%;
  object-fit: contain;
}
.bb-item {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bb-buy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 40px;
  margin-top: auto;
  padding: 0 12px;
}
.bb-buy:disabled {
  background: transparent;
  border: 1px solid var(--line-3);
  color: var(--muted);
  cursor: not-allowed;
}
.bb-cost { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
.bb-sold { margin: 0; }

.bb-card.empty .bb-stage { flex: 1; }

/* The bought slot keeps its place on the shelf, lit in gold. */
.bb-card.bought {
  border-color: var(--gold);
  background: color-mix(in srgb, var(--gold) 8%, var(--rail));
}
.bb-stamp {
  display: grid;
  place-items: center;
  min-height: 40px;
  margin-top: auto;
  border: 1px solid var(--gold);
  color: var(--gold);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  overflow: hidden;
  white-space: nowrap;
}

.bb-veil {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: color-mix(in srgb, var(--ground) 90%, transparent);
  color: var(--khaki);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.35;
  text-align: center;
  text-transform: uppercase;
}
.bb-veil .bb-lock { width: 20px; height: 20px; }

/* The Armor Pack is side stock, not a shelf slot: one sealed product, one
   operation, one pull. It reads as a foil pack beside the ordinary grid. */
.bb-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--line-1);
}
.bb-side-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.bb-pack {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--line-3));
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--gold) 6%, transparent) 0 7px, transparent 7px 16px),
    color-mix(in srgb, var(--gold) 5%, var(--rail));
}
.bb-pack.bought {
  border-color: var(--gold);
  background:
    radial-gradient(ellipse 60% 100% at 0% 50%, color-mix(in srgb, var(--gold) 16%, transparent), transparent 70%),
    var(--rail);
}
.bb-pack.empty {
  border-style: dashed;
  border-color: var(--line-3);
  background: transparent;
}
.bb-pack-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid color-mix(in srgb, var(--gold) 60%, var(--line-3));
  background: var(--ground);
  color: var(--gold);
  box-shadow: inset 0 0 18px color-mix(in srgb, var(--gold) 14%, transparent);
}
.bb-pack-mark :deep(svg) { width: 26px; height: 26px; }
.bb-pack-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.bb-pack-title {
  color: var(--gold);
  font-size: 1rem;
  letter-spacing: 0.06em;
}
.bb-pack-line { margin: 0; }
.bb-pack-dot { margin: 0 4px; color: var(--dim); }

.bb-pulls {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}
.bb-pull {
  --tier: var(--tier-c);
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  padding-left: 6px;
  border-left: 2px solid var(--tier);
}
.bb-pull[data-tier='B'] { --tier: var(--tier-b); }
.bb-pull[data-tier='A'] { --tier: var(--tier-a); }
.bb-pull[data-tier='S'] { --tier: var(--tier-s); }
.bb-pull-tier {
  color: var(--tier);
  font-size: 12px;
  line-height: 1;
}
.bb-pull-name {
  min-width: 0;
  overflow: hidden;
  color: var(--khaki);
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bb-pack-buy {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
}
.bb-pack-btn {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 0 12px;
  white-space: nowrap;
}
.bb-pack-btn:disabled {
  background: transparent;
  border: 1px solid var(--line-3);
  color: var(--muted);
  cursor: not-allowed;
}
.bb-pack-reason {
  max-width: 150px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.2;
  text-align: right;
}

@container (max-width: 430px) {
  .bb-pack { grid-template-columns: auto minmax(0, 1fr); }
  .bb-pack-buy { grid-column: 1 / -1; }
  .bb-pack-reason { max-width: none; text-align: left; }
}
</style>
