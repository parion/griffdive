<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import { actingDiverIds } from '~~/shared/engine/selectors'
import type { BonusStat } from '~~/shared/engine/config'
import type { DiveState, DiverState } from '~~/shared/engine/types'
import type { SteamLobbyInfo } from '~~/shared/types/messages'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  online?: string[]
  mode: 'local' | 'room'
  isHost?: boolean
  canControl?: boolean
  slotName?: string
  steam?: SteamLobbyInfo | null
  steamPanelOpen?: boolean
  honors?: BonusStat | null
  honorsWinners?: string[]
  honorsAwarded?: boolean
  // The phone squad sheet is a modal dialog: a portalled dropdown lands under
  // its overlay and stops taking taps, so host actions render inline instead.
  inlineManage?: boolean
}>(), {
  online: () => [],
  isHost: false,
  canControl: false,
  slotName: '',
  steam: null,
  steamPanelOpen: false,
  honors: null,
  honorsWinners: () => [],
  honorsAwarded: false,
  inlineManage: false,
})

const emit = defineEmits<{
  transferHost: [diverId: string]
  kick: [diverId: string]
  copyInvite: []
  openSteam: []
  awardBonus: [playerIds: string[]]
}>()

const selectedWinners = ref<string[]>([])
const acting = computed(() => new Set(actingDiverIds(props.state)))
const roomCode = computed(() => (props.slotName || '').toUpperCase())
const openSeats = computed(() => Math.max(0, 4 - props.state.divers.length))
const host = computed(() => props.state.hostId)
const canAward = computed(() =>
  props.canControl
  && Boolean(props.honors)
  && !props.honorsAwarded
  && props.state.bonusSeed !== null)

function isSelf(diver: DiverState): boolean {
  return diver.id === props.selfId
}

function statusOf(diver: DiverState): string {
  if (diver.away) {
    return 'Away'
  }
  const hostPrefix = diver.id === host.value ? 'Host · ' : ''
  switch (props.state.phase) {
    case 'lobby': return `${hostPrefix}Starting`
    case 'spin':
    case 'decision':
    case 'strain':
    case 'deal': return diver.id === host.value ? 'Host · calling' : 'Listening'
    case 'pacts': return diver.pactsLocked ? 'Sworn ✓' : 'Swearing'
    case 'diving': return 'In game'
    case 'rewards':
      if (diver.skipsCurrentDraft) return 'Sat out'
      if (diver.rewardBanned) return 'Banned'
      if (diver.pickedOptionId) return 'Banked ✓'
      return 'Drafting'
    case 'forfeit':
      if (diver.forfeitedItemId) return 'Forfeited'
      return 'Choosing'
    case 'complete': return 'Ready'
    default: return ''
  }
}

function lampClass(diver: DiverState): string {
  if (diver.away) return 'dim'
  return acting.value.has(diver.id) ? 'gold pulse' : 'teal'
}

function toggleWinner(diverId: string): void {
  if (!canAward.value) {
    return
  }
  selectedWinners.value = selectedWinners.value.includes(diverId)
    ? selectedWinners.value.filter(id => id !== diverId)
    : [...selectedWinners.value, diverId]
}

function award(): void {
  if (selectedWinners.value.length === 0) {
    return
  }
  emit('awardBonus', selectedWinners.value)
  selectedWinners.value = []
}

function transfer(diverId: string): void {
  emit('transferHost', diverId)
}
function kick(diverId: string): void {
  emit('kick', diverId)
}
</script>

