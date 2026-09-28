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

// Waiting status per diver, from engine state — purely presentational, so the
// squad can see who still needs to act. Absent outside the deciding phases.
const statuses = computed<Record<string, string>>(() => {
  const result: Record<string, string> = {}
  for (const diver of props.state.divers) {
    if (props.state.phase === 'pacts') {
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

// A diver still owes the squad an action — the lamp pulses gold until they act.
function isWaiting(diverId: string): boolean {
  const status = statuses.value[diverId]
  return status === 'choosing pacts' || status === 'choosing reward'
}

// Host moderation: remove a diver who left or is blocking the squad, or hand
// the crown to any other seated diver.
function canModerate(diverId: string): boolean {
  return props.mode === 'room'
    && props.isHost
    && diverId !== props.selfId
    && diverId !== props.state.hostId
}

function chits(count: number): boolean[] {
  return Array.from({ length: REWARD_TOKEN_CAP }, (_, i) => i < count)
}
</script>

<template>
  <div class="row squad-strip">
    <span
      v-for="diver in state.divers"
      :key="diver.id"
      class="chip diver-chip cut-sm"
      :class="{ warn: !isOnline(diver.id) }"
      :title="isOnline(diver.id) ? 'online' : 'offline'"
    >
      <span
        class="avatar disp"
        aria-hidden="true"
      >{{ initial(diver.name) }}</span>
      <AppTooltip
        :content="statuses[diver.id] ?? (isOnline(diver.id) ? 'online' : 'offline')"
      >
        <span
          class="dot"
          :class="{ on: isOnline(diver.id), waiting: isWaiting(diver.id) }"
          role="img"
          :aria-label="statuses[diver.id] ?? (isOnline(diver.id) ? 'Online' : 'Offline')"
        />
      </AppTooltip>
      <input
        v-if="diver.id === selfId"
        v-model="name"
        class="self-name nb"
        type="text"
        maxlength="32"
        title="Your name"
        aria-label="Your name"
        @change="$emit('commit')"
      >
      <template v-else>{{ diver.name }}</template>
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
      <span
        v-if="diver.catchUpOwed > 0"
        class="catchup-chip"
        role="img"
        :aria-label="`Field Promotion: ${diver.catchUpOwed} picks owed`"
        title="Field Promotion picks owed"
      >+{{ diver.catchUpOwed }}</span>
      <span
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
      </span>
      <AppTooltip
        v-if="canModerate(diver.id)"
        :content="`Hand host to ${diver.name}`"
      >
        <button
          class="handover"
          type="button"
          :aria-label="`Hand host to ${diver.name}`"
          @click="$emit('transferHost', diver.id)"
        >
          host
        </button>
      </AppTooltip>
      <AppTooltip
        v-if="canModerate(diver.id)"
        :content="`Kick ${diver.name} from the squad`"
      >
        <button
          class="kick"
          type="button"
          :aria-label="`Kick ${diver.name} from the squad`"
          @click="$emit('kick', diver.id)"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.6"
            aria-hidden="true"
          ><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </AppTooltip>
    </span>
  </div>
</template>

<style scoped>
.squad-strip { justify-content: flex-end; }

.diver-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: auto;
  padding: 0.18rem 0.45rem 0.18rem 0.2rem;
}

.avatar {
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  font-size: 0.62rem;
  background: var(--line-3);
  color: var(--text);
}
.diver-chip.warn .avatar { background: var(--ground); color: var(--dim); }

.catchup-chip {
  padding: 0 0.3rem;
  border: 1px solid var(--teal);
  color: var(--teal);
  font-size: 0.68rem;
  font-weight: 700;
}

.you { color: var(--muted); font-size: 0.7rem; }

.kick {
  display: inline-grid;
  place-items: center;
  width: 0.95rem;
  height: 0.95rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--red);
  font: inherit;
  line-height: 1;
  cursor: pointer;
}

.handover {
  padding: 0 0.25rem;
  border: 1px solid var(--line-4);
  background: none;
  color: var(--khaki);
  font: inherit;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.4;
  white-space: nowrap;
  cursor: pointer;
}
.handover:hover {
  border-color: var(--gold);
  color: var(--gold);
}

/* Pointer devices reveal the moderation affordances on chip hover; touch
   devices always show them — there is no hover to rely on. */
@media (hover: hover) and (pointer: fine) {
  .kick {
    width: 0;
    opacity: 0;
    overflow: hidden;
    transition:
      opacity var(--dur-fast) var(--ease-out),
      width var(--dur-fast) var(--ease-out);
  }

  .diver-chip:hover .kick,
  .kick:focus-visible {
    width: 0.95rem;
    opacity: 1;
  }

  .handover {
    max-width: 0;
    padding-inline: 0;
    opacity: 0;
    overflow: hidden;
    transition:
      opacity var(--dur-fast) var(--ease-out),
      max-width var(--dur-fast) var(--ease-out),
      padding-inline var(--dur-fast) var(--ease-out);
  }

  .diver-chip:hover .handover,
  .handover:focus-visible {
    max-width: 4rem;
    padding-inline: 0.25rem;
    opacity: 1;
  }
}

.self-name.nb {
  width: 9ch;
  min-width: 5ch;
  height: auto;
  padding: 0 0.15rem;
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--line-4);
  border-radius: 0;
  color: inherit;
  font-family: inherit;
  font-stretch: normal;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  text-transform: inherit;
  box-shadow: none;
}
.self-name.nb:focus {
  outline: none;
  border-color: transparent;
  border-bottom-color: var(--gold);
  box-shadow: none;
}

.crown { color: var(--gold); }

.dot {
  width: 7px;
  height: 7px;
  background: var(--dim);
  display: inline-block;
  flex-shrink: 0;
}
.dot.on { background: var(--teal); }
.dot.waiting {
  background: var(--gold);
  animation: dot-wait 2s ease-in-out infinite;
}
@keyframes dot-wait {
  0%, 100% {
    opacity: 0.55;
    box-shadow: 0 0 0 0 rgba(255, 214, 66, 0.55);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 0 4px transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dot.waiting {
    animation: none;
    opacity: 1;
    box-shadow: 0 0 0 3px rgba(255, 214, 66, 0.35);
  }
}
</style>
