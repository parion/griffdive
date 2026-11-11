// Composes the Reddit lead image from capture-hero.mjs stills: 1200x675 rendered at 2x.
// Usage: node scripts/compose-hero.mjs [partsDir] [outFile]
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BRAND_MARK } from '../app/utils/brandMark.ts'

const parts = resolve(process.argv[2] ?? 'docs/marketing/images/hero-parts')
const outFile = resolve(process.argv[3] ?? 'docs/marketing/images/cards/card-0-hero-liberty-day.png')
const png = name => `data:image/png;base64,${readFileSync(`${parts}/${name}`).toString('base64')}`
const widthOf = name => readFileSync(`${parts}/${name}`).readUInt32BE(16)
const archivo = readFileSync(resolve('public/fonts/archivo-variable-latin.woff2')).toString('base64')

// Super Earth blue from Arrowhead's Liberty Day 2186 party pack bunting.
const SE_BLUE = '#1b5ea8'
const SE_YELLOW = '#ffe14d'

// Crops are in the 2x source pixels of each still; `w` is the CSS width it lands at.
function crop(name, [x, y, cw, ch], w, pos, extra = '') {
  const s = w / cw
  return `<div class="crop ${extra}" style="${pos};width:${w}px;height:${(ch * s).toFixed(1)}px">
    <img src="${png(name)}" style="width:${(widthOf(name) * s).toFixed(1)}px;left:${(-x * s).toFixed(1)}px;top:${(-y * s).toFixed(1)}px"></div>`
}

function bunting(width) {
  const letters = [...'LIBERTY', ' ', ...'DAY']
  const pad = 2
  const flags = [...Array(pad).fill(''), ...letters, ...Array(pad).fill('')]
  const n = flags.length
  const step = width / (n + 1)
  const sag = 16
  const yAt = x => 6 + sag * (1 - ((2 * x) / width - 1) ** 2)
  const slope = x => (-sag * 2 * ((2 * x) / width - 1) * 2) / width
  const items = flags.map((ch, i) => {
    const x = step * (i + 1)
    const y = yAt(x)
    const rot = (Math.atan(slope(x)) * 180) / Math.PI
    if (ch === ' ') return ''
    const day = i >= pad + 8 && ch
    const fill = day ? '#f4f1e6' : SE_BLUE
    const ink = day ? SE_BLUE : '#ffffff'
    const stroke = day ? SE_BLUE : SE_YELLOW
    const letter = ch ? `<text x="0" y="25" text-anchor="middle" font-family="Archivo" font-stretch="125%" font-weight="800" font-size="21" fill="${ink}">${ch}</text>` : ''
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})">
      <path d="M-25 0 L25 0 L0 56 Z" fill="${fill}"/>
      <path d="M-19 4 L19 4 L0 45 Z" fill="none" stroke="${stroke}" stroke-width="2"/>
      ${letter}</g>`
  }).join('')
  const path = Array.from({ length: 41 }, (_, i) => {
    const x = (width * i) / 40
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${yAt(x).toFixed(1)}`
  }).join(' ')
  return `<svg class="bunting" width="${width}" height="84" viewBox="0 0 ${width} 84">
    <path d="${path}" fill="none" stroke="#b8b08d" stroke-width="1.5"/>${items}</svg>`
}

const m = BRAND_MARK
const mark = `<svg viewBox="${m.viewBox}" class="mark"><g fill="none" stroke="#b8b08d"><path d="${m.rim}" stroke-width="${m.rimWidth}"/><path d="${m.ticks}" stroke-width="${m.tickWidth}"/></g><g fill="#ffd642"><path d="${m.wings}"/><path fill-rule="evenodd" d="${m.head}"/></g></svg>`

const stars = [[488, 92, 9], [1150, 70, 7], [700, 58, 6], [520, 610, 6], [880, 62, 5]]
  .map(([x, y, s]) => `<span class="star" style="left:${x}px;top:${y}px;font-size:${s * 2}px">★</span>`).join('')

