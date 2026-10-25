<script setup lang="ts">
import type { DiveSessionStatus } from '~/composables/useDiveSession'
import { missionsPerOperation } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { factionImageUrl, difficultyImageUrl } from '~~/shared/data/images'
import type { DivePhase, DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  phase: DivePhase
  reporting?: boolean
  mode: 'local' | 'room'
  slotName: string
  status: DiveSessionStatus
  saved?: boolean
  canControl?: boolean
  isHost?: boolean
}>(), {
  reporting: false,
  saved: false,
  canControl: false,
  isHost: false,
})

const emit = defineEmits<{
  copyInvite: []
  openTutorial: []
  openMenu: []
}>()

const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const diffName = computed(() => difficultyName(props.state.difficulty))
const front = computed(() => props.state.frontId ? factionImageUrl(props.state.frontId) : null)
const online = computed(() => props.status === 'connected')
</script>

<template>
  <header class="top">
    <div class="identity">
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
          <span
            class="mission-pips"
            role="img"
            :aria-label="`Operation mission ${state.missionInOperation} of ${opLength}`"
          >
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
    </div>

    <DivePhaseTabs
      class="beats"
      :phase="phase"
      :reporting="reporting"
    />

    <div class="actions">
      <span
        v-if="mode === 'room'"
        class="link-lamp"
        :class="online ? 'on' : 'off'"
        :title="online ? 'Connected' : 'Reconnecting'"
        aria-hidden="true"
      />
      <button
        class="menu"
        type="button"
        aria-label="Session menu"
        aria-haspopup="dialog"
        @click="emit('openMenu')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle
            cx="5"
            cy="12"
            r="1.8"
          />
          <circle
            cx="12"
            cy="12"
            r="1.8"
          />
          <circle
            cx="19"
            cy="12"
            r="1.8"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 24px;
  min-height: 72px;
  padding: 0 var(--pad-page);
  border-bottom: 1px solid var(--line-1);
  background: linear-gradient(180deg, #14160f, var(--ground));
  min-width: 0;
}
.identity {
  display: flex;
  align-items: center;
  gap: 13px;
  flex: 1 1 250px;
  min-width: 0;
}
.diff-emblem {
  width: 66px;
  height: 32px;
  flex: none;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(255, 214, 66, 0.18));
}
.diff-line { display: flex; align-items: baseline; gap: 8px; }
.diff-num {
  color: var(--gold);
  font-size: 22px;
  line-height: 1;
  text-shadow: 0 0 14px rgba(255, 214, 66, 0.35);
}
.diff-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.diff-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.diff-sub {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.06em;
}
.mission-pips { display: flex; gap: 4px; }
.mission-pips i {
  width: 22px;
  height: 6px;
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.mission-pips i.on {
  background: var(--gold);
  box-shadow: 0 0 6px rgba(255, 214, 66, 0.55);
}
.front {
  width: 23px;
  height: 23px;
  object-fit: contain;
  margin-left: 2px;
}

.beats { flex: 0 1 auto; justify-content: center; }

.actions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1 1 320px;
  justify-content: flex-end;
  min-width: 0;
}
.menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--khaki);
  cursor: pointer;
}
.menu:hover { color: var(--text); }

.link-lamp {
  width: 6px;
  height: 6px;
  margin-left: 2px;
  border-radius: 50%;
  background: var(--red);
}
.link-lamp.on { background: var(--teal); box-shadow: 0 0 6px var(--teal); }

@media (max-width: 980px) {
  .top { gap: 10px 16px; padding-top: 8px; padding-bottom: 8px; }
  .beats { order: 3; flex: 1 1 100%; }
  .actions { flex: 0 1 auto; }
}
@media (max-width: 720px) {
  .identity { flex: 1 1 auto; }
  .top { min-height: 0; }
}
</style>
