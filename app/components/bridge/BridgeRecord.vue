<script setup lang="ts">
import { missionsPerOperation } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import type { CrusadeVariant, DiveState } from '~~/shared/engine/types'
import type { DiveSaveInfo } from '~~/shared/types/messages'
import type { SaveDoc, SessionSave } from '~~/shared/types/save'

export interface OnlineDive { code: string, state: DiveState | null, saved: DiveSaveInfo | null }

// The service record: every crusade this browser can pick back up — live rooms,
// session mirrors whose room is gone, and local solo saves.
defineProps<{
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

function opNumber(state: DiveState): number {
  return catchUpOpsBehind(state.difficulty, state.settings?.variant ?? 'medium') + 1
}
function ladderCells(difficulty: number): ('cleared' | 'current' | 'locked')[] {
  return Array.from({ length: 8 }, (_, i) => {
    const n = 3 + i
    if (n < difficulty) return 'cleared'
    return n === difficulty ? 'current' : 'locked'
  })
}
</script>

<template>
  <section
    class="record"
    aria-labelledby="rec-h"
  >
    <div class="sec-h">
      <h2
        id="rec-h"
        class="lbl"
      >
        Service record
      </h2>
      <span class="dash" />
      <span class="cap">Pick up where the squad left off</span>
    </div>

    <p
      v-if="loading"
      class="muted small"
    >
      Checking for live dives…
    </p>
    <ul
      v-else
      class="rc-grid"
    >
      <li
        v-for="dive in online"
        :key="dive.code"
        class="record-card live"
      >
        <template v-if="dive.state">
          <div class="rc-head">
            <span class="rc-live"><span
              class="pulse rc-dot"
              aria-hidden="true"
            />Live room {{ dive.code }}</span>
            <span
              v-if="dive.saved"
              class="chip gold"
              :title="`Saved as “${dive.saved.name}” — kept past the idle timeout`"
            >saved</span>
            <div
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
            </div>
          </div>
          <div class="rc-body">
            <img
              class="rc-emblem"
              :src="difficultyImageUrl(dive.state.difficulty)"
              alt=""
              width="44"
              height="44"
            >
            <div class="rc-meta">
              <span class="rc-name">{{ upperName(dive.state.divers[0]?.name) ?? 'Crusade' }} · {{ VARIANT_LABELS[dive.state.settings?.variant ?? 'medium'] }}</span>
              <span class="rc-diffname"><b class="disp">{{ dive.state.difficulty }}</b> {{ difficultyName(dive.state.difficulty) }}</span>
              <div class="rc-op">
                <span>Op {{ opNumber(dive.state) }}</span>
                <span
                  class="rc-pips"
                  aria-hidden="true"
                ><i
                  v-for="i in missionsPerOperation(dive.state.difficulty)"
                  :key="i"
                  :class="{ on: i <= dive.state.missionInOperation }"
                /></span>
                <span>M{{ dive.state.missionInOperation }}/{{ missionsPerOperation(dive.state.difficulty) }}</span>
              </div>
            </div>
          </div>
          <div
            class="rc-ladder"
            role="img"
            :aria-label="`Ladder: on difficulty ${dive.state.difficulty} of 10`"
          >
            <i
              v-for="(c, i) in ladderCells(dive.state.difficulty)"
              :key="i"
              :class="c"
            />
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
        <div class="rc-head">
          <span class="rc-tag">Session save · {{ save.roomCode }}</span>
        </div>
        <div class="rc-body">
          <img
            class="rc-emblem"
            :src="difficultyImageUrl(save.state.difficulty)"
            alt=""
            width="44"
            height="44"
          >
          <div class="rc-meta">
            <span class="rc-name">{{ save.slotName }}</span>
            <span class="rc-diffname"><b class="disp">{{ save.state.difficulty }}</b> {{ difficultyName(save.state.difficulty) }}</span>
          </div>
        </div>
        <div
          class="rc-ladder"
          role="img"
          :aria-label="`Ladder: on difficulty ${save.state.difficulty} of 10`"
        >
          <i
            v-for="(c, i) in ladderCells(save.state.difficulty)"
            :key="i"
            :class="c"
          />
        </div>
        <div class="rc-actions">
          <button
            class="btn ghost rc-btn"
            type="button"
            :disabled="hosting"
            @click="emit('hostSession', save)"
          >
            HOST
          </button>
          <span class="grow" />
          <button
            class="icon-btn rc-icon"
            type="button"
            :aria-label="`Export ${save.slotName}`"
            @click="emit('exportSession', save.roomCode)"
          >
            <svg
              width="18"
              height="18"
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
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              aria-hidden="true"
            ><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </li>

      <li
        v-for="{ id, doc } in slots"
        :key="id"
        class="record-card"
      >
        <div class="rc-head">
          <span class="rc-tag">Local save</span>
          <span
            v-if="doc.state.achieved"
            class="chip gold"
          >ACHIEVED</span>
        </div>
        <div class="rc-body">
          <img
            class="rc-emblem"
            :src="difficultyImageUrl(doc.state.difficulty)"
            alt=""
            width="44"
            height="44"
          >
          <div class="rc-meta">
            <span class="rc-name">{{ doc.slotName }}</span>
            <span class="rc-diffname"><b class="disp">{{ doc.state.difficulty }}</b> {{ difficultyName(doc.state.difficulty) }}</span>
          </div>
        </div>
        <div
          class="rc-ladder"
          role="img"
          :aria-label="`Ladder: on difficulty ${doc.state.difficulty} of 10`"
        >
          <i
            v-for="(c, i) in ladderCells(doc.state.difficulty)"
            :key="i"
            :class="c"
          />
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
          <span class="grow" />
          <button
            class="icon-btn rc-icon"
            type="button"
            :aria-label="`Export ${doc.slotName}`"
            @click="emit('exportSlot', id)"
          >
            <svg
              width="18"
              height="18"
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
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              aria-hidden="true"
            ><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.record { display: grid; gap: 14px; }
.rc-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: var(--gap-grid);
}
.record-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--line-2);
  border-top: 2px solid var(--line-4);
  background: var(--rail);
}
.record-card.live {
  border-color: var(--line-4);
  border-top-color: var(--teal);
  background:
    radial-gradient(90% 60% at 100% 0%, color-mix(in srgb, var(--teal) 8%, transparent), transparent 70%),
    var(--panel);
}
.rc-head { display: flex; align-items: center; gap: 8px; min-height: 24px; flex-wrap: wrap; }
.rc-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--teal) 50%, transparent);
  background: color-mix(in srgb, var(--teal) 8%, transparent);
  color: var(--teal);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.rc-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); }
