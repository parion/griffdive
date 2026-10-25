#!/usr/bin/env node
// Reads the feedback inbox straight off the storage file (or stdin, when pulled
// off the Fly volume) and prints it newest-first. No auth, no server call: the
// inbox is one JSON array at `.data/feedback/inbox`.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const source = args.find(arg => !arg.startsWith('--')) ?? resolve(process.cwd(), '.data/feedback/inbox')

async function readSource() {
  if (source === '-') {
    const chunks = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks).toString('utf8')
  }
  return readFile(source, 'utf8')
}

const raw = await readSource().catch((cause) => {
  if (cause?.code === 'ENOENT') {
    return null
  }
  throw cause
})

if (raw === null) {
  console.log('Inbox empty.')
  process.exit(0)
}

let entries
try {
  entries = JSON.parse(raw)
}
catch {
  console.error(`Not valid JSON: ${source}`)
  process.exit(1)
}

if (!Array.isArray(entries)) {
  console.error(`Expected a JSON array of feedback entries: ${source}`)
  process.exit(1)
}

const sorted = [...entries].sort((a, b) => b.at - a.at)

if (asJson) {
  process.stdout.write(`${JSON.stringify(sorted, null, 2)}\n`)
  process.exit(0)
}

if (sorted.length === 0) {
  console.log('Inbox empty.')
  process.exit(0)
}

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
for (const entry of sorted) {
  const context = entry.context ?? {}
  const facts = [context.path, context.version, context.phase && `phase ${context.phase}`, context.difficulty && `difficulty ${context.difficulty}`]
    .filter(Boolean)
    .join(' · ')
  console.log(`\n${entry.id}  ${when.format(new Date(entry.at))}  [${entry.category}]`)
  if (facts) {
    console.log(`  ${facts}`)
  }
  for (const line of String(entry.message ?? '').split('\n')) {
    console.log(`  ${line}`)
  }
  if (entry.contact) {
    console.log(`  reply-to: ${entry.contact}`)
  }
}
console.log(`\n${sorted.length} note${sorted.length === 1 ? '' : 's'}.`)
