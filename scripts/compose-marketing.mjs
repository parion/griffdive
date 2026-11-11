// Frames the captured stills into 1200x675 social cards. Run capture-marketing.mjs first.
// Usage: node scripts/compose-marketing.mjs [imagesDir]
import { chromium } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve(process.argv[2] ?? 'docs/marketing/images')
const outDir = `${dir}/cards`
mkdirSync(outDir, { recursive: true })
const font = readFileSync(resolve('public/fonts/archivo-variable-latin.woff2')).toString('base64')
const img = name => `data:image/png;base64,${readFileSync(`${dir}/${name}`).toString('base64')}`

const cards = [
  { file: 'card-1-hero', kicker: 'Helldivers 2 · Squad roguelike', head: 'Risk buys <em>rarity.</em>', sub: 'Spin the Wheel of Adversity. Swear pacts. Climb 3 → 10 on scavenged gear.', shot: 'desktop-01-bridge.png' },
  { file: 'card-2-wheel', kicker: 'The Wheel of Adversity', head: 'Zero Deaths. Pacifist. <em>Melee Only.</em>', sub: 'Spin a squad directive. Your squad votes to take it. Taking it is how you earn S-tier.', shot: 'desktop-03-directive.png' },
  { file: 'card-3-pacts', kicker: 'Personal pacts', head: 'Swear your <em>pacts.</em>', sub: 'Every rule is checkable in-game: loadout, field, or stats screen. Break one and it costs you loot.', shot: 'desktop-04-pacts.png' },
  { file: 'card-4-loot', kicker: 'The draft', head: 'Every option rolls its <em>own tier.</em>', sub: 'The odds line is bought with the risk you chose. Fail a mission and you forfeit what you earned.', shot: 'desktop-07-rewards.png' },
]

const base = `
@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${font});font-weight:100 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:675px;background:#0b0c09;color:#ece9d8;font-family:'Chakra Petch',ui-sans-serif,system-ui,sans-serif;position:relative;overflow:hidden;
 background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:40px 40px}
.stripe{position:absolute;left:0;top:0;width:100%;height:10px;background:repeating-linear-gradient(135deg,#ffd642 0 14px,#0b0c09 14px 28px)}
.kicker{color:#ffd642;font-size:15px;letter-spacing:.28em;text-transform:uppercase;font-weight:600}
h1{font-family:Archivo,'Arial Black',sans-serif;font-stretch:125%;font-weight:800;text-transform:uppercase;line-height:.98;letter-spacing:-.01em}
h1 em{font-style:normal;color:#ffd642}
.sub{color:#b9b59c;font-size:21px;line-height:1.4}
.foot{position:absolute;left:48px;bottom:26px;right:48px;display:flex;justify-content:space-between;align-items:center;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8a8672}
.beta{border:1px solid #ffd642;color:#ffd642;padding:3px 10px}
.brand{color:#ffd642;font-weight:700;font-size:15px}
`

const wide = c => `<style>${base}
.copy{position:absolute;left:48px;top:70px;width:410px}
h1{font-size:50px;margin:20px 0 24px}
.frame{position:absolute;left:490px;top:118px;width:690px;border:2px solid #ffd642;box-shadow:0 0 0 6px #0b0c09,0 24px 60px #000c}
.frame img{display:block;width:100%}
</style><div class=stripe></div>
<div class=copy><div class=kicker>${c.kicker}</div><h1>${c.head}</h1><p class=sub>${c.sub}</p></div>
<div class=frame><img src="${img(c.shot)}"></div>
<div class=foot><span class=brand>GRIFFDIVE</span><span>Fan project · not affiliated with Sony or Arrowhead</span><span class=beta>Beta</span></div>`

const phones = `<style>${base}
.copy{position:absolute;left:48px;top:70px;width:420px}
h1{font-size:46px;margin:20px 0 24px}
.ph{position:absolute;top:64px;width:200px;height:433px;border:2px solid #ffd642;border-radius:26px;overflow:hidden;box-shadow:0 0 0 6px #0b0c09,0 24px 50px #000c;background:#000}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top}
</style><div class=stripe></div>
<div class=copy><div class=kicker>Phone-first, between drops</div><h1>Check it between <em>drops.</em></h1><p class=sub>Call the directive, swear pacts, file the report and draft loot without leaving the dive. Installable, no account.</p></div>
<div class=ph style="left:520px;top:90px"><img src="${img('phone-03-directive.png')}"></div>
<div class=ph style="left:745px;top:130px"><img src="${img('phone-04-pacts.png')}"></div>
<div class=ph style="left:970px;top:170px"><img src="${img('phone-07-rewards.png')}"></div>
<div class=foot><span class=brand>GRIFFDIVE</span><span>Fan project · not affiliated with Sony or Arrowhead</span><span class=beta>Beta</span></div>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 2 })
for (const c of cards) {
  await page.setContent(wide(c))
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/${c.file}.png` })
}
await page.setContent(phones)
await page.waitForTimeout(300)
await page.screenshot({ path: `${outDir}/card-5-phone.png` })
await browser.close()
