<script setup lang="ts">
import { REWARD_TOKEN_CAP } from '~~/shared/engine/config'
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  online: string[]
  mode: 'local' | 'room'
  isHost: boolean
  nameDraft: string
}>()

const emit = defineEmits<{
  'update:nameDraft': [name: string]
  'commit': []
  'transferHost': [diverId: string]
  'kick': [diverId: string]
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

const statuses = computed<Record<string, string>>(() => {
  const result: Record<string, string> = {}
  for (const diver of props.state.divers) {
    if (props.state.phase === 'deal' || props.state.phase === 'pacts') {
      result[diver.id] = diver.pactsLocked ? 'ready' : 'choosing pacts'
    }
    else if (props.state.phase === 'rewards') {
      if (diver.skipsCurrentDraft) {
        result[diver.id] = 'skips this draft'
      }
      else {
        result[diver.id] = diver.pickedOptionId !== null ? 'ready' : 'choosing reward'
      }
    }
  }
  return result
})

function statusOf(diverId: string): string {
  return statuses.value[diverId]
    ?? (isOnline(diverId) || props.mode === 'local' ? 'ready' : 'reconnecting')
}

function isWaiting(diverId: string): boolean {
  const status = statuses.value[diverId]
  return status === 'choosing pacts' || status === 'choosing reward'
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

const selfIsHost = computed(() => props.state.hostId === props.selfId)
</script>

<template>
  <div class="squad">
    <div class="squad-head">
      <span class="lbl">Squad</span>
      <span class="count">{{ state.divers.length }}/4</span>
    </div>
    <ul class="divers">
      <li
        v-for="diver in state.divers"
        :key="diver.id"
        class="diver-chip"
        :class="{ offline: !isOnline(diver.id) && mode === 'room', self: diver.id === selfId }"
      >
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
                class="dot"
                :class="{ on: isOnline(diver.id) || mode === 'local', waiting: isWaiting(diver.id) }"
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
      </li>
    </ul>
    <p
      v-if="selfIsHost && state.divers.length === 1 && mode === 'room'"
      class="solo-hint"
    >
      Invite a diver — copy the room code above.
    </p>
  </div>
</template>

<style scoped>
.squad { display: flex; flex-direction: column; gap: 10px; }
.squad-head { display: flex; justify-content: space-between; align-items: baseline; }
.count { font-size: 12px; font-weight: 700; color: var(--khaki); }

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

.dot { width: 7px; height: 7px; background: var(--dim); display: inline-block; flex-shrink: 0; }
.dot.on { background: var(--teal); }
.dot.waiting { background: var(--gold); animation: dot-wait 2s ease-in-out infinite; }
@keyframes dot-wait {
  0%, 100% { opacity: 0.55; box-shadow: 0 0 0 0 rgba(255, 214, 66, 0.55); }
  50% { opacity: 1; box-shadow: 0 0 0 4px transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .dot.waiting { animation: none; opacity: 1; box-shadow: 0 0 0 3px rgba(255, 214, 66, 0.35); }
}

@media (hover: hover) and (pointer: fine) {
  .mods { opacity: 0; transition: opacity var(--dur-fast) var(--ease-out); }
  .diver-chip:hover .mods,
  .mods:focus-within { opacity: 1; }
}
</style>
