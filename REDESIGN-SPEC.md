# Destroyer Terminal — Per-Screen Redesign Spec

Implementation brief for closing the gap between the live app and the design drops. This file is
**intent + build order**, not a source of truth for game rules — `AGENTS.md` still owns rules,
architecture and conventions. When a screen here changes rules, data shapes or architecture, the
rule-change checklist in `PLAN.md` applies in the same commit.

## Source of truth

The authoritative design is `.orca/drops/Griffdive — Destroyer Terminal redesign.html` (git-ignored).
Per-screen extracts:

- Markup (post-`</helmet>`): `.orca/drops/extracted/_bodies/<NN>-<name>.body.html`
- Per-screen CSS: `.orca/drops/extracted/_css-*.css` + `_base-theme.css`
- Full pages: `.orca/drops/extracted/<NN>-<name>.html`

Current implementation lives in `app/components/dive/**`, `app/pages/**`, `app/assets/css/main.css`.
All references below use `file:line` against this commit's tree.

## Status legend

`Todo` · `In progress` · `Done` · `Partial` (shell exists but layout diverges) · `Missing` (no
equivalent component/layout).

## Global principles (apply to every screen)

1. **Phases are replaced, not stacked.** Today `DivePhaseWheel.vue:96-186` renders the wheel *and*
   the pact hand, and `DivePhaseRewards.vue:79-110` renders the honors ceremony *and* the reward
   draft. Each spec page is a distinct composition; a phase must swap the center column, not append.
2. **Wire the orphaned motion.** `main.css:679-752` defines the full signature keyframe set
   (`slam`, `barL`, `starIn`, `growY`, `flashIn`, `podFall/podL/podR/impact/cardIn/flipIn`,
   `bandFlash`, `thunk`, `fly0-3`, `plusOne`, `rungOn`, `numOn`, `flagIn`, `raysIn`, `tagDrop`,
   `bandIn`, `slotIn`, `podDrop`, `doorL/R`, `streak`, `breathe`, `loopLit`). Almost none are
   consumed. Each screen below lists the animations to attach.
3. **Reduced motion is mandatory.** Every new loop/one-shot honours `prefers-reduced-motion`
   (global CSS guard in `main.css` + explicit `matchMedia` for JS-driven reels/wheel).
4. **Dumb components.** Screens take state + emit intents; all math stays in
   `shared/engine/**`. Armory bans remain engine-derived (`armoryRules` / `itemBannedInArmory`,
   `shared/engine/selectors.ts`).
5. **Tokens first.** Prefer `main.css` tokens and `@container` over viewport `@media`. One
   structural breakpoint (1020px) stays. Fluid `clamp()` type/pad scale (`--fs-*`, `--pad-*`,
   `--gap-*`) already exists; use it.
6. **`.cap` is overloaded.** In the specs `.cap` is `{ text-wrap: balance }`; in `main.css:225-233`
   it is a nowrap 10px uppercase micro-label. Do **not** repurpose `.cap` for spec prose that
   expects wrapping — use a prose class.
7. **Add sample tokens.** `#45FF8D` / `#FF812A` / `#FF5AC7` (common/rare/super) are absent from
   `main.css`. Add `--sample-common/--sample-rare/--sample-super` before building the report.

## Build order

| Order | Screen | Spec | Why first |
| --- | --- | --- | --- |
| 1 | Pacts | 06 | Largest structural fix; removes wheel-from-pacts |
| 2 | Mission report | 08 | User-flagged (samples); unlocks dive + forfeit reuse |
| 3 | Reward draft | 09 | Dedicated layout + drop-pod motion |
| 4 | Squad honors | 10 | Split from draft; ceremony screen |
| 5 | Failed / forfeit | 11 | Per-diver tile picker + stamps |
| 6 | Achieved | 12 | Full-bleed takeover |
| 7 | Wheel | 05 | Title/reroll/MO/legend/CTA polish |
| 8 | Bridge home | 00 | MO strip, odds ladder, code cells |
| 9 | Lobby | 01 | Invite rail, pods, launch hold |
| 10 | Briefing | 03 | Interactive tour beats |
| 11 | Armory | 02 | Closest to spec; rail + animations |
| 12 | Dive | 07 | Mission card + void summary |
| 13 | Phone shell | 04,13-17 | Depends on 1-12 being componentized |

Screens 9-12 are lower visual priority and can slip if the shell work grows.

### Screen status (coordinator board)

The redesign landed as three commits on `Major-Redesign` (latest: `feat(dive): redesign dive screens
per destroyer-terminal spec`). Verified state at the current HEAD:

