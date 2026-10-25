<script setup lang="ts">
import { isRoomCode } from '~~/shared/utils/room-code'

// The drop console: every way onto the Destroyer in one lit panel — host a
// squad, join one by code, or drop solo. The callsign is filed on the host
// tutorial that follows, never here. The ship's tools (save import, support and
// the repo) sit under the panel as quiet icon buttons; the run's setup hangs off
// the solo half.
defineProps<{
  hosting: boolean
  setupLabel: string
}>()

const emit = defineEmits<{
  host: []
  join: [code: string]
  solo: []
  setup: []
  import: [event: Event]
}>()

const joinCode = ref('')
const codeFocused = ref(false)

function cleanCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}
const codeLen = computed(() => joinCode.value.length)
const codeCells = computed(() =>
  Array.from({ length: 6 }, (_, i) => ({
    ch: joinCode.value[i] ?? '',
    active: i === Math.min(codeLen.value, 5) && codeLen.value < 6,
  })))

function join(): void {
  if (isRoomCode(joinCode.value)) {
    emit('join', joinCode.value)
  }
}
</script>

<template>
  <div class="deploy-wrap">
    <section
      id="deploy"
      class="deploy"
      aria-label="Deploy"
      tabindex="-1"
    >
      <span
        class="deploy-edge hazard"
        aria-hidden="true"
      />
      <button
        class="host-btn cut cta-sweep"
        type="button"
        :disabled="hosting"
        aria-label="Host an online dive"
        @click="emit('host')"
      >
        <span class="host-copy">
          <span class="disp host-label">{{ hosting ? 'Opening dive…' : 'Host a squad dive' }}</span>
          <span class="host-sub">1–4 divers · live-synced · invite only</span>
        </span>
        <span
          class="host-chev"
          aria-hidden="true"
        >
          <span class="pod-pips"><i class="on" /><i /><i /><i /></span>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.6"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </button>

      <div class="deploy-split">
        <form
          class="join"
          @submit.prevent="join"
        >
          <div class="row-head">
            <label
              for="room-code"
              class="lbl"
            >Join a squad</label>
            <span
              class="join-count"
              :class="{ full: codeLen === 6 }"
              aria-hidden="true"
            >{{ codeLen }}/6</span>
          </div>
          <div class="join-row">
            <div class="code-wrap">
              <div
                class="code-cells"
                aria-hidden="true"
              >
                <span
                  v-for="(c, i) in codeCells"
                  :key="i"
                  class="code-cell"
                  :class="{ filled: c.ch, active: c.active && codeFocused }"
                >
                  <span class="disp code-ch">{{ c.ch }}</span>
                  <span
                    v-if="c.active"
                    class="code-caret"
                    :class="{ blink: codeFocused }"
                  />
                </span>
              </div>
              <input
                id="room-code"
                class="code-in"
                type="text"
                :value="joinCode"
                maxlength="6"
                autocomplete="off"
                spellcheck="false"
                autocapitalize="characters"
                aria-label="Room code"
                aria-describedby="room-code-hint"
                @input="joinCode = cleanCode(($event.target as HTMLInputElement).value)"
                @focus="codeFocused = true"
                @blur="codeFocused = false"
              >
            </div>
            <button
              class="btn primary cut-sm join-btn"
              type="submit"
              :disabled="codeLen < 6"
            >
              <span class="disp">Join</span>
            </button>
          </div>
          <span
            id="room-code-hint"
            class="sr-only"
          >Six letters or digits from the host's invite</span>
        </form>

        <div class="solo">
          <div class="row-head">
            <span class="lbl">Play solo</span>
            <button
              class="setup-link"
              type="button"
              aria-haspopup="dialog"
              :aria-label="setupLabel"
              @click="emit('setup')"
            >
              Run setup
            </button>
          </div>
          <button
            class="btn ghost cut-sm solo-drop"
            type="button"
            @click="emit('solo')"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            ><path d="M12 3v11M7 10l5 5 5-5M6 21h12" /></svg>
            <span class="disp">Solo drop</span>
          </button>
        </div>
      </div>
    </section>

    <nav
      class="tools"
      aria-label="Ship tools"
    >
      <a
        class="tool"
        href="https://ko-fi.com/griffdive"
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconKofi class="tool-icon" />
        <span>Support on Ko-fi</span>
      </a>
      <a
        class="tool"
        href="https://github.com/parion/griffdive"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Star Griffdive on GitHub"
      >
        <IconStar class="tool-icon star" />
        <span aria-hidden="true">Star on GitHub</span>
      </a>
      <label class="tool">
        <input
          type="file"
          accept="application/json"
          class="file-in"
          aria-label="Import save"
          @change="emit('import', $event)"
        >
        <svg
          class="tool-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        ><path d="M12 15V3M7 8l5-5 5 5M4 15v5h16v-5" /></svg>
        <span aria-hidden="true">Import save</span>
      </label>
    </nav>
  </div>