const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&display=block">
<style>
@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${archivo}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:675px;overflow:hidden;position:relative;color:#eceada;font-family:'Chakra Petch',sans-serif;
  background:
    radial-gradient(ellipse 520px 380px at 960px 300px,#ffd64214,transparent 70%),
    radial-gradient(ellipse 700px 420px at 0 0,${SE_BLUE}2e,transparent 70%),
    linear-gradient(#ffffff07 1px,transparent 1px) 0 0/40px 40px,
    linear-gradient(90deg,#ffffff07 1px,transparent 1px) 0 0/40px 40px,
    #0b0c09}
.bunting{position:absolute;left:0;top:0;z-index:5}
.star{position:absolute;color:#ffd642;opacity:.55;z-index:1}
.hazard{position:absolute;left:0;right:0;bottom:0;height:8px;background:repeating-linear-gradient(135deg,#ffd642 0 12px,#0b0c09 12px 24px)}
.crop{position:absolute;overflow:hidden}
.crop img{position:absolute;max-width:none}
.wheel{-webkit-mask-image:radial-gradient(circle at 47% 50%,#000 61%,transparent 66%),linear-gradient(90deg,transparent 70%,#000 70%,#000 100%);-webkit-mask-composite:source-over;mask-composite:add}
.lift{box-shadow:0 0 0 1px #ffd64233,0 18px 40px #000d}

.copy{position:absolute;left:52px;top:96px;width:480px;z-index:4}
.kicker{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#ffd642}
.kicker .se{white-space:nowrap;font-size:11px;color:#fff;background:${SE_BLUE};padding:3px 8px 3px 10px;letter-spacing:.2em;box-shadow:inset 0 0 0 1px ${SE_YELLOW}66}
h1{font-family:Archivo,sans-serif;font-stretch:125%;font-weight:800;text-transform:uppercase;line-height:.92;margin:16px 0 0;font-size:64px;letter-spacing:-.01em}
h1 .gold{color:#ffd642}
.is{display:flex;align-items:center;gap:14px;margin:8px 0 6px;font:700 18px 'Chakra Petch';letter-spacing:.3em;color:#4ad7c8}
.is i{flex:1;height:3px;background:linear-gradient(90deg,#9a9b82,#6fbf73,#4ad7c8)}
.is i:last-child{background:linear-gradient(90deg,#4ad7c8,#ffd642,#ff4b3e)}
.sub{margin-top:12px;font-size:16px;line-height:1.45;color:#b8b08d;font-weight:500}
.sub b{color:#eceada;font-weight:600}
.beats{display:flex;gap:6px;margin-top:14px}
.beats span{font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#eceada;background:#1a1d15;padding:7px 14px 7px 12px;clip-path:polygon(0 0,calc(100% - 9px) 0,100% 50%,calc(100% - 9px) 100%,0 100%)}
.beats b{color:#ffd642;margin-right:7px}

.brand{display:flex;align-items:center;gap:10px}
.mark{width:34px;height:34px}
.word{font-family:Archivo,sans-serif;font-stretch:125%;font-weight:800;font-size:22px;letter-spacing:.04em}
.beta{font-size:11px;font-weight:700;letter-spacing:.24em;color:#0b0c09;background:#ffd642;padding:3px 8px}
.legal{position:absolute;left:52px;bottom:16px;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#5d5b4c}

.label{position:absolute;z-index:6;font-size:10px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#0b0c09;background:#ffd642;padding:3px 8px}
.label.dark{background:#0b0c09;color:#ffd642;box-shadow:inset 0 0 0 1px #ffd64288}
.pact{position:absolute;width:150px;z-index:3}
.pact img{width:100%;display:block;box-shadow:0 14px 34px #000e}
.caption{position:absolute;z-index:6;font-size:10px;font-weight:700;letter-spacing:.22em;color:#b8b08d}
</style>
${bunting(1200)}
${stars}

<div class="copy">
  <div class="kicker"><span class="brand">${mark}<span class="word">GRIFFDIVE</span><span class="beta">BETA</span></span><span class="se">★★★★★ Liberty Day 2186</span></div>
  <h1>Freedom</h1>
  <div class="is"><i></i>IS<i></i></div>
  <h1 class="gold" style="margin-top:0">Earned.</h1>
  <p class="sub">A squad roguelike for <b>Helldivers 2</b>. Spin the <b>Wheel of Adversity</b>, swear <b>pacts</b>, climb <b>3 → 10</b>. More risk, rarer loot.</p>
  <div class="beats"><span><b>01</b>Call</span><span><b>02</b>Pacts</span><span><b>03</b>Dive</span><span><b>04</b>Loot</span></div>
</div>

${crop('call.png', [40, 1664, 1720, 116], 480, 'left:52px;top:434px;z-index:4', 'lift')}
<span class="label dark" style="left:52px;top:418px">1–4 divers · live-synced</span>

<span class="label dark" style="left:52px;top:488px">Every Griffdiver's Starting Kit</span>
<span class="caption" style="left:52px;top:510px">PRIMARY</span>
<span class="caption" style="left:156px;top:510px">STRATAGEMS</span>
${crop('kit.png', [19, 122, 215, 178], 92, 'left:52px;top:526px;z-index:4', 'lift')}
${crop('kit.png', [727, 628, 1031, 221], 355, 'left:156px;top:526px;z-index:4', 'lift')}

${crop('call.png', [380, 190, 1370, 1280], 420, 'left:752px;top:74px;z-index:2', 'wheel')}
<span class="label" style="left:742px;top:108px">01 · Wheel of Adversity</span>

<div class="pact" style="left:556px;top:236px;transform:rotate(-7deg)"><img src="${png('pact-1.png')}"></div>
<div class="pact" style="left:678px;top:248px;transform:rotate(3deg)"><img src="${png('pact-2.png')}"></div>
<span class="label dark" style="left:564px;top:220px;transform:rotate(-7deg)">02 · Swear pacts</span>

${crop('report.png', [520, 680, 800, 140], 210, 'left:966px;top:384px;z-index:5', 'lift')}
<span class="label dark" style="left:966px;top:368px">03 · Dive · report</span>

${crop('rewards.png', [544, 392, 2010, 856], 510, 'left:656px;top:432px;z-index:4;background:#0b0c09', 'lift')}
<span class="label" style="left:656px;top:416px">04 · Every option rolls its own tier</span>

<div class="legal">Fan project · not affiliated with Sony or Arrowhead</div>
<div class="hazard"></div>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
await page.screenshot({ path: outFile })
await browser.close()
console.log(outFile)