| Screen | State in tree | Notes |
| --- | --- | --- |
| 1 Pacts | Done | `PactScreen.vue` split out; wheel no longer renders in `pacts`; summary bar, filter/floor notes, hold-to-lock. `PactPicker` deduped to the hand only (the screen owns the CTA). Fixed: `canLock` no longer gated on host-only `canControl`, so every seated diver — not just the host — can lock their own pacts. Visual nit: the card-back `rotateY` deal is still a 2D translate. |
| 2 Mission report | Done | `MissionReport.vue` + `SampleCanister` + `SegmentedBar`; `DivePhaseDiving` branches to it. E2E assertions moved to the canister/segmented controls. |
| 3 Reward draft | Done | `RewardPod` + `CeilingTrack`; always-on token bar with Honors link; hold-to-confirm ban; e2e updated. Fixed: `.hazard-dark` ban fill, `CeilingTrack` S+ marker overflow, lead-pod ceiling math. |
| 4 Squad honors | Done | `BonusCeremony` split via `DivePhaseRewards v-model:view`; `RewardTokensRail`. Fixed: first-spin reel animation, `Honored` stamp + `tagFlash`, award `.crawl`, mission-counter CTA. |
| 5 Failed / forfeit | Done | `ForfeitPicker` + `ForfeitCarriesOver`; e2e updated. Fixed: `.flicker`/`.crawl-slow` animations, 40px title. |
| 6 Achieved | Done | `AchievedOverlay` wired full-bleed in `dive/[id].vue`; export action wired. Open: failed dots (no failure-history data). |
| 7 Wheel | Partial | `WheelPanel` / `WheelOfMisfortune` reworked: title + prominent Reroll-with-tally, segment risk pips + legend, front/strain hint; the MO chooser sits in the front card's pre-roll slot. Fixed: solid segment fills, "All N missions" lock label. Landed: the **"Deal the pacts" gate** — a new `deal` phase holds the wheel after both calls are in until the host presses the host-only `DEAL_PACTS` CTA (desktop + phone). Open: the MO card is not the spec's full pre-spin column card. |
| 8 Bridge home | Partial | `index.vue` rebuilt: climb ladder, "Every mission" loop, Valor sources, Solo drop + Variant & warbonds split, room-code join, Continue record. Deltas: no Major Order band; loop is 4 steps (spec wants 6 + NEXT); record is not the spec's live-room card; no per-tier odds ladder. |
| 9 Lobby | Partial | `DivePhaseLobby.vue`: hellpod bays, "Invite only", variant selector via `CrusadeSetup`. Missing: invite code-cell sidebar, route-preview strip, animated pod drop/door halves, hold-to-launch + checks strip. |
| 10 Briefing | Partial (different content) | `BriefingOverlay.vue` is a dossier with a beat rail (Squad/Sentence/File/Catch-up/Deploy/Begin). The spec's six interactive tour beats remain absent; product direction still open. |
| 11 Armory | Partial | `InventoryGrid.vue` reworked (`AppTabs`, accented sections) but still the drawer via `ArmoryDrawer`/`AppDrawer`. Spec subtitle (warbond count), `slot-in` stagger and title scale not confirmed. |
| 12 Dive | Partial | `DivePhaseDiving.vue`: locked team-risk status strip + outcome plates. Missing: 136px mission card/DEPLOYED stamp, entry shake + pod-drop overlay, `anyVoid` rail panel, `PactBriefing` skull-row/vertical-hold styling. |
| 13 Phone shell | Partial (wired) | New `DivePhone` orchestrator + `Phone*` components rendered from `dive/[id].vue` below the 1020px breakpoint via `usePhoneShell`. Fixed: `PhoneValor` partial cell, honors `@advance`. Remaining: no-scroll 390×844 fidelity, hit-size pass. |

---

# 1. Pacts — spec `06-pacts`

**Status:** Done (confirmed). **Effort:** L.

**Spec:** dedicated full-screen layout. Center column is the pact hand — **no wheel**. Structure
(`06-pacts.body.html:306-494`):

- Title row: `lbl` "Operation N · Mission M of O · <diver>'s offer" + `disp` "Swear your pacts"
  (`:306-312`), right-side status chip with 3 offer pips (12×17) + "2 of 3 sworn" (`:313-315`).
- 56px team-risk summary bar (`:355-386`): hazard lock cell · "Misfortune · squad" + skull pips +
  "NO ORBITALS +2" · front/strain cell "AUTOMATONS · JET BRIGADE +2 ×3" with a 3-pip hold marker ·
  "Team" cell with 4 risk squares + big `4`.
- Centered **264×372** card hand, 22px gap (`:388-428`); each card: skull row + risk number
  (`:397-400`), 128px glyph tile (`:401-402`), name `21px` (`:403`), rule (`:404`), dashed divider,
  channel chip (`:406-409`), and a `.back` face (hazard strips + chevron + "Pact") for a 3D
  `rotateY` deal (`:419-428`).
- Filter/floor note row (`:434-449`): dashed "1 FILTERED · ~~SHIP SILENT~~ — NO ORBITALS ALREADY
  BANS IT" + teal "LOADOUT FLOOR · 4 STRATAGEMS" with 4 stratagem icons.