</template>

<style scoped>
.deploy {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  padding: 20px 20px 14px 26px;
  border: 1px solid var(--line-3);
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(255, 214, 66, 0.06), transparent 60%),
    color-mix(in srgb, var(--panel) 94%, transparent);
  container-type: inline-size;
}
.deploy:focus { outline: none; }
.deploy-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }

.host-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 16px 20px;
  border: 0;
  background: var(--gold);
  color: var(--on-gold);
  text-align: left;
  cursor: pointer;
  filter: drop-shadow(0 0 22px rgba(255, 214, 66, 0.2));
  transition: filter var(--dur-fast);
}
.host-btn:hover:not(:disabled) { filter: brightness(1.08) drop-shadow(0 0 26px rgba(255, 214, 66, 0.3)); }
.host-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.host-copy { display: grid; gap: 2px; min-width: 0; }
.host-label { font-size: clamp(18px, 1.7vw, 24px); line-height: 1.1; }
.host-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.72; }
.host-chev { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.pod-pips { display: flex; gap: 3px; }
.pod-pips i { width: 9px; height: 9px; border: 2px solid var(--on-gold); }
.pod-pips i.on { background: var(--on-gold); }
@media (max-width: 480px) {
  .deploy { padding: 16px 14px 12px 20px; }
}
@container (max-width: 420px) {
  .host-btn { padding: 14px 16px; }
  .pod-pips { display: none; }
}

.deploy-split { display: grid; gap: 16px; }
@container (min-width: 560px) {
  .deploy-split { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; }
  .solo { padding-left: 20px; border-left: 1px dashed var(--line-3); }
}
.row-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.row-head .cap { color: var(--muted); }
.setup-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--khaki);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
}
.setup-link:hover { color: var(--gold); }

.join-row { display: flex; gap: 6px; }
.join-count { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted); }
.join-count.full { color: var(--gold); }
.code-wrap { position: relative; flex-grow: 1; min-width: 0; height: 48px; }
.code-cells { position: absolute; inset: 0; display: flex; gap: 3px; }
.code-cell:nth-child(3) { margin-right: 6px; }
.code-cell {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: grid;
  place-items: center;
  background: var(--ground);
  border: 1px solid var(--line-2);
  border-bottom: 2px solid var(--line-3);
}
.code-cell.filled { background: var(--raised); border-color: var(--line-5); }
.code-cell.active { border-color: var(--gold); }
.code-ch { font-size: 18px; color: var(--text); }
.code-caret {
  position: absolute;
  left: 50%;
  bottom: 9px;
  width: 12px;
  height: 2px;
  margin-left: -6px;
  background: var(--line-5);
}
.code-caret.blink { background: var(--gold); animation: blinkc 1s steps(1) infinite; }
.code-in {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  font-size: 16px;
  cursor: text;
}
.code-in:focus { outline: none; }
.code-in::selection { background: transparent; }
.join-btn { flex-shrink: 0; width: 76px; display: grid; place-items: center; }
.join-btn .disp { font-size: 14px; }

.solo-drop {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-color: var(--gold);
  color: var(--gold);
}
.solo-drop .disp { font-size: 14px; }
.solo-drop:hover:not(:disabled) { border-color: var(--gold); background: rgba(255, 214, 66, 0.08); color: var(--gold); }

.deploy-wrap { display: grid; gap: 10px; min-width: 0; }

.tools { display: flex; flex-wrap: wrap; gap: 6px; }
.tool {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px 0 10px;
  border: 1px solid transparent;
  background: none;
  color: var(--khaki);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast);
}
.tool { text-decoration: none; }
.tool-icon.star { color: var(--gold); }
.tool:hover { border-color: var(--line-3); background: var(--rail); color: var(--gold); }
.tool:focus-within { outline: 2px solid var(--gold); outline-offset: 2px; }
.tool-icon { width: 18px; height: 18px; flex-shrink: 0; }
@media (max-width: 480px) {
  .tools { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
  .tool { flex-direction: column; justify-content: center; gap: 4px; height: 56px; padding: 0 4px; font-size: 10px; letter-spacing: 0.1em; text-align: center; }
}
.file-in {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
