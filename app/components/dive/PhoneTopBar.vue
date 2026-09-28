<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import type { DiveSessionStatus } from '~/composables/useDiveSession'

const props = withDefaults(defineProps<{
  mode: 'local' | 'room'
  slotName: string
  status: DiveSessionStatus
  saved?: boolean
  canControl?: boolean
  isHost?: boolean
  loneHost?: boolean
}>(), { saved: false, canControl: false, isHost: false, loneHost: false })

const emit = defineEmits<{
  copyInvite: []
  openArmory: []
  leave: []
  end: []
  saveDive: []
  unsaveDive: []
}>()

const { codexOpen, warbondsOpen, guideOpen } = useDrawers()
const roomCode = computed(() => (props.slotName || '').toUpperCase())

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
onClickOutside(menuRef, () => {
  menuOpen.value = false
})

function run(action: () => void): void {
  menuOpen.value = false
  action()
}
</script>

<template>
  <header class="phone-top">
    <NuxtLink
      to="/"
      class="mark"
      aria-label="Griffdive bridge"
    >
      <BrandMark :size="24" />
    </NuxtLink>

    <button
      v-if="mode === 'room'"
      class="ghost room"
      type="button"
      :aria-label="`Room ${roomCode}, copy invite link`"
      @click="emit('copyInvite')"
    >
      <span class="lbl room-l">Room</span>
      <span class="room-code">{{ roomCode }}</span>
      <IconCopy />
    </button>
    <span
      v-else
      class="solo"
      aria-label="Solo crusade"
    >
      <span
        class="lamp gold"
        aria-hidden="true"
      />
      Solo
    </span>

    <span class="grow" />

    <div
      ref="menuRef"
      class="menu-wrap"
    >
      <button
        class="icon-btn"
        type="button"
        aria-label="Dive menu"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
        @keydown.esc="menuOpen = false"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="5"
            r="1.8"
          /><circle
            cx="12"
            cy="12"
            r="1.8"
          /><circle
            cx="12"
            cy="19"
            r="1.8"
          />
        </svg>
      </button>

      <div
        v-if="menuOpen"
        class="menu cut-sm"
        role="menu"
      >
        <button
          class="menu-item"
          type="button"
          role="menuitem"
          @click="run(() => (guideOpen = true))"
        >
          Field manual
        </button>
        <button
          class="menu-item"
          type="button"
          role="menuitem"
          @click="run(() => (codexOpen = true))"
        >
          Codex
        </button>
        <button
          class="menu-item"
          type="button"
          role="menuitem"
          @click="run(() => (warbondsOpen = true))"
        >
          Warbonds
        </button>
        <span
          v-if="mode === 'room'"
          class="menu-sep"
        />
        <button
          v-if="mode === 'room' && !saved"
          class="menu-item"
          type="button"
          role="menuitem"
          @click="run(() => emit('saveDive'))"
        >
          Save dive
        </button>
        <button
          v-if="mode === 'room' && saved && isHost"
          class="menu-item"
          type="button"
          role="menuitem"
          @click="run(() => emit('unsaveDive'))"
        >
          Unpin dive
        </button>
        <button
          v-if="mode === 'room'"
          class="menu-item"
          type="button"
          role="menuitem"
          @click="run(() => emit('leave'))"
        >
          Leave dive
        </button>
        <button
          v-if="canControl"
          class="menu-item danger"
          type="button"
          role="menuitem"
          @click="run(() => emit('end'))"
        >
          End crusade
        </button>
      </div>
    </div>

    <button
      class="icon-btn"
      type="button"
      aria-label="Armory"
      @click="emit('openArmory')"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        aria-hidden="true"
      >
        <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
        <path d="M3 7l9 4 9-4M12 11v10" />
      </svg>
    </button>
  </header>
</template>

<style scoped>
.phone-top {
  position: relative;
  z-index: 30;
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  border-bottom: 1px solid var(--line-1);
  background: var(--ground);
}
.mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}
.grow { flex: 1 1 auto; }

.room {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  min-width: 0;
  padding: 0 10px;
  border-color: var(--line-2);
  color: var(--text);
}
.room-l { font-size: 9px; }
.room-code {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--text);
}
.room :deep(svg) { color: var(--khaki); flex-shrink: 0; }

.solo {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 44px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--khaki);
}

.menu-wrap { position: relative; }
.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 40;
  min-width: 190px;
  padding: 4px;
  background: var(--raised);
  border: 1px solid var(--line-3);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}
.menu-item {
  display: block;
  width: 100%;
  padding: 12px 12px;
  border: 0;
  background: none;
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: left;
  text-transform: uppercase;
  cursor: pointer;
}
.menu-item:hover { background: color-mix(in srgb, var(--gold) 12%, transparent); color: var(--gold); }
.menu-item.danger { color: var(--red); }
.menu-item.danger:hover { background: color-mix(in srgb, var(--red) 16%, transparent); color: var(--red); }
.menu-sep { display: block; height: 1px; margin: 4px 8px; background: var(--line-2); }

.icon-btn {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
</style>
