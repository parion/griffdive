// Display names (Archivo at 125% width) must never split mid-word: a card
// would rather shrink "UNTOUCHABLE" than orphan its last letter. This measures
// the name's longest unbreakable run in ems, so CSS can cap the font size at
// `100cqi / var(--fit-len)` against the card's width. Advances are measured
// from the vendored font (uppercase, `.disp` tracking included).
const ADVANCE: Readonly<Record<string, number>> = {
  'A': 0.94, 'B': 0.92, 'C': 0.95, 'D': 0.94, 'E': 0.87, 'F': 0.8, 'G': 1.02, 'H': 1, 'I': 0.38, 'J': 0.74,
  'K': 0.95, 'L': 0.76, 'M': 1.16, 'N': 1, 'O': 1.02, 'P': 0.87, 'Q': 1.02, 'R': 0.94, 'S': 0.87, 'T': 0.85,
  'U': 0.97, 'V': 0.91, 'W': 1.22, 'X': 0.95, 'Y': 0.93, 'Z': 0.87,
  '-': 0.43, '.': 0.37, ',': 0.37, '\'': 0.28, '’': 0.32, ':': 0.36, '!': 0.37,
  '&': 1.01, '/': 0.32, '+': 0.74, '(': 0.38, ')': 0.38,
}
const DIGIT = 0.8
const UNKNOWN = 1.02
// Sub-pixel rounding and the glyph's own side bearing need a hair of slack.
const SLACK = 1.04

function runWidth(run: string): number {
  let width = 0
  for (const glyph of run.toUpperCase()) {
    width += ADVANCE[glyph] ?? (glyph >= '0' && glyph <= '9' ? DIGIT : UNKNOWN)
  }
  return width * SLACK
}

// Browsers may break after a hyphen, so "ADRENO-DEFIBRILLATOR" is two runs.
export function fitWord(name: string): { '--fit-len': string } {
  const runs = name.split(/\s+|(?<=-)/).filter(Boolean)
  const longest = Math.max(1, ...runs.map(runWidth))
  return { '--fit-len': longest.toFixed(3) }
}
