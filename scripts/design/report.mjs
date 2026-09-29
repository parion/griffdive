// Aggregate design/report/*.json (written by e2e/design-conformance.spec.ts)
// into design/report/summary.md — the visual-QA worklist.
//
//   node scripts/design/report.mjs

import fs from 'node:fs'
import path from 'node:path'

const REPORT_DIR = path.join(process.cwd(), 'design', 'report')
if (!fs.existsSync(REPORT_DIR)) {
  console.error('no design/report — run `pnpm exec playwright test e2e/design-conformance.spec.ts` first')
  process.exit(1)
}

const files = fs.readdirSync(REPORT_DIR).filter(f => f.endsWith('.json')).sort()
let totalMismatches = 0
const rows = []
for (const file of files) {
  const report = JSON.parse(fs.readFileSync(path.join(REPORT_DIR, file), 'utf8'))
  totalMismatches += report.mismatches.length
  rows.push(report)
}

const lines = ['# Design conformance report', '']
lines.push(`Pages: ${rows.length} · Matched labels: ${rows.reduce((n, r) => n + r.matched, 0)} · Mismatches: ${totalMismatches}`, '')
for (const report of rows) {
  lines.push(`## ${report.page}`)
  lines.push('')
  if (!report.mismatches.length) {
    lines.push('Clean.', '')
    continue
  }
  lines.push(`Matched ${report.matched} · ${report.mismatches.length} mismatches`, '')
  lines.push('| label | prop | design | app |', '| --- | --- | --- | --- |')
  for (const m of report.mismatches) {
    lines.push(`| ${m.text} | ${m.prop} | ${m.design} | ${m.app} |`)
  }
  lines.push('')
}
fs.writeFileSync(path.join(REPORT_DIR, 'summary.md'), `${lines.join('\n')}\n`)
console.log(`design report: ${rows.length} pages, ${totalMismatches} mismatches → design/report/summary.md`)
