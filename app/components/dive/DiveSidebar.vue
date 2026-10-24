<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { bargainLamp, bargainsClosedReason } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'
import type { SidePanel } from '~/composables/useDrawers'

// The dive's permanent tool rail. Kit, Codex, Warbonds and Brasch's Bargains
// share one non-modal panel: on desktop it docks beside the stage with a slim
// tab rail at the right edge, on a phone the rail pins to the bottom and the
// panel rises over the stage. Nothing here is a rule; it only hosts the browsers.
const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  previewPactIds?: string[]
  sheet?: boolean
  fieldKit?: boolean
}>(), { previewPactIds: () => [], sheet: false, fieldKit: false })

const emit = defineEmits<{ buy: [itemId: string] }>()

const { sidePanel: panel, hostSidebar, releaseSidebar } = useDrawers()
onMounted(hostSidebar)
onBeforeUnmount(releaseSidebar)

const credits = computed(() => props.self?.credits ?? 0)
const bargainsClosed = computed(() => bargainsClosedReason(props.state))
const lamp = computed(() => (props.self ? bargainLamp(props.state, props.self) : 'off'))
const bargainsLabel = computed(() => {
  const base = `Brasch's Bargains, ${credits.value} credits`
  if (bargainsClosed.value) {
    return `${base} — ${bargainsClosed.value}`
  }
  return `${base}${lamp.value === 'restocked' ? ', restocked' : lamp.value === 'ready' ? ', something affordable in stock' : ''}`
})

const PANELS: Record<SidePanel, { title: string, description: string }> = {
  kit: { title: 'Kit', description: 'What each diver carries, with this mission\'s bans.' },
  codex: { title: 'Codex', description: 'Every item, tier and warbond in the catalog.' },
  warbonds: { title: 'Warbonds', description: 'Declare the warbonds you own — reward offers roll against your own catalog.' },
  bargains: { title: 'Brasch\'s Bargains', description: 'Earn credits by extracting samples from successful missions. Faster clears earn more.' },
}
const current = computed(() => (panel.value ? PANELS[panel.value] : null))

// The field opens the Kit for the squad, then puts the stage back when the
// beat ends — unless the diver has since picked a panel of their own.
const autoKit = ref(false)
watch(() => props.fieldKit, (field) => {
  if (field && panel.value === null) {
    panel.value = 'kit'
    autoKit.value = true
  }
  else if (!field && autoKit.value && panel.value === 'kit') {
    panel.value = null
  }
  if (!field) {
    autoKit.value = false
  }
}, { immediate: true })

function toggle(next: SidePanel): void {
  autoKit.value = false
  panel.value = panel.value === next ? null : next
}

// A phone's panel overlays the stage, so a tap anywhere off the dock puts it away.
const root = useTemplateRef<HTMLElement>('root')
onClickOutside(root, () => {
  if (props.sheet) {
    panel.value = null
  }
})

watch(bargainsClosed, (closed) => {
  if (closed && panel.value === 'bargains') {
    panel.value = null
  }
})
</script>

<template>
  <aside
    ref="root"
    class="dive-side"
    :class="{ sheet }"
    aria-label="Dive tools"
    @keydown.esc="panel = null"
  >
    <Transition name="side-panel">
      <section
        v-if="current"
        class="side-panel"
      >
        <header class="side-head">
          <span
            class="side-mark"
            aria-hidden="true"
          />
          <h2 class="side-title">
            {{ current.title }}
          </h2>
          <button
            class="side-hide"
            type="button"
            :aria-label="`Hide ${current.title.toLowerCase()}`"
            @click="panel = null"
          >
            Hide
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              aria-hidden="true"
            ><path
              :d="sheet ? 'M2 4l4 4 4-4' : 'M4 2l4 4-4 4'"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            /></svg>
          </button>
        </header>
        <p class="side-desc">
          {{ current.description }}
        </p>
        <div class="side-body">
          <KitPanel
            v-if="panel === 'kit'"
            :state="state"
            :self-id="selfId"
            :preview-pact-ids="previewPactIds"
          />
          <CodexBrowser v-else-if="panel === 'codex'" />
          <WarbondBrowser v-else-if="panel === 'warbonds'" />
          <BraschBargains
            v-else-if="panel === 'bargains'"
            :state="state"
            :self="self"
            @buy="emit('buy', $event)"
          />
        </div>
      </section>
    </Transition>

    <nav
      class="side-rail"
      aria-label="Tools"
    >
      <button
        class="side-tab"
        type="button"
        aria-label="Kit"
        :aria-expanded="panel === 'kit'"
        @click="toggle('kit')"
      >
        <span class="tab-top"><IconKit /></span>
        <span class="tab-word">Kit</span>
      </button>
      <button
        class="side-tab"
        type="button"
        aria-label="Codex"
        :aria-expanded="panel === 'codex'"
        @click="toggle('codex')"
      >
        <span class="tab-top"><IconBook /></span>
        <span class="tab-word">Codex</span>
      </button>
      <button
        class="side-tab"
        type="button"
        aria-label="Warbonds"
        :aria-expanded="panel === 'warbonds'"
        @click="toggle('warbonds')"
      >
        <span class="tab-top"><IconWarbond /></span>
        <span class="tab-word">Warbonds</span>
      </button>
      <button
        class="side-tab credits"
        type="button"
        :disabled="Boolean(bargainsClosed)"
        :aria-label="bargainsLabel"
        :title="bargainsClosed ?? bargainsLabel"
        :aria-expanded="panel === 'bargains'"
        @click="toggle('bargains')"
      >
        <span
          v-if="lamp !== 'off' && !bargainsClosed"
          class="tab-lamp"
          :class="{ pulse: lamp === 'restocked' }"
          aria-hidden="true"
        />
        <span class="tab-top">
          <IconCredit />
          <b class="tab-credits">{{ credits }}</b>
        </span>
        <span class="tab-word">Bargains</span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.dive-side {
  position: relative;
  z-index: 2;
  display: flex;
  flex-shrink: 0;
  min-height: 0;
}

