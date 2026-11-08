<script setup lang="ts">
import type { DiveState } from '~~/shared/engine/types'
import { buildRecap, recapFilename } from '~/utils/recap'
import { RECAP_CARD_HEIGHT, RECAP_CARD_WIDTH, drawRecapCard } from '~/utils/recapCard'

const props = defineProps<{
  state: DiveState
  crusadeLabel?: string
  slotName?: string
}>()

const recap = computed(() => buildRecap(props.state, props.crusadeLabel ?? ''))
const canvas = ref<HTMLCanvasElement | null>(null)
const announcement = ref('')

async function ensureFonts(): Promise<void> {
  if (!import.meta.client || !document.fonts) {
    return
  }
  await Promise.allSettled([
    document.fonts.load('800 84px Archivo'),
    document.fonts.load('700 15px "Chakra Petch"'),
    document.fonts.load('600 15px "Chakra Petch"'),
  ])
  await document.fonts.ready
}

function paint(): void {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) {
    return
  }
  drawRecapCard(ctx, recap.value)
}

onMounted(async () => {
  await ensureFonts()
  paint()
})

async function download(): Promise<void> {
  const element = canvas.value
  if (!element || !import.meta.client) {
    return
  }
  await ensureFonts()
  paint()
  const blob = await new Promise<Blob | null>(resolve => element.toBlob(resolve, 'image/png'))
  if (!blob) {
    announcement.value = 'Could not render the recap card.'
    return
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = recapFilename(props.slotName || props.crusadeLabel || 'crusade')
  anchor.click()
  URL.revokeObjectURL(url)
  announcement.value = 'Recap card downloaded.'
}
</script>

<template>
  <section
    class="recap"
    aria-label="Run recap card"
  >
    <header class="recap-head">
      <h2 class="lbl">
        Run recap
      </h2>
      <span class="dash" />
      <span class="cap">Canvas-rendered · no upload</span>
    </header>

    <div class="recap-frame">
      <canvas
        ref="canvas"
        :width="RECAP_CARD_WIDTH"
        :height="RECAP_CARD_HEIGHT"
        role="img"
        :aria-label="recap.accessibleLabel"
      >{{ recap.accessibleLabel }}</canvas>
    </div>

    <div class="recap-foot">
      <button
        type="button"
        class="btn ghost recap-dl"
        @click="download"
      >
        Download recap (PNG)
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        ><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
      </button>
      <span
        class="sr-only"
        role="status"
        aria-live="polite"
      >{{ announcement }}</span>
    </div>
  </section>
</template>

<style scoped>
.recap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
}
.recap-head {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.recap-head h2 { margin: 0; color: var(--gold); }
.recap-head .dash { flex: 1 1 auto; min-width: 12px; }
.recap-frame {
  border: 1px solid var(--line-2);
  background: var(--ground);
  overflow: hidden;
}
.recap-frame canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
}
.recap-foot { display: flex; justify-content: flex-end; }
.recap-dl {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 16px;
  color: var(--text);
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>
