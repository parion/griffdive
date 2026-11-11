<script setup lang="ts">
import { difficultyImageUrl } from '~~/shared/data/images'
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
let emblem: HTMLImageElement | null = null

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

// The card still renders without the emblem if the image never arrives.
async function ensureEmblem(): Promise<void> {
  if (!import.meta.client || emblem?.src.endsWith(difficultyImageUrl(props.state.difficulty))) {
    return
  }
  const image = new Image()
  image.src = difficultyImageUrl(props.state.difficulty)
  try {
    await image.decode()
    emblem = image
  }
  catch {
    emblem = null
  }
}

function paint(): void {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) {
    return
  }
  drawRecapCard(ctx, recap.value, emblem)
}

async function render(): Promise<void> {
  await Promise.all([ensureFonts(), ensureEmblem()])
  paint()
}

onMounted(render)

async function download(): Promise<void> {
  const element = canvas.value
  if (!element || !import.meta.client) {
    return
  }
  await render()
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
  <div class="recap">
    <div class="recap-frame ticks">
      <canvas
        ref="canvas"
        :width="RECAP_CARD_WIDTH"
        :height="RECAP_CARD_HEIGHT"
        role="img"
        :aria-label="recap.accessibleLabel"
      >{{ recap.accessibleLabel }}</canvas>
    </div>
    <button
      type="button"
      class="btn recap-dl"
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
</template>

<style scoped>
.recap {
  display: grid;
  justify-items: start;
  gap: var(--sp-4);
  min-width: 0;
}
.recap-frame {
  width: 100%;
  border: 1px solid var(--line-3);
  background: var(--ground);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}
.recap-frame canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
}
.recap-dl {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 18px;
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>
