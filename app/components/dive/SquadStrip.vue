<script setup lang="ts">
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
  'copyInvite': []
}>()

const name = computed({
  get: () => props.nameDraft,
  set: value => emit('update:nameDraft', value),
})

function isOnline(diverId: string): boolean {
  return props.online.includes(diverId)
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

// A diver still owes the squad an action — the name dot pulses gold until they act.
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
</script>

<template>
  <section class="panel squad-strip">
    <div class="row">
      <span
        v-for="diver in state.divers"
        :key="diver.id"
        class="chip diver-chip"
        :class="{ warn: !isOnline(diver.id) }"
        :title="isOnline(diver.id) ? 'online' : 'offline'"
      >
        <AppTooltip
          :content="statuses[diver.id] ?? (isOnline(diver.id) ? 'online' : 'offline')"
        >
          <span
            class="dot"
            :class="{ on: isOnline(diver.id), waiting: isWaiting(diver.id) }"
            role="img"
            :aria-label="statuses[diver.id] ?? (isOnline(diver.id) ? 'Online' : 'Offline')"
          />
        </AppTooltip><input
          v-if="diver.id === selfId"
          v-model="name"
          class="self-name"
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
          v-if="diver.catchUpOwed > 0"
          class="catchup-chip"
          role="img"
          :aria-label="`Field Promotion: ${diver.catchUpOwed} picks owed`"
          title="Field Promotion picks owed"
        >+{{ diver.catchUpOwed }}</span>
        <span
          v-if="diver.id === selfId"
          class="muted small"
        >(you)</span>
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
            ×
          </button>
        </AppTooltip>
      </span>
      <button
        v-if="mode === 'room' && state.divers.length === 1"
        class="lone-host"
        type="button"
        @click="$emit('copyInvite')"
      >
        Share the invite link
      </button>
    </div>
  </section>
</template>

<style scoped>
.squad-strip { padding: 0.6rem 0.75rem; }
.lone-host {
  margin: 0 0 0 auto;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: var(--gold);
  font-weight: 700;
  text-align: right;
  cursor: pointer;
  animation: lone-glow 2.4s ease-in-out infinite;
}
.lone-host:hover {
  text-decoration: underline;
}
@keyframes lone-glow {
  0%, 100% { text-shadow: 0 0 4px color-mix(in srgb, var(--gold) 35%, transparent); }
  50% { text-shadow: 0 0 14px color-mix(in srgb, var(--gold) 90%, transparent); }
}
@media (prefers-reduced-motion: reduce) {
  .lone-host {
    animation: none;
    text-shadow: 0 0 8px color-mix(in srgb, var(--gold) 60%, transparent);
  }
}
.catchup-chip {
  padding: 0 0.3rem;
  border: 1px solid var(--teal);
  border-radius: 4px;
  color: var(--teal);
  font-size: 0.7rem;
  font-weight: 700;
}
.diver-chip { display: inline-flex; align-items: center; gap: 0.35rem; }
.kick {
  width: 0.9rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--red);
  font: inherit;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}
.handover {
  padding: 0 0.25rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: none;
  color: var(--khaki);
  font: inherit;
  font-size: 0.6rem;
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
    width: 0.9rem;
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
.self-name {
  width: 9ch;
  min-width: 5ch;
  padding: 0 0.15rem;
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--border);
  border-radius: 0;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}
.self-name:focus {
  outline: none;
  border-bottom-color: var(--gold);
}
.crown { color: var(--gold); }
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
  display: inline-block;
}
.dot.on { background: var(--teal); }
.dot.waiting {
  background: var(--gold);
  animation: dot-wait 2s ease-in-out infinite;
}
@keyframes dot-wait {
  0%, 100% {
    opacity: 0.55;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 55%, transparent);
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
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent);
  }
}
</style>
