<script setup lang="ts">
import { difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import { diverCeiling } from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'
import type { DiveSaveInfo } from '~~/shared/types/messages'
import type { DiveSessionStatus } from '~/composables/useDiveSession'

const props = defineProps<{
  state: DiveState
  mode: 'local' | 'room'
  status: DiveSessionStatus
  selfId: string | null
  canControl: boolean
  isHost: boolean
  opLength: number
  slotName: string
  saved: DiveSaveInfo | null
}>()

defineEmits<{
  copyInvite: []
  leave: []
  end: []
  saveDive: []
  unsaveDive: []
}>()

const savedLabel = computed(() => {
  const saved = props.saved
  if (!saved) {
    return ''
  }
  return `Saved as “${saved.name}” on ${new Date(saved.savedAt).toLocaleString()} — kept past the idle timeout.`
})

const lockedCeiling = computed(() => {
  const self = props.selfId
    ? props.state.divers.find(diver => diver.id === props.selfId) ?? null
    : null
  return self ? diverCeiling(props.state, self) : null
})

const loneHost = computed(() => props.mode === 'room' && props.state.divers.length === 1)

const chits = (n: number) => Array.from({ length: 3 }, (_, i) => i < n)
</script>

<template>
  <header class="strip">
    <div class="strip-left">
      <img
        class="diff-icon"
        :src="difficultyImageUrl(state.difficulty)"
        alt=""
        draggable="false"
      >
      <div class="stack">
        <span class="cap">
          Mission <b>{{ state.missionInOperation }}/{{ opLength }}</b>
          <span class="sep">·</span> diff {{ state.difficulty }} {{ difficultyName(state.difficulty) }}
        </span>
        <MissionTrack
          :mission-in-operation="state.missionInOperation"
          :op-length="opLength"
          :mission-index="state.missionIndex"
          :failed="state.phase === 'forfeit'"
        />
      </div>
    </div>

    <div class="strip-right">
      <AppTooltip
        v-if="lockedCeiling"
        content="Your locked reward ceiling — the best tier your next draft can roll."
      >
        <span
          class="cap ceiling"
          tabindex="0"
        >Ceiling <Motion
          :key="lockedCeiling"
          as="span"
          class="badge-pop"
          :initial="{ opacity: 0, scale: 0.4 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="{ type: 'spring', stiffness: 500, damping: 15 }"
        ><TierBadge
          :tier="lockedCeiling"
          size="sm"
        /></Motion></span>
      </AppTooltip>

      <span
        class="cap tokens"
        :aria-label="`${state.rerollTokens} wheel reroll tokens banked`"
      >
        Rerolls
        <span
          class="chits"
          aria-hidden="true"
        ><i
          v-for="(on, i) in chits(state.rerollTokens)"
          :key="i"
          class="chit"
          :class="{ on }"
        /></span>
      </span>

      <span
        v-if="mode === 'room'"
        class="chan"
        :class="{ warn: status !== 'connected' }"
      >
        <span
          class="lamp"
          :class="status === 'connected' ? 'teal pulse' : 'red'"
          aria-hidden="true"
        />
        {{ status }}
      </span>

      <button
        v-if="mode === 'room'"
        class="icon-btn"
        :class="{ glow: loneHost }"
        type="button"
        aria-label="Copy invite link"
        title="Copy invite link"
        @click="$emit('copyInvite')"
      >
        <IconCopy />
      </button>

      <AppTooltip
        v-if="mode === 'room' && saved"
        :content="savedLabel"
      >
        <span
          class="chip gold saved"
          tabindex="0"
        >saved</span>
      </AppTooltip>
      <button
        v-else-if="mode === 'room'"
        class="btn ghost tiny"
        type="button"
        @click="$emit('saveDive')"
      >
        Save
      </button>
      <button
        v-if="mode === 'room' && saved && isHost"
        class="btn ghost tiny"
        type="button"
        @click="$emit('unsaveDive')"
      >
        Unpin
      </button>

      <button
        v-if="mode === 'room' && state.phase !== 'complete'"
        class="btn ghost tiny"
        type="button"
        @click="$emit('leave')"
      >
        Leave
      </button>
      <button
        v-if="canControl && state.phase !== 'complete'"
        class="btn ghost tiny"
        type="button"
        @click="$emit('end')"
      >
        End
      </button>
    </div>
  </header>
</template>

<style scoped>
.strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.strip-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.strip-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.diff-icon {
  height: 42px;
  padding: 2px 6px;
  background: var(--ground);
  border: 1px solid var(--line-2);
  object-fit: contain;
  flex-shrink: 0;
}
.stack { display: flex; flex-direction: column; gap: 5px; }
.sep { color: var(--ghost-ink); padding: 0 3px; }

.ceiling { white-space: nowrap; }
.badge-pop { display: inline-grid; }
.saved { color: var(--gold); }
.tokens { white-space: nowrap; }
.copy-code { color: var(--muted); }

.glow { color: var(--gold); border-color: var(--gold); animation: copy-glow 2.4s ease-in-out infinite; }
@keyframes copy-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 214, 66, 0.3); }
  50% { box-shadow: 0 0 16px rgba(255, 214, 66, 0.8); }
}
@media (prefers-reduced-motion: reduce) {
  .glow { animation: none; box-shadow: 0 0 8px rgba(255, 214, 66, 0.6); }
}
</style>
