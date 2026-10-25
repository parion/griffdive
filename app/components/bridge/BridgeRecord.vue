<script setup lang="ts">
import { missionsPerOperation } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import type { CrusadeVariant, DiveState } from '~~/shared/engine/types'
import type { DiveSaveInfo } from '~~/shared/types/messages'
import type { SaveDoc, SessionSave } from '~~/shared/types/save'

export interface OnlineDive { code: string, state: DiveState | null, saved: DiveSaveInfo | null, online: string[] }

// The service record: every crusade this browser can pick back up — live rooms,
// session mirrors whose room is gone, and local solo saves. It takes the hero's
// showcase slot once there is anything to resume, so it scrolls in place.
const props = defineProps<{
  loading: boolean
  hosting: boolean
  online: OnlineDive[]
  sessions: SessionSave[]
  slots: { id: string, doc: SaveDoc }[]
  mirroredCodes: ReadonlySet<string>
}>()

const emit = defineEmits<{
  hostLive: [dive: OnlineDive]
  hostSession: [save: SessionSave]
  hostLocal: [doc: SaveDoc]
  exportSession: [code: string]
  removeSession: [code: string]
  exportSlot: [id: string]
  removeSlot: [id: string]
  forget: [code: string]
}>()

const VARIANT_LABELS: Record<CrusadeVariant, string> = {
  medium: 'Medium',
  hard: 'Hard',
  suicide: 'Suicide Mission',
}

const count = computed(() => props.online.length + props.sessions.length + props.slots.length)

// A solo save is named after its diver as they are now: the callsign is often
// filed on the tutorial, after the slot was created.
function crusadeName(state: DiveState): string {
  const variant = VARIANT_LABELS[state.settings?.variant ?? 'medium']
  const lead = state.divers.find(diver => diver.id === state.hostId) ?? state.divers[0]
  return `${upperName(lead?.name) ?? 'Crusade'} · ${variant}`
}
function opLine(state: DiveState): string {
  const op = catchUpOpsBehind(state.difficulty, state.settings?.variant ?? 'medium') + 1
  return `Op ${op} · M${state.missionInOperation}/${missionsPerOperation(state.difficulty)}`
}
function ladderCells(difficulty: number): ('cleared' | 'current' | 'locked')[] {
  return Array.from({ length: 8 }, (_, i) => {
    const n = 3 + i
    if (n < difficulty) return 'cleared'
    return n === difficulty ? 'current' : 'locked'
  })
}
// "Live" is presence, not persistence: a room record outlives its squad by up
// to 30 days, so the label follows the connected-seat list from the server.
// A pinned room already carries its own SAVED chip.
function presenceLabel(dive: OnlineDive): string {
  if (dive.online.length === 0) {
    return 'Idle room'
  }
  return dive.online.length === 1 ? 'Live · 1 diver' : `Live · ${dive.online.length} divers`
}
</script>

