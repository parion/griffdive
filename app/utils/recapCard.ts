import { BRAND_MARK } from './brandMark'
import { MAX_DIFFICULTY, MIN_DIFFICULTY, baseTierFor } from '~~/shared/engine/config'
import type { Recap } from './recap'

export const RECAP_CARD_WIDTH = 1200
export const RECAP_CARD_HEIGHT = 630

const COLORS = {
  ground: '#0b0c09',
  panel: '#13150f',
  line: '#2c3022',
  lineSoft: '#1c1f16',
  text: '#eceada',
  khaki: '#b8b08d',
  muted: '#9a9b82',
  dim: '#85876f',
  gold: '#ffd642',
  goldBright: '#ffe88a',
  tierC: '#9a9b82',
  tierB: '#6fbf73',
  tierA: '#4ad7c8',
  tierS: '#ffd642',
  tierSPlus: '#ff4b3e',
} as const

const TIER_COLORS: Record<string, string> = {
  'C': COLORS.tierC,
  'B': COLORS.tierB,
  'A': COLORS.tierA,
  'S': COLORS.tierS,
  'S+': COLORS.tierS,
}

// The display face is the vendored variable Archivo; the canvas has to ask
// for its width axis explicitly or it draws the narrow cut.
function display(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.font = `800 ${size}px Archivo, Arial Black, sans-serif`
  ctx.fontStretch = 'expanded'
  ctx.letterSpacing = '0px'
}

function body(ctx: CanvasRenderingContext2D, size: number, weight = 700, tracking = 0): void {
  ctx.font = `${weight} ${size}px "Chakra Petch", Segoe UI, sans-serif`
  ctx.fontStretch = 'normal'
  ctx.letterSpacing = `${tracking}px`
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

function hazard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.fillStyle = COLORS.ground
  ctx.fillRect(x, y, width, height)
  ctx.fillStyle = COLORS.gold
  for (let stripe = x - height; stripe < x + width; stripe += 16) {
    ctx.beginPath()
    ctx.moveTo(stripe, y + height)
    ctx.lineTo(stripe + height, y)
    ctx.lineTo(stripe + height + 8, y)
    ctx.lineTo(stripe + 8, y + height)
    ctx.fill()
  }
  ctx.restore()
}

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const scale = size / 512
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.globalAlpha = 0.55
  ctx.strokeStyle = COLORS.khaki
  ctx.lineWidth = BRAND_MARK.rimWidth
  ctx.stroke(new Path2D(BRAND_MARK.rim))
  ctx.lineWidth = BRAND_MARK.tickWidth
  ctx.stroke(new Path2D(BRAND_MARK.ticks))
  ctx.globalAlpha = 1
  ctx.fillStyle = COLORS.gold
  ctx.fill(new Path2D(BRAND_MARK.wings))
  ctx.fill(new Path2D(BRAND_MARK.head), 'evenodd')
  ctx.restore()
}

function drawField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = COLORS.ground
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = COLORS.lineSoft
  ctx.lineWidth = 1
  for (let x = 44.5; x < width; x += 44) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 44.5; y < height; y += 44) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  hazard(ctx, 0, 0, width, 10)
}

function drawRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, achieved: boolean): void {
  ctx.save()
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  glow.addColorStop(0, achieved ? 'rgba(255, 214, 66, 0.26)' : 'rgba(184, 176, 141, 0.12)')
  glow.addColorStop(1, 'rgba(255, 214, 66, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  if (achieved) {
    const fade = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    fade.addColorStop(0, 'rgba(255, 214, 66, 0.14)')
    fade.addColorStop(1, 'rgba(255, 214, 66, 0)')
    ctx.fillStyle = fade
    const wedge = (Math.PI * 2) / 36
    for (let i = 0; i < 36; i++) {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, i * wedge, i * wedge + wedge * 0.32)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

// The creed stack, the Bridge headline's answer: two display words with the
// small middle word centred between the tier rules.
function drawCreed(ctx: CanvasRenderingContext2D, x: number, y: number, maxWidth: number, recap: Recap): number {
  const [top, middle, bottom] = recap.creed
  display(ctx, 88)
  const natural = Math.max(ctx.measureText(top.toUpperCase()).width, ctx.measureText(bottom.toUpperCase()).width)
  const size = Math.min(88, Math.floor(88 * maxWidth / natural))
  display(ctx, size)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const width = Math.max(ctx.measureText(top.toUpperCase()).width, ctx.measureText(bottom.toUpperCase()).width)
  ctx.fillStyle = COLORS.text
  ctx.fillText(top.toUpperCase(), x, y)

  const ruleY = y + 38
  body(ctx, 17, 700, 7)
  const word = middle.toUpperCase()
  const wordWidth = ctx.measureText(word).width
  const gap = 16
  const ruleWidth = (width - wordWidth - gap * 2) / 2
  const left = ctx.createLinearGradient(x, 0, x + ruleWidth, 0)
  left.addColorStop(0, COLORS.tierC)
  left.addColorStop(0.34, COLORS.tierC)
  left.addColorStop(0.34, COLORS.tierB)
  left.addColorStop(0.67, COLORS.tierB)
  left.addColorStop(0.67, COLORS.tierA)
  left.addColorStop(1, COLORS.tierA)
  ctx.fillStyle = left
  ctx.fillRect(x, ruleY - 1, ruleWidth, 2)
  const rightX = x + width - ruleWidth
  const right = ctx.createLinearGradient(rightX, 0, rightX + ruleWidth, 0)
  right.addColorStop(0, COLORS.tierS)
  right.addColorStop(0.5, COLORS.tierS)
  right.addColorStop(0.5, COLORS.tierSPlus)
  right.addColorStop(1, COLORS.tierSPlus)
  ctx.fillStyle = right
  ctx.fillRect(rightX, ruleY - 1, ruleWidth, 2)
  ctx.fillStyle = COLORS.tierA
  ctx.textBaseline = 'middle'
  ctx.fillText(word, x + ruleWidth + gap, ruleY + 1)

  display(ctx, size)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = recap.outcome === 'achieved' ? COLORS.gold : COLORS.khaki
  ctx.fillText(bottom.toUpperCase(), x, y + 140)
  return y + 140
}

function drawStairs(ctx: CanvasRenderingContext2D, x: number, baseY: number, width: number, reached: number, achieved: boolean): void {
  const count = MAX_DIFFICULTY - MIN_DIFFICULTY + 1
  const gap = 6
  const stepWidth = (width - gap * (count - 1)) / count
  for (let i = 0; i < count; i++) {
    const n = MIN_DIFFICULTY + i
    const stepHeight = 22 + i * 12
    const stepX = x + i * (stepWidth + gap)
    const top = baseY - stepHeight
    const climbed = n < reached || (n === reached && achieved)
    const here = n === reached
    const tier = TIER_COLORS[baseTierFor(n)] ?? COLORS.gold
    if (climbed || here) {
      const fill = ctx.createLinearGradient(0, top, 0, baseY)
      fill.addColorStop(0, here ? 'rgba(255, 214, 66, 0.42)' : 'rgba(255, 214, 66, 0.2)')
      fill.addColorStop(1, 'rgba(255, 214, 66, 0)')
      ctx.fillStyle = fill
      ctx.fillRect(stepX, top, stepWidth, stepHeight)
      ctx.fillStyle = here ? COLORS.goldBright : COLORS.gold
      ctx.fillRect(stepX, top, stepWidth, 3)
    }
    else {
      ctx.strokeStyle = COLORS.line
      ctx.setLineDash([4, 4])
      ctx.strokeRect(stepX + 0.5, top + 0.5, stepWidth - 1, stepHeight - 1)
      ctx.setLineDash([])
    }
    ctx.fillStyle = climbed || here ? tier : COLORS.line
    ctx.fillRect(stepX, baseY + 6, stepWidth, 3)
    body(ctx, 13, 700)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = here ? COLORS.gold : climbed ? COLORS.khaki : COLORS.dim
    ctx.fillText(String(n), stepX + stepWidth / 2, baseY + 28)
  }
  ctx.textAlign = 'left'
}

function drawStats(ctx: CanvasRenderingContext2D, x: number, y: number, recap: Recap): void {
  const stats = [
    { label: 'Missions', value: recap.missionsFlown },
    { label: 'Operations', value: recap.operationsCleared },
    { label: 'Gear earned', value: recap.gearEarned },
    { label: 'Honors', value: recap.honorsHeld },
  ]
  const cellWidth = 150
  stats.forEach((stat, index) => {
    const cellX = x + index * cellWidth
    if (index > 0) {
      ctx.fillStyle = COLORS.line
      ctx.fillRect(cellX - 18, y - 36, 1, 58)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    display(ctx, 38)
    ctx.fillStyle = COLORS.gold
    ctx.fillText(String(stat.value), cellX, y)
    body(ctx, 11, 700, 2)
    ctx.fillStyle = COLORS.muted
    ctx.fillText(stat.label.toUpperCase(), cellX, y + 22)
  })
}

export function drawRecapCard(
  ctx: CanvasRenderingContext2D,
  recap: Recap,
  emblem: CanvasImageSource | null = null,
  width = RECAP_CARD_WIDTH,
  height = RECAP_CARD_HEIGHT,
): void {
  const achieved = recap.outcome === 'achieved'
  ctx.clearRect(0, 0, width, height)
  drawField(ctx, width, height)

  const summitX = 930
  const summitY = 210
  drawRays(ctx, summitX, summitY, 420, achieved)

  const margin = 64
  drawMark(ctx, margin, 40, 40)
  display(ctx, 20)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = COLORS.gold
  ctx.fillText('GRIFFDIVE', margin + 52, 61)

  hazard(ctx, margin, 128, 44, 6)
  body(ctx, 14, 700, 4)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = COLORS.gold
  ctx.fillText(recap.kicker.toUpperCase(), margin + 58, 132)

  const creedEnd = drawCreed(ctx, margin, 238, 620, recap)

  body(ctx, 18, 600)
  ctx.textBaseline = 'alphabetic'
  const from = `${recap.startName.toUpperCase()} ${recap.startDifficulty}`
  ctx.fillStyle = COLORS.khaki
  ctx.fillText(from, margin, creedEnd + 52)
  const fromWidth = ctx.measureText(from).width
  ctx.fillStyle = COLORS.gold
  ctx.fillText('  →  ', margin + fromWidth, creedEnd + 52)
  const arrowWidth = ctx.measureText('  →  ').width
  ctx.fillStyle = COLORS.text
  ctx.fillText(`${recap.endName.toUpperCase()} ${recap.endDifficulty}`, margin + fromWidth + arrowWidth, creedEnd + 52)

  drawStats(ctx, margin, 530, recap)

  if (emblem) {
    const emblemWidth = 250
    const emblemHeight = emblemWidth * (92 / 190)
    ctx.save()
    ctx.shadowColor = achieved ? 'rgba(255, 214, 66, 0.55)' : 'rgba(184, 176, 141, 0.3)'
    ctx.shadowBlur = 36
    ctx.drawImage(emblem, summitX - emblemWidth / 2, summitY - emblemHeight / 2 - 40, emblemWidth, emblemHeight)
    ctx.restore()
  }
  display(ctx, 64)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = achieved ? COLORS.gold : COLORS.text
  ctx.fillText(String(recap.endDifficulty), summitX, summitY + 96)
  body(ctx, 15, 700, 5)
  ctx.fillStyle = COLORS.text
  ctx.fillText(recap.endName.toUpperCase(), summitX, summitY + 126)

  drawStairs(ctx, 740, 460, 380, recap.endDifficulty, achieved)

  ctx.fillStyle = COLORS.line
  ctx.fillRect(740, 520, 380, 1)
  body(ctx, 11, 700, 2)
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.muted
  ctx.fillText('SQUAD', 740, 546)
  body(ctx, 15, 700, 1)
  ctx.fillStyle = COLORS.text
  ctx.fillText(fit(ctx, recap.squad.map(member => member.name).join(' · '), 380), 740, 570)

  body(ctx, 11, 600, 1)
  ctx.fillStyle = COLORS.dim
  ctx.fillText('FAN PROJECT · NOT AFFILIATED WITH SONY OR ARROWHEAD', margin, height - 22)
  ctx.textAlign = 'right'
  body(ctx, 13, 700, 2)
  ctx.fillStyle = COLORS.khaki
  ctx.fillText('GRIFFDIVE.COM', width - margin, height - 22)
  ctx.textAlign = 'left'
  ctx.letterSpacing = '0px'
}
