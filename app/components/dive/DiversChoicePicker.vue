<script setup lang="ts">
import { TIER_RANK } from '~~/shared/data/catalog'
import type { Item, ItemCategory } from '~~/shared/data/types'
import { SPRING_SNAP } from '~/utils/motion'

const props = defineProps<{
  open: boolean
  pool: Item[]
  ownedIds: string[]
}>()

const emit = defineEmits<{ close: [], choose: [itemId: string] }>()

const CATEGORIES: (ItemCategory | 'all')[] = [
  'all',
  'primary',
  'secondary',
  'throwable',
  'booster',
  'armorPassive',
  'Supply',
  'Eagle',
  'Orbital',
  'Defense',
]

const search = ref('')
const category = ref<ItemCategory | 'all'>('all')
const searchInput = ref<HTMLInputElement | null>(null)

const owned = computed(() => new Set(props.ownedIds))

const filtered = computed(() =>
  props.pool.filter((item) => {
    if (category.value !== 'all' && item.category !== category.value) {
      return false
    }
    const query = search.value.trim().toLowerCase()
    if (query && !item.displayName.toLowerCase().includes(query) && !item.id.includes(query)) {
      return false
    }
    return true
  }),
)

const tierGroups = computed(() =>
  [...new Set(filtered.value.map(item => item.tier))]
    .sort((a, b) => TIER_RANK[b] - TIER_RANK[a])
    .map(tier => ({
      tier,
      items: filtered.value.filter(item => item.tier === tier),
    })),
)

const claimableCount = computed(() => props.pool.filter(item => !owned.value.has(item.id)).length)

function choose(item: Item): void {
  if (owned.value.has(item.id)) {
    return
  }
  emit('choose', item.id)
}

watch(() => props.open, (open) => {
  document.documentElement.classList.toggle('modal-open', open)
  if (open) {
    search.value = ''
    category.value = 'all'
    nextTick(() => searchInput.value?.focus())
  }
})

function onKeydown(event: KeyboardEvent): void {
  if (props.open && event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.classList.remove('modal-open')
})
</script>

<template>
  <Teleport to="body">
    <AnimatePresence>
      <Motion
        v-if="open"
        key="backdrop"
        as="div"
        class="backdrop"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.15 }"
        @click="emit('close')"
      />
      <Motion
        v-if="open"
        key="dialog"
        as="div"
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="choice-picker-title"
        :initial="{ opacity: 0, y: 24, scale: 0.97 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 12, scale: 0.98 }"
        :transition="SPRING_SNAP"
      >
        <header class="row spread head">
          <div>
            <h2
              id="choice-picker-title"
              class="title"
              data-tier="S+"
            >
              <span class="mark">S+</span> Diver's Choice
            </h2>
            <p class="muted small">
              {{ claimableCount }} of {{ pool.length }} items claimable — anything from your own
              warbonds, nothing already owned.
            </p>
          </div>
          <button
            type="button"
            class="btn tiny ghost"
            @click="emit('close')"
          >
            Close
          </button>
        </header>

        <section class="panel filters">
          <select
            v-model="category"
            aria-label="Filter by category"
          >
            <option
              v-for="entry in CATEGORIES"
              :key="entry"
              :value="entry"
            >
              {{ entry === 'all' ? 'All categories' : entry }}
            </option>
          </select>
          <input
            ref="searchInput"
            v-model="search"
            type="text"
            placeholder="Search name or id…"
            aria-label="Search the codex"
          >
        </section>

        <p
          v-if="filtered.length === 0"
          class="muted small"
        >
          Nothing in your catalog matches.
        </p>

        <template
          v-for="group in tierGroups"
          :key="group.tier"
        >
          <h3
            class="tier-heading"
            :data-tier="group.tier"
          >
            <span class="label">{{ group.tier.toUpperCase() }} Tier</span>
            <span class="count">{{ group.items.length }}</span>
          </h3>
          <section class="grid">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="slot"
              :class="{ held: owned.has(item.id) }"
            >
              <ItemCard
                :item="item"
                compact
                :disabled="owned.has(item.id)"
                :title="owned.has(item.id) ? 'Already owned' : undefined"
                @select="choose(item)"
              />
            </div>
          </section>
        </template>
      </Motion>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(9, 10, 7, 0.72);
}

.dialog {
  position: fixed;
  inset: 0;
  z-index: 41;
  margin: auto;
  width: min(680px, calc(100vw - 2rem));
  height: fit-content;
  max-height: min(84vh, 760px);
  overflow: auto;
  padding: 1.1rem 1.25rem 1.25rem;
  background: var(--bg-raised);
  border: 1px solid color-mix(in srgb, var(--tier-splus) 40%, var(--border));
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 34px color-mix(in srgb, var(--tier-splus) 14%, transparent);
}

.head {
  align-items: baseline;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.6rem;
  margin-bottom: 0.75rem;
}

.title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  font-stretch: 125%;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.mark {
  display: inline-grid;
  place-items: center;
  min-width: 1.7rem;
  height: 1.7rem;
  padding: 0 0.2rem;
  border: 1px solid currentColor;
  border-radius: 5px;
  font-size: 0.75rem;
}

.filters {
  position: sticky;
  top: -1.1rem;
  z-index: 1;
  margin-bottom: 0.75rem;
  padding: 0.6rem;
  background: var(--bg-raised);
}
.filters select, .filters input[type="text"] { min-width: 0; flex: 1 1 10rem; }

.tier-heading {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 1.1rem 0 0.6rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  font-stretch: 125%;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.tier-heading::before, .tier-heading::after {
  content: '';
  align-self: center;
  flex: 1;
  height: 1px;
  background: currentColor;
  opacity: 0.35;
}
.tier-heading .count {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

.slot.held { opacity: 0.4; }
</style>
