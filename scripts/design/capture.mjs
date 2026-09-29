// Capture every scene of the Destroyer Terminal design exports.
//
//   node scripts/design/capture.mjs [Page ...]
//
// Source: the runnable per-page exports under .orca/designs/<Page>/ (unpacked
// from designs.zip) — each is a DCC artboard (<Page>.dc.html + support.js +
// vendor/react + assets) whose <script data-dc-script data-props='…'> block
// lists the page's scene options and the viewport it was authored at.
//
// The static Anima bundle only prerenders each page's *default* scene; this
// runs the real runtime once per scene so decide / sworn / banked / banning /
// landed / awarded / launched / selected / confiscated are all visible.
//
// Writes:
//   design/scenes/<Page>__<scene>.json          region tree (committed)
//   design/report/scenes/<Page>__<scene>.png    screenshot (git-ignored)
//   design/scenes.json                          manifest (committed)

import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { chromium } from '@playwright/test'

const ROOT = new URL('../../', import.meta.url)
const DESIGNS = new URL('.orca/designs/', ROOT)
const OUT = new URL('design/scenes/', ROOT)
const SHOTS = new URL('design/report/scenes/', ROOT)
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(SHOTS, { recursive: true })

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

function serve(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0])
      const file = path.join(rootDir, url)
      if (!file.startsWith(rootDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
      fs.createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

// A page's scene options and authored viewport live in the data-props JSON.
function readProps(html) {
  const m = html.match(/data-props='([^']*)'/) || html.match(/data-props="([^"]*)"/)
  if (!m) return { props: null, scenes: [], viewport: { width: 1440, height: 900 } }
  let props
  try {
    props = JSON.parse(m[1].replace(/&quot;/g, '"'))
  }
  catch {
    return { props: null, scenes: [], viewport: { width: 1440, height: 900 } }
  }
  const scenes = props?.scene?.options?.length ? props.scene.options : ['default']
  const pv = props?.$preview ?? {}
  return {
    props,
    scenes,
    default: props?.scene?.default ?? scenes[0],
    viewport: { width: pv.width ?? 1440, height: pv.height ?? 900 },
  }
}

// Rewrite the scene prop's default in a copy of the artboard so the runtime
// boots straight into the wanted scene.
function withScene(html, props, scene) {
  if (!props?.scene || scene === 'default') return html
  const next = structuredClone(props)
  next.scene.default = scene
  const json = JSON.stringify(next)
  return html.replace(/data-props='[^']*'/, `data-props='${json}'`)
}

const SKIP = new Set(['path', 'g', 'rect', 'circle', 'line', 'polyline', 'polygon', 'ellipse',
  'defs', 'stop', 'lineargradient', 'radialgradient', 'clippath', 'mask', 'filter', 'use', 'symbol',
  'script', 'style'])

async function collect(tab) {
  return tab.evaluate((skipList) => {
    const skip = new Set(skipList)
    const out = []
    const first = v => v.split(',')[0].replace(/["']/g, '').trim()
    const walk = (el, path) => {
      const kids = [...el.children]
      for (let i = 0; i < kids.length; i++) {
        const child = kids[i]
        const ctag = child.tagName.toLowerCase()
        const cpath = `${path} > ${ctag}:nth-child(${i + 1})`
        if (skip.has(ctag)) continue
        const cs = getComputedStyle(child)
        const r = child.getBoundingClientRect()
        const cls = typeof child.className === 'string' ? child.className.trim() : ''
        const id = child.id || ''
        const aria = child.getAttribute('aria-label') || ''
        const direct = [...child.childNodes]
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent.trim())
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        const visible = cs.display !== 'none' && cs.visibility !== 'hidden'
        if (visible && r.width > 0 && r.height > 0 && (cls || id || aria || direct)) {
          const anim = cs.animationName && cs.animationName !== 'none'
            ? {
                name: cs.animationName,
                duration: cs.animationDuration,
                timing: cs.animationTimingFunction,
                delay: cs.animationDelay,
                iteration: cs.animationIterationCount,
                direction: cs.animationDirection,
              }
            : undefined
          out.push({
            name: id || aria || cls.split(/\s+/)[0] || ctag,
            path: cpath,
            tag: ctag,
            class: cls,
            id,
            aria,
            text: direct.slice(0, 120),
            box: {
              x: Math.round(r.x * 10) / 10,
              y: Math.round(r.y * 10) / 10,
              w: Math.round(r.width * 10) / 10,
              h: Math.round(r.height * 10) / 10,
            },
            font: {
              family: first(cs.fontFamily),
              size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
              weight: cs.fontWeight,
              spacing: cs.letterSpacing,
              transform: cs.textTransform,
            },
            color: cs.color,
            bg: cs.backgroundColor,
            border: {
              width: Math.round(parseFloat(cs.borderTopWidth) * 10) / 10,
              color: cs.borderTopColor,
            },
            ...(anim ? { anim } : {}),
          })
        }
        walk(child, cpath)
      }
    }
    walk(document.body, 'body')
    return out
  }, [...SKIP])
}

const wanted = process.argv.slice(2)
const pages = fs.readdirSync(DESIGNS, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(name => !wanted.length || wanted.includes(name))
  .sort()

const server = await serve(DESIGNS.pathname)
const { port } = server.address()
const browser = await chromium.launch()
const manifest = []

for (const page of pages) {
  const dir = path.join(DESIGNS.pathname, page)
  const dc = fs.readdirSync(dir).find(f => f.endsWith('.dc.html'))
  if (!dc) continue
  const src = fs.readFileSync(path.join(dir, dc), 'utf8')
  const { props, scenes, viewport, default: def } = readProps(src)

  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const tab = await ctx.newPage()
  const captured = []

  for (const scene of scenes) {
    const tmp = `__scene_${scene}.html`
    fs.writeFileSync(path.join(dir, tmp), withScene(src, props, scene))
    await tab.goto(`http://127.0.0.1:${port}/${page}/${tmp}`, { waitUntil: 'load' })
    // The DCC runtime mounts React into #dc-root; wait for it, then fonts.
    await tab.waitForSelector('#dc-root > *', { timeout: 15_000 }).catch(() => {})
    await tab.evaluate(() => document.fonts.ready)
    await tab.waitForTimeout(500)

    const regions = await collect(tab)
    const key = `${page}__${scene}`
    fs.writeFileSync(new URL(`${key}.json`, OUT), `${JSON.stringify({
      page,
      scene,
      viewport,
      regions,
    }, null, 1)}\n`)
    await tab.screenshot({ path: new URL(`${key}.png`, SHOTS).pathname })
    captured.push(scene)
    console.log(`capture ${key} ${regions.length} regions`)
  }

  await ctx.close()
  manifest.push({ page, dc, viewport, default: def ?? scenes[0], scenes: captured })
}

await browser.close()
server.close()
fs.writeFileSync(new URL('design/scenes.json', ROOT), `${JSON.stringify({ pages: manifest }, null, 1)}\n`)
console.log('manifest: design/scenes.json —', manifest.length, 'pages,',
  manifest.reduce((n, p) => n + p.scenes.length, 0), 'scenes')
