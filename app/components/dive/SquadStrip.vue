<script setup lang="ts">
import { REWARD_TOKEN_CAP } from '~~/shared/engine/config'
import { actingDiverIds } from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  online: string[]
  mode: 'local' | 'room'
  isHost: boolean
  nameDraft: string
  canControl: boolean
  collapsed?: boolean
}>(), { collapsed: false })

const emit = defineEmits<{
  'update:nameDraft': [name: string]
  'commit': []
  'transferHost': [diverId: string]
  'kick': [diverId: string]
  'toggle': []
}>()

const name = computed({
  get: () => props.nameDraft,
  set: value => emit('update:nameDraft', value),
})

function isOnline(diverId: string): boolean {
  return props.online.includes(diverId)
}

function initial(diverName: string): string {
  return diverName.trim().slice(0, 1).toUpperCase() || '?'
}

// The squad's lamps match the rail cue: gold and pulsing on whoever the squad
// is waiting on, teal for everyone else who is connected.
const acting = computed(() => new Set(actingDiverIds(props.state)))

const ACTING_STATUS: Partial<Record<DiveState['phase'], string>> = {
  lobby: 'launching',
  spin: 'spinning',
  decision: 'deciding',
  strain: 'deciding',
  deal: 'dealing',
  pacts: 'choosing pacts',
  forfeit: 'picking forfeit',
}

function isActing(diverId: string): boolean {
  return acting.value.has(diverId)
}

function statusOf(diverId: string): string {
  const diver = props.state.divers.find(entry => entry.id === diverId)
  if (props.mode === 'room' && !isOnline(diverId)) {
    return 'reconnecting'
  }
  if (props.state.phase === 'diving') {
    return 'in game'
  }
  if (props.state.phase === 'rewards' && diver?.skipsCurrentDraft) {
    return 'skips this draft'
  }
  if (isActing(diverId)) {
    if (props.state.phase === 'rewards') {
      return diver?.pickedOptionId === null && !diver.rewardBanned ? 'choosing reward' : 'advancing'
    }
    return ACTING_STATUS[props.state.phase] ?? 'ready'
  }
  return 'ready'
}

function canModerate(diverId: string): boolean {
  return props.mode === 'room'
    && props.isHost
    && diverId !== props.selfId
    && diverId !== props.state.hostId
}

function chits(count: number): boolean[] {
  return Array.from({ length: REWARD_TOKEN_CAP }, (_, i) => i < count)
}

function lampClass(diverId: string): string {
  if (isActing(diverId)) {
    return 'gold pulse'
  }
  return isOnline(diverId) || props.mode === 'local' ? 'teal' : 'dim'
}

const selfIsHost = computed(() => props.state.hostId === props.selfId)
</script>

<template>
  <div
    class="squad"
    :class="{ collapsed }"
  >
    <div class="squad-head">
      <span
        v-if="!collapsed"
        class="lbl"
      >Squad</span>
      <div class="head-right">
        <span
          v-if="!collapsed"
          class="count"
        >{{ state.divers.length }}/4</span>
        <button
          class="rail-toggle"
          type="button"
          :aria-label="collapsed ? 'Expand squad rail' : 'Collapse squad rail'"
          :aria-expanded="!collapsed"
          @click="$emit('toggle')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      </div>
    </div>
    <PhaseCue
      v-if="!collapsed"
      :state="state"
      :self-id="selfId"
      :can-control="canControl"
      rail
    />
    <ul class="divers">
      <li
        v-for="diver in state.divers"
        :key="diver.id"
        class="diver-chip"
        :class="{ collapsed, offline: !isOnline(diver.id) && mode === 'room', self: diver.id === selfId }"
      >
        <template v-if="collapsed">
          <span class="sr-only">{{ diver.name }} — {{ statusOf(diver.id) }}</span>
          <div class="compact-row">
            <span
              class="active-bar"
              :class="lampClass(diver.id)"
              aria-hidden="true"
            />
            <span
              class="avatar cut-sm disp"
              aria-hidden="true"
            >{{ initial(diver.name) }}</span>
          </div>
          <div
            class="token-bars"
            :aria-label="`${diver.rewardTokens} reward tokens banked`"
          >
            <i
              v-for="(on, i) in chits(diver.rewardTokens)"
              :key="i"
              class="token-bar"
              :class="{ on }"
            />
          </div>
        </template>
        <template v-else>
          <span
            aria-hidden="true"
            class="node"
          />
          <span
            class="avatar cut-sm disp"
            aria-hidden="true"
          >{{ initial(diver.name) }}</span>
          <div class="meta">
            <div class="line">
              <input
                v-if="diver.id === selfId"
                v-model="name"
                class="self-name"
                type="text"
                maxlength="32"
                title="Your name"
                aria-label="Your name"
                @change="$emit('commit')"
              >
              <span
                v-else
                class="diver-name"
              >{{ diver.name }}</span>
              <span
                v-if="diver.id === state.hostId"
                class="crown"
                role="img"
                aria-label="Host"
              >★</span>
              <span
                v-if="diver.id === selfId"
                class="you"
              >(you)</span>
            </div>
            <div class="line status">
              <AppTooltip
                :content="statusOf(diver.id)"
              >
                <span
                  class="lamp"
                  :class="lampClass(diver.id)"
                  role="img"
                  :aria-label="statusOf(diver.id)"
                />
              </AppTooltip>
              <span class="status-text">{{ statusOf(diver.id) }}</span>
              <span
                v-if="diver.catchUpOwed > 0"
                class="catchup-chip"
                role="img"
                :aria-label="`Field Promotion: ${diver.catchUpOwed} picks owed`"
              >+{{ diver.catchUpOwed }}</span>
            </div>
          </div>
          <div
            v-if="diver.rewardTokens > 0"
            class="chits"
            :aria-label="`${diver.rewardTokens} reward tokens banked`"
          >
            <i
              v-for="(on, i) in chits(diver.rewardTokens)"
              :key="i"
              class="chit"
              :class="{ on }"
            />
          </div>
          <div
            v-if="canModerate(diver.id)"
            class="mods"
          >
            <AppTooltip :content="`Hand host to ${diver.name}`">
              <button
                class="handover"
                type="button"
                :aria-label="`Hand host to ${diver.name}`"
                @click="$emit('transferHost', diver.id)"
              >
                host
              </button>
            </AppTooltip>
            <AppTooltip :content="`Kick ${diver.name} from the squad`">
              <button
                class="kick"
                type="button"
                :aria-label="`Kick ${diver.name} from the squad`"
                @click="$emit('kick', diver.id)"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.6"
                  aria-hidden="true"
                ><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </AppTooltip>
          </div>
        </template>
      </li>
    </ul>
    <p
      v-if="!collapsed && selfIsHost && state.divers.length === 1 && mode === 'room'"
      class="solo-hint"
    >
      Invite a diver — copy the room code above.
    </p>
  </div>