<template>
  <footer
    class="dock"
    aria-label="Squad"
  >
    <div class="squad-side">
      <div
        v-if="honors"
        class="honors"
        role="status"
      >
        <span
          class="honors-hex"
          aria-hidden="true"
        >1</span>
        <span class="honors-copy">
          <i>Squad Honors</i>
          <b class="disp">{{ honors.label }}</b>
        </span>
        <button
          v-if="canAward"
          class="honors-award"
          type="button"
          :disabled="selectedWinners.length === 0"
          @click="award"
        >
          Award{{ selectedWinners.length > 1 ? ` ${selectedWinners.length}` : '' }}
        </button>
        <span
          v-else-if="honorsAwarded"
          class="honors-done"
        >Token banked</span>
      </div>

      <span class="cap squad-label">Squad</span>

      <div
        v-for="diver in state.divers"
        :key="diver.id"
        class="seat"
        :class="{ self: isSelf(diver), away: diver.away }"
      >
        <span
          class="lamp"
          :class="lampClass(diver)"
          aria-hidden="true"
        />
        <span class="seat-copy">
          <b>{{ diver.name }}</b>
          <i>{{ statusOf(diver) }}</i>
        </span>
        <button
          v-if="canAward"
          class="honor-token"
          type="button"
          :aria-pressed="selectedWinners.includes(diver.id)"
          :aria-label="`Award Squad Honors token to ${diver.name}`"
          @click="toggleWinner(diver.id)"
        >
          <svg
            width="20"
            height="22"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3z"
              :fill="selectedWinners.includes(diver.id) ? 'var(--gold)' : 'none'"
              stroke="var(--gold)"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <span
          v-if="canControl && !isSelf(diver) && inlineManage"
          class="manage-inline"
        >
          <button
            class="manage-item"
            type="button"
            @click="transfer(diver.id)"
          >
            Make host
          </button>
          <button
            class="manage-item danger"
            type="button"
            @click="kick(diver.id)"
          >
            Kick diver
          </button>
        </span>
        <DropdownMenuRoot v-else-if="canControl && !isSelf(diver)">
          <DropdownMenuTrigger as-child>
            <button
              class="icon-mini"
              type="button"
              :aria-label="`Manage ${diver.name}`"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle
                  cx="5"
                  cy="12"
                  r="1.8"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="1.8"
                />
                <circle
                  cx="19"
                  cy="12"
                  r="1.8"
                />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              class="manage-menu"
              :side-offset="6"
              align="end"
            >
              <DropdownMenuItem
                class="manage-item"
                @select="transfer(diver.id)"
              >
                Make host
              </DropdownMenuItem>
              <DropdownMenuItem
                class="manage-item danger"
                @select="kick(diver.id)"
              >
                Kick diver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
      </div>

      <button
        v-if="openSeats > 0"
        class="open-seat"
        type="button"
        :aria-label="mode === 'room' ? `Copy invite to ${openSeats} open seat${openSeats === 1 ? '' : 's'}` : 'Open seat'"
        @click="emit('copyInvite')"
      >
        + Open seat
      </button>
    </div>

    <div class="link-side">
      <a
        v-if="mode === 'room' && !isHost && steam"
        class="link-btn join-game cut-sm"
        :href="steam.link"
        rel="noopener"
        aria-label="Join Game"
        title="Join Game"
      >
        <IconSteam />
        <span class="link-label">Join Game</span>
        <svg
          class="join-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          aria-hidden="true"
        ><path d="M7 17L17 7M9 7h8v8" /></svg>
      </a>
      <button
        v-else-if="mode === 'room' && isHost"
        class="link-btn"
        :class="{ open: steamPanelOpen }"
        type="button"
        aria-label="Steam lobby settings"
        title="Steam lobby"
        :aria-expanded="steamPanelOpen"
        :aria-controls="steamPanelOpen ? 'steam-lobby-bar' : undefined"
        @click="emit('openSteam')"
      >
        <IconSteam />
        <span class="link-label">Steam lobby</span>
      </button>
      <button
        v-if="mode === 'room'"
        class="link-btn invite"
        type="button"
        :aria-label="`Copy invite link for room ${roomCode}`"
        @click="emit('copyInvite')"
      >
        <span class="code">{{ roomCode }}</span>
        <span class="link-label">Invite</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          aria-hidden="true"
        >
          <rect
            x="5"
            y="5"
            width="9"
            height="9"
          />
          <path d="M11 5V2H2v9h3" />
        </svg>
      </button>
    </div>
  </footer>
</template>

