<script setup lang="ts">
withDefaults(defineProps<{
  mode: 'local' | 'room'
  saved?: boolean
  canFork?: boolean
  canControl?: boolean
  isHost?: boolean
  loneHost?: boolean
  roomCode?: string
}>(), {
  saved: false,
  canFork: false,
  canControl: false,
  isHost: false,
  loneHost: false,
  roomCode: '',
})

const open = defineModel<boolean>('open', { default: false })

const { openFeedback } = useFeedback()

const emit = defineEmits<{
  openTutorial: []
  saveDive: []
  unsaveDive: []
  leave: []
  end: []
  newSession: []
  copyInvite: []
}>()

function run(action: () => void): void {
  open.value = false
  action()
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    title="Session"
    description="Controls for this crusade."
    size="sm"
  >
    <div class="menu">
      <NuxtLink
        class="menu-row"
        to="/"
      >
        <span>Bridge</span>
        <span class="hint">Home</span>
      </NuxtLink>

      <button
        class="menu-row"
        type="button"
        @click="run(() => emit('openTutorial'))"
      >
        <span>Tutorial / field manual</span>
        <span class="hint">{{ isHost ? 'Host tutorial' : 'Field manual' }}</span>
      </button>

      <button
        v-if="mode === 'room'"
        class="menu-row"
        type="button"
        @click="run(() => emit('copyInvite'))"
      >
        <span>Copy invite link</span>
        <span class="hint">{{ roomCode }}</span>
      </button>

      <button
        v-if="mode === 'room' && !saved"
        class="menu-row"
        type="button"
        @click="run(() => emit('saveDive'))"
      >
        <span>Pin this dive</span>
        <span class="hint">Keep it on the Bridge</span>
      </button>
      <button
        v-if="mode === 'room' && saved && isHost"
        class="menu-row"
        type="button"
        @click="run(() => emit('unsaveDive'))"
      >
        <span>Unpin this dive</span>
        <span class="hint">Remove from the Bridge</span>
      </button>

      <button
        v-if="canFork"
        class="menu-row"
        type="button"
        @click="run(() => emit('newSession'))"
      >
        <span>Start a new session</span>
        <span class="hint">Keep this one intact</span>
      </button>

      <button
        class="menu-row"
        type="button"
        @click="run(openFeedback)"
      >
        <span>Send feedback</span>
        <span class="hint">Bug, idea, balance</span>
      </button>

      <button
        v-if="mode === 'room'"
        class="menu-row danger"
        type="button"
        @click="run(() => emit('leave'))"
      >
        <span>Leave dive</span>
        <span class="hint">{{ loneHost ? 'Last diver keeps the seat' : 'Seat stays parked' }}</span>
      </button>

      <button
        v-if="canControl"
        class="menu-row danger"
        type="button"
        @click="run(() => emit('end'))"
      >
        <span>End crusade</span>
        <span class="hint">Close this run</span>
      </button>
    </div>
  </AppDialog>
</template>

<style scoped>
.menu { display: flex; flex-direction: column; gap: 2px; }
.menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 48px;
  padding: 0 12px;
  border: 0;
  border-bottom: 1px solid var(--line-1);
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.menu-row:hover { background: var(--panel); }
.menu-row.danger { color: var(--red); }
.hint { color: var(--dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
</style>
