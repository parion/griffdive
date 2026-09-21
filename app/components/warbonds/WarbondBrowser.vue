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

// Hover / focus / tap spotlight, plus a scroll spotlight for the row nearest
// the drawer's centre.
const activeCode = ref('')
const centeredCodes = ref<Set<string>>(new Set())
const rowElements = new Map<string, HTMLElement>()
let observer: IntersectionObserver | null = null

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

function registerRow(el: unknown, code: string): void {
  if (el instanceof HTMLElement) {
    rowElements.set(code, el)
  }
  else {
    rowElements.delete(code)
  }
}

onMounted(() => {
  if (!import.meta.client || typeof IntersectionObserver === 'undefined') {
    return
  }
  observer = new IntersectionObserver((entries) => {
    const next = new Set(centeredCodes.value)
    for (const entry of entries) {
      const code = (entry.target as HTMLElement).dataset.code
      if (!code) {
        continue
      }
      if (entry.isIntersecting) {
        next.add(code)
      }
      else {
        next.delete(code)
      }
    }
    centeredCodes.value = next
  }, { rootMargin: '-42% 0px -42% 0px', threshold: 0.01 })
  for (const el of rowElements.values()) {
    observer.observe(el)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
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
          :ref="el => registerRow(el, row.code)"
          type="button"
          class="warbond"
          :class="{
            selected: ownedWarbonds.includes(row.code),
            focused: activeCode === row.code || centeredCodes.has(row.code),
          }"
          :data-code="row.code"
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
  min-height: 3.4rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 160ms ease, background 160ms ease;
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

/* The banner starts obscured — soft blur, low light — and resolves as the row
   is scrolled to the centre, hovered, focused or tapped. */
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
}
</style>
