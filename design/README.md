# Design contract

The Destroyer Terminal design ships two ways (both git-ignored):

- `.orca/drops/Griffdive — Destroyer Terminal redesign.html` — the single Anima bundle. Static
  export: only each page's **default scene** is prerendered.
- `.orca/drops/designs.zip` — the runnable per-page exports (`<Page>.dc.html` + `support.js` +
  `vendor/react` + assets). Each page's `data-props` lists its **scene options** and authored
  viewport, so every scene (`decide`, `sworn`, `banked`, `banning`, `landed`, `launched`, …) can be
  rendered — not just the default.

This directory holds the **distilled, repo-owned contract** so the app can be checked against the
design without pointing at the bundle.

- `scenes.json` — the scene manifest: each page's `dc` file, authored viewport, default scene and
  full scene list.
- `scenes/<Page>__<scene>.json` — per-scene region tree: every element carrying an id, class,
  aria-label or its own text, with its box, text, computed font, colors, border and any resolved
  CSS `animation`. Committed. **This is the authoritative design contract.**
- `spec/<NN>-<name>.json` — the older default-scene-only extract from the Anima bundle. Kept for
  reference; superseded by `scenes/`.
- `map.ts` — design page → app route + engine fixture + UI steps (the conformance targets).
- `states.ts` — deterministic engine fixtures (lobby, spin, pacts, diving, rewards, forfeit,
  complete) built through the real reducer, so a fixture can never drift from the engine.
- `report/` — generated diff output (git-ignored): per-page JSON, `summary.md`, and the captured
  design screenshots under `report/scenes/`.

## Regenerate the scene contract

Only needed when the design changes. Requires `designs.zip` in `.orca/drops/`.

```sh
# unpack the per-page exports into .orca/designs/<Page>/
# (unzip designs.zip, then unzip each nested <Page>-html.zip into its own folder)
pnpm design:capture                 # all pages × all scenes → design/scenes/
pnpm design:capture Rewards Wheel   # just some pages
```

`capture.mjs` serves `.orca/designs/`, boots each scene by rewriting the `data-props` default in a
throwaway copy, waits for the runtime + fonts, and writes the region tree and a screenshot.

The older default-scene extract (from the Anima bundle) is regenerated with:

```sh
pnpm design:extract   # bundle → .orca/drops/extracted/ → design/spec/*.json
```

## Check the app against it

Renders each design scene's app state and diffs the **static-text styling** (font family / size /
weight / transform / color) of every matched label. Text values themselves are not compared — the
designs are static mocks and the app is dynamic.

```sh
pnpm exec playwright test e2e/design-conformance.spec.ts   # report-only
pnpm design:check                                          # strict: fail on any mismatch
pnpm design:report                                         # rewrite report/summary.md
```

`design/report/summary.md` is the visual-QA worklist: each row is a label whose styling diverges
from the design. A match is by exact label text; unmatched design labels are dynamic values
(mission numbers, room codes, seeded content) and are ignored.

## How it fits together

```
designs.zip ──unpack──▶ .orca/designs/<Page>/<Page>.dc.html
                                 │ capture.mjs (chromium, one render per scene)
                                 ▼
                          design/scenes/<Page>__<scene>.json  ◀── committed contract
                                 │
app (seeded via design/states.ts) │
        │  e2e/design-conformance.spec.ts
        ▼
  design/report/summary.md ── fix divergences ──▶ app components
```

The design language itself (tokens, utilities, motion) is documented in `AGENTS.md` →
Destroyer Terminal design language. This directory is the verification layer for it.
