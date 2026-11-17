<script setup lang="ts">
import type { HeroTranscript } from '~~/shared/engine/hero'
import { redemptionOf, redemptionTargetFor, reinforceBlockedFor } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  self: DiverState | null
}>()

const emit = defineEmits<{
  begin: [playerId: string]
  submit: [playerId: string, seed: number, transcript: HeroTranscript]
}>()

const open = ref(false)
const blocked = computed(() => Boolean(props.self && reinforceBlockedFor(props.state, props.self)))
const earned = computed(() => (props.self ? redemptionOf(props.self).earned : 0))
const target = computed(() => (props.self ? redemptionTargetFor(props.state, props.self) : 0))
</script>

<template>
  <article
    v-if="self && blocked"
    class="redemption-card cut"
  >
    <div class="rc-copy">
      <span class="cap">Redemption</span>
      <p class="rc-title">
        Down? Clear round <b>{{ target }}</b> to earn your reinforce.
      </p>
      <p
        v-if="earned > 0"
        class="rc-earned"
      >
        Redeemed ×{{ earned }} this mission
      </p>
    </div>
    <button
      type="button"
      class="btn primary"
      @click="open = true"
    >
      I'm down
    </button>

    <RedemptionDialog
      v-model:open="open"
      :state="state"
      :diver="self"
      @begin="emit('begin', self.id)"
      @submit="(seed, transcript) => emit('submit', self!.id, seed, transcript)"
    />
  </article>
</template>

<style scoped>
.redemption-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-5);
  padding: var(--pad-panel);
  background: rgba(255, 214, 66, 0.06);
  border: 1px solid var(--gold);
}

.rc-copy { display: grid; gap: var(--sp-1); min-width: 0; }
.rc-copy .cap { color: var(--gold); }

.rc-title {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--text);
}

.rc-title b { color: var(--gold); }

.rc-earned {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--teal);
}
</style>
