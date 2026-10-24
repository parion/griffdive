<script setup lang="ts">
import { conditionRiskAt } from '~~/shared/engine/config'
import { MISFORTUNES } from '~~/shared/data/conditions'

// Every directive the wheel can draw, as two counter-running belts. Each tile
// carries its sigil and its engine risk at the showcase difficulty.
const props = withDefaults(defineProps<{ difficulty?: number }>(), { difficulty: 7 })

const tiles = computed(() => MISFORTUNES.map(misfortune => ({
  id: misfortune.id,
  name: misfortune.name,
  rule: misfortune.rule,
  risk: conditionRiskAt(misfortune.id, props.difficulty),
})))
const half = computed(() => Math.ceil(tiles.value.length / 2))
const belts = computed(() => [tiles.value.slice(0, half.value), tiles.value.slice(half.value)])
</script>

<template>
  <div class="dir">
    <ul
      class="sr-only"
      aria-label="Directives on the wheel"
    >
      <li
        v-for="t in tiles"
        :key="t.id"
      >
        {{ t.name }}: {{ t.rule }} (risk {{ t.risk }})
      </li>
    </ul>
    <div
      v-for="(belt, b) in belts"
      :key="b"
      class="belt"
      :class="{ rev: b === 1 }"
      aria-hidden="true"
    >
      <div class="belt-track">
        <template
          v-for="copy in 2"
          :key="copy"
        >
          <div
            v-for="t in belt"
            :key="`${copy}-${t.id}`"
            class="dir-tile cut-sm"
          >
            <ConditionSigil
              :id="t.id"
              :size="42"
            />
            <span class="dir-copy">
              <span class="dir-name">{{ t.name }}</span>
              <RiskPips
                :value="t.risk"
                :max="t.risk"
              />
            </span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dir {
  display: grid;
  gap: 12px;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}
.belt { overflow: hidden; }
.belt-track {
  display: flex;
  gap: 10px;
  width: max-content;
  animation: belt 46s linear infinite;
}
.rev .belt-track { animation-direction: reverse; animation-duration: 52s; }
.dir:hover .belt-track { animation-play-state: paused; }
@keyframes belt { to { transform: translateX(calc(-50% - 5px)); } }

.dir-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 80px;
  padding: 0 22px 0 14px;
  border: 1px solid var(--line-3);
  background:
    linear-gradient(180deg, rgba(255, 214, 66, 0.05), transparent 60%),
    var(--panel);
  color: var(--khaki);
}
.dir-copy { display: grid; gap: 4px; }
.dir-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text);
}

@media (prefers-reduced-motion: reduce) {
  .belt { overflow-x: auto; }
  .belt-track { animation: none; }
}
</style>