.side-panel {
  display: flex;
  flex-direction: column;
  width: clamp(340px, 32vw, 34rem);
  min-height: 0;
  background: var(--rail);
  border-left: 1px solid var(--line-2);
  box-shadow: -24px 0 60px rgba(0, 0, 0, 0.35);
}
.side-panel-enter-active { animation: panel-in var(--dur-slow) var(--ease-out); }
.side-panel-leave-active { animation: panel-out var(--dur-med) ease-in; }
.side-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px 4px;
}
.side-mark { width: 3px; height: 18px; background: var(--gold); box-shadow: 0 0 10px rgba(255, 214, 66, 0.5); }
.side-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  font-stretch: 125%;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
}
.side-hide {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  margin-left: auto;
  padding: 0 10px;
  border: 0;
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--khaki);
  font: 700 10px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.side-hide:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.side-desc { margin: 0; padding: 0 18px 10px; color: var(--muted); font-size: var(--fs-sm); border-bottom: 1px solid var(--line-1); }
.side-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 18px 20px;
}

.side-rail {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 52px;
  overflow-y: auto;
  background: var(--rail);
  border-left: 1px solid var(--line-2);
}
.side-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
  border: 0;
  border-bottom: 1px solid var(--line-1);
  background: transparent;
  color: var(--khaki);
  font: 700 11px var(--font-body);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
}
.side-tab :deep(svg) { width: 18px; height: 18px; }
.tab-top { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.tab-word { writing-mode: vertical-rl; }
.side-tab:hover:not(:disabled) { color: var(--gold); background: var(--panel); }
.side-tab[aria-expanded='true'] {
  color: var(--gold);
  background: var(--panel);
  box-shadow: inset -2px 0 0 var(--gold);
}
.side-tab:disabled { opacity: 0.45; cursor: not-allowed; }
.credits { color: var(--gold); }
.tab-credits {
  max-width: 46px;
  overflow: hidden;
  color: var(--text);
  font-size: 12px;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
}
.tab-lamp {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: var(--gold);
  box-shadow: 0 0 8px var(--gold);
}

@keyframes panel-in {
  from { translate: 100% 0; }
}
@keyframes panel-out {
  to { translate: 100% 0; }
}

/* A phone has no right edge to spare: the rail pins above the action bar and
   the panel rises out of it over the stage. The aside makes no stacking
   context of its own, so the panel paints under the rail and the shell's
   action bar (later in the tree) and slides in and out from behind them. */
.dive-side.sheet { display: block; z-index: auto; }
.sheet .side-panel {
  position: absolute;
  inset: auto 0 100%;
  width: auto;
  max-height: 64dvh;
  border-left: 0;
  border-top: 1px solid var(--line-3);
  box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.55);
}
.sheet .side-panel-enter-active { animation-name: sheet-rise; }
.sheet .side-panel-leave-active { animation-name: sheet-fall; }
.sheet .side-head { padding: 12px 14px 2px; }
.sheet .side-desc { padding: 0 14px 8px; }
.sheet .side-body { padding: 0 14px 16px; }
.sheet .side-rail {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  width: auto;
  overflow: visible;
  border-left: 0;
  border-top: 1px solid var(--line-2);
}
.sheet .side-tab {
  justify-content: center;
  gap: 3px;
  min-height: 52px;
  padding: 6px 0;
  border-bottom: 0;
  border-left: 1px solid var(--line-1);
  font-size: 9px;
  letter-spacing: 0.08em;
}
.sheet .side-tab:first-child { border-left: 0; }
.sheet .side-tab[aria-expanded='true'] { box-shadow: inset 0 2px 0 var(--gold); }
.sheet .tab-top { flex-direction: row; gap: 5px; }
.sheet .tab-word { writing-mode: horizontal-tb; }
.sheet .tab-lamp { top: 5px; right: 10px; }

@keyframes sheet-rise {
  from { translate: 0 100%; }
}
@keyframes sheet-fall {
  to { translate: 0 100%; }
}
</style>