- CTA (`:451-474`): full-width 62px hold-to-lock button → "Locked" stamp + glowing gold "Drop in →"
  320px link; below, a left mini "Squad Valor" bar (`:322-336`).

**Current:** `DivePhaseWheel.vue:96-186` stacks `<WheelPanel>` above `<PactPicker>` in the single
scrolling center. `PactPicker.vue:238-242` uses `repeat(auto-fit, minmax(210px,1fr))`; `:190-198` a
small "Lock in & dive" button. No summary bar, no filter/floor notes, no card backs, no team total.

**Changes:**
1. Split the pacts phase out of `WheelPanel`: when `state.phase === 'pacts'`, render only the pact
   screen (new `components/dive/PactScreen.vue`, or rework `DivePhaseWheel.vue` to branch). Keep the
   wheel mounted only for `spin|decision|strain` phases.
2. Build the team-risk summary bar from engine selectors (`activeMisfortune`, accepted strain,
   `teamRiskFor` / existing team-risk helpers). It must be read-only display.
3. Restyle `PactPicker.vue` to a centered fixed-width hand with card backs; smallest fixed width
   `264px` desktop, full-width on phone.
4. Add filter + loadout-floor notes. Filtered list derives from the offer diff (engine already
   filters via `pactOfferFor`); floor count from `legalStratagemCount` — do not recompute bans in the
   component.
5. Hold-to-lock CTA (mobile `Lock in` semantics already exist in `WheelPanel` — reuse the `hold`
   pattern) then a "Drop in" transition to `diving`.
6. Wire `dealL/dealC/dealR` (`rotateY(180deg)`, `perspective:1700px`), `popA/popB` on offer pips,
   `lockBar`, `glow` on Drop in, `ghostIn`, `swornFlash`, `stampIn`.

**Acceptance:** pacts phase shows no wheel; summary bar matches spec values; 3-card centered hand
with a 3D deal; filter/floor notes present; hold-to-lock then Drop in.

---

# 2. Mission report — spec `08-mission-report`

**Status:** Done (confirmed). **Effort:** L.

**Spec:** dedicated screen. Center opens with a **112px** banner: `flashIn` overlay, hazard bars
both sides (`barL`, origins right/left), "Mission complete" `44px` with `slam`, breadcrumb
"OP 5 · MISSION 1/3 / 7 · SUICIDE MISSION / AUTOMATONS / OBJECTIVES + EXTRACTION"
(`08-mission-report.body.html:317-329`). Body is `grid-template-columns: 1fr 300px; gap:16px`
(`:331`):

- Left: **Stars** card — five 66px buttons with 44px SVG star (`starIn` staggered + glow),
  big "N /5", honors status strip (`:337-357`). **Samples** card — three canister groups, each a
  48×100 SVG jar tinted common/rare/super (`#45FF8D`/`#FF812A`/`#FF5AC7`), 28px icon overlaid, big
  `34px` count, `+`/`−` 44px step buttons (`:363-413`). **Time remaining** card — segmented 20-cell
  bar, click-to-set cells, `+`/`−` steppers, teal value (`:415-427`).
- Right: reward-draft preview (star→options math, crates, tier table) (`:433-456`), **Performance**
  card (`48px` teal value, TIME bar, tri-color SAMPLES bar, Valor "8 → 8.3") (`:458-478`), gold
  "File report" CTA (`:480-483`).
- Left rail: Squad honors block (awarded / need-5-stars) (`:302-311`). Right rail: Valor cells with
  `growY` fill (`:496`).

**Current:** `DivePhaseDiving.vue:225-317` renders an inline form: a centered `.victory-banner`
(`:231-250`), `StarRating` text glyphs, three `RangeField` sliders for samples/time (`:261-298`),
Submit/Cancel row (`:301-316`). `RangeField.vue` still uses legacy tokens `--bg`/`--border`.

**Changes:**
1. New `components/dive/MissionReport.vue` (or a dedicated phase branch) with the 1fr/300px grid.
2. Replace `RangeField` samples with canisters: add `components/ui/SampleCanister.vue` (SVG jar +
   tint + count + step buttons). Add sample tokens to `main.css`.
3. Replace the time slider with `components/ui/SegmentedBar.vue` (cells + steppers).
4. Replace text stars with SVG stars keyed to `starIn`; keep `StarRating` API but restyle internals.
   (Check `e2e` star-rating selectors before changing roles/labels.)
5. Build the banner with `flashIn` + `barL` + `slam`; wire `growY` on the Valor fill.
6. Right column: performance breakdown (TIME + SAMPLES bars + Valor delta) — values from the engine
   performance term already exposed to `ValorMeter`; presentation only.
7. Keep `submit`/`cancel` intents and honor-system semantics untouched.

