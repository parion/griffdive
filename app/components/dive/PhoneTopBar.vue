<script setup lang="ts">
import { missionsPerOperation } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl, factionImageUrl } from '~~/shared/data/images'
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  mode: 'local' | 'room'
  slotName: string
  canControl?: boolean
  isHost?: boolean
}>()

const emit = defineEmits<{
  openSquad: []
  openMenu: []
}>()

const diffName = computed(() => difficultyName(props.state.difficulty))
const front = computed(() => props.state.frontId ? factionImageUrl(props.state.frontId) : null)
const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
</script>

<template>
  <header class="phone-top">
    <div class="row1">
      <img
        class="diff-emblem"
        :src="difficultyImageUrl(state.difficulty)"
        alt=""
        draggable="false"
      >
      <span class="diff-copy">
        <span class="diff-line">
          <b class="diff-num disp">{{ state.difficulty }}</b>
          <span class="diff-name">{{ diffName }}</span>
        </span>
        <span class="diff-sub">
          Op {{ opNumber }}
          <span class="pips">
            <i
              v-for="i in opLength"
              :key="i"
              :class="{ on: i <= state.missionInOperation }"
            />
          </span>
        </span>
      </span>
      <img
        v-if="front"
        class="front"
        :src="front"
        alt=""
        draggable="false"
      >
      <span class="grow" />
      <button
        class="squad-btn"
        type="button"
        @click="emit('openSquad')"
      >
        <span
          class="squad-lamp"
          aria-hidden="true"
        />
        Squad
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label="Dive menu"
        @click="emit('openMenu')"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle
            cx="5"
            cy="12"
            r="1.7"
          />
          <circle
            cx="12"
            cy="12"
            r="1.7"
          />
          <circle
            cx="19"
            cy="12"
            r="1.7"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.phone-top {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: linear-gradient(180deg, #14160f, var(--ground));
  border-bottom: 1px solid var(--line-1);
}
.row1 { display: flex; align-items: center; gap: 8px; min-width: 0; }
.diff-emblem {
  width: 46px;
  height: 22px;
  flex: none;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(255, 214, 66, 0.18));
}
.diff-line { display: flex; align-items: baseline; gap: 6px; }
.diff-num { color: var(--gold); font-size: 17px; line-height: 1; }
.diff-copy { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.diff-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}
.diff-sub { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 10px; }
.pips { display: flex; gap: 3px; }
.pips i { width: 12px; height: 4px; box-shadow: inset 0 0 0 1px var(--line-4); }
.pips i.on { background: var(--gold); box-shadow: 0 0 4px rgba(255, 214, 66, 0.5); }
.front { width: 18px; height: 18px; object-fit: contain; }
.grow { flex: 1; }
.squad-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 0 7px;
  border: 0;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2);
  color: var(--khaki);
  font: 700 9px var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.squad-lamp { width: 6px; height: 6px; background: var(--teal); }
.icon-btn { width: 34px; padding: 0; justify-content: center; }
.icon-btn :deep(svg) { width: 17px; height: 17px; }
</style>
