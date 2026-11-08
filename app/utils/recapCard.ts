import { BRAND_MARK } from './brandMark'
import { baseTierFor } from '~~/shared/engine/config'
import type { Recap } from './recap'

export const RECAP_CARD_WIDTH = 1200
export const RECAP_CARD_HEIGHT = 630

const COLORS = {
  ground: '#0b0c09',
  rail: '#0e100b',
  panel: '#13150f',
  line: '#2c3022',
  lineSoft: '#23261c',
  text: '#eceada',
  khaki: '#b8b08d',
  muted: '#9a9b82',
  dim: '#85876f',
  gold: '#ffd642',
  tierC: '#9a9b82',
  tierB: '#6fbf73',
  tierA: '#4ad7c8',
  tierS: '#ffd642',
} as const

const TIER_COLORS: Record<string, string> = {
  'C': COLORS.tierC,
  'B': COLORS.tierB,
  'A': COLORS.tierA,
  'S': COLORS.tierS,
  'S+': COLORS.tierS,
}

function display(size: number): string {
  return `800 ${size}px Archivo, Arial Black, sans-serif`
}

function body(size: number, weight = 700): string {
  return `${weight} ${size}px "Chakra Petch", Segoe UI, sans-serif`
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

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const scale = size / 512
  ctx.save()
  ctx.translate(x + size / 2, y + size / 2)
  ctx.scale(scale, scale)
  ctx.translate(-256, -256)
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

  const glow = ctx.createRadialGradient(width * 0.78, height * 0.28, 0, width * 0.78, height * 0.28, 560)
  glow.addColorStop(0, 'rgba(255, 214, 66, 0.16)')
  glow.addColorStop(1, 'rgba(255, 214, 66, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = COLORS.lineSoft
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1
  for (let x = 40; x < width; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 80; y < height; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  ctx.fillStyle = COLORS.gold
  ctx.fillRect(0, 0, width, 8)
  ctx.fillRect(0, height - 4, width, 4)
}

function drawLadder(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, reached: number): void {
  const cellWidth = (width - 7 * 4) / 8
  for (let i = 0; i < 8; i++) {
    const n = i + 3
    const cellX = x + i * (cellWidth + 4)
    const filled = n <= reached
    ctx.fillStyle = filled ? COLORS.rail : COLORS.panel
    ctx.fillRect(cellX, y, cellWidth, 26)
    ctx.fillStyle = filled ? TIER_COLORS[baseTierFor(n)] ?? COLORS.gold : COLORS.line
    ctx.fillRect(cellX, y + 22, cellWidth, 4)
    ctx.font = display(13)
    ctx.fillStyle = n === reached ? COLORS.gold : filled ? COLORS.khaki : COLORS.dim
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(n), cellX + cellWidth / 2, y + 11)
  }
  ctx.textAlign = 'left'
}

function drawStats(ctx: CanvasRenderingContext2D, x: number, y: number, recap: Recap): void {
  const stats = [
    { label: 'Missions', value: recap.missionsFlown },
    { label: 'Operations', value: recap.operationsCleared },
    { label: 'Combos', value: recap.combos },
    { label: 'Gear', value: recap.gearOwned },
  ]
  const cellWidth = 176
  stats.forEach((stat, index) => {
    const cellX = x + index * cellWidth
    if (index > 0) {
      ctx.fillStyle = COLORS.line
      ctx.fillRect(cellX - 14, y, 1, 64)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = display(42)
    ctx.fillStyle = index === 0 ? COLORS.gold : COLORS.text
    ctx.fillText(String(stat.value), cellX, y + 42)
    ctx.font = body(11)
    ctx.fillStyle = COLORS.muted
    ctx.fillText(stat.label.toUpperCase(), cellX, y + 62)
  })
}

export function drawRecapCard(
  ctx: CanvasRenderingContext2D,
  recap: Recap,
  width = RECAP_CARD_WIDTH,
  height = RECAP_CARD_HEIGHT,
): void {
  ctx.clearRect(0, 0, width, height)
  drawField(ctx, width, height)

  const margin = 60
  drawMark(ctx, margin, 40, 46)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = display(24)
  ctx.fillStyle = COLORS.text
  ctx.fillText('GRIFFDIVE', margin + 60, 64)
  ctx.textAlign = 'right'
  ctx.font = body(12)
  ctx.fillStyle = COLORS.muted
  ctx.fillText('SERVICE RECORD · GRIFFDIVE.COM', width - margin, 64)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = body(14)
  ctx.fillStyle = COLORS.gold
  ctx.fillText(recap.kicker.toUpperCase(), margin, 138)

  ctx.font = display(84)
  ctx.fillStyle = COLORS.text
  ctx.fillText(recap.title[0].toUpperCase(), margin, 220)
  ctx.fillStyle = recap.outcome === 'achieved' ? COLORS.gold : COLORS.khaki
  ctx.fillText(recap.title[1].toUpperCase(), margin, 300)

  if (recap.crusadeLabel) {
    ctx.font = body(16, 600)
    ctx.fillStyle = COLORS.muted
    ctx.fillText(fit(ctx, recap.crusadeLabel.toUpperCase(), 660), margin, 332)
  }

  ctx.font = body(17)
  const climb = `${recap.startName} ${recap.startDifficulty}`
  ctx.fillStyle = COLORS.khaki
  ctx.fillText(climb, margin, 368)
  const climbWidth = ctx.measureText(climb).width
  ctx.fillStyle = COLORS.gold
  ctx.fillText('  →  ', margin + climbWidth, 368)
  const arrowWidth = ctx.measureText('  →  ').width
  ctx.fillStyle = COLORS.text
  ctx.fillText(`${recap.endName} ${recap.endDifficulty}`, margin + climbWidth + arrowWidth, 368)

  ctx.fillStyle = COLORS.line
  ctx.fillRect(margin, 392, width - margin * 2, 1)

  drawStats(ctx, margin, 420, recap)
  drawLadder(ctx, margin, 528, width - margin * 2 - 356, recap.endDifficulty)

  const panelX = width - margin - 324
  const panelY = 132
  const panelW = 324
  const panelH = 424
  ctx.fillStyle = COLORS.panel
  ctx.fillRect(panelX, panelY, panelW, panelH)
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1)
  ctx.fillStyle = COLORS.gold
  ctx.fillRect(panelX, panelY, panelW, 3)

  const inset = panelX + 22
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = body(11)
  ctx.fillStyle = COLORS.muted
  ctx.fillText('SIGNATURE STAT', inset, panelY + 34)

  ctx.font = display(62)
  ctx.fillStyle = COLORS.gold
  ctx.fillText(String(recap.honorsHeld), inset, panelY + 104)
  ctx.font = body(13, 600)
  ctx.fillStyle = COLORS.khaki
  ctx.fillText('SQUAD HONORS IN HAND', inset, panelY + 128)

  ctx.fillStyle = COLORS.line
  ctx.fillRect(inset, panelY + 150, panelW - 44, 1)

  ctx.font = body(11)
  ctx.fillStyle = COLORS.muted
  ctx.fillText('SQUAD', inset, panelY + 178)
  ctx.font = body(15, 600)
  const shown = recap.squad.slice(0, 4)
  shown.forEach((member, index) => {
    const lineY = panelY + 208 + index * 26
    ctx.fillStyle = member.isHost ? COLORS.gold : COLORS.line
    ctx.fillRect(inset, lineY - 10, 6, 6)
    ctx.fillStyle = COLORS.text
    ctx.fillText(fit(ctx, member.name, panelW - 70), inset + 16, lineY)
  })

  ctx.fillStyle = COLORS.line
  ctx.fillRect(inset, panelY + 330, panelW - 44, 1)

  ctx.font = body(11)
  ctx.fillStyle = COLORS.muted
  ctx.fillText('RUNG REACHED', inset, panelY + 358)
  ctx.font = display(24)
  ctx.fillStyle = recap.outcome === 'achieved' ? COLORS.gold : COLORS.text
  ctx.fillText(fit(ctx, recap.endName.toUpperCase(), panelW - 56), inset, panelY + 392)

  ctx.font = body(11)
  ctx.fillStyle = COLORS.muted
  ctx.textAlign = 'left'
  ctx.fillText('FAN PROJECT · NOT AFFILIATED WITH SONY OR ARROWHEAD', margin, height - 26)
  ctx.textAlign = 'right'
  ctx.fillStyle = COLORS.khaki
  ctx.font = body(13)
  ctx.fillText('GRIFFDIVE.COM', width - margin, height - 26)
  ctx.textAlign = 'left'
}
