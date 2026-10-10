<script setup lang="ts">
import type { DiveSessionStatus } from '~/composables/useDiveSession'

import { difficultyImageUrl } from '~~/shared/data/images'

const props = withDefaults(defineProps<{
  crusadeLabel: string
  difficulty: number
  mode: 'local' | 'room'
  slotName: string
  status: DiveSessionStatus
  saved?: boolean
  canControl?: boolean
  isHost?: boolean
  loneHost?: boolean
  canFork?: boolean
}>(), { saved: false, canControl: false, isHost: false, loneHost: false, canFork: false })

const emit = defineEmits<{
  copyInvite: []
  openTutorial: []
  leave: []
  end: []
  saveDive: []
  unsaveDive: []
  newSession: []
}>()

const { codexOpen, warbondsOpen } = useDrawers()

const roomCode = computed(() => (props.slotName || '').toUpperCase())
</script>

<template>
  <header class="top">
    <NuxtLink
      to="/"
      class="brand"
      aria-label="Griffdive bridge"
    >
      <BrandMark :size="26" />
      <span class="brand-word disp">Griffdive</span>
    </NuxtLink>
    <span
      class="vline"
      aria-hidden="true"
    />
    <img
      class="diff-icon"
      :src="difficultyImageUrl(difficulty)"
      alt=""
      draggable="false"
    >
    <div class="crusade">
      <span class="lbl">Crusade</span>
      <span class="crusade-name">{{ crusadeLabel }}</span>
    </div>
    <div class="grow" />

    <div
      v-if="mode === 'room'"
      class="room"
    >
      <span class="lbl room-l">Room</span>
      <span class="room-code">{{ roomCode }}</span>
      <span
        class="lamp"
        :class="status === 'connected' ? 'teal pulse' : 'red'"
        :title="status"
        aria-hidden="true"
      />
      <button
        class="icon-btn room-copy"
        :class="{ glow: loneHost }"
        type="button"
        aria-label="Copy invite link"
        title="Copy invite link"
        @click="emit('copyInvite')"
      >
        <IconCopy />
      </button>
      <span
        v-if="saved"
        class="chip gold saved"
      >saved</span>
    </div>
    <div
      v-else
      class="chan"
      aria-label="Solo crusade"
    >
      <span
        class="lamp gold"
        aria-hidden="true"
      />
      Solo
    </div>

    <div class="session">
      <button
        class="btn ghost tiny"
        type="button"
        aria-haspopup="dialog"
        @click="emit('openTutorial')"
      >
        Tutorial
      </button>
      <button
        v-if="canFork"
        class="btn ghost tiny"
        type="button"
        @click="emit('newSession')"
      >
        New session
      </button>
      <button
        v-if="mode === 'room' && !saved"
        class="btn ghost tiny"
        type="button"
        @click="emit('saveDive')"
      >
        Save
      </button>
      <button
        v-if="mode === 'room' && saved && isHost"
        class="btn ghost tiny"
        type="button"
        @click="emit('unsaveDive')"
      >
        Unpin
      </button>
      <button
        v-if="mode === 'room'"
        class="btn ghost tiny"
        type="button"
        @click="emit('leave')"
      >
        Leave
      </button>
      <button
        v-if="canControl"
        class="btn ghost tiny"
        type="button"
        @click="emit('end')"
      >
        End
      </button>
    </div>

    <nav
      class="ship-nav"
      aria-label="Ship"
    >
      <button
        class="icon-btn navb"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="codexOpen"
        @click="codexOpen = true"
      >
        <IconBook class="nav-icon" />
        <span>Codex</span>
      </button>
      <button
        class="icon-btn navb"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="warbondsOpen"
        @click="warbondsOpen = true"
      >
        <IconWarbond class="nav-icon" />
        <span>Warbonds</span>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.top {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  height: 60px;
  padding: 0 var(--pad-page);
  border-bottom: 1px solid var(--line-1);
  background: var(--ground);
  min-width: 0;
}
.brand { display: flex; align-items: center; gap: 10px; color: var(--gold); }
.diff-icon {
  height: 38px;
  padding: 2px 5px;
  background: var(--ground);
  border: 1px solid var(--line-2);
  object-fit: contain;
  flex-shrink: 0;
}
.room-copy.glow {
  color: var(--gold);
  border-color: var(--gold);
  animation: copy-glow 2.4s ease-in-out infinite;
}
@keyframes copy-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 214, 66, 0.3); }
  50% { box-shadow: 0 0 16px rgba(255, 214, 66, 0.8); }
}
@media (prefers-reduced-motion: reduce) {
  .room-copy.glow { animation: none; box-shadow: 0 0 8px rgba(255, 214, 66, 0.6); }
}
.brand:hover { color: var(--gold); text-decoration: none; }
.brand-word { font-size: 17px; letter-spacing: 0.06em; }
.vline { width: 1px; height: 28px; background: var(--line-2); flex-shrink: 0; }
.crusade { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.crusade .lbl { font-size: 10px; }
.crusade-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.room {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 12px;
  border: 1px solid var(--line-2);
}
.room-l { font-size: 10px; }
.room-code { font-size: 15px; font-weight: 700; letter-spacing: 0.3em; }
.room-copy { width: 30px; height: 30px; display: grid; place-items: center; padding: 0; }
.room-copy svg { width: 15px; height: 15px; }
.saved { font-size: 9px; }
.session { display: flex; gap: 4px; }
.ship-nav { display: flex; gap: 2px; }
/* Labelled like the Bridge header: players couldn't find the Kit behind a bare icon. */
.navb {
  flex-direction: column;
  gap: 0.12rem;
  height: 48px;
  padding: 0.3rem 0.6rem;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.nav-icon { width: 20px; height: 20px; }

@media (max-width: 760px) {
  .top { height: auto; min-height: 52px; padding: var(--sp-3) var(--sp-4); gap: var(--sp-3); flex-wrap: wrap; }
  .brand-word { font-size: 14px; }
  .crusade,
  .session { display: none; }
  .room-code { font-size: 13px; letter-spacing: 0.2em; }
}
</style>