</template>

<style scoped>
.squad { display: flex; flex-direction: column; gap: 10px; }
.squad-head { display: flex; justify-content: space-between; align-items: center; }
.squad.collapsed .squad-head { justify-content: center; }
.head-right { display: flex; align-items: center; gap: var(--sp-3); }
.count { font-size: 12px; font-weight: 700; color: var(--khaki); }

.rail-toggle {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--line-2);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: border-color var(--dur-fast), color var(--dur-fast);
}
.rail-toggle:hover { border-color: var(--gold); color: var(--gold); }
.rail-toggle svg {
  width: 12px;
  height: 12px;
  transition: transform var(--dur-med) var(--ease-out);
}
.squad.collapsed .rail-toggle svg { transform: rotate(180deg); }

.divers { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

.diver-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 8px 8px 14px;
  background: var(--panel);
  border: 1px solid var(--line-2);
}
.diver-chip.self { border-color: var(--line-4); background: var(--raised); }
.diver-chip.offline { opacity: 0.55; }

.diver-chip.collapsed {
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 7px 0;
}
.compact-row { display: flex; align-items: center; gap: 3px; }
.active-bar {
  width: 3px;
  height: 22px;
  flex-shrink: 0;
  background: var(--line-2);
}
.active-bar.gold { background: var(--gold); }
.active-bar.teal { background: var(--teal); }
.active-bar.dim { background: var(--dim); }
.active-bar.pulse { animation: pulse 1.6s ease-in-out infinite; }
.token-bars { display: flex; flex-direction: column; gap: 2px; align-items: center; }
.token-bar { width: 18px; height: 2px; background: var(--line-2); }
.token-bar.on { background: var(--gold); }

.node {
  position: absolute;
  left: 5px;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-top: -3px;
  border-radius: 50%;
  background: var(--ground);
  border: 1px solid var(--line-4);
}
.diver-chip.self .node { background: var(--gold); border-color: var(--gold); }

.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  background: var(--line-2);
  color: var(--text);
  font-size: 15px;
}
.diver-chip.self .avatar { background: var(--gold); color: var(--on-gold); }

.meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex-grow: 1; }
.line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.diver-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.status-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.crown { color: var(--gold); font-size: 13px; }
.you { color: var(--muted); font-size: 10px; }
.catchup-chip {
  padding: 0 4px;
  border: 1px solid var(--teal);
  color: var(--teal);
  font-size: 9px;
  font-weight: 700;
}

.self-name {
  width: 9ch;
  min-width: 5ch;
  padding: 0;
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--line-4);
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.self-name:focus { outline: none; border-bottom-color: var(--gold); box-shadow: none; }

.mods { display: flex; align-items: center; gap: 4px; }
.handover {
  padding: 0 4px;
  border: 1px solid var(--line-4);
  background: none;
  color: var(--khaki);
  font: inherit;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
}
.handover:hover { border-color: var(--gold); color: var(--gold); }
.kick {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid transparent;
  background: none;
  color: var(--red);
  cursor: pointer;
}
.kick:hover { border-color: var(--red); }

.solo-hint { margin: 0; font-size: 10px; letter-spacing: 0.06em; color: var(--muted); text-transform: uppercase; }

@media (hover: hover) and (pointer: fine) {
  .mods { opacity: 0; transition: opacity var(--dur-fast) var(--ease-out); }
  .diver-chip:hover .mods,
  .mods:focus-within { opacity: 1; }
}
</style>
