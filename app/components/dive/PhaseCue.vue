<script setup lang="ts">
import { allDiversPicked, awaitingDiverIds, strainDecision } from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  canControl: boolean
  // The phone shell renders the cue as a slim fixed band between the squad bar
  // and the phase, so the phase body keeps its no-scroll layout.
  band?: boolean
}>(), { band: false })

// One line that answers "whose move is it?" for the current beat. Playtesters
// lost the thread between phases because every panel spoke at once.
type Tone = 'act' | 'wait'

function nameOf(id: string | null | undefined): string {
  return props.state.divers.find(diver => diver.id === id)?.name ?? 'the host'
}

function names(ids: string[]): string {
  const list = ids.map(nameOf)
  if (list.length <= 2) {
    return list.join(' and ')
  }
  return `${list.slice(0, 2).join(', ')} and ${list.length - 2} more`
}

const cue = computed<{ tone: Tone, tag: string, text: string } | null>(() => {
  const state = props.state
  const host = nameOf(state.hostId)
  const lead = (act: string, wait: string) => props.canControl
    ? { tone: 'act' as const, tag: 'Your move', text: act }
    : { tone: 'wait' as const, tag: 'Stand by', text: wait }

  switch (state.phase) {
    case 'lobby':
      return lead('Launch the crusade once your squad is seated.', `Waiting on ${host} to launch the crusade.`)
    case 'spin':
      return lead('Spin the wheel to draw this mission\'s directive.', `${host} spins the Wheel of Adversity.`)
    case 'decision':
      return strainDecision(state).decided
        ? lead('Squad call: lock in the directive or opt out.', `Squad call — ${host} locks in the directive or opts out.`)
        : lead('Squad call: lock in or opt out of the directive and the strain.', `Squad call — ${host} decides the directive and the strain.`)
    case 'strain':
      return lead('Accept or decline the strain — it holds for the whole operation.', `Squad call — ${host} accepts or declines the strain.`)
    case 'deal':
      return lead('Deal the pacts to every diver.', `${host} deals the pacts.`)
    case 'pacts': {
      const waiting = awaitingDiverIds(state)
      if (props.selfId && waiting.includes(props.selfId)) {
        return { tone: 'act', tag: 'Your move', text: 'Pick your pacts — or none — then hold to lock in.' }
      }
      return { tone: 'wait', tag: 'Locked in', text: `Waiting on ${names(waiting)} to lock their pacts.` }
    }
    case 'diving':
      return props.canControl
        ? { tone: 'act', tag: 'In game', text: 'Play the mission in Helldivers 2, then report it here.' }
        : { tone: 'act', tag: 'In game', text: `Play the mission in Helldivers 2 — ${host} reports the result.` }
    case 'rewards': {
      const waiting = awaitingDiverIds(state)
      if (props.selfId && waiting.includes(props.selfId)) {
        return { tone: 'act', tag: 'Your move', text: 'Draft one reward for your kit.' }
      }
      if (!allDiversPicked(state)) {
        return { tone: 'wait', tag: 'Drafted', text: `Waiting on ${names(waiting)} to draft.` }
      }
      return lead('Everyone has drafted — advance to the next mission.', `Everyone has drafted — waiting on ${host} to advance.`)
    }
    case 'forfeit':
      return lead('Mission failed — pick the one item the squad forfeits.', `Mission failed — ${host} picks the item the squad forfeits.`)
    default:
      return null
  }
})
</script>

<template>
  <div
    v-if="cue"
    class="cue"
    :class="{ band }"
    :data-tone="cue.tone"
    role="status"
    aria-live="polite"
  >
    <span class="cue-tag">
      <span
        class="lamp"
        :class="cue.tone === 'act' ? 'gold pulse' : 'teal'"
        aria-hidden="true"
      />
      {{ cue.tag }}
    </span>
    <span class="cue-text">{{ cue.text }}</span>
  </div>
</template>

<style scoped>
.cue {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-height: 44px;
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--line-2);
  border-left-width: 4px;
  background: var(--panel);
}
.cue[data-tone='act'] {
  border-color: color-mix(in srgb, var(--gold) 40%, transparent);
  border-left-color: var(--gold);
  background: color-mix(in srgb, var(--gold) 6%, var(--panel));
}
.cue[data-tone='wait'] { border-left-color: var(--teal); }
.cue-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  white-space: nowrap;
}
.cue[data-tone='act'] .cue-tag { color: var(--gold); }
.cue[data-tone='wait'] .cue-tag { color: var(--teal); }
.cue-text {
  font-size: var(--fs-body);
  color: var(--text);
  min-width: 0;
}

.cue.band {
  gap: var(--sp-3);
  min-height: 0;
  padding: 7px 12px;
  border-width: 0 0 1px;
  border-left-width: 3px;
}
.cue.band .cue-tag { font-size: 10px; letter-spacing: 0.16em; }
.cue.band .cue-text { font-size: 13px; line-height: 1.3; }
</style>