**Acceptance:** report is a two-column dedicated screen; samples are canisters, time is segmented,
stars are SVG with entrance; banner animates; values still feed the engine unchanged.

---

# 3. Reward draft — spec `09-reward-draft`

**Status:** Done. **Effort:** L.

**Spec:** `09-reward-draft.body.html:334-482`. Key elements:

- Ceiling roll: **514×84** horizontal track with 3 connector links, 4 tier nodes (`animation:
  {{n.anim}}`), `BASE` tag, sliding gold marker `transition:left .42s cubic-bezier(.34,1.56,.64,1)`
  (`:351-380`); header "VALOR 8.16 · CHANCE PER STEP" (`:354`).
- Stars→options badge: 44px panel, 5 stars → 4 slot rects → "4 OPTIONS" (`:341-348`).
- Cards: 4-slot drop-pod cabinet — placeholder, pod falls, splits left/right, impact flash, static
  card reveal (`:391-431`). Keyframes `podFall/podL/podR/impact/slotFlash/cardIn/flipIn/shake/
  chipIn` (`:228-237`).
- Card footer actions: `CLAIM →` / `→ ARMORY` / `BAN` / `PURGED · CRUSADE` (`:407-411`); resolution
  as stamped overlays (`Banked`/`Banned`, `:417-418`); lead marked inline `CEILING` (`:397`).
- Bottom bar **always present** (`:437-482`): token chits + count, `REROLL` with `−1` chit, `BAN`
  with `−1` chit, status "PICK 1 OF 4" / "<diver> CHOOSING", gold **Squad Honors** link
  (`:467`). Ban mode swaps in a 300px hold-to-confirm red button with `hazard-dark crawl`
  (`:477-480`).

**Current:** `RewardDraft.vue` renders horizontal `RewardReel.vue` strips
(`RewardReel.vue:237-250`, `@keyframes reel-spin`) — a slot machine, not pods. Ceiling is an inline
`TierBadge` strip with 5 rungs (`RewardDraft.vue:274-318`). Bottom bar only renders when
`tokenCount > 0` (`:355-393`) and has no Honors link. Ban is a plain click (`:460-469`).

**Changes:**
1. Replace reels with a pod-reveal component (or reskin `RewardReel` as a static card + pod
   animation). Wire `podFall/podL/podR/impact/slotFlash/cardIn/flipIn/shake`.
2. Build the 514×84 ceiling track with sliding marker; reduce rungs to the spec's 4 nodes; show the
   VALOR / CHANCE-PER-STEP readout. Values from `ceilingRangeForDifficulty` + odds selectors.