<style scoped>
.dock {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 24px;
  padding: 10px var(--pad-page);
  background: var(--rail);
  box-shadow: inset 0 1px 0 var(--line-1);
  min-width: 0;
}
.squad-side,
.link-side {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.squad-label { margin-right: 4px; }

.honors {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 10px;
  margin-right: 6px;
  background: linear-gradient(90deg, rgba(255, 214, 66, 0.16), var(--panel));
  box-shadow: inset 0 0 0 1px var(--gold), 0 0 16px rgba(255, 214, 66, 0.16);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}
.honors-hex {
  display: grid;
  place-items: center;
  width: 26px;
  height: 24px;
  background: linear-gradient(180deg, #ffe57a, var(--gold) 50%, #e0b000);
  color: var(--on-gold);
  font: 800 12px var(--font-display);
  font-stretch: 125%;
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
}
.honors-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.honors-copy i {
  color: var(--muted);
  font-size: 10px;
  font-style: normal;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.honors-copy b {
  color: var(--gold);
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
}
.honors-award,
.honors-done {
  min-height: 30px;
  padding: 0 9px;
  border: 0;
  background: var(--gold);
  color: var(--on-gold);
  font: 700 10px var(--font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.honors-award:disabled { opacity: 0.35; cursor: not-allowed; }
.honors-done { background: transparent; color: var(--teal); padding: 0 4px; }

.seat {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 6px 0 14px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2);
  min-width: 0;
}
.seat.self { box-shadow: inset 0 0 0 1px var(--line-4); }
.seat.away { opacity: 0.55; }
.seat-copy { display: flex; flex-direction: column; gap: 1px; flex: 1; line-height: 1.2; min-width: 120px; }
.seat-copy b { font-size: 14px; font-weight: 700; color: var(--text); }
.seat-copy i {
  color: var(--muted);
  font-size: 11px;
  font-style: normal;
  letter-spacing: 0.06em;
}
.lamp {
  width: 8px;
  height: 8px;
  flex: none;
  background: var(--teal);
}
.lamp.gold { background: var(--gold); box-shadow: 0 0 8px rgba(255, 214, 66, 0.75); }
.lamp.teal { background: var(--teal); }
.lamp.dim { background: var(--line-4); box-shadow: none; }
.pulse { animation: lamp-pulse 1.6s ease-in-out infinite; }
@keyframes lamp-pulse { 50% { opacity: 0.45; } }

.honor-token,
.icon-mini {
  display: grid;
  place-items: center;
  width: 32px;
  height: 36px;
  border: 0;
  background: none;
  color: var(--dim);
  cursor: pointer;
}
.honor-token { color: var(--gold); }
.honor-token:hover svg { filter: drop-shadow(0 0 5px var(--gold)); }
.icon-mini:disabled { opacity: 0.3; cursor: not-allowed; }
.icon-mini:hover:not(:disabled) { color: var(--text); }

.open-seat {
  min-height: 48px;
  padding: 0 14px;
  border: 0;
  background: repeating-linear-gradient(-45deg, #101209 0 6px, var(--rail) 6px 12px);
  box-shadow: inset 0 0 0 1px var(--line-2);
  color: var(--dim);
  font: 600 10px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.open-seat:hover { color: var(--khaki); }

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 13px;
  border: 0;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--khaki);
  font: 600 11px var(--font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.link-btn:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.link-btn.open { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.link-btn.join-game {
  --steam-deep: #171a21;
  background: linear-gradient(180deg, #67c1f5 0%, #417a9b 100%);
  color: var(--steam-deep);
  box-shadow: none;
  transition: filter var(--dur-fast) var(--ease-out);
}
.link-btn.join-game:hover {
  color: var(--steam-deep);
  box-shadow: none;
  filter: brightness(1.08);
}
.link-btn.join-game .join-arrow { width: 14px; height: 14px; }
.link-btn.invite .code { color: var(--text); font-weight: 700; letter-spacing: 0.06em; }
.link-btn svg { width: 16px; height: 16px; }

.manage-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-left: auto;
}
.manage-inline .manage-item {
  min-height: 32px;
  padding: 0 8px;
  border: 0;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--khaki);
  font: 700 10px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.manage-inline .manage-item.danger { color: var(--red); }
.manage-menu {
  z-index: 100;
  min-width: 150px;
  padding: 4px;
  background: var(--raised);
  box-shadow: inset 0 0 0 1px var(--line-4), 0 10px 28px rgba(0, 0, 0, 0.6);
}
.manage-item {
  padding: 9px 11px;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  outline: none;
}
.manage-item[data-highlighted] { background: var(--panel); color: var(--gold); }
.manage-item.danger { color: var(--red); }

@media (max-width: 900px) {
  .link-label { display: none; }
  .seat-copy { min-width: 0; }
  .dock { padding-top: 8px; padding-bottom: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .pulse { animation: none; }
}
</style>
