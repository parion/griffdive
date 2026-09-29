# Design contract

The Destroyer Terminal design ships as a single Anima export (`.orca/drops/Griffdive —
Destroyer Terminal redesign.html`, git-ignored). This directory holds the **distilled,
repo-owned contract** so the app can be checked against the design without pointing at the
11 MB bundle.

- `spec/<NN>-<name>.json` — per-page region tree: every element carrying an id, class,
  aria-label or its own text, with its box (at the page's authored viewport), text, computed
  font, and colors. Committed.
- `map.ts` — design page → app route + engine fixture + UI steps (the conformance targets).
- `states.ts` — deterministic engine fixtures (lobby, spin, pacts, diving, rewards, forfeit,
  complete) built through the real reducer, so a fixture can never drift from the engine.
- `report/` — generated diff output (git-ignored): per-page JSON + `summary.md`.

## Regenerate the contract

Only needed when the design changes. Requires the Anima bundle in `.orca/drops/`.

```sh
pnpm design:extract   # bundle → .orca/drops/extracted/ → design/spec/*.json
```

## Check the app against it

Renders each design page's app state and diffs the **static-text styling** (font family /
size / weight / transform / color) of every matched label. Text values themselves are not
compared — the designs are static mocks and the app is dynamic.

```sh
pnpm exec playwright test e2e/design-conformance.spec.ts   # report-only
pnpm design:check                                          # strict: fail on any mismatch
pnpm design:report                                         # rewrite report/summary.md
```

`design/report/summary.md` is the visual-QA worklist: each row is a label whose styling
diverges from the design. A match is by exact label text; unmatched design labels are dynamic
values (mission numbers, room codes, seeded content) and are ignored.

## How it fits together

```
Anima bundle ──extract──▶ .orca/drops/extracted/_render/*.html
                                 │ spec.mjs (chromium)
                                 ▼
                          design/spec/*.json  ◀── committed contract
                                 │
app (seeded via design/states.ts) │
        │  e2e/design-conformance.spec.ts
        ▼
  design/report/summary.md ── fix divergences ──▶ app components
```

The design language itself (tokens, utilities, motion) is documented in `AGENTS.md` →
Destroyer Terminal design language. This directory is the verification layer for it.