3. Build the stars→options badge from `starsToOptions` (engine).
4. Always-on bottom bar; add `−1` chits; add the **Squad Honors** link (routes to #4).
5. Hold-to-confirm ban (`hazard-dark crawl`), stamped resolution overlays.
6. Left rail: Mission report summary card on this screen (spec `:310-330`); right rail: existing
   `ValorMeter` matches `09:486-519` already.

**Acceptance:** rewards reveal via pod/impact; ceiling track + marker; always-on token bar with
Honors link; hold-to-confirm ban; resolution stamped on the card.

---

# 4. Squad honors — spec `10-squad-honors`

**Status:** Done. **Effort:** M.

**Spec:** dedicated ceremony screen with its own right rail (`10-squad-honors.body.html:342-497`):

- 48px eligibility bar: "5/5 STARS" · "4 DIVERS" with initial chips · "EVERY MISSION" with 3 gold
  bars · teal `ELIGIBLE` (`:342-357`).
- Stat reel: 222px, 64px rows = stat icon + label + direction arrow, `reel-view` mask,
  highlighted landing band (`bandFlash`), left/right gold triangles, `LEAST`/`MOST` stamped chip,
  `transition: transform {{reelMs}} cubic-bezier(.12,.64,.14,1)` (`:359-378`).
- Action column stateful: idle big gold `Spin` (`glow`) → `··· Drawing` → prize hex + text
  (`:380-405`). Prize only after spin.
- Winner naming: poker-chip `tag-shape` cards (158px, hole, serial, host crown, chits, count /
  MAX 3, `Honored` stamp) in a radiogroup (`:408-439`).
- Award: 58px hold-to-confirm (`hazard crawl`) + `SKIP`; awarded → "Token banked" + gold
  "Next mission · 2/3" (`:441-455`).
- Right rail: `Reward tokens` per-diver banks, "Spend in a draft" legend, "Your draft" card,
  honors cadence (`:460-497`).

**Current:** `BonusCeremony.vue` is stacked with `RewardDraft` (`DivePhaseRewards.vue:79-110`,
not `v-else`). Stat "reel" is only `ReelText` text-swap (`BonusCeremony.vue:89-116`); eligibility
is a text `<ul>` (`:67-87`); winners are small initial buttons (`:157-186`); award is a plain
click (`:170`).

**Changes:**
1. Make honors a distinct screen (render `BonusCeremony` **or** `RewardDraft`, and route the
   "Squad Honors" link from #3 to it). Keep the engine soft-gate (`ADVANCE` never waits).
2. Build the stat reel with icons + direction arrows + landing band + triangles; drive by the
   seeded `rollBonus` result (`shared/engine` stream salt 4) — no local randomness.
3. Build the eligibility bar from `bonusEligible` + cadence selectors.
4. Stateful spin/prize; winner poker-chip tags with `MAX 3` and `Honored`.
5. Hold-to-confirm award + SKIP; "Token banked" + Next mission.
6. Wire `bandFlash/thunk/fly0-3/plusOne` + existing `reelBlur`.

**Acceptance:** honors is its own screen reachable from the draft; reel is iconographic and
seed-driven; only spin reveals the stat; award is hold-to-confirm and banks the token.

---

# 5. Failed / forfeit — spec `11-mission-failed-forfeit`

**Status:** Done. **Effort:** M.

**Spec:** `11-mission-failed-forfeit.body.html:281-464`:

- Title kicker "Report · Suicide Mission · Operation 5 · Mission 1 of 3" (red pulse) + `disp slam`
  "Mission failed" with `.flicker` (40px red) + Ministry notice (`:290-293`).
- Full-screen red terror frame: red grid, `hazard-red crawl-slow` top **and** bottom bars,
  `ticks-red` border, red `sweep` (`:281-286`).
- Stars readout: 5 outlined stars, "0 / 5", "NO REWARD DRAFT" (`:295-301`).
- Three summary cards: "Restart MISSION 1/3" with curved arrow + pips; difficulty `HELD` with mini
  ladder; front held + "STRAIN CALL REOPENS" with padlock (`:305-340`).
- Surrender picker: heading "The squad surrenders one item" + `HOST CALLS IT` chip + pick count
  (`:342-346`); `424px 206px 206px 206px` grid of per-diver compact rows (46px tiles, image + name +
  tier) with a `Confiscated` stamped overlay (`:358-370`).
- Surrender bar: 68px hazard stripe + 330px hold-to-confirm red button → `Confiscated` stamp + gold
  "Respin the wheel" (`:378-403`).
- Right rail: `Carries over` (token chits, "WHEEL REROLL TOKENS · KEPT", front kept + strain reopen,
  Resets list) (`:406-464`).

**Current:** `DivePhaseForfeit.vue:30-54` — title "Operation failed", three plain cards, no stars,
no surrender heading/picker. Pick delegates to `InventoryGrid` select mode which renders full
showcase cards and forfeits immediately (`InventoryGrid.vue:337-361`). No `Confiscated` stamp
anywhere; no red frame animations.

**Changes:**
1. Retitle to "Mission failed"; wire `slam` + `flicker`.
2. Build the red terror frame (top+bottom hazard bars, `ticks-red`, red `sweep`).
3. Add stars/no-draft readout and the three summary cards (engine: restart op, difficulty held,
   front kept, strain reopen).
4. Build a compact per-diver surrender picker (`components/dive/ForfeitPicker.vue`) — 46px tile
   rows, host-call chip, pick count, `Confiscated` overlay on the chosen item. Keep `FORFEIT_ITEM`
   intent; keep host execution.
5. Hold-to-confirm surrender (330px red) + `Confiscated` stamp + "Respin the wheel".
6. Right rail `Carries over` (reroll tokens kept, front kept, strain reopen, resets).

**Acceptance:** "Mission failed" + flicker; red frame; per-diver tile picker with Confiscated
stamp; hold-to-confirm; carries-over rail.

---

# 6. Achieved — spec `12-griffdive-achieved`

**Status:** Done. **Effort:** M.

**Spec:** full-bleed **1440×900** takeover, own 56px header, **no ladder/rails/phase bar**
(`12-griffdive-achieved.body.html:242-372`):

- Header: crusade label, Ministry pardon notice, room code, replay button (`:250-259`).
- -5° rotating hazard marquee "Griffdive achieved · Difficulty 10 cleared · Squad extracted"
  (`bandIn`) (`:267-273`).
- Hero: `CRUSADE COMPLETE` chip, operation line, then **two stacked 120px lines** — "Griffdive"
  (ink) and "Achieved" (gold, `text-shadow`), each `rv-slam` staggered (`:275-284`).
- Ascending rung ladder: 8 vertical bars (42px wide, heights to 504px) with `rv-rung`/`rv-num`,
  tier badges, pips, failed dots + `rv-flag` brand flag + "10 / SUPER HELLDIVE" (`:286-312`).
- Crusade record: **6-column** `dl`, 46px numbers (`:314-327`).
- Squad tags: four 158px poker-chip cards with `tagDrop` (`:331-357`).
- Next: `Back to bridge` (gold), `EXPORT CRUSADE` (ghost), `CONTINUE · ENDLESS` (disabled,
  POST-V1) (`:359-372`).
- Motion: `bandIn`, `slamIn`, `shake`, `rungOn`, `numOn`, `flagIn`, `raysIn` (delay 2.1s),
  `tagDrop`, staggered `riseIn`.

**Current:** `DivePhaseComplete.vue` renders in `DiveFrame` (ladder + rails + phase bar frame it).
Single centered `<h1>Griffdive achieved</h1>` (`:36-43`); `CrusadeLadder.vue:73-153` is a compact
vertical list; record has 4 items (`:56-70`); no squad tags; actions are Delete save / Back to base
(`:72-87`); `.rays` static.

**Changes:**
1. Render the achieved phase as a full-bleed layer outside the shell grid (branch in
   `pages/dive/[id].vue` or a dedicated overlay component) — no ladder/rails/phase bar.
2. Build the marquee band, two-line hero, ascending-bar ladder + flag, 6-stat record, squad tags.
3. Actions: Back to bridge (gold), Export crusade (reuse `useSaves` export), Continue·Endless
   disabled (POST-V1).
4. Wire `bandIn/slamIn/shake/rungOn/numOn/flagIn/raysIn/tagDrop` with spec delays.

**Acceptance:** full-bleed takeover; animated marquee + two-line title; ascending ladder with flag;
6-column record; squad tags; export/endless.

---

# 7. Wheel — spec `05-wheel-of-misfortune`

**Status:** Partial (deal gate landed; MO card placement remains). **Effort:** S-M.

**Spec:** `05-wheel-of-misfortune.body.html:303-498`:

- Title row: `lbl` "Operation 5 · Mission 1 of 3 · first spin draws the front" + `disp` "Wheel of
  Misfortune" (34px) + prominent ghost **Reroll** button carrying a chit + count (`:306-316`).
- Pre-spin right column: full **Major Order card** (radar, countdown, title, planet bar, 3 stat
  cells, "Play this order"/"Let the wheel pick") (`:358-381`) then a dashed "Front + strain" hint
  card (`:382-392`).
- Wheel: per-segment risk pips (6×6) + solid fills (`:327-338`); **risk legend** under the wheel
  ("Risk 1–2 / Risk 3 / Risk 4–5") (`:348-352`).
- Ready CTA: gold 56px **"Deal the pacts →"** (`:488-493`).
- Decision cards: 56px front emblem, "Front · locked", 3-cell op-lock pips + "ALL 3 MISSIONS", red
  gradient frame (`:438-449`); labels "HOLD TO LOCK" / "HOLD · COMMIT ×3" / "+0" (`:423-474`).

**Current:** `WheelPanel.vue:316-325` header only; reroll is tiny per-card dice (`:361-373`);
`MajorOrderPicker` is injected into the front card's pre-roll slot (`:735-740`);
`WheelOfMisfortune.vue:108-119` slices at `fill-opacity 0.14`, no pips, no legend; no
"Deal the pacts" (auto-advances).

**Changes:**
1. Add title/subtitle + prominent Reroll button (with chit + count).
2. Move the MO card above the front card in the pre-spin column; add the front+strain hint row.
3. Add segment risk pips + legend to `WheelOfMisfortune.vue`.
4. ~~Add the "Deal the pacts" CTA to the ready state (gates the pacts phase — pairs with #1).~~
   **Done:** a `deal` engine phase + host-only `DEAL_PACTS` action; the wheel holds with the CTA
   once both calls are in, then swaps to `PactScreen`.
5. Align hold/opt-out labels.

**Acceptance:** title + reroll; MO card placement; segment pips + legend; Deal-the-pacts gate.

---

# 8. Bridge home — spec `00-bridge`

**Status:** Partial. **Effort:** M-L.

**Spec:** `00-bridge.body.html`:

- Major Order band: full-width bottom strip (radar, title, planet + %, countdown, "PLAY IT: +1
  REROLL") with `moIn` (`:548-574`).
- Valor section: per-tier odds ladder with bars + % (`:381-389`), big Valor number + "AT
  DIFFICULTY 7" (`:375-379`).
- "Every mission": **6** loop steps + dashed NEXT cell, each with a `.lit` `loopLit` overlay
  (`:338-356`).
- Join control: 6-cell code display with blinking caret, `n/6` counter, overlaid input (`:415-439`).
- Service record: live-room card (44px difficulty, `OP 5` + pips + `M1/3`, squad avatars, RESUME +
  arrow, `.ticks` frame) (`:473-507`), heading "Service record · N" (`:461`).
- Solo action: gold-bordered ghost `SOLO DROP` (164×52) + separate `VARIANT & WARBONDS` ghost
  (`:446-456`).
- Footer: 26px "FAN PROJECT · NOT AFFILIATED…" (`:576-579`).
- Motion: `sweep`, `rungOn`, `flagIn`, `cellOn`, `grow`, `moIn`.

**Current:** `index.vue` has no MO band (`main` ends `:640-643`); Valor is prose (`:350-369`); loop
has 4 cells no NEXT (`:154-159`); join is a plain input + button (`:427-446`); record is flat slots
(`:530-626`); solo is full-width primary (`:470-476`).

**Changes:**
1. Add the Major Order band (reuse `MajorOrderCard.vue`, currently unused; live data from
   `useMajorOrder`).
2. Build the odds ladder from `ceilingRangeForDifficulty` / odds selectors.
3. Grow the loop to 6 steps + NEXT; wire `loopLit`.
4. Build the code-cell join control.
5. Rebuild the service record as the live-room card; rename heading "Service record".
6. Split "Solo drop" (ghost) from "Variant & warbonds" (ghost).
7. Add the footer; wire `sweep/rungOn/flagIn/cellOn/grow/moIn`.

**Acceptance:** MO band present; odds ladder; 6-step loop; code cells; live-room record card; footer.

---

# 9. Lobby — spec `01-lobby-pre-launch`

**Status:** Partial (folded into shell). **Effort:** L.

**Spec:** `01-lobby-pre-launch.body.html`:

- 300px invite sidebar: Invite card (6×64px code cells + copy + note) (`:286-305`); Seats 3/4 with
  per-seat tiles (host gold, teal, `breathe` dashed empty) + bracket labels (`:307-325`); Your diver
  row (`:329-336`); debrief warbonds button + 18-cell bar + "REWARDS ROLL FROM YOURS ONLY"
  (`:337-346`); "NO MATCHMAKING" notice (`:351-357`).
- 84px route-preview strip: 8 proportional cards with `START`/goal/`SKIP`/tier/pips (`:261-280`).
- Hellpod bays: 252px, 148px body, animated descending pod (`podDrop`), `streak`, two
  `doorL`/`doorR` halves, `DEPLOYED` overlay, footer (`:376-445`).
- Variant selector: 5-column radiogroup of 198px cards with big 40px start number, tick staircase,
  difficulty name, diver count, per-variant kit list (`:447-476`).
- Launch: summary row + 392×62 hold-to-launch `hazard crawl` → "Launched" stamp + "To the wheel"
  (`:478-503`).
- Pre-launch checks strip: 52px footer with 5 checks (`:508-519`).

**Current:** `DivePhaseLobby.vue:44-89` renders 4 small bay cards; `CrusadeSetup.vue:83-87`
auto-fill grid; plain "Launch crusade" click (`:69-76`).

**Changes:** build the invite sidebar, route-preview strip, animated hellpod bays, 5-column variant
selector, hold-to-launch + launched stamp, checks strip. Wire `podDrop/doorL/doorR/streak/breathe`.

---

# 10. Briefing — spec `03-griffdiver-briefing`

**Status:** Partial (different content). **Effort:** XL.

**Spec:** interactive six-beat tour — `01 IDENTIFY · 02 SPIN · 03 PACT · 04 REWARD · 05 WARBONDS ·
06 DEPLOY` (`03-griffdiver-briefing.body.html:435-442`), 300px dossier aside + 1140px main with a
horizontal 68px rail, 696px panel, 76px footer (`:303`, `:432-443`). Beats include a registration
form with flipping grade letter (`:463-538`), a spinning wheel + accept card (`:541-618`), 222×336
pact cards with Sworn stamp + odds (`:621-690`), a ceiling-probability track (`:693-776`), a 26-cell
warbond grid with SELECT/CLEAR ALL (`:779-819`), and an "Order of Deployment" document (`:822-958`).
Footer: Back, pips, step text, `NAME REQUIRED` lock, `Next · <name>`, context CTA
(`:963-1000`). Motion: `blinkc`, `flip`, `stamp`, `drop`, `swornFlash`, `pop`, `scanY`.

**Current:** `BriefingOverlay.vue` is a dive dossier (Squad/Sentence/File/Catch-up/Deploy/Begin)
with a vertical 232px rail (`:52-96`, `:340-741`). No interactive beats, no dossier sidebar, no
name gating.

**Changes:** decide product direction first (interactive tour vs dossier). If spec: build the six
interactive beats + dossier aside + horizontal rail + footer gating. This is the largest single
piece; scope before starting.

---

# 11. Armory — spec `02-armory`

**Status:** Partial (closest match). **Effort:** S-M.

**Spec:** `02-armory.body.html`: full page with ladder + 52px key footer (`:254-274`, `:319-322`);
4-item vertical tablist with selected `.chev` (`:280-297`); kit-tab second line = **warbond count**
("18 WARBONDS") (`:289`); readiness slots with `slot-in` stagger (`:335`); sections in
`flex-wrap` with left accent + notes (`:379-386`); `<h1>` 30px (`:317`).

**Current:** `InventoryGrid.vue` is a drawer; kit tabs wrap in a grid (`:872-876`); second line is
item count (`:407`); no `slot-in` (`:1091-1104`); sections single-column grid (`:1218-1222`);
`<h3>` title (`:479-481`).

**Changes:** keep the drawer (product decision) but align content — vertical tablist, warbond-count
subtitle, `slot-in` animation, section wrapping/accent/notes, title scale. Add the ladder strip if
the drawer should host it.

---

# 12. Dive — spec `07-dive`

**Status:** Partial. **Effort:** M.

**Spec:** `07-dive.body.html:326-571`: entry `shake` + full hellpod-drop overlay
(`drop-ov`/`streak`/`ring`/`scorch`/`debris`/`podDrop`, `:326-367`); 136px mission card (DEPLOYED
stamp + "4/4 ON THE GROUND", mission pips + "VS <front>" + strain chip, TEAM RULE/LOADOUT CHECK
panel) (`:369-418`); "Your pacts" 540px column, per-card 64px glyph + 34px risk + open hold
(`:422-464`); "Squad pacts" rows with skulls + 44px vertical-fill hold (`:466-505`); outcome buttons
"Extracted" (`flex-grow:1.6`) + "Mission failed" (`:516-527`); red dashed `anyVoid` summary in the
right rail (`:563-571`).

**Current:** `DivePhaseDiving.vue:84-156` compact status strip; `PactBriefing.vue` uses auto-fit
grids, no skull rows/vertical hold; no mission card, no shake, no anyVoid panel.

**Changes:** add the mission card + DEPLOYED stamp, entry shake + pod overlay, restyle pacts
columns, add the anyVoid rail panel, align outcome labels/weights.

---

# 13. Phone shell — specs `04`, `13`-`17`

**Status:** Wired (renders below 1020px; no-scroll/390×844 fidelity + hit-size pass pending). **Effort:** XL.

All phone specs are **390×844 fixed, no-scroll** with a 48/40/52px header/crusade/squad trio and
content anchored in **bottom sheets** (`bottom:0`). Current: `DiveFrame.vue:89-103` collapses to a
long scrolling page (center → squad → Valor → phase bar); `CrusadeStrip` + `PhaseRail` double the
context; no bottom-sheet component (only unused `.sheet-*` CSS in `main.css:766-770`).

**Changes (after 1-12):**
1. Build a mobile shell mode: fixed bands, squad directly under the crusade nav, phase content owns
   a bottom sheet, no `PhaseRail`.
2. Replace `CrusadeStrip` with a compact 40-42px crusade bar on phone (big difficulty number, name,
   pips, OP/M, 3px rail).
3. Bottom sheet for wheel/pacts Valor + CTA; fixed footer for report (performance + File report) and
   reward draft (tokens + Next).
4. Reorder Bridge home so Host/Join/Solo precede the education panels; pin the MO bar.
5. Hit-size pass to the 44px floor: `.room-copy` 32→44, `.reroll-dice` 29→48, `.btn.tiny` 24→44,
   Join input/button 34/88→56/92, RangeField thumb.
6. Phone report + reward draft get real layouts (vertical 76px rows for the draft; canisters +
   segmented bar + fixed footer for the report).

---

# Cross-cutting tasks

- [x] **Sample tokens** `--sample-common/rare/super` → `main.css`.
- [ ] **Wire orphaned keyframes** per screen (see each section); remove or use unused ones so
      `main.css` has no dead motion after the pass. (Screens 1–6 wired; audit the rest.)
- [ ] **`.cap` prose fix** — new prose class so balance-expected copy wraps. (Not started.)
- [x] **E2E updates** — specs assert behavior, not pixels; update anchors when labels/roles change
      (star rating roles, report labels, pacts CTA, honors route). `pnpm test:e2e` green at HEAD
      (16 passing); this session fixed the non-host pact-lock regression and the stale
      report/CTA assertions.
- [ ] **Verify per screen** — `pnpm lint && pnpm typecheck && pnpm test`, plus a screenshot check via
      `.orca/*.mjs` at 1440×900 and 390×844. (`lint` / `typecheck` / `test` / `test:e2e` green at
      HEAD; screenshot check outstanding.)
- [x] **AGENTS.md** — update the "Destroyer Terminal design language" section and directory map as
      each screen lands; note new components (`PactScreen`, `MissionReport`, `SampleCanister`,
      `SegmentedBar`, `ForfeitPicker`).

## Definition of done (per screen)

1. Matches the spec's structure, element placement and labels.
2. Uses `main.css` tokens/utilities; no new viewport `@media` beyond the 1020px structural one.
3. Spec animations attached and reduced-motion safe.
4. Engine, sync, saves and data untouched (or migrated per the `PLAN.md` rule-change checklist).
5. `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` green.
6. Screenshot verified at desktop and phone widths.
