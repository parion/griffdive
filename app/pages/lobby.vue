<script setup lang="ts">
import type { FrontId } from '~~/shared/data/fronts'
import { VARIANTS, difficultyName } from '~~/shared/engine/progression'
import { frontById } from '~~/shared/engine/wheel'
import type { CrusadeVariant } from '~~/shared/engine/types'
import type { LobbyEntry } from '~~/shared/types/messages'

const store = useSessionStore()

const difficultyFilter = ref<'any' | 'early' | 'mid' | 'late' | 'endgame'>('any')
const variantFilter = ref<'any' | CrusadeVariant>('any')
const frontFilter = ref<'any' | FrontId>('any')

const DIFFICULTY_BANDS: Record<string, number[]> = {
  early: [3, 4],
  mid: [5, 6],
  late: [7, 8],
  endgame: [9, 10],
}

const filtered = computed(() =>
  store.lobbyRooms.filter((room) => {
    if (difficultyFilter.value !== 'any' && !DIFFICULTY_BANDS[difficultyFilter.value]?.includes(room.difficulty)) {
      return false
    }
    if (variantFilter.value !== 'any' && room.variant !== variantFilter.value) {
      return false
    }
    if (frontFilter.value !== 'any' && room.front !== frontFilter.value) {
      return false
    }
    return true
  }),
)

onMounted(async () => {
  try {
    const response = await $fetch<{ rooms: LobbyEntry[] }>('/api/lobby')
    store.lobbyRooms = response.rooms
  }
  catch {
    // The live lobby connection (below) will populate the list shortly.
  }
})

// Live lobby updates ride the same WebSocket endpoint; lobby listeners join
// the pseudo-room and receive `lobby` broadcasts.
useGameSocket('__lobby__')

function variantName(variant: LobbyEntry['variant']): string {
  return VARIANTS.find(entry => entry.id === variant)?.name ?? 'Fresh lobby'
}

function frontOf(front: LobbyEntry['front']) {
  return front ? frontById(front) : null
}
</script>

<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1>Open dives</h1>
        <p class="muted small">
          Squads with free seats, looking for divers right now.
        </p>
      </div>
      <NuxtLink
        class="btn ghost"
        to="/"
      >Host from base</NuxtLink>
    </header>

    <section class="panel row filters">
      <label class="row small muted">
        Difficulty
        <select v-model="difficultyFilter">
          <option value="any">Any</option>
          <option value="early">Medium–Challenging (3–4)</option>
          <option value="mid">Hard–Extreme (5–6)</option>
          <option value="late">Suicide–Impossible (7–8)</option>
          <option value="endgame">Helldive+ (9–10)</option>
        </select>
      </label>
      <label class="row small muted">
        Variant
        <select v-model="variantFilter">
          <option value="any">Any</option>
          <option
            v-for="entry in VARIANTS"
            :key="entry.id"
            :value="entry.id"
          >{{ entry.name }}</option>
        </select>
      </label>
      <label class="row small muted">
        Front
        <select v-model="frontFilter">
          <option value="any">Any</option>
          <option value="terminids">Terminids</option>
          <option value="automatons">Automatons</option>
          <option value="illuminate">Illuminate</option>
        </select>
      </label>
    </section>

    <section
      v-if="filtered.length === 0"
      class="panel"
    >
      <p class="muted">
        {{ store.lobbyRooms.length === 0
          ? 'No open dives at the moment. Host one from the home page and flag it open.'
          : 'No open dives match those filters.' }}
      </p>
    </section>

    <section
      v-else
      class="grid"
    >
      <div
        v-for="room in filtered"
        :key="room.roomCode"
        class="panel lobby-card"
      >
        <strong class="room-code mono">{{ room.roomCode }}</strong>
        <p class="small">
          {{ room.hostName }}'s squad
          · {{ variantName(room.variant) }}
          · {{ difficultyName(room.difficulty) }} ({{ room.difficulty }})
        </p>
        <p class="small muted">
          {{ room.squadSize }}/4 divers · {{ room.slotsFree }} slot{{ room.slotsFree === 1 ? '' : 's' }} free
          <template v-if="room.front">
            · vs <strong
              :style="{ color: frontOf(room.front)?.accent }"
            >{{ frontOf(room.front)?.displayName }}</strong>
          </template>
        </p>
        <NuxtLink
          class="btn primary"
          :to="`/dive/${room.roomCode}`"
        >Join dive</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.lobby-card { gap: 0.4rem; align-content: start; }
.room-code { font-size: 1.3rem; letter-spacing: 0.25em; color: var(--gold); }
.filters select { min-width: 0; }
</style>
