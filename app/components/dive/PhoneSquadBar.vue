<script setup lang="ts">
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  online: string[]
  mode: 'local' | 'room'
}>()

function isOnline(diverId: string): boolean {
  return props.online.includes(diverId) || props.mode === 'local'
}

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

// The per-diver beat, mirroring the desktop squad strip's status derivation.
function statusOf(diverId: string): string {
  const diver = props.state.divers.find(d => d.id === diverId)
  if (!diver) {
    return ''
  }
  if (props.state.phase === 'deal' || props.state.phase === 'pacts') {
    return diver.pactsLocked ? 'ready' : 'choosing pacts'
  }
  if (props.state.phase === 'rewards') {
    if (diver.skipsCurrentDraft) {
      return 'skips this draft'
    }
    return diver.pickedOptionId !== null ? 'ready' : 'choosing reward'
  }
  return isOnline(diverId) ? 'ready' : 'reconnecting'
}

function waiting(diverId: string): boolean {
  const status = statusOf(diverId)
  return status === 'choosing pacts' || status === 'choosing reward'
}
</script>

<template>
  <section
    class="squad-bar"
    aria-label="Squad"
  >
    <div
      v-for="diver in state.divers"
      :key="diver.id"
      class="diver"
      :class="{ offline: mode === 'room' && !isOnline(diver.id) }"
      role="img"
      :aria-label="`${diver.name}${diver.id === state.hostId ? ', host' : ''}: ${statusOf(diver.id)}`"
    >
      <span class="av-wrap">
        <span
          class="avatar cut-sm disp"
          :class="{ self: diver.id === selfId }"
        >{{ initial(diver.name) }}</span>
        <span
          class="light"
          :class="{ on: isOnline(diver.id), wait: waiting(diver.id) }"
        />
      </span>
      <span class="meta">
        <span class="dname">{{ diver.name }}</span>
        <span
          v-if="diver.id === state.hostId"
          class="crown"
        >★ host</span>
        <span
          v-else
          class="state"
        >{{ waiting(diver.id) ? 'waiting' : 'ready' }}</span>
      </span>
    </div>
  </section>
</template>

<style scoped>
.squad-bar {
  flex-shrink: 0;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 12px;
  background: var(--rail);
  border-bottom: 1px solid var(--line-1);
  overflow: hidden;
}
.diver {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex: 1 1 0;
}
.diver.offline { opacity: 0.5; }

.av-wrap { position: relative; flex-shrink: 0; }
.avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: var(--line-2);
  color: var(--text);
  font-size: 14px;
}
.avatar.self { background: var(--gold); color: var(--on-gold); }
.light {
  position: absolute;
  right: -3px;
  top: -3px;
  width: 9px;
  height: 9px;
  border: 2px solid var(--rail);
  background: var(--dim);
}
.light.on { background: var(--teal); }
.light.wait { background: var(--gold); animation: squadPulse 1.6s ease-in-out infinite; }

.meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dname {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text);
}
.crown,
.state {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.crown { color: var(--gold); }
.state { color: var(--muted); }

@keyframes squadPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@media (prefers-reduced-motion: reduce) {
  .light.wait { animation: none; }
}
</style>
