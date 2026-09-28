<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import { missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import type { DiveState, ItemRef } from '~~/shared/engine/types'

const props = defineProps<{ state: DiveState, canControl: boolean }>()

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()

const opLength = computed(() => missionsPerOperation(props.state.difficulty))

const frontName = computed(() =>
  FRONTS.find(front => front.id === props.state.frontId)?.displayName ?? 'Uncharted front')
</script>

<template>
  <section class="sec forfeit scan">
    <div
      class="hazard-red for-top"
      aria-hidden="true"
    />
    <header class="ff-head">
      <div class="ff-copy">
        <span class="lbl ff-kicker">
          <span
            class="lamp red pulse"
            aria-hidden="true"
          />
          Report · {{ difficultyName(state.difficulty) }} · OP MISSION {{ state.missionInOperation }}/{{ opLength }}
        </span>
        <h2 class="disp ff-title">
          Operation failed
        </h2>
      </div>
      <p class="ff-note">
        The operation restarts. Choose <strong>one</strong> item for the squad to lose —
        any item from any diver's personal inventory, stratagems included.
      </p>
    </header>
    <div class="ff-cards">
      <div class="ff-card cut-sm">
        <span class="disp ff-card-n">{{ state.missionInOperation }}</span>
        <span class="cap">Restart M1/{{ opLength }}</span>
      </div>
      <div class="ff-card cut-sm">
        <span class="disp ff-card-n">{{ state.difficulty }}</span>
        <span class="cap">{{ difficultyName(state.difficulty) }} held</span>
      </div>
      <div class="ff-card cut-sm">
        <span class="disp ff-card-front">{{ frontName }}</span>
        <span class="cap">Front kept</span>
      </div>
    </div>
  </section>
  <InventoryGrid
    :state="state"
    :select-mode="canControl"
    @forfeit="emit('forfeit', $event)"
  />
</template>

<style scoped>
.forfeit {
  position: relative;
  overflow: hidden;
  border-color: rgba(255, 75, 62, 0.5);
  background:
    linear-gradient(rgba(255, 75, 62, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 75, 62, 0.05) 1px, transparent 1px),
    var(--panel);
  background-size: 40px 40px;
}
.for-top {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 5px;
  opacity: 0.85;
}

.ff-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.ff-copy { display: grid; gap: 0.3rem; }
.ff-kicker { display: flex; align-items: center; gap: 0.4rem; color: var(--red); }
.ff-title {
  margin: 0;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  color: var(--red);
}
.ff-note {
  flex: 0 1 22rem;
  margin: 0;
  padding: 0.5rem 0.7rem;
  border: 1px dashed rgba(255, 75, 62, 0.55);
  background: rgba(255, 75, 62, 0.06);
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--khaki);
}

.ff-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.6rem;
}
.ff-card {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid rgba(255, 75, 62, 0.5);
  background: var(--rail);
  color: var(--khaki);
}
.ff-card-n { font-size: 1.5rem; color: var(--text); }
.ff-card-front { font-size: 1rem; color: var(--red); }
</style>
