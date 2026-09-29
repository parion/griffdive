// Shared helpers for the Destroyer Terminal design pipeline.
// The Anima export is a single HTML file with three top-level JSON script
// blocks: manifest (page id -> gzipped template), page_order, and template.
// Each decoded page is itself a mini Anima bundle with its own manifest
// (asset uuid -> gzipped bytes), template, and ext_resources.

import fs from 'node:fs'
import zlib from 'node:zlib'

export const BUNDLE = new URL('../../.orca/drops/Griffdive — Destroyer Terminal redesign.html', import.meta.url)

// Page order is fixed by the export; the names are the extract contract.
export const PAGE_NAMES = [
  '00-bridge',
  '01-lobby',
  '02-armory',
  '03-briefing',
  '04-phone-briefing',
  '05-wheel',
  '06-pacts',
  '07-dive',
  '08-mission-report',
  '09-reward-draft',
  '10-squad-honors',
  '11-mission-failed',
  '12-achieved',
  '13-phone-bridge',
  '14-phone-wheel',
  '15-phone-pacts',
  '16-phone-report',
  '17-phone-reward',
  '18-foundations',
]

export function grabBlock(html, name) {
  const m = html.match(new RegExp(`<script type="__bundler/${name}">\\s*([\\s\\S]*?)\\s*</script>`))
  if (!m) throw new Error(`missing __bundler/${name} block`)
  return JSON.parse(m[1])
}

function tryGrabBlock(html, name) {
  try {
    return grabBlock(html, name)
  }
  catch {
    return null
  }
}

export function decodeEntry(entry) {
  let buf = Buffer.from(entry.data, 'base64')
  if (entry.compressed) buf = zlib.gunzipSync(buf)
  return buf
}

// A page's inner bundle carries its own manifest; the template references
// assets by uuid in url("..."). Inline them as data URIs so the page renders
// standalone (fonts are the only asset that matters for layout fidelity).
export function inlineAssets(template, assetManifest) {
  const map = {}
  for (const [uuid, entry] of Object.entries(assetManifest)) {
    const buf = decodeEntry(entry)
    map[uuid] = `data:${entry.mime};base64,${buf.toString('base64')}`
  }
  return template.replace(/url\((["']?)([0-9a-f-]{36})\1\)/g, (m, _q, uuid) =>
    map[uuid] ? `url("${map[uuid]}")` : m)
}

export function readBundle() {
  return fs.readFileSync(BUNDLE, 'utf8')
}

// Decode every page into { name, template, assets } in page order.
export function decodePages(html) {
  const manifest = grabBlock(html, 'manifest')
  const order = grabBlock(html, 'page_order')
  return order.map((id, i) => {
    const entry = manifest[id]
    const inner = decodeEntry(entry).toString('utf8')
    const template = grabBlock(inner, 'template')
    const assets = tryGrabBlock(inner, 'manifest') ?? {}
    return { name: PAGE_NAMES[i], template, assets }
  })
}

// The Anima data props sit in a trailing <script type="text/x-dc"> block and
// carry the canvas size the page was authored at.
export function previewSize(template) {
  const m = template.match(/\$preview&quot;:\{&quot;width&quot;:(\d+),&quot;height&quot;:(\d+)\}/)
  if (m) return { width: Number(m[1]), height: Number(m[2]) }
  const m2 = template.match(/"\$preview"\s*:\s*\{\s*"width"\s*:\s*(\d+)\s*,\s*"height"\s*:\s*(\d+)/)
  if (m2) return { width: Number(m2[1]), height: Number(m2[2]) }
  return { width: 1440, height: 900 }
}
