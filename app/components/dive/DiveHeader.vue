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
  online: string[]
  nameDraft: string
  saved: DiveSaveInfo | null
}>()

defineEmits<{
  'copyInvite': []
  'leave': []
  'end': []
  'saveDive': []
  'unsaveDive': []
  'update:nameDraft': [name: string]
  'commit': []
  'transferHost': [diverId: string]
  'kick': [diverId: string]
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

// A lone host in a room has nobody to play with yet — the invite copy control
// pulses to draw the eye, replacing the old "Share the invite link" nudge.
const loneHost = computed(() => props.mode === 'room' && props.state.divers.length === 1)
</script>

<template>
  <header class="page-header dive-header">
    <div class="head-title">
      <div class="title-row">
        <h1 class="mono">
          {{ slotName || 'Dive' }}
        </h1>
        <button
          v-if="mode === 'room'"
          class="copy-code"
          :class="{ glow: loneHost }"
          type="button"
          aria-label="Copy invite link"
          title="Copy invite link"
          @click="$emit('copyInvite')"
        >
          <IconCopy />
        </button>
      </div>
    </div>
    <div class="head-actions row">
      <span
        v-if="mode === 'room'"
        class="chip"
        :class="{ warn: status !== 'connected' }"
      >
        {{ status }}
      </span>
      <AppTooltip
        v-if="mode === 'room' && saved"
        :content="savedLabel"
      >
        <span
          class="chip saved"
          tabindex="0"
        >saved</span>
      </AppTooltip>
      <button
        v-else-if="mode === 'room'"
        class="btn ghost tiny"
        type="button"
        @click="$emit('saveDive')"
      >
        Save dive
      </button>
      <button
        v-if="mode === 'room' && saved && isHost"
        class="btn ghost tiny"
        type="button"
        @click="$emit('unsaveDive')"
      >
        Remove save
      </button>
      <AppTooltip
        v-if="lockedCeiling"
        content="Your locked reward ceiling — the best tier your next draft can roll."
      >
        <span
          class="row small muted"
          tabindex="0"
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
      </AppTooltip>
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
    <SquadStrip
      class="head-squad"
      :state="state"
      :self-id="selfId"
      :online="online"
      :mode="mode"
      :is-host="isHost"
      :name-draft="nameDraft"
      @update:name-draft="$emit('update:nameDraft', $event)"
      @commit="$emit('commit')"
      @transfer-host="$emit('transferHost', $event)"
      @kick="$emit('kick', $event)"
    />
  </header>
</template>

<style scoped>
.badge-pop { display: inline-grid; }

.chip.saved {
  border-color: color-mix(in srgb, var(--gold) 55%, var(--border));
  color: var(--gold);
}

.dive-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.75rem;
  row-gap: 0.4rem;
}

.head-title {
  grid-area: 1 / 1;
  min-width: 0;
}

.head-actions {
  grid-area: 1 / 2;
  justify-self: end;
}

.head-squad {
  grid-area: 2 / 2;
  justify-self: end;
}

@media (max-width: 640px) {
  .dive-header { grid-template-columns: minmax(0, 1fr); }

  .head-title,
  .head-actions,
  .dive-meta,
  .head-squad {
    grid-area: auto;
    justify-self: stretch;
  }
}

.dive-meta {
  grid-area: 2 / 1;
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
.copy-code.glow {
  border-color: var(--gold);
  color: var(--gold);
  animation: copy-glow 2.4s ease-in-out infinite;
}
@keyframes copy-glow {
  0%, 100% {
    box-shadow: 0 0 4px color-mix(in srgb, var(--gold) 30%, transparent);
    border-color: color-mix(in srgb, var(--gold) 55%, var(--border));
  }
  50% {
    box-shadow: 0 0 14px color-mix(in srgb, var(--gold) 85%, transparent);
    border-color: var(--gold);
  }
}
@media (prefers-reduced-motion: reduce) {
  .copy-code.glow {
    animation: none;
    box-shadow: 0 0 8px color-mix(in srgb, var(--gold) 60%, transparent);
  }
}
.copy-code svg {
  width: 0.9rem;
  height: 0.9rem;
}
</style>
