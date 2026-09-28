<script setup lang="ts">
import { difficultyName } from '~~/shared/engine/progression'
import type { DiveState } from '~~/shared/engine/types'
import { slamIn, riseIn } from '~/utils/motion'

const props = defineProps<{ state: DiveState, mode: 'local' | 'room' }>()

const emit = defineEmits<{ abandonSlot: [] }>()

const itemsOwned = computed(() =>
  Object.values(props.state.personalInventories).flat().length)

const records = computed(() => [
  { label: 'Difficulty', value: String(props.state.difficulty), unit: difficultyName(props.state.difficulty) },
  { label: 'Missions', value: String(props.state.missionIndex), unit: 'flown' },
  { label: 'Combos', value: String(props.state.completedCombos.length), unit: 'cleared' },
  { label: 'Items', value: String(itemsOwned.value), unit: 'owned' },
])
</script>

<template>
  <section class="panel victory scan">
    <div
      class="rays"
      aria-hidden="true"
    />
    <Motion
      class="mark-row"
      v-bind="riseIn(0)"
    >
      <BrandMark
        :size="60"
        class="mark"
      />
    </Motion>
    <span class="lbl">{{ state.achieved ? 'Crusade complete' : 'Dive ended' }}</span>
    <Motion
      as="h1"
      class="disp win-title"
      v-bind="slamIn(0)"
    >
      {{ state.achieved ? 'Griffdive achieved' : 'Dive ended' }}
    </Motion>
    <p class="muted win-note">
      {{ state.achieved
        ? 'Operation complete at difficulty 10. Super Earth thanks you, divers.'
        : 'The crusade was ended early.' }}
    </p>

    <CrusadeLadder
      class="win-ladder"
      :difficulty="state.difficulty"
      :achieved="state.achieved"
    />

    <dl class="record">
      <div
        v-for="row in records"
        :key="row.label"
        class="rec-cell"
      >
        <dt class="lbl">
          {{ row.label }}
        </dt>
        <dd>
          <span class="disp rec-n">{{ row.value }}</span>
          <span class="odl rec-u">{{ row.unit }}</span>
        </dd>
      </div>
    </dl>

    <div class="row win-actions">
      <button
        v-if="mode === 'local'"
        class="btn danger"
        type="button"
        @click="emit('abandonSlot')"
      >
        Delete save
      </button>
      <NuxtLink
        class="btn cut-sm"
        to="/"
      >
        Back to base
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.victory {
  position: relative;
  overflow: hidden;
  align-items: center;
  text-align: center;
  gap: 0.8rem;
  padding: 2rem 1.4rem;
}

.rays {
  position: absolute;
  right: -140px;
  top: -160px;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, rgba(255, 214, 66, 0.07) 0deg 5deg, transparent 5deg 15deg);
  pointer-events: none;
}

.mark-row { position: relative; }
.mark { color: var(--gold); filter: drop-shadow(0 0 16px rgba(255, 214, 66, 0.35)); }

.win-title {
  position: relative;
  margin: 0;
  font-size: clamp(2rem, 7vw, 3.6rem);
  color: var(--gold);
}
.win-note { margin: 0; }

.win-ladder {
  position: relative;
  width: min(30rem, 100%);
  text-align: left;
}

.record {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
  gap: 0;
  width: min(34rem, 100%);
  margin: 0;
  border: 1px solid var(--line-2);
  background: var(--ground);
}
.rec-cell {
  display: grid;
  gap: 0.3rem;
  padding: 0.7rem 0.9rem;
  text-align: left;
  border-left: 1px solid var(--line-1);
}
.rec-cell:first-child { border-left: 0; }
.rec-cell dd {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
}
.rec-n { font-size: 1.8rem; color: var(--text); }
.rec-u { color: var(--dim); }

.win-actions { position: relative; justify-content: center; }
</style>
