<script setup lang="ts">
import type { SteamLobbyInfo } from '~~/shared/types/messages'
import { normalizeSteamLobbyLink } from '~~/shared/utils/steam-lobby'

const props = defineProps<{
  steam: SteamLobbyInfo | null
}>()

const emit = defineEmits<{ setSteam: [link: string] }>()

const { push: pushToast } = useToasts()

const editing = ref(false)
const draft = ref('')

const showEditor = computed(() => !props.steam || editing.value)
const normalized = computed(() => normalizeSteamLobbyLink(draft.value))
const invalid = computed(() => draft.value.trim().length > 0 && !normalized.value)

function startEdit(): void {
  draft.value = props.steam?.link ?? ''
  editing.value = true
}

function cancel(): void {
  editing.value = false
  draft.value = ''
}

function save(): void {
  if (!normalized.value) {
    return
  }
  emit('setSteam', normalized.value)
  editing.value = false
  draft.value = ''
}

function clear(): void {
  emit('setSteam', '')
  editing.value = false
  draft.value = ''
}

function copy(): void {
  if (!props.steam || !navigator.clipboard?.writeText) {
    return
  }
  navigator.clipboard.writeText(props.steam.link)
    .then(() => pushToast('Steam lobby link copied'))
    .catch(() => pushToast('Could not copy the link', 'warn'))
}
</script>

<template>
  <section
    class="steam"
    aria-labelledby="steam-h"
  >
    <div class="steam-h">
      <IconSteam class="steam-glyph" />
      <h2
        id="steam-h"
        class="lbl steam-lbl"
      >
        Steam Lobby
      </h2>
      <span class="dash" />
    </div>

    <template v-if="steam && !showEditor">
      <a
        class="join cut-sm"
        :href="steam.link"
        rel="noopener"
      >
        <IconSteam class="join-glyph" />
        <span class="join-text">
          <span class="join-label">Join Lobby</span>
          <span class="join-sub">Steam link</span>
        </span>
        <svg
          class="join-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          aria-hidden="true"
        ><path d="M7 17L17 7M9 7h8v8" /></svg>
      </a>
      <div class="steam-actions">
        <button
          class="steam-btn"
          type="button"
          @click="copy"
        >
          Copy link
        </button>
        <button
          class="steam-btn"
          type="button"
          @click="startEdit"
        >
          Change
        </button>
        <button
          class="steam-btn danger"
          type="button"
          @click="clear"
        >
          Clear
        </button>
      </div>
    </template>

    <form
      v-else
      class="steam-editor"
      @submit.prevent="save"
    >
      <label
        class="sr-only"
        for="steam-link"
      >Steam lobby link</label>
      <input
        id="steam-link"
        v-model="draft"
        class="steam-input"
        type="text"
        inputmode="url"
        autocomplete="off"
        spellcheck="false"
        placeholder="steam://joinlobby/553850/…"
        @keydown.esc="cancel"
      >
      <p
        v-if="invalid"
        class="steam-hint err"
      >
        Not a Helldivers 2 lobby link.
      </p>
      <p
        v-else
        class="steam-hint"
      >
        Paste the <code>steam://joinlobby/…</code> link from your in-game lobby.
      </p>
      <div class="steam-actions">
        <button
          class="steam-btn primary"
          type="submit"
          :disabled="!normalized"
        >
          Pin lobby
        </button>
        <button
          v-if="editing"
          class="steam-btn"
          type="button"
          @click="cancel"
        >
          Cancel
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
/* Steam flair on the terminal frame: the palette lifts from Steam's own
   storefront nav — deep navy ground, mid-blue seams, the signature pale-blue
   accent. Structure stays Griffdive (cut shapes, dash rules, uppercase labels),
   only the surface reads "Steam". */
.steam {
  --steam-deep: #171a21;
  --steam-bg: #1b2838;
  --steam-mid: #2a475e;
  --steam-blue: #66c0f4;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px 14px;
  border: 1px solid var(--steam-mid);
  background: linear-gradient(165deg, var(--steam-bg) 0%, var(--steam-deep) 100%);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  overflow: hidden;
}
/* A faint top seam in the Steam blues, echoing the storefront's gradient bar. */
.steam::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, var(--steam-blue), transparent 72%);
  opacity: 0.7;
}

.steam-h { display: flex; align-items: center; gap: 8px; }

.steam-glyph { width: 15px; height: 15px; color: var(--steam-blue); flex-shrink: 0; }
.steam-lbl { color: var(--steam-blue); }
.steam-h .dash { flex-grow: 1; }

/* The join card: a Steam-blue button that fills the rail. */
.join {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(180deg, #67c1f5 0%, #417a9b 100%);
  color: var(--steam-deep);
  text-decoration: none;
  transition: filter var(--dur-fast) var(--ease-out), transform 0.08s;
}
.join:hover { filter: brightness(1.08); color: var(--steam-deep); text-decoration: none; }
.join:active { transform: translateY(1px); }
.join-glyph { width: 20px; height: 20px; flex-shrink: 0; }
.join-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex-grow: 1; }
.join-label {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.05;
  white-space: nowrap;
}
.join-sub {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.75;
}
.join-arrow { width: 15px; height: 15px; flex-shrink: 0; }

.steam-editor { display: flex; flex-direction: column; gap: 8px; }
.steam-input {
  width: 100%;
  padding: 8px 10px;
  background: var(--steam-deep);
  border: 1px solid var(--steam-mid);
  color: var(--text);
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.03em;
}
.steam-input::placeholder { color: var(--dim); }
.steam-input:focus { outline: none; border-color: var(--steam-blue); box-shadow: none; }

.steam-hint { margin: 0; font-size: 10px; line-height: 1.45; color: var(--muted); }
.steam-hint code { color: var(--steam-blue); font-size: 9.5px; }
.steam-hint.err { color: var(--red); }

.steam-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.steam-btn {
  flex: 1 1 auto;
  padding: 6px 10px;
  border: 1px solid var(--steam-mid);
  background: transparent;
  color: var(--steam-blue);
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast), color var(--dur-fast);
}
.steam-btn:hover:not(:disabled) { border-color: var(--steam-blue); background: rgba(102, 192, 244, 0.1); }
.steam-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.steam-btn.primary {
  background: linear-gradient(180deg, #67c1f5 0%, #417a9b 100%);
  color: var(--steam-deep);
  border-color: transparent;
}
.steam-btn.primary:hover:not(:disabled) { filter: brightness(1.08); background: linear-gradient(180deg, #67c1f5 0%, #417a9b 100%); }
.steam-btn.danger { color: var(--red); }
.steam-btn.danger:hover:not(:disabled) { border-color: var(--red); background: rgba(255, 75, 62, 0.1); }

@media (prefers-reduced-motion: reduce) {
  .join:active { transform: none; }
}
</style>
