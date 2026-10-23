<script setup lang="ts">
import type { SteamLobbyInfo } from '~~/shared/types/messages'
import { normalizeSteamLobbyLink } from '~~/shared/utils/steam-lobby'

const props = defineProps<{
  steam: SteamLobbyInfo | null
}>()

const emit = defineEmits<{ setSteam: [link: string], close: [] }>()

const { push: pushToast } = useToasts()

const titleId = useId()
const inputId = useId()
const hintId = useId()

const editing = ref(false)
const draft = ref('')
const input = ref<HTMLInputElement | null>(null)
const joinLink = ref<HTMLAnchorElement | null>(null)
const saving = ref(false)

const normalized = computed(() => normalizeSteamLobbyLink(draft.value))
const invalid = computed(() => draft.value.trim().length > 0 && !normalized.value)

// The save round-trip replaces the focused control with the join card; move
// focus to the result rather than dropping it on the document.
watch(() => props.steam, (steam) => {
  if (saving.value && steam) {
    saving.value = false
    nextTick(() => joinLink.value?.focus())
  }
})

function focusInput(): void {
  nextTick(() => input.value?.focus())
}

function startEdit(): void {
  draft.value = props.steam?.link ?? ''
  editing.value = true
  focusInput()
}

function cancel(): void {
  editing.value = false
  draft.value = ''
}

function save(): void {
  if (!normalized.value) {
    return
  }
  saving.value = true
  emit('setSteam', normalized.value)
  editing.value = false
}

function clear(): void {
  emit('setSteam', '')
  emit('close')
}

function copy(): void {
  if (!props.steam || !navigator.clipboard?.writeText) {
    return
  }
  navigator.clipboard.writeText(props.steam.link)
    .then(() => pushToast('Steam lobby link copied'))
    .catch(() => pushToast('Could not copy the link', 'warn'))
}

function onEscape(): void {
  if (editing.value) {
    cancel()
    return
  }
  emit('close')
}

onMounted(() => {
  if (!props.steam) {
    focusInput()
  }
})
</script>

<template>
  <section
    id="steam-lobby-bar"
    class="steam-bar"
    :aria-labelledby="titleId"
    @keydown.esc="onEscape"
  >
    <div class="steam-bar-inner">
      <div class="steam-id">
        <IconSteam class="steam-glyph" />
        <h2
          :id="titleId"
          class="lbl steam-lbl"
        >
          Steam Lobby
        </h2>
      </div>

      <template v-if="steam && !editing">
        <a
          ref="joinLink"
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
            Remove
          </button>
        </div>
      </template>

      <form
        v-else
        class="steam-editor"
        @submit.prevent="save"
      >
        <div class="steam-field">
          <label
            class="sr-only"
            :for="inputId"
          >Steam lobby link</label>
          <input
            :id="inputId"
            ref="input"
            v-model="draft"
            class="steam-input"
            type="text"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            placeholder="steam://joinlobby/553850/…"
            :aria-invalid="invalid || undefined"
            :aria-describedby="invalid ? hintId : undefined"
          >
          <p
            v-if="invalid"
            :id="hintId"
            class="steam-hint err"
          >
            Not a Helldivers 2 lobby link.
          </p>
        </div>
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

      <button
        class="steam-close"
        type="button"
        aria-label="Close Steam lobby"
        @click="emit('close')"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        ><path d="M3 3l10 10M13 3L3 13" /></svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Steam flair on the dock: the palette lifts from Steam's own storefront nav —
   deep navy ground, mid-blue seams, the signature pale-blue accent. Structure
   stays Griffdive (cut shapes, uppercase labels), only the surface reads
   "Steam". */
.steam-bar {
  --steam-deep: #171a21;
  --steam-bg: #1b2838;
  --steam-mid: #2a475e;
  --steam-blue: #66c0f4;

  position: relative;
  border-top: 1px solid var(--steam-mid);
  border-bottom: 1px solid var(--steam-mid);
  background: linear-gradient(100deg, var(--steam-bg) 0%, var(--steam-deep) 72%);
  overflow: hidden;
}
/* A faint top seam in the Steam blues, echoing the storefront's gradient bar. */
.steam-bar::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, var(--steam-blue), transparent 72%);
  opacity: 0.7;
}

.steam-bar-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  width: 100%;
  max-width: 1180px;
  min-height: 60px;
  margin-inline: auto;
  padding: 9px var(--pad-page);
}

.steam-id {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding-right: 12px;
  border-right: 1px solid var(--steam-mid);
}
.steam-glyph { width: 18px; height: 18px; color: var(--steam-blue); flex-shrink: 0; }
.steam-lbl { margin: 0; color: var(--steam-blue); }

/* The join card keeps the card's Steam-blue treatment, just inline. */
.join {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 42px;
  padding: 6px 11px;
  background: linear-gradient(180deg, #67c1f5 0%, #417a9b 100%);
  color: var(--steam-deep);
  text-decoration: none;
  transition: filter var(--dur-fast) var(--ease-out), transform 0.08s;
}
.join:hover { filter: brightness(1.08); color: var(--steam-deep); text-decoration: none; }
.join:active { transform: translateY(1px); }
.join-glyph { width: 18px; height: 18px; flex-shrink: 0; }
.join-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.join-label {
  font-family: var(--font-display);
  font-size: 12px;
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
.join-arrow { width: 14px; height: 14px; flex-shrink: 0; }

.steam-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1 1 360px;
  min-width: 0;
}
.steam-field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 240px;
  min-width: 0;
}
.steam-input {
  width: 100%;
  min-height: 42px;
  padding: 7px 10px;
  background: var(--steam-deep);
  border: 1px solid var(--steam-mid);
  color: var(--text);
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.03em;
}
.steam-input::placeholder { color: var(--dim); }
.steam-input:focus { outline: none; border-color: var(--steam-blue); box-shadow: none; }

.steam-hint {
  flex: 0 1 auto;
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--red);
  white-space: nowrap;
}

.steam-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.steam-editor .steam-actions { flex: 0 0 auto; }
.steam-btn {
  min-height: 34px;
  padding: 0 10px;
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

.steam-close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-left: auto;
  padding: 0;
  border: 0;
  background: none;
  color: var(--steam-blue);
  cursor: pointer;
  transition: background-color var(--dur-fast), color var(--dur-fast);
}
.steam-close:hover { background: rgba(102, 192, 244, 0.1); color: var(--text); }
.steam-close svg { width: 14px; height: 14px; }

@media (max-width: 640px) {
  .steam-id { order: 0; border-right: 0; padding-right: 0; }
  .steam-close { order: 1; margin-left: auto; }
  .steam-editor { order: 2; flex-basis: 100%; }
  .join { order: 2; flex: 1 1 100%; }
  .steam-actions { order: 3; flex: 0 0 auto; }
  .steam-field { flex-basis: 100%; }
  .steam-editor .steam-actions { width: 100%; }
  .steam-editor .steam-btn { flex: 1 1 auto; }
  .steam-btn { flex: 1 1 auto; }
}

@media (prefers-reduced-motion: reduce) {
  .join:active { transform: none; }
}
</style>
