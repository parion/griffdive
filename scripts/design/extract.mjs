// Extract the Destroyer Terminal Anima bundle into per-page HTML.
//
//   node scripts/design/extract.mjs
//
// Writes:
//   .orca/drops/extracted/<NN>-<name>.html        raw page template (git-ignored)
//   .orca/drops/extracted/_render/<NN>-<name>.html font-inlined, standalone (git-ignored)
//
// The committed contract (design/spec/*.json) is produced separately by
// `node scripts/design/spec.mjs`, which reads the _render output.

import fs from 'node:fs'
import { readBundle, decodePages, inlineAssets } from './lib.mjs'

const OUT = new URL('../../.orca/drops/extracted/', import.meta.url)
const RENDER = new URL('../../.orca/drops/extracted/_render/', import.meta.url)
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(RENDER, { recursive: true })

const pages = decodePages(readBundle())
for (const page of pages) {
  fs.writeFileSync(new URL(`${page.name}.html`, OUT), page.template)
  // Strip external runtime scripts (Anima CDN + fonts): the design is a static
  // mock, we only need its markup and inline styles for rendering.
  const rendered = inlineAssets(page.template, page.assets)
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
  fs.writeFileSync(new URL(`${page.name}.html`, RENDER), rendered)
  console.log('extracted', page.name, `${page.template.length}b`, `${Object.keys(page.assets).length} assets`)
}
