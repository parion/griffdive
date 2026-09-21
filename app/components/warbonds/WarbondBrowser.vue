<script setup lang="ts">
import { ALL_ITEMS, WARBONDS } from '~~/shared/data/catalog'
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
}

const activeCode = ref('')

const rows = computed<WarbondRow[]>(() => WARBONDS.map((warbond: Warbond) => ({
  code: warbond.code,
  displayName: warbond.displayName,
  image: warbondImageUrl(warbond),
  tier: warbond.tier ? TIER_LABEL[warbond.tier] : undefined,
  items: ALL_ITEMS.filter(item => item.warbondCode === warbond.code).length,
})))

const allOwned = computed(() => ownedWarbonds.value.length === WARBONDS.length)

function toggleAll(): void {
  setOwned(allOwned.value ? [] : WARBONDS.map(warbond => warbond.code))
}
</script>

<template>
  <div class="warbond-browser">
    <div class="row spread">
      <p class="muted small">
        {{ ownedWarbonds.length }} of {{ WARBONDS.length }} owned · reward offers only include items
        from your own warbonds
      </p>
      <button
        type="button"
        class="btn tiny ghost"
        @click="toggleAll"
      >
        {{ allOwned ? 'Clear all' : 'Select all' }}
      </button>
    </div>

    <ul class="warbond-list">
      <li
        v-for="row in rows"
        :key="row.code"
      >
        <button
          type="button"
          class="warbond"
          :class="{
            selected: ownedWarbonds.includes(row.code),
            active: activeCode === row.code,
          }"
          :aria-pressed="ownedWarbonds.includes(row.code)"
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
            <span class="muted small">{{ row.items }} items</span>
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
.warbond-browser { display: grid; gap: 0.7rem; }

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
  min-height: 3.3rem;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition:
    min-height 220ms var(--ease-out),
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms var(--ease-out);
}

.warbond:hover,
.warbond.active {
  min-height: 4.6rem;
  transform: translateX(2px);
}

.warbond.selected {
  border-color: color-mix(in srgb, var(--gold) 55%, var(--border));
}
.warbond.selected::before {
  content: '';
  position: absolute;
  inset-block: 0;
  left: 0;
  width: 3px;
  background: var(--gold);
}

.warbond-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.05;
  transform: scale(1.06);
  pointer-events: none;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 62%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 62%);
  transition: opacity 260ms var(--ease-out), transform 400ms var(--ease-out);
}

.warbond:hover .warbond-bg,
.warbond.active .warbond-bg,
.warbond.selected .warbond-bg {
  opacity: 0.22;
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
  border: 1px solid var(--muted);
  border-radius: 50%;
  font-size: 0.7rem;
  line-height: 1;
  color: transparent;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}
.warbond.selected .warbond-check {
  background: var(--gold);
  border-color: var(--gold);
  color: #171712;
}

.warbond-text {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.05rem;
  flex: 1;
  min-width: 0;
}

.warbond-name { font-weight: 600; letter-spacing: 0.02em; }
.warbond.selected .warbond-name { color: var(--gold); }

.warbond :deep(.tier-badge) { position: relative; z-index: 1; flex: none; }

@media (prefers-reduced-motion: reduce) {
  .warbond,
  .warbond-bg,
  .warbond-check { transition: none; }
  .warbond:hover,
  .warbond.active { transform: none; }
}
</style>