.rc-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.rc-squad { margin-left: auto; display: flex; gap: 3px; }
.rc-avatar {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  font-size: 11px;
  background: var(--line-2);
  color: var(--text);
}
.rc-avatar.host { background: var(--gold); color: var(--on-gold); }
.rc-body { display: flex; align-items: center; gap: 14px; min-width: 0; }
.rc-emblem { width: 44px; height: 44px; object-fit: contain; flex-shrink: 0; }
.rc-meta { display: grid; gap: 4px; min-width: 0; }
.rc-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rc-diffname { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); }
.rc-diffname b { margin-right: 4px; font-size: 16px; }
.rc-op { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--khaki); }
.rc-pips { display: flex; gap: 3px; }
.rc-pips i { width: 14px; height: 5px; border: 1px solid var(--line-5); }
.rc-pips i.on { background: var(--gold); border-color: var(--gold); }
.rc-ladder { display: flex; gap: 3px; }
.rc-ladder i { flex: 1 1 0; height: 4px; background: var(--line-2); }
.rc-ladder i.cleared { background: var(--khaki); }
.rc-ladder i.current { background: var(--gold); box-shadow: 0 0 8px rgba(255, 214, 66, 0.5); }
.rc-actions { display: flex; align-items: center; gap: 6px; margin-top: auto; }
.rc-btn {
  height: 40px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.rc-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-2);
  color: var(--khaki);
}
.rc-icon.danger:hover { color: var(--red); border-color: var(--red); }
.rc-unreachable { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rc-code { color: var(--gold); font-weight: 700; letter-spacing: 0.18em; }
</style>
