// Renders the link-preview cards: public/og-image.png (Open Graph / Twitter,
// 1200×630) and branding/github-social-preview.png (repo settings upload,
// 1280×640). One template, so every share surface carries the same frame as the
// Bridge hero. Chakra Petch loads from Google Fonts at render time; Archivo is
// inlined from the vendored woff2 because the page has no origin to resolve it.
import { readFile } from 'node:fs/promises'
import { BRAND_MARK } from '../app/utils/brandMark.ts'

const root = new URL('..', import.meta.url)

const TARGETS = [
  { path: 'public/og-image.png', width: 1200, height: 630 },
  { path: 'branding/github-social-preview.png', width: 1280, height: 640 },
]

const TIERS = ['#9a9b82', '#9a9b82', '#6fbf73', '#6fbf73', '#4ad7c8', '#4ad7c8', '#ffd642', '#ff4b3e']

const archivo = (await readFile(new URL('public/fonts/archivo-variable-latin.woff2', root))).toString('base64')

function dialTicks() {
  const [cx, cy] = [250, 250]
  return Array.from({ length: 72 }, (_, i) => {
    const angle = (i / 72) * Math.PI * 2
    const major = i % 9 === 0
    const r1 = major ? 214 : 222
    const r2 = 236
    const p = r => `${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`
    return `<path d="M${p(r1)} L${p(r2)}" stroke="${major ? '#ffd642' : '#3a3f2e'}" stroke-width="${major ? 3 : 2}"/>`
  }).join('')
}

function card(width, height) {
  const m = BRAND_MARK
  const ladder = TIERS.map((colour, i) => `<span style="--c:${colour}"><b>${i + 3}</b></span>`).join('')
  return `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&display=block">
<style>
@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${archivo}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}
body{width:${width}px;height:${height}px;overflow:hidden;background:#0b0c09;color:#eceada;font-family:'Chakra Petch',sans-serif;position:relative}
.bg{position:absolute;inset:0;background:
  radial-gradient(42% 62% at 77% 50%,rgba(255,214,66,.16),transparent 70%),
  radial-gradient(40% 60% at 0% 100%,rgba(74,215,200,.07),transparent 70%),
  repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 4px)}
.grid{position:absolute;inset:0;background-image:linear-gradient(#1a1d15 1px,transparent 1px),linear-gradient(90deg,#1a1d15 1px,transparent 1px);background-size:40px 40px;mask-image:radial-gradient(55% 75% at 76% 50%,#000,transparent 80%)}
.haz{position:absolute;left:0;right:0;height:12px;background:repeating-linear-gradient(-45deg,#ffd642 0 14px,#141410 14px 28px)}
.top{top:0}.bot{bottom:0}
.stage{position:absolute;inset:12px 0;display:grid;grid-template-columns:minmax(0,1fr) ${Math.round(height * 0.6)}px;align-items:center;padding:0 ${Math.round(width * 0.05)}px 0 ${Math.round(width * 0.06)}px;gap:24px}
.copy{display:flex;flex-direction:column;gap:22px}
.kick{display:flex;align-items:center;gap:14px;font-weight:700;font-size:19px;letter-spacing:.28em;text-transform:uppercase;color:#ffd642}
.kick i{display:block;width:48px;height:8px;background:repeating-linear-gradient(-45deg,#ffd642 0 6px,#141410 6px 12px)}
h1{display:flex;flex-direction:column;align-items:flex-start;width:fit-content;font-family:Archivo,sans-serif;font-stretch:125%;font-weight:900;font-size:88px;line-height:.9;text-transform:uppercase;letter-spacing:-.01em}
h1 .is{display:flex;align-items:center;gap:18px;width:100%;margin:.3em 0 .26em;font-family:'Chakra Petch',sans-serif;font-stretch:100%;font-size:22px;font-weight:700;letter-spacing:.4em;line-height:1;color:#4ad7c8}
h1 .is:before,h1 .is:after{content:"";flex:1 1 0;height:3px}
h1 .is:before{background:linear-gradient(90deg,#9a9b82 0 34%,#6fbf73 34% 67%,#4ad7c8 67%)}
h1 .is:after{background:linear-gradient(90deg,#ffd642 0 50%,#ff4b3e 50%)}
h1 .gold{color:#ffd642}
.lede{max-width:560px;font-size:23px;font-weight:500;line-height:1.38;color:#b8b08d}
.lede b{color:#eceada;font-weight:600}
.ladder{display:flex;gap:4px;width:560px}
.ladder span{flex:1;height:34px;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 18%,#13150f);border-bottom:4px solid var(--c);clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}
.ladder b{font-family:Archivo,sans-serif;font-stretch:125%;font-weight:800;font-size:17px;color:var(--c)}
.side{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px}
.dial{width:100%;aspect-ratio:1;position:relative}
.dial svg{position:absolute;inset:0;width:100%;height:100%}
.mark{position:absolute;inset:21%}
.word{font-family:Archivo,sans-serif;font-stretch:125%;font-weight:900;font-size:40px;letter-spacing:.02em;color:#eceada;line-height:1}
.url{font-weight:700;font-size:17px;letter-spacing:.32em;text-transform:uppercase;color:#9a9b82}
.url em{font-style:normal;color:#4ad7c8}
</style>
<div class="bg"></div><div class="grid"></div><div class="haz top"></div><div class="haz bot"></div>
<div class="stage">
  <div class="copy">
    <div class="kick"><i></i>Helldivers 2 · Squad roguelike</div>
    <h1><span>Freedom</span><span class="is">is</span><span class="gold">earned.</span></h1>
    <p class="lede">Spin the <b>Wheel of Adversity</b>, swear <b>pacts</b> for rarer loot and climb from Medium to <b>Super Helldive</b>.</p>
    <div class="ladder">${ladder}</div>
  </div>
  <div class="side">
    <div class="dial">
      <svg viewBox="0 0 500 500">
        <circle cx="250" cy="250" r="244" fill="none" stroke="#2c3022" stroke-width="2"/>
        <circle cx="250" cy="250" r="200" fill="rgba(19,21,15,.85)" stroke="#3a3f2e" stroke-width="2"/>
        <path d="M250 6 A244 244 0 0 1 494 250" fill="none" stroke="#ffd642" stroke-width="5"/>
        ${dialTicks()}
      </svg>
      <svg class="mark" viewBox="${m.viewBox}">
        <g fill="none" stroke="#b8b08d"><path d="${m.rim}" stroke-width="${m.rimWidth}"/><path d="${m.ticks}" stroke-width="${m.tickWidth}"/></g>
        <g fill="#ffd642"><path d="${m.wings}"/><path fill-rule="evenodd" d="${m.head}"/></g>
      </svg>
    </div>
    <div class="word">GRIFFDIVE</div>
    <div class="url">griffdive.com</div>
  </div>
</div>`
}

const { chromium } = await import('@playwright/test')
const browser = await chromium.launch()
for (const { path, width, height } of TARGETS) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(card(width, height), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: new URL(path, root).pathname })
  await page.close()
  console.log(`✔ ${path} (${width}×${height})`)
}
await browser.close()
