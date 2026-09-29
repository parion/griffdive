// Design conformance: render each app screen at its design page's state and
// diff the static text styling against the extracted design contract
// (design/spec/<page>.json). Report-only by default; set DESIGN_STRICT=1 to
// fail on any style mismatch (the ratchet CI will run once the baseline is
// clean).
//
//   pnpm design:check          # strict
//   pnpm test:e2e              # report-only, alongside the flow specs
//
// Regenerate the contract with `pnpm design:extract` after a design change.

import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { DESIGN_TARGETS, type DesignStep, type DesignTarget } from '../design/map'
import { saveDocFor } from '../design/states'

const ROOT = process.cwd()
const SPEC_DIR = path.join(ROOT, 'design', 'spec')
const REPORT_DIR = path.join(ROOT, 'design', 'report')
const SAVE_KEY = 'griffdive:saves:v1'
const SLOT = '00000000-0000-4000-8000-000000000001'
const STRICT = process.env.DESIGN_STRICT === '1'

const SKIP_TAGS = new Set(['svg', 'path', 'g', 'rect', 'circle', 'line', 'polyline', 'polygon',
  'ellipse', 'defs', 'stop', 'lineargradient', 'radialgradient', 'clippath', 'mask', 'filter',
  'use', 'symbol', 'script', 'style'])

interface Region {
  name: string
  path: string
  tag: string
  text: string
  box: { x: number, y: number, w: number, h: number }
  font: { family: string, size: number, weight: string, spacing: string, transform: string }
  color: string
}

interface AppText {
  text: string
  font: { family: string, size: number, weight: string, transform: string }
  color: string
}

// A design label we can match on: not an Anima placeholder, long enough to be
// unambiguous, and not a bare value (numbers/punctuation collide across the
// page and drown the report in false positives).
function isStatic(text: string): boolean {
  return text.length >= 3 && !text.includes('{{') && !/^[\d\s·/%,.+\-–—×★]+$/.test(text)
}

async function applySteps(page: import('@playwright/test').Page, steps: DesignStep[]): Promise<void> {
  for (const step of steps) {
    switch (step) {
      case 'open-armory':
        await page.getByRole('button', { name: 'Armory' }).click()
        await expect(page.getByRole('dialog').first()).toBeVisible()
        break
      case 'open-briefing':
        await expect(page.getByRole('heading', { name: /Identify|Griffdiver/i }).first()).toBeVisible()
        break
      case 'open-report-success':
        await page.getByRole('button', { name: 'Mission complete' }).click()
        await expect(page.getByRole('heading', { name: 'Mission complete' })).toBeVisible()
        break
      case 'open-report-failure':
        await page.getByRole('button', { name: 'Mission failed' }).click()
        await expect(page.getByRole('heading', { name: 'Mission failed' })).toBeVisible()
        break
      case 'open-honors':
        // The honors link only appears once every diver has picked, so resolve
        // the draft first.
        await page.locator('.pod-card .item-card:not([disabled])').first().click()
        await page.getByRole('button', { name: 'Squad Honors' }).click()
        await expect(page.getByRole('heading', { name: 'Squad Honors' })).toBeVisible()
        break
    }
  }
}

