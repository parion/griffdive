<script setup lang="ts">
import { difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import { diverCeiling } from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'
import type { DiveSessionStatus } from '~/composables/useDiveSession'

const props = defineProps<{
  state: DiveState
  mode: 'local' | 'room'
  status: DiveSessionStatus
  selfId: string | null
  canControl: boolean
  opLength: number
  slotName: string
}>()

defineEmits<{ copyInvite: [], leave: [], end: [] }>()

const lockedCeiling = computed(() => {
  const self = props.selfId
    ? props.state.divers.find(diver => diver.id === props.selfId) ?? null
    : null
  return self ? diverCeiling(props.state, self) : null
})
</script>

<template>
  <header class="page-header">
    <div>
      <div class="title-row">
        <h1 class="mono">
          {{ slotName || 'Dive' }}
        </h1>
        <button
          v-if="mode === 'room'"
          class="copy-code"
          type="button"
          aria-label="Copy invite link"
          title="Copy invite link"
          @click="$emit('copyInvite')"
        >
          <IconCopy />
        </button>
      </div>
      <div class="dive-meta">
        <img
          class="diff-icon"
          :src="difficultyImageUrl(state.difficulty)"
          alt=""
          draggable="false"
        >
        <div class="meta-stack">
          <span class="diff-descriptor">
            <span class="diff-name">{{ difficultyName(state.difficulty) }}</span>
            <span class="diff-num">{{ state.difficulty }}</span>
          </span>
          <MissionTrack
            :mission-in-operation="state.missionInOperation"
            :op-length="opLength"
            :mission-index="state.missionIndex"
            :failed="state.phase === 'forfeit'"
          />
        </div>
      </div>
    </div>
    <div class="row">
      <span
        v-if="mode === 'room'"
        class="chip"
        :class="{ warn: status !== 'connected' }"
      >
        {{ status }}
      </span>
      <span
        v-if="lockedCeiling"
        class="row small muted"
      >ceiling <Motion
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
      <span class="muted small">tokens {{ state.rerollTokens }}</span>
      <button
        v-if="mode === 'room' && state.phase !== 'complete'"
        class="btn ghost tiny"
        type="button"
        @click="$emit('leave')"
      >
        Leave dive
      </button>
      <button
        v-if="canControl && state.phase !== 'complete'"
        class="btn ghost tiny"
        type="button"
        @click="$emit('end')"
      >
        End dive
      </button>
    </div>
  </header>
</template>

<style scoped>
.badge-pop { display: inline-grid; }

.dive-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.1rem;
}

.diff-icon {
  height: 2.5rem;
  padding: 0.2rem 0.45rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}

.meta-stack {
  display: grid;
  gap: 0.3rem;
}

.diff-descriptor {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.diff-name {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--khaki);
}

.diff-num {
  display: inline-grid;
  place-items: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.25rem;
  border: 1px solid var(--gold);
  border-radius: 4px;
  color: var(--gold);
  font-size: 0.7rem;
  font-weight: 700;
}

.title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.copy-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.copy-code:hover {
  border-color: var(--gold);
  color: var(--gold);
}
.copy-code svg {
  width: 0.9rem;
  height: 0.9rem;
}
</style>
