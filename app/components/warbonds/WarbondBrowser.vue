<script setup lang="ts">
import { ALL_ITEMS, SPECIAL_WARBOND_CODES, WARBONDS } from '~~/shared/data/catalog'
import { warbondImageUrl } from '~~/shared/data/images'
import type { RewardTier } from '~~/shared/engine/types'
import type { Tier, Warbond } from '~~/shared/data/types'

const { ownedWarbonds, setOwned, toggle } = useOwnedWarbonds()

const TIER_LABEL: Record<Tier, RewardTier> = { c: 'C', b: 'B', a: 'A', s: 'S' }

interface WarbondRow {
  code: string
  displayName: string
  image: string | undefined
  tier: RewardTier | undefined
  items: number
  special: boolean
}

// Hover / focus / tap spotlight only — the banner stays obscured otherwise.
const activeCode = ref('')

const rows = computed<WarbondRow[]>(() => WARBONDS.map((warbond: Warbond) => ({
  code: warbond.code,
  displayName: warbond.displayName,
  image: warbondImageUrl(warbond),
  tier: warbond.tier ? TIER_LABEL[warbond.tier] : undefined,
  items: ALL_ITEMS.filter(item => item.warbondCode === warbond.code).length,
  special: SPECIAL_WARBOND_CODES.includes(warbond.code),
})))

const allOwned = computed(() => ownedWarbonds.value.length === WARBONDS.length)

function toggleAll(): void {
  setOwned(allOwned.value ? [] : WARBONDS.map(warbond => warbond.code))
}

function isOwned(code: string): boolean {
  return ownedWarbonds.value.includes(code)
}
</script>

<template>
  <div class="warbond-browser">
    <div class="wb-head row spread">
      <span class="lbl">
        Owned <b class="wb-count">{{ ownedWarbonds.length }}</b>
        <span class="dim">/ {{ WARBONDS.length }}</span>
      </span>
      <button
        type="button"
        class="btn tiny ghost"
        @click="toggleAll"
      >
        {{ allOwned ? 'Clear all' : 'Select all' }}
      </button>
    </div>
    <p class="muted small wb-note">
      Reward offers only include items from your own warbonds.
    </p>

    <ul class="warbond-list">
      <li
        v-for="row in rows"
        :key="row.code"
      >
        <button
          type="button"
          class="warbond cut-sm"
          :class="[
            isOwned(row.code) ? 'wb-on' : 'wb-off',
            { focused: activeCode === row.code, special: row.special },
          ]"
          :aria-pressed="isOwned(row.code)"
          @click="toggle(row.code)"
          @pointerenter="activeCode = row.code"
          @pointerleave="activeCode = ''"
          @focus="activeCode = row.code"
          @blur="activeCode = ''"
        >
          <span
            v-if="row.image"
            class="warbond-bg"
            :style="{ backgroundImage: `url(${row.image})` }"
            aria-hidden="true"
          />
          <span
            class="warbond-check"
            aria-hidden="true"
          >✓</span>
          <span class="warbond-text">
            <span class="warbond-name">{{ row.displayName }}</span>
            <span class="warbond-meta">
              <span class="cap">{{ row.items }} items</span>
              <span
                v-if="row.special"
                class="acq"
              >Acquisition</span>
            </span>
          </span>
          <TierBadge
            v-if="row.tier"
            :tier="row.tier"
            size="sm"
          />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.warbond-browser { display: grid; gap: 0.6rem; }
.wb-head { align-items: baseline; }
.wb-count { color: var(--gold); }
.wb-note { margin: 0; }

.warbond-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}

.warbond {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3.4rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--dur-fast), background-color var(--dur-fast), filter var(--dur-fast);
}
.warbond:hover { border-color: #8a8c6e; }

.wb-on {
  border-color: var(--line-4);
  background-color: var(--raised);
}
.wb-on .warbond-name { color: var(--gold); }

.wb-off { color: var(--muted); }
.wb-off .warbond-name { color: var(--khaki); }
.wb-off .warbond-check { border-style: dashed; }

.warbond.special { border-left: 3px solid color-mix(in srgb, var(--khaki) 35%, transparent); }

/* The banner starts obscured — soft blur, low light — and resolves while the
   row is hovered, focused or tapped. */
.warbond-bg {
  position: absolute;
  inset: -8%;
  z-index: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.08;
  filter: blur(11px) saturate(0.45) brightness(0.7);
  transform: scale(1.12);
  pointer-events: none;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 65%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 65%);
  transition:
    opacity 420ms var(--ease-out),
    filter 420ms var(--ease-out),
    transform 620ms var(--ease-out);
}

.wb-off .warbond-bg { filter: grayscale(1) brightness(0.5) blur(11px); }
.wb-on .warbond-bg { opacity: 0.12; }

.warbond.focused .warbond-bg {
  opacity: 0.34;
  filter: blur(0) saturate(1) brightness(1);
  transform: scale(1);
}

.warbond-check {
  position: relative;
  z-index: 1;
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 1.15rem;
  height: 1.15rem;
  border: 1px solid var(--line-4);
  font-size: 0.7rem;
  line-height: 1;
  color: transparent;
  transition: background-color var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast);
}
.wb-on .warbond-check {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--on-gold);
}

.warbond-text {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}
.warbond-name {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.warbond-meta { display: flex; align-items: center; gap: 0.5rem; }
.acq {
  display: inline-block;
  padding: 0 0.4rem;
  border: 1px solid var(--line-4);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--khaki);
  white-space: nowrap;
}

.warbond :deep(.tier-badge) { position: relative; z-index: 1; flex: none; }

@media (prefers-reduced-motion: reduce) {
  .warbond,
  .warbond-bg,
  .warbond-check { transition: none; }
}
</style>