<template>
  <section
    class="record"
    aria-labelledby="rec-h"
  >
    <header class="rec-head">
      <h2
        id="rec-h"
        class="lbl"
      >
        Service record
      </h2>
      <span
        v-if="!loading"
        class="disp rec-count"
      >{{ count }}</span>
      <span class="dash" />
      <span class="cap">Pick up where the squad left off</span>
    </header>

    <p
      v-if="loading"
      class="muted small rec-loading"
    >
      Checking for live dives…
    </p>
    <ul
      v-else
      class="rc-list"
    >
      <li
        v-for="dive in online"
        :key="dive.code"
        class="record-card"
        :class="{ live: dive.online.length > 0 }"
      >
        <template v-if="dive.state">
          <img
            class="rc-emblem"
            :src="difficultyImageUrl(dive.state.difficulty)"
            alt=""
            width="56"
            height="56"
          >
          <div class="rc-main">
            <div class="rc-tags">
              <span
                class="rc-live"
                :class="{ idle: dive.online.length === 0 }"
                :title="dive.online.length > 0
                  ? `${dive.online.length} diver(s) connected right now`
                  : 'No divers connected — the room is still kept on the server'"
              >
                <span
                  v-if="dive.online.length > 0"
                  class="pulse rc-dot"
                  aria-hidden="true"
                />
                <span>{{ presenceLabel(dive) }} {{ dive.code }}</span>
              </span>
              <span
                v-if="dive.saved"
                class="chip gold"
                :title="`Saved as “${dive.saved.name}” — kept past the idle timeout`"
              >saved</span>
              <span
                class="rc-squad"
                role="img"
                :aria-label="`Squad: ${dive.state.divers.map(d => d.name).join(', ')}`"
              >
                <span
                  v-for="d in dive.state.divers"
                  :key="d.id"
                  class="rc-avatar disp"
                  :class="{ host: d.id === dive.state.hostId }"
                >{{ d.name.slice(0, 1).toUpperCase() }}</span>
              </span>
            </div>
            <span class="rc-name">{{ crusadeName(dive.state) }}</span>
            <span class="rc-diff"><b class="disp">{{ dive.state.difficulty }}</b>{{ difficultyName(dive.state.difficulty) }}<i>{{ opLine(dive.state) }}</i></span>
            <span
              class="rc-ladder"
              role="img"
              :aria-label="`Ladder: on difficulty ${dive.state.difficulty} of 10`"
            ><i
              v-for="(c, i) in ladderCells(dive.state.difficulty)"
              :key="i"
              :class="c"
            /></span>
          </div>
          <div class="rc-actions">
            <NuxtLink
              class="btn primary cut-sm rc-btn"
              :to="`/dive/${dive.code}`"
            >RESUME</NuxtLink>
            <button
              v-if="mirroredCodes.has(dive.code)"
              class="btn ghost rc-btn"
              type="button"
              :disabled="hosting"
              @click="emit('hostLive', dive)"
            >
              NEW SESSION
            </button>
          </div>
        </template>
        <div
          v-else
          class="rc-unreachable"
        >
          <span class="mono rc-code">{{ dive.code }}</span>
          <span class="muted small">Unreachable right now — the dive server may be down.</span>
          <button
            class="btn ghost tiny"
            type="button"
            @click="emit('forget', dive.code)"
          >
            Forget
          </button>
        </div>
      </li>

      <li
        v-for="save in sessions"
        :key="save.roomCode"
        class="record-card"
      >
        <img
          class="rc-emblem"
          :src="difficultyImageUrl(save.state.difficulty)"
          alt=""
          width="56"
          height="56"
        >
        <div class="rc-main">
          <div class="rc-tags">
            <span class="rc-tag">Session save · {{ save.roomCode }}</span>
          </div>
          <span class="rc-name">{{ save.slotName }}</span>
          <span class="rc-diff"><b class="disp">{{ save.state.difficulty }}</b>{{ difficultyName(save.state.difficulty) }}<i>{{ opLine(save.state) }}</i></span>
          <span
            class="rc-ladder"
            role="img"
            :aria-label="`Ladder: on difficulty ${save.state.difficulty} of 10`"
          ><i
            v-for="(c, i) in ladderCells(save.state.difficulty)"
            :key="i"
            :class="c"
          /></span>
        </div>
        <div class="rc-actions">
          <button
            class="btn primary cut-sm rc-btn"
            type="button"
            :disabled="hosting"
            @click="emit('hostSession', save)"
          >
            HOST
          </button>
          <span class="rc-icons">
            <button
              class="icon-btn rc-icon"
              type="button"
              :aria-label="`Export ${save.slotName}`"
              @click="emit('exportSession', save.roomCode)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              ><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
            </button>
            <button
              class="icon-btn rc-icon danger"
              type="button"
              :aria-label="`Delete ${save.slotName}`"
              @click="emit('removeSession', save.roomCode)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              ><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </span>
        </div>
      </li>

      <li
        v-for="{ id, doc } in slots"
        :key="id"
        class="record-card"
      >
        <img
          class="rc-emblem"
          :src="difficultyImageUrl(doc.state.difficulty)"
          alt=""
          width="56"
          height="56"
        >
        <div class="rc-main">
          <div class="rc-tags">
            <span class="rc-tag">Local save</span>
            <span
              v-if="doc.state.achieved"
              class="chip gold"
            >ACHIEVED</span>
          </div>
          <span class="rc-name">{{ crusadeName(doc.state) }}</span>
          <span class="rc-diff"><b class="disp">{{ doc.state.difficulty }}</b>{{ difficultyName(doc.state.difficulty) }}<i>{{ opLine(doc.state) }}</i></span>
          <span
            class="rc-ladder"
            role="img"
            :aria-label="`Ladder: on difficulty ${doc.state.difficulty} of 10`"
          ><i
            v-for="(c, i) in ladderCells(doc.state.difficulty)"
            :key="i"
            :class="c"
          /></span>
        </div>
        <div class="rc-actions">
          <NuxtLink
            class="btn primary cut-sm rc-btn"
            :to="`/dive/${id}`"
          >OPEN</NuxtLink>
          <button
            class="btn ghost rc-btn"
            type="button"
            :disabled="hosting"
            @click="emit('hostLocal', doc)"
          >
            HOST
          </button>
          <span class="rc-icons">
            <button
              class="icon-btn rc-icon"
              type="button"
              :aria-label="`Export ${doc.slotName}`"
              @click="emit('exportSlot', id)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              ><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
            </button>
            <button
              class="icon-btn rc-icon danger"
              type="button"
              :aria-label="`Delete ${doc.slotName}`"
              @click="emit('removeSlot', id)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              ><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.record {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: var(--rec-max, none);
  border: 1px solid var(--line-3);
  border-top: 2px solid var(--gold);
  background:
    radial-gradient(90% 40% at 100% 0%, rgba(255, 214, 66, 0.06), transparent 70%),
    color-mix(in srgb, var(--panel) 94%, transparent);
  container-type: inline-size;
}
.rec-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--line-2);
}
.rec-head h2 { margin: 0; color: var(--gold); white-space: nowrap; }
.rec-count { font-size: 18px; line-height: 1; color: var(--text); }
.rec-head .dash { flex-grow: 1; min-width: 12px; }
.rec-head .cap { color: var(--muted); white-space: nowrap; }
.rec-loading { margin: 0; padding: 18px; }

