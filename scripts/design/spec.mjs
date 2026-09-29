// Render each extracted design page and emit a machine-readable region tree.
//
//   node scripts/design/spec.mjs [NN-name ...]
//
// Writes design/spec/<NN>-<name>.json — the committed design contract the
// conformance check (e2e/design-conformance.spec.ts) diffs the app against.
// Only meaningful nodes are recorded: elements carrying an id, class,
// aria-label, or their own text, at non-zero size. SVG internals are skipped
// (the owning <svg> is recorded instead).

import fs from 'node:fs'
import { chromium } from '@playwright/test'
import { readBundle, decodePages, inlineAssets, previewSize } from './lib.mjs'

const SPEC = new URL('../../design/spec/', import.meta.url)
const RENDER = new URL('../../.orca/drops/extracted/_render/', import.meta.url)
fs.mkdirSync(SPEC, { recursive: true })

const wanted = process.argv.slice(2)
const pages = decodePages(readBundle()).filter(p => !wanted.length || wanted.includes(p.name))

const SKIP = new Set(['path', 'g', 'rect', 'circle', 'line', 'polyline', 'polygon', 'ellipse',
  'defs', 'stop', 'lineargradient', 'radialgradient', 'clippath', 'mask', 'filter', 'use', 'symbol'])

const browser = await chromium.launch()
for (const page of pages) {
  const { width, height } = previewSize(page.template)
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const tab = await ctx.newPage()
  // Use the font-inlined render copy if present, else inline on the fly.
  const renderPath = new URL(`${page.name}.html`, RENDER)
  const html = fs.existsSync(renderPath)
    ? fs.readFileSync(renderPath, 'utf8')
    : inlineAssets(page.template, page.assets).replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
  await tab.setContent(html, { waitUntil: 'load' })
  await tab.evaluate(() => document.fonts.ready)
  await tab.waitForTimeout(250)

  const regions = await tab.evaluate((skipList) => {
    const skip = new Set(skipList)
    const out = []
    const first = v => v.split(',')[0].replace(/["']/g, '').trim()
    const walk = (el, path) => {
      const tag = el.tagName.toLowerCase()
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
        const meaningful = visible && r.width > 0 && r.height > 0
          && (cls || id || aria || direct)
        if (meaningful) {
          out.push({
            name: id || aria || cls.split(/\s+/)[0] || tag,
            path: cpath,
            tag: ctag,
            class: cls,
            id,
            aria,
            text: direct.slice(0, 80),
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
          })
        }
        walk(child, cpath)
      }
    }
    walk(document.body, 'body')
    return out
  }, [...SKIP])

  const doc = { page: page.name, viewport: { width, height }, regions }
  fs.writeFileSync(new URL(`${page.name}.json`, SPEC), JSON.stringify(doc, null, 1) + '\n')
  console.log('spec', page.name, regions.length, 'regions')
  await ctx.close()
}
await browser.close()