async function collectAppText(page: import('@playwright/test').Page): Promise<AppText[]> {
  return page.evaluate((skipList) => {
    const skip = new Set(skipList)
    const out: AppText[] = []
    const walk = (el: Element) => {
      for (const child of Array.from(el.children)) {
        const tag = child.tagName.toLowerCase()
        if (skip.has(tag)) continue
        const direct = Array.from(child.childNodes)
          .filter(node => node.nodeType === 3)
          .map(node => (node.textContent ?? '').trim())
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        const cs = getComputedStyle(child)
        const r = child.getBoundingClientRect()
        if (direct && r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden') {
          out.push({
            text: direct.slice(0, 80),
            font: {
              family: cs.fontFamily.split(',')[0]!.replace(/["']/g, '').trim(),
              size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
              weight: cs.fontWeight,
              transform: cs.textTransform,
            },
            color: cs.color,
          })
        }
        walk(child)
      }
    }
    walk(document.body)
    return out
  }, [...SKIP_TAGS])
}

async function runTarget(page: import('@playwright/test').Page, target: DesignTarget): Promise<void> {
  const specPath = path.join(SPEC_DIR, `${target.page}.json`)
  if (!fs.existsSync(specPath)) {
    test.skip(true, `no design spec for ${target.page} — run pnpm design:extract`)
    return
  }
  const doc = JSON.parse(fs.readFileSync(specPath, 'utf8')) as {
    page: string
    viewport: { width: number, height: number }
    regions: Region[]
  }
  const viewport = target.viewport ?? doc.viewport

  await page.setViewportSize(viewport)
  // Seed the local save (and the one-shot intro flags) before the app boots.
  const seed: Record<string, string> = {}
  if (target.state) {
    seed[SAVE_KEY] = JSON.stringify({ [SLOT]: saveDocFor(target.state) })
  }
  // Keep the dive-start overlays quiet unless the target wants the briefing.
  const wantsBriefing = target.steps?.includes('open-briefing')
  seed['griffdive:warbond-intro:v1'] = '1'
  if (!wantsBriefing) {
    seed['griffdive:dive-intro:v1'] = '1'
  }
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, value as string)
    }
  }, seed)

  const url = target.route === 'dive' ? `/dive/${SLOT}` : target.route
  await page.goto(url)
  // Wait for the screen to actually mount (dev HMR is slower than the prod
  // build), then let fonts/layout settle.
  const ready = target.route === 'dive' ? '.dive-page' : target.route === '/' ? '.bridge' : 'main'
  await page.waitForSelector(ready, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await applySteps(page, target.steps ?? [])

  const appTexts = await collectAppText(page)
  // A design label can appear several times in the app (a wordmark in the
  // header and a hero in the body), so keep every instance and match each
  // design region to the closest size. A missing hero still surfaces as a size
  // mismatch against the small instance.
  const byText = new Map<string, AppText[]>()
  for (const entry of appTexts) {
    const list = byText.get(entry.text)
    if (list) {
      list.push(entry)
    }
    else {
      byText.set(entry.text, [entry])
    }
  }

  const mismatches: { text: string, prop: string, design: string | number, app: string | number }[] = []
  const unmatched: string[] = []
  let matched = 0
  for (const region of doc.regions) {
    if (!isStatic(region.text)) continue
    const candidates = byText.get(region.text)
    if (!candidates) {
      unmatched.push(region.text)
      continue
    }
    const app = candidates.reduce((best, entry) =>
      Math.abs(entry.font.size - region.font.size) < Math.abs(best.font.size - region.font.size) ? entry : best)
    matched++
    const push = (prop: string, d: string | number, a: string | number) =>
      mismatches.push({ text: region.text, prop, design: d, app: a })
    if (region.font.family !== app.font.family) push('family', region.font.family, app.font.family)
    if (Math.abs(region.font.size - app.font.size) > 1.5) push('size', region.font.size, app.font.size)
    if (region.font.weight !== app.font.weight) push('weight', region.font.weight, app.font.weight)
    if (region.font.transform !== app.font.transform) push('transform', region.font.transform, app.font.transform)
    if (region.color !== app.color) push('color', region.color, app.color)
  }

  const report = {
    page: target.page,
    viewport,
    designRegions: doc.regions.length,
    matched,
    mismatches,
    unmatched,
    appTextNodes: appTexts.length,
  }
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(path.join(REPORT_DIR, `${target.page}.json`), `${JSON.stringify(report, null, 1)}\n`)
  if (process.env.DESIGN_SHOT === '1') {
    await page.screenshot({ path: path.join(REPORT_DIR, `${target.page}.png`) })
  }

  const summary = mismatches.length
    ? `${target.page}: ${matched} matched, ${mismatches.length} mismatches — ${mismatches.slice(0, 6).map(m => `${m.text}:${m.prop} ${m.design}→${m.app}`).join(', ')}`
    : `${target.page}: ${matched} matched, 0 mismatches`
  console.log(`[design] ${summary}`)

  if (STRICT) {
    expect(mismatches, summary).toEqual([])
  }
}

for (const target of DESIGN_TARGETS) {
  test(`design conformance: ${target.page}`, async ({ page }) => {
    await runTarget(page, target)
  })
}
