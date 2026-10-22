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
  credits?: number
  bargainsClosed?: string | null
  bargainLamp?: 'off' | 'ready' | 'restocked'
}>(), {
  reporting: false,
  saved: false,
  canControl: false,
  isHost: false,
  credits: 0,
  bargainsClosed: null,
  bargainLamp: 'off',
})

const emit = defineEmits<{
  copyInvite: []
  openBargains: []
  openKit: []
  openTutorial: []
  openMenu: []
}>()

const { codexOpen, warbondsOpen } = useDrawers()
const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const diffName = computed(() => difficultyName(props.state.difficulty))
const front = computed(() => props.state.frontId ? factionImageUrl(props.state.frontId) : null)
const online = computed(() => props.status === 'connected')

const creditLabel = computed(() => {
  const base = `Brasch's Bargains, ${props.credits} credits`
  if (props.bargainsClosed) {
    return `${base} — ${props.bargainsClosed}`
  }
  return `${base}${props.bargainLamp === 'restocked' ? ', restocked' : props.bargainLamp === 'ready' ? ', something affordable in stock' : ''}`
})
</script>

<template>
  <header class="top">
    <div class="identity">
      <span class="diff-mark">
        <img
          class="diff-emblem"
          :src="difficultyImageUrl(state.difficulty)"
          alt=""
          draggable="false"
        >
        <span class="diff-num disp">{{ state.difficulty }}</span>
      </span>
      <span class="diff-copy">
        <span class="diff-name">{{ diffName }}</span>
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

    <PhaseTabs
      class="beats"
      :phase="phase"
      :reporting="reporting"
    />

    <div class="actions">
      <button
        class="tile credits"
        type="button"
        :disabled="Boolean(bargainsClosed)"
        :aria-label="creditLabel"
        :title="bargainsClosed ?? creditLabel"
        @click="emit('openBargains')"
      >
        <span
          v-if="bargainLamp !== 'off' && !bargainsClosed"
          class="lamp"
          :class="{ pulse: bargainLamp === 'restocked' }"
          aria-hidden="true"
        />
        <IconCredit class="credit-icon" />
        <span class="credit-value">{{ credits }}</span>
      </button>

      <button
        class="tile kit"
        type="button"
        aria-label="Kit"
        @click="emit('openKit')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect
            x="3.5"
            y="3.5"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="13.5"
            y="3.5"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="3.5"
            y="13.5"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="13.5"
            y="13.5"
            width="7"
            height="7"
            rx="1"
          />
        </svg>
        <span>Kit</span>
      </button>

      <button
        class="navb"
        type="button"
        @click="codexOpen = true"
      >
        Codex
      </button>
      <button
        class="navb"
        type="button"
        @click="warbondsOpen = true"
      >
        Warbonds
      </button>

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
.diff-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 58px;
  height: 52px;
  flex: none;
  color: var(--on-gold);
  background: linear-gradient(180deg, #ffe57a, var(--gold) 50%, #e0b000);
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
}
.diff-emblem {
  width: 36px;
  height: 19px;
  object-fit: contain;
  opacity: 0.55;
  filter: brightness(0.2);
}
.diff-num {
  position: absolute;
  font-size: 24px;
  line-height: 1;
  color: var(--on-gold);
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
.tile,
.navb,
.menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border: 0;
  background: var(--panel);
  color: var(--khaki);
  font: 600 11px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.tile { padding: 0 12px; position: relative; }
.tile:hover:not(:disabled),
.navb:hover,
.menu:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.tile:disabled { opacity: 0.45; cursor: not-allowed; }
.credits {
  color: var(--gold);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 55%, var(--line-3));
  min-width: 76px;
}
.credit-icon { width: 22px; height: 22px; }
.credit-value { font-size: 15px; font-weight: 700; letter-spacing: 0.04em; }
.kit { color: var(--text); }
.navb {
  background: transparent;
  box-shadow: none;
  padding: 0 8px;
  color: var(--muted);
}
.navb:hover { box-shadow: none; color: var(--text); }
.menu { width: 40px; padding: 0; background: transparent; box-shadow: none; }
.menu:hover { box-shadow: none; }

.lamp {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  background: var(--gold);
  box-shadow: 0 0 8px var(--gold);
}
.link-lamp {
  width: 6px;
  height: 6px;
  margin-left: 2px;
  border-radius: 50%;
  background: var(--red);
}
.link-lamp.on { background: var(--teal); box-shadow: 0 0 6px var(--teal); }

@media (max-width: 1100px) {
  .top { gap: 10px 16px; padding-top: 8px; padding-bottom: 8px; }
  .beats { order: 3; flex: 1 1 100%; }
  .actions { flex: 0 1 auto; }
}
@media (max-width: 720px) {
  .identity { flex: 1 1 auto; }
  .navb { display: none; }
  .top { min-height: 0; }
}
</style>