.rc-list {
  list-style: none;
  margin: 0;
  padding: 10px;
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--line-4) transparent;
  scrollbar-width: thin;
}

.record-card {
  position: relative;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px 14px 14px 16px;
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--line-4);
  background: var(--rail);
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.record-card:hover { border-color: var(--line-4); background: var(--panel); }
.record-card.live {
  border-left-color: var(--teal);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--teal) 8%, transparent), transparent 45%),
    var(--panel);
}
.rc-emblem { width: 56px; height: 56px; object-fit: contain; }
.rc-main { display: grid; gap: 5px; min-width: 0; }
.rc-tags { display: flex; align-items: center; gap: 8px; min-height: 22px; flex-wrap: wrap; }
.rc-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 20px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--teal) 50%, transparent);
  background: color-mix(in srgb, var(--teal) 8%, transparent);
  color: var(--teal);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.rc-live.idle {
  border-color: var(--line-3);
  background: transparent;
  color: var(--muted);
}
.rc-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); }
.rc-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.rc-squad { display: flex; gap: 3px; }
.rc-avatar {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  font-size: 10px;
  background: var(--line-2);
  color: var(--text);
}
.rc-avatar.host { background: var(--gold); color: var(--on-gold); }
.rc-name {
  overflow: hidden;
  text-transform: uppercase;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text);
}
.rc-diff {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
}
.rc-diff b { font-size: 16px; }
.rc-diff i { font-style: normal; color: var(--khaki); }
.rc-ladder { display: flex; gap: 3px; max-width: 220px; margin-top: 2px; }
.rc-ladder i { flex: 1 1 0; height: 4px; background: var(--line-2); }
.rc-ladder i.cleared { background: var(--khaki); }
.rc-ladder i.current { background: var(--gold); box-shadow: 0 0 8px rgba(255, 214, 66, 0.5); }

.rc-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  min-width: 11rem;
}
.rc-actions > :first-child { grid-column: 1 / -1; }
.live .rc-actions .rc-btn { grid-column: 1 / -1; }
.rc-btn {
  height: 38px;
  padding: 0 14px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  white-space: nowrap;
}
.rc-icons { display: flex; justify-content: flex-end; gap: 4px; }
.rc-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-2);
  color: var(--khaki);
}
.rc-icon.danger:hover { color: var(--red); border-color: var(--red); }
.rc-unreachable { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rc-code { color: var(--gold); font-weight: 700; letter-spacing: 0.18em; }

/* A narrow record stacks each card's actions under it, in one row. */
@container (max-width: 440px) {
  .rec-head .cap { display: none; }
  .record-card { grid-template-columns: 44px minmax(0, 1fr); gap: 12px; }
  .rc-emblem { width: 44px; height: 44px; align-self: start; }
  .rc-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; min-width: 0; }
  .rc-btn { flex: 1 1 0; }
  .rc-icons { margin-left: auto; }
}
</style>
