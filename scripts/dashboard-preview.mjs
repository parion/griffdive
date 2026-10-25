// Renders grafana/griffdive-overview.json into a self-contained HTML preview
// and a PNG, so a dashboard change can be reviewed without fly-metrics access.
// The series are illustrative mock data — only the layout, titles, queries and
// legends come from the real dashboard JSON.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dashPath = path.join(root, 'grafana/griffdive-overview.json')
const htmlPath = path.join(root, 'grafana/dashboard-preview.html')
const pngPath = path.join(root, 'grafana/dashboard-preview.png')

const ROW_HEIGHT = 30
const PALETTE = ['#73bf69', '#e8c265', '#4fd1c5', '#ff9830', '#f2495c', '#b06bff', '#5794f2', '#fade2a']

const dash = JSON.parse(await readFile(dashPath, 'utf8'))

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

// Deterministic mock series: the same panel always draws the same shape.
function seeded(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sparkline(random, color) {
  const points = Array.from({ length: 48 }, (_, index) => {
    const drift = 0.35 + 0.45 * Math.sin(index / 7 + random() * 4)
    return Math.min(0.95, Math.max(0.05, drift * (0.6 + random() * 0.8)))
  })
  const step = 100 / (points.length - 1)
  const line = points.map((value, index) => `${(index * step).toFixed(2)},${(100 - value * 90).toFixed(2)}`).join(' ')
  return `<svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <polygon points="0,100 ${line} 100,100" fill="${color}" opacity="0.12"></polygon>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"></polyline>
  </svg>`
}

function barchart(random, color) {
  const bars = Array.from({ length: 26 }, () => 0.1 + random() * 0.85)
  const width = 100 / bars.length
  return `<svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    ${bars.map((value, index) => `<rect x="${(index * width + width * 0.15).toFixed(2)}" y="${(100 - value * 92).toFixed(2)}" width="${(width * 0.7).toFixed(2)}" height="${(value * 92).toFixed(2)}" fill="${color}" opacity="0.75"></rect>`).join('')}
  </svg>`
}

function horizontalBars(random, labels) {
  const count = Math.max(labels.length, 4)
  const values = Array.from({ length: count }, () => 0.15 + random() * 0.85).sort((a, b) => b - a)
  const name = index => labels[index] ?? (labels.length === 1 ? `${labels[0]} #${index + 1}` : `series ${index + 1}`)
  return `<div class="hbars">${values.map((value, index) => `
    <div class="hbar">
      <span class="hbar-label">${escapeHtml(name(index))}</span>
      <span class="hbar-track"><span class="hbar-fill" style="width:${(value * 100).toFixed(0)}%;background:${PALETTE[index % PALETTE.length]}"></span></span>
    </div>`).join('')}</div>`
}

function statBody(random, panel, labels) {
  const unit = panel.fieldConfig?.defaults?.unit
  const percent = unit === 'percent' || unit === 'percentunit'
  const value = percent ? `${(random() * 90).toFixed(0)}%` : `${Math.round(random() * 40)}`
  return `<div class="stat">
    <span class="stat-value">${value}</span>
    <span class="stat-label">${escapeHtml(labels[0] ?? 'value')}</span>
  </div>`
}

function tableBody() {
  return `<table class="build">
    <thead><tr><th>engine</th><th>image</th><th>Value</th></tr></thead>
    <tbody><tr><td>25</td><td>registry.fly.io/griffdive:deployment-…</td><td>1</td></tr></tbody>
  </table>`
}

function legend(labels) {
  if (labels.length === 0) {
    return ''
  }
  return `<div class="legend">${labels.map((label, index) => `
    <span class="legend-item"><i style="background:${PALETTE[index % PALETTE.length]}"></i>${escapeHtml(label)}</span>`).join('')}</div>`
}

function panelBody(panel) {
  const random = seeded(panel.id * 7919 + 13)
  const labels = (panel.targets ?? []).map(target => String(target.legendFormat ?? target.expr ?? '').replace(/\{\{(\w+)\}\}/g, '$1'))
  if (panel.type === 'stat') {
    return `${statBody(random, panel, labels)}${legend(labels)}`
  }
  if (panel.type === 'bargauge') {
    return `${horizontalBars(random, labels)}`
  }
  if (panel.type === 'table') {
    return tableBody()
  }
  const drawStyle = panel.fieldConfig?.defaults?.custom?.drawStyle === 'bars' ? 'bars' : 'line'
  const chart = drawStyle === 'bars' ? barchart(random, PALETTE[0]) : sparkline(random, PALETTE[2])
  return `${chart}${legend(labels)}`
}

function queries(panel) {
  if (panel.type === 'row') {
    return ''
  }
  return `<div class="queries">${(panel.targets ?? []).map(target => `
    <code>${target.instant ? 'instant · ' : ''}${escapeHtml(target.expr)}</code>`).join('')}</div>`
}

const body = dash.panels.map((panel) => {
  const { x, y, w, h } = panel.gridPos
  const style = `left:${(x / 24) * 100}%;top:${y * ROW_HEIGHT}px;width:${(w / 24) * 100}%;height:${h * ROW_HEIGHT}px`
  if (panel.type === 'row') {
    return `<section class="row" style="${style}"><span>${escapeHtml(panel.title)}</span></section>`
  }
  return `<article class="panel" style="${style}">
    <header class="panel-title" title="${escapeHtml(panel.description ?? '')}">${escapeHtml(panel.title)}</header>
    <div class="panel-body">${panelBody(panel)}</div>
    ${queries(panel)}
  </article>`
}).join('\n')

const height = Math.max(...dash.panels.map(panel => panel.gridPos.y + panel.gridPos.h)) * ROW_HEIGHT + 40

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(dash.title)} — preview</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #0e1013;
    color: #d8d9da;
    font-family: Inter, "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
  }
  .chrome {
    display: flex; align-items: center; gap: 16px;
    padding: 10px 16px; background: #181b1f; border-bottom: 1px solid #26292e;
    position: sticky; top: 0; z-index: 2;
  }
  .chrome h1 { margin: 0; font-size: 15px; font-weight: 600; }
  .chip { padding: 2px 8px; border: 1px solid #33373d; border-radius: 3px; color: #9fa3a8; }
  .warn { margin-left: auto; color: #e8c265; letter-spacing: 0.04em; text-transform: uppercase; font-size: 10px; }
  .grid { position: relative; height: ${height}px; margin: 8px; }
  .row {
    position: absolute; padding: 6px 8px; font-weight: 600; letter-spacing: 0.02em;
    background: #15181c; border: 1px solid #22262b; border-radius: 3px; color: #c9ccd1;
  }
  .panel {
    position: absolute; padding: 3px;
  }
  .panel-title {
    height: 26px; padding: 4px 8px; background: #181b1f;
    border: 1px solid #26292e; border-bottom: none; border-radius: 3px 3px 0 0;
    font-weight: 600; color: #d8d9da; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .panel-body {
    height: calc(100% - ${26 + 3}px - 26px);
    padding: 6px 8px; background: #14171a; border: 1px solid #26292e; border-radius: 0 0 3px 3px;
    display: flex; flex-direction: column; gap: 4px; overflow: hidden;
  }
  .chart { flex: 1; width: 100%; min-height: 24px; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 10px; color: #9fa3a8; font-size: 10px; }
  .legend-item { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
  .legend-item i { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
  .hbars { display: flex; flex-direction: column; gap: 5px; justify-content: center; flex: 1; }
  .hbar { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #9fa3a8; }
  .hbar-label { width: 42%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hbar-track { flex: 1; height: 9px; background: #1f2328; border-radius: 2px; overflow: hidden; }
  .hbar-fill { display: block; height: 100%; }
  .stat { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .stat-value { font-size: 34px; font-weight: 600; color: #e8e9ea; }
  .stat-label { color: #9fa3a8; font-size: 10px; }
  .queries { height: 26px; overflow: hidden; padding: 2px 4px; }
  .queries code {
    display: block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px;
    color: #6f757c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .build { width: 100%; border-collapse: collapse; font-size: 10px; }
  .build th, .build td { text-align: left; padding: 2px 4px; border-bottom: 1px solid #22262b; color: #9fa3a8; }
</style>
</head>
<body>
<div class="chrome">
  <h1>${escapeHtml(dash.title)}</h1>
  <span class="chip">Last 6 hours</span>
  <span class="chip">Refresh ${escapeHtml(dash.refresh)}</span>
  <span class="chip">Difficulty: All</span>
  <span class="chip">App: ${escapeHtml(dash.templating.list.find(variable => variable.name === 'app')?.current?.text ?? 'All')}</span>
  <span class="chip">${dash.panels.filter(panel => panel.type !== 'row').length} panels</span>
  <span class="warn">preview — layout &amp; queries from the json; series are illustrative</span>
</div>
<div class="grid">
${body}
</div>
</body>
</html>
`

await writeFile(htmlPath, html)
console.log(`wrote ${path.relative(root, htmlPath)}`)

try {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
  await page.goto(`file://${htmlPath}`)
  await page.screenshot({ path: pngPath, fullPage: true })
  await browser.close()
  console.log(`wrote ${path.relative(root, pngPath)}`)
}
catch (error) {
  console.log(`PNG skipped (${error instanceof Error ? error.message : error})`)
}
