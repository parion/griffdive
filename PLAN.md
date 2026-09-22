# Griffdive Plan

Tracking doc for playtest findings, balance/design decisions, and the work between releases. It
absorbs the former `QA-LOG.md` (2026-09-15 live session, room `8FDMZ2`, difficulty 6 → 10 to
`achieved`, 24 successful missions, plus the isolated forfeit/cache/rejoin stress rooms). The
original QA labels are recorded in the **Origin** column so nothing is lost.

`AGENTS.md` remains the single source of truth for game rules, architecture, and conventions.
This file tracks *intent and status*; it never overrides `AGENTS.md`.

## Rule-change checklist

Any item below that changes rules, data shapes, or architecture must, in the same commit:

1. update `AGENTS.md` (rules / architecture / data catalog as appropriate),
2. bump `ENGINE_VERSION` (`shared/engine/config.ts`),
3. regenerate goldens (`GRIFFDIVE_UPDATE_GOLDENS=1 pnpm test`),
4. land with `pnpm lint && pnpm test && pnpm typecheck` green.

## Legend

**Status:** `Todo` · `In progress` · `Needs repro` · `Blocked` (waiting on a `DEC`) · `Accepted`
(intentional / safety net) · `Phase 5` (post-v1) · `Done`.

**Type:** Bug · UX · Balance · Rules · Design · Feature · Infra · Docs.
**Scope:** S (localized) · M (one subsystem) · L (multi-subsystem) · XL (new content/infra axis).

IDs are stable and append-only; do not renumber.

## Status board

| ID | Title | Type | Scope | Status | Origin |
|----|-------|------|-------|--------|--------|
| N1 | Booster section when none owned | UX | S | Done | new |
| N2 | Faction strains (optional operation-long team risk) | Design | L | Done | new |
| N3 | Helldivers campaign API → MO boosts | Feature/Infra | XL | Phase 5 | new |
| N4 | Stars default to full | UX | S | Done | new |
| N5 | Mandatory 4 stratagems; remove `barebones`; early-game pact trap | Rules | M | Done (DEC-1: loadout-checked + reserve + exclusivity) | new |
| N6 | Time % + samples (common/rare/super) boost Valor slightly | Rules | M | Done (DEC-2) | new |
| N7 | Valor meter visual (lore-named) | UX | M | Done | new, QA-U1 |
| N8 | Reward ban + separate reward reroll | Rules/Design | L | Done | new |
| N9 | `stimAbstinent` at max risk (`untouchable` already 3) | Balance | S | Done | new |
| N10 | Crash / host-loss resilience mid-match | Infra/UX | L | Blocked (DEC-9) | new, QA-T3 |
| N11 | Codex kicks host + no back link | Bug | S | Done | new |
| N12 | Faction reroll broken + no same-result reroll | Bug | S | Done (front gate + same-result refusal) | new, QA-T2/D1 |
| N13 | `fragileLiberty` locks out early players | Balance/Data | M | Blocked (DEC-6) | new |
| N14 | Squad reward indicators (icon-only) | UX | M | Done | new |
| N15 | All incoming kits look identical | Bug? | S–M | Needs repro | new |
| N16 | Incoming Valor from current run performance | Design | M | Done (DEC-7: closed) | new |
| N17 | Onboarding for link-joiners | UX | L | Done | new |
| N18 | Rejoining under stored `playerId` does not reclaim legacy cache | Bug | S | Done | QA-T1/D3 |
| N19 | S+ unpreviewable in low difficulty bands | Balance/UX | S | Done | QA-U2 |
| N20 | Squad strip a11y (online dot + host crown indistinguishable) | UX | S | Done | QA-U3 |
| N21 | `MARK FAILED` confirm has no armed cue | UX | S | Done | QA-U4 |
| N22 | Field Promotion re-rolls its offer on every claim | UX/Design | M | Done | QA-U5 |
| N23 | Star→options is flat early (3★ = 2 options) | Balance | S | Done | QA-B1 |
| N24 | Pact redundancy is free risk (subsumed pacts still count) | Balance | M | Done (exclusive groups + subsumption) | QA-B2 |
| N25 | Pacts are strictly "take everything" | Balance | S | Todo | QA-B3 |
| N26 | Failure path rework | Design | L | Accepted (DEC-8: keep current) | QA-B4 |
| N27 | S+ / Liberty's Cross frequency at altitude | Balance | S | Done (monitor) | QA-B5 |
| N28 | `holdingsEmpty` branch effectively unreachable | Infra | S | Accepted | QA-F1 |
| N29 | Stale mission counter during `forfeit` | UX | S | Done | QA-F2 |
| N30 | Failure cannot lower difficulty or set `achieved` | Rules | S | Accepted | QA-F4 |
| N31 | Remove open-dive lobby / matchmaking | Feature | M | Done | new |
| N32 | Kit ordering: stratagem role then tier | UX | S | Done | new |
| N33 | Reward options skew to base tiers even at a high ceiling | Balance/Bug | M | Done (DEC-10) | new |
| N34 | Copy-invite icon by session ID + lone-host share aside | UX | S | Done | new |
| N35 | Users-list waiting indicators (pacts/rewards) | UX | S | Done | new |
| N36 | Mandatory 4 slots vs equip-restricting misfortunes | Rules | M | Done | new |
| N37 | Oops, All Orbitals too narrow (rename to Airstrikes, include Eagles) | Rules | S | Done | new |
| N38 | Bonus-stat squad honors (slot-machine stat → token prize) | Feature/Design | L | Done | new |
| N39 | Team reroll-token economy (more sources for the shared pool) | Balance/Design | M | Todo (DEC-5 follow-on) | new |

Also carried, positive: `F3` (failure copy/guardrails excellent) lives in the regression baseline.

## Decisions needed

| DEC | Question | Blocks |
|-----|----------|--------|
| DEC-1 | Stratagem-restricting pacts: rule text is "equipped but never called" (accountability moves to field/loadout-with-intent), or provide a neutral fallback stratagem list for early players? | Resolved — N5, N24 |
| DEC-2 | Time/samples → Valor: target max bonus (e.g. +0.5 total, or +1.0), and sample rarity weights? | Resolved — N6 |
| DEC-3 | Luck meter name (candidates: Liberty's Favor, Dive Fortune, Providence), and do rerolls exclude only the immediately replaced result or every prior result this window? | Resolved — split: DEC-3a naming (N7), DEC-3b reroll scope (N12) |
| DEC-4 | Reward reroll token: banked across missions or per-mission? Ban scope: personal-crusade or squad-wide, and does a ban cost the whole reward pick? | Resolved — N8/N38 (one flexible token from bonus honors; spend to reroll your own offer or ban one offered item from your personal pools for the crusade) |
| DEC-5 | Strains: drawn per operation (with the front) or per mission? Flavor-only or rule-bearing modifiers? Which front/strains ship first? | Resolved — N2 |
| DEC-6 | Light-armor fix: add a light starter passive, reword `fragileLiberty` to "no heavy armor", or gate the misfortune? | N13 |
| DEC-7 | Incoming-player Valor: cap, and the non-exploit rule (e.g. scales off the squad's banked performance, not a fresh join's). | Resolved — N16 closed (conflicts with "Field Promotion restores altitude, never rarity") |
| DEC-8 | Failure rework direction (owner-flagged, to be spec'd): what replaces "repeat op + forfeit one item"? | Resolved — N26 accepted (keep current rule) |
| DEC-9 | Mid-match crash semantics: void the mission with no forfeit, auto-pause, or keep the forfeit? | N10 |
| DEC-10 | Target distribution for rolled reward options under a ceiling (favor near-ceiling vs uniform), and the S+ guarantee fallback when the diver's S pool is empty. | Resolved — N33 |
| DEC-11 | Bonus honors (N38): prize shape (one flexible token vs choose ban/reroll at award), stat pool + directions, per-mission vs per-operation cadence, whether the skip-a-reward source survives, and whether ADVANCE waits on the ceremony. | Resolved — N38 (one flexible token; all 12 stats with directions; per mission; bonus is the only token source; soft gate) |

**DEC-1 — resolved (N5/N24). Landed.** Keep the stratagem pacts **loadout-checked**, not "equipped
but never called": a stratagem call-in is team-visible but not attributed to a diver and never
appears on the stats screen, so "never called" fails the accountability rule. HD2's mandatory four
slots are guaranteed instead by three rules, all in `shared/engine/`:
- the three category bans (`grounded`/`shipSilent`/`openField`) are **mutually exclusive**
  (`PACT_EXCLUSIVE_GROUPS`) — they tax the same strength (stratagem variety), so an offer never
  draws two of them and `SET_PACTS` refuses a same-group pick. This is also the N24 fix: overlapping
  restrictions can no longer bank free risk.
- every diver always owns a non-lethal **reserve** of warbond-free utility (`RESERVE_STRATAGEMS`:
  Orbital EMS Strike, Orbital Smoke Strike, Eagle Smoke Strike, EMS Mortar Sentry, Shield Generator
  Relay), exempt from slot-removing *pacts*, so any pact combination still fields four. The category
  pacts were reworded to "no **offensive** …" so the carve-out is legible.
- `hasLegalLoadout` (pact bans + accepted misfortune + reserve vs `STRATAGEM_SLOTS_REQUIRED`) is the
  hard floor: `SET_PACTS` refuses a pick that would drop the diver below four, and the UI greys it
  "Leaves too few stratagems to ready up". A misfortune that strands the loadout on its own is not
  blamed on a pact — that same mandatory-slot tension for **misfortunes** is split out as **N36**.

**DEC-2 — resolved (N6). Landed.** Team performance becomes a small, capped third term on top of
chosen risk: `timePct` (percent of the timer remaining, 0–100) scales to `TIME_VALOR_MAX` 0.2, and
squad samples score `common 0.0015 / rare 0.004 / super 0.02` capped at `SAMPLE_VALOR_CAP` 0.3, so
time + samples never exceed 0.5 against the 13-point chosen ceiling. The per-sample values are
calibrated against wiki.gg/Sample availability, so the game's own rarity mix scales the term with
difficulty (~0.03 commons-only Medium haul to ~0.3 Super Helldive haul) without a multiplier.
`MissionReport` carries `samples?: { common, rare, super }`; the reward form collects them on
success, so the mission just reported feeds the draft that follows.

**DEC-3 — resolved (N7/N12). Landed, split in two.**
- *DEC-3a (naming):* the mechanic is **Valor** — the conscious self-limitation, not raw luck —
  and the S+ bonus slot is renamed **Liberty's Cross** (was Diver's Choice). The rename is global
  (`luckOf` → `valorOf`, `diverLuck` → `diverValor`, `rollCeiling`/`maxCeiling`/`oddsToReach`
  params, the `valor {n}` UI string, AGENTS.md reward math). N7 is now unblocked to build the meter.
- *DEC-3b (reroll scope):* **only the immediately replaced result is excluded.** `REROLL_WHEEL`
  refuses a seed that re-derives the result it would replace, and the UI draws fresh seeds until the
  roll actually moves. Excluding every prior result this window was rejected: it shrinks the pool and
  fights the free-overrule rule (cycling back onto an already-completed combo is intentionally free).

**DEC-5 — resolved (N2).** Strains ship as an **optional, operation-long team-risk commitment**,
never a forced modifier. The front is drawn at the operation's first spin as today, and a **strain
is rolled with it** (a subfaction of that front, gated per-strain by `minDifficulty` like
misfortunes). In the mission-1 decision window the squad **accepts or declines** the strain exactly
like the misfortune — declining is free and zero-risk (principle 1: risk is chosen, never forced),
which also protects a surplus-kit squad from being handed an unfieldable op. Accepting commits the
squad for the whole operation: the strain's **team risk is added to every mission's Valor**
(compounding over the op's 2–3 missions — a deliberately different scope from the per-mission
misfortune). The lock holds until the operation ends: a **win** rolls a fresh front+strain on
`ADVANCE`; a **failure** restarts at mission 1, keeps the front, and **reopens the strain decision**
(same draw, re-decidable, so the squad may drop it). Rerolling the strain is a mission-1-only token
sink mirroring the front gate. Strains are **flavor + risk, never rule-bearing**: the app never
observes enemy composition, so no unverifiable restriction is attached — the real subfaction
reshapes loadout decisions in-game and the app only prices the risk. Carrot is **extra Valor only**
(no themed reward pool). Implementation adds `shared/data/strains.ts` (flavor: id, frontId, name,
blurb) with `STRAIN_RISK` / `STRAIN_MIN_DIFFICULTY` in `shared/engine/config.ts` (invariant 5: risk
values are tunables), a `strainId` + `strainAccepted` on `DiveState` and a dedicated `strain`
phase (save schema v8 → v9 migration), a three-part `(misfortune × front × strain)` combo key,
strain-aware reroll guards, an `ENGINE_VERSION` bump + goldens, and a WheelPanel front-card
accept/decline treatment. The strain is a second operation-long token sink, so the shared reroll
pool needs more sources — split out as **N39**.

**DEC-10 — resolved (N33). Landed.** Reward options roll inside the band from the difficulty's
**base tier** (a hard floor) up to the rolled ceiling: the draft **leads with one option at the
ceiling**, then fills the rest a band down, weighted toward the top. Genre check (Enter the Gungeon
per-floor quality tables, Dead Cells' Boss Stem Cells, Hades' boon-rarity investment) supports
shifting the distribution up and flooring out the bottom while keeping the top a minority. First
pass used a pure exponential toward the ceiling; playtesting at diff 6 showed low-Valor runs
getting S-flooded drafts (3 S of 4), which exposed that the **ceiling roll** was the root — a
single risk-2 misfortune reached S 15–80% at diffs 6–10. Retuned: **S and S+ are Valor-gated**
(floors 4 / 8, then a ramp) so altitude can't hand out the top, and the draft lands **exactly one**
ceiling option plus support. The S+ guarantee falls back to the highest tier still in the diver's
pool when no S item is unowned, so it never drops a slot.

## Batches

Each batch lands shippable and green.

### Batch A — Hotfixes (unblocked)

Landed. N1, N4, N9, N11, N12 (faction-reroll gate), N18, N20, N21, N29, plus removing `barebones`
(the shippable half of N5). N12's same-result reroll exclusion landed with DEC-3b and the rest of N5
with DEC-1. `ENGINE_VERSION` bumped 9 → 10; goldens regenerated (Barebones removal reshapes the pact
offer draw).

### Batch A2 — UX follow-ups (unblocked)

Landed. N34, N35. No engine changes (presentation only) — no `ENGINE_VERSION` bump or golden regen.

### Batch B — Rules & economy

**Batch B complete.** N5/N24 landed with **DEC-1** (reserve kit, mutual exclusion, four-slot
floor), N6 with **DEC-2** (time/samples Valor), N12's same-result reroll with **DEC-3b**, N7 (the
Valor meter) with **DEC-3a** (the name), **N36** (the misfortune half of the four-slot floor:
`ACCEPT_MISFORTUNE` refuses a rule that strands any diver), and **N33** with **DEC-10** (reward
options floored at the base tier and weighted toward the earned ceiling; S+ guarantee falls back to
the highest available tier). `ENGINE_VERSION` bumped 12 → 14; goldens regenerated for N36
(`oopsAllOrbitals` declines) and N33 (option tiers shift upward).

### Batch C — Rewards & catch-up

N8, N14, N16, N22, N26, plus **N38** (bonus-stat honors, the token source). **All landed or
closed.** N14 and N22 landed (presentation + a catch-up derivation fix; no engine-version bump — the
promotion's rules are unchanged). N16 closed (DEC-7) and N26 accepted (DEC-8: keep current rule) — no
code. **N8 + N38 landed together** under DEC-4/DEC-11: the reward-token economy and the end-of-mission
bonus ceremony, limited to full-star clears on a squad-size cadence. `ENGINE_VERSION` is 15 after the
N37 (Airstrikes) merge; the token work needed no further bump, and goldens are unchanged for it (no
scripted crusade spends a token).

### Batch D — Content, resilience, onboarding

N2, N10, N15, N17, N39. **N2 landed** (faction strains, below) and **N17 landed** (guide primer +
persistent Help drawer + Valor/ceiling tooltips; presentation only, no engine bump). Remaining:
N10 (crash semantics, DEC-9), N15 (repro), N39 (token economy).

### Post-v1 / R&D

N3.

### Shipped outside the batches

N31, N32 — owner-requested changes landed after Batch A.

## Item details

### Batch A

**N1 · Booster section when none owned.** `InventoryGrid.vue:30-38` only pushes a group when it has
items, so a boosterless diver sees no Boosters heading at all. Render an always-on Boosters group
with an empty state ("No boosters available yet — rewards can unlock one").

**N4 · Stars default to full.** `dive/[id].vue:118` hardcodes `const stars = ref(1)`. Default to
`maxStars` when the success form opens (`dive/[id].vue:635-641`), reset on cancel.

**N9 · `stimAbstinent` max risk.** `config.ts:156` `stimAbstinent: 2 → 3`. `untouchable` is already
3. Golden replay unchanged (Stim Abstinent is only picked on a failed mission there, which rolls no
options), proving the bump is scoped to Valor.

**N11 · Codex kicks host.** Confirmed root cause: `app.vue` used `<NuxtLink to="/codex">`, which
unmounts the dive page; `useGameSocket.ts:133` runs `onBeforeUnmount(close)`, dropping the socket,
and the server migrates host. **Shipped as the long-term fix:** Codex is now a Reka `Drawer` slide-over
(`ui/CodexDrawer.vue`) mounted in `app.vue` above `<NuxtPage />`, so the dive page never unmounts and
the socket stays live. The catalog browser moved to `components/codex/CodexBrowser.vue`, shared by the
drawer and the `/codex` page (kept for deep links). The header control is a global button
(`aria-haspopup="dialog"`), modal with focus trap + Esc-to-close; reduced-motion guard included.
Covered by `e2e/codex.spec.ts` and the host-preservation case in `e2e/room.spec.ts`.

**N12 · Faction reroll + guaranteed different result.** Two parts:
- The front-reroll window keys off the global `missionIndex` (`reducer.ts:174`, `selectors.ts:163`)
  instead of the per-operation `missionInOperation`, so the front is permanently unrerollable after
  the first operation. Gate on `missionInOperation > 1`. **Done** (gated in the reducer and
  `canRerollWheel`; AGENTS.md already documented `missionInOperation === 1`).
- `REROLL_WHEEL` accepted a client seed and never checked the new draw differed from the replaced
  one. **Done (DEC-3b)** — the reducer refuses a seed that re-derives the replaced result and the UI
  draws fresh seeds until the roll moves. Only the immediately replaced result is excluded (DEC-3b);
  all-prior-results exclusion was rejected as it fights the free-overrule economy.

**N18 · Cache reclaim on rejoin.** The engine supports the reclaim (`room.ts:60-70`, `joinDiver`
reads `state.legacyCaches[playerId]`), but the server only treats a stored id as known when it is
still in `divers`; otherwise it mints a new id and never passes the stored id to `joinDiver`
(`server/utils/room-sync.ts:219-236`). **Done** (`processHello` reuses the stored id when
`legacyCaches[storedId]` exists; covered by `room-sync.spec.ts`).

**N20 · Squad strip a11y.** Diver chips flattened to one node (`name ★ (you)`); online dot and host
crown were indistinguishable to assistive tech. **Done** — `role="img"` + `aria-label` on the online
dot ("Online"/"Offline"), the crown ("Host") and the catch-up chip.

**N21 · `MARK FAILED` armed state.** First click only armed an inline confirm; with no modal it read
as inert. **Done** — the armed confirm is now a solid red pulsing button with a "can't be undone"
hint (self row and squad chip), disabled under reduced motion.

**N29 · Stale mission counter during `forfeit`.** Failure enters `forfeit` without calling
`resetOperation` (only `FORFEIT_ITEM` does, `reducer.ts:295/319`), so the header showed the failed
mission index and old wheel/reroll state until the item was picked. **Done** — `MissionTrack` takes a
`failed` prop while the phase is `forfeit`: the active segment turns red and still, and the label
reads "Operation failed — … restarts at mission 1". Engine untouched (the failure genuinely ends the
operation; the restart happens on forfeit).

### Batch A2

**N34 · Copy-invite icon by the session ID + lone-host aside. Done.** The `Copy invite` button moved
out of the right header row to a copy icon (`ui/IconCopy.vue`) directly beside the room code in the
`<h1>` (room mode only), sharing `copyInvite()` which now toasts "Invite copied" via `ToastStack`
(and reports a failure if the clipboard API is unavailable). A lone seated host gets the aside
"You're the only diver here — share the invite link to bring in your squad" inline in the squad
strip, gold and pulsing (reduced-motion guarded).
Covered by the copy-icon assertion in `e2e/room.spec.ts`.

**N35 · Users-list waiting indicators. Done.** `diverStatuses` derives a per-diver status from
engine state and renders it as an a11y-labelled chip in the squad strip: "choosing pacts" while
`phase === 'pacts' && !diver.pactsLocked`; "choosing reward" while `phase === 'rewards' &&
!diver.pickedOptionId && !diver.skipsCurrentDraft`; "ready" once locked/picked; "skips this draft"
for `skipsCurrentDraft`; absent outside those phases. Purely presentational — no rules touched.
Covered by `e2e/solo-dive.spec.ts`.

### Batch B

**N5 · Mandatory 4 stratagems; `barebones`; early-game trap.** HD2 requires 4 equipped stratagems
to ready up, so the `barebones` pact ("I fill no stratagem slots") was impossible. **Shipped:**
`barebones` removed in Batch A (from `PACT_RISK`, both misfortune block-lists; `PACT_SUBSUMES` now
empty — the subsumption machinery and PactPicker "Covered by …" UI stay for future rules), and the
rest with **DEC-1** (see the resolution above). The category pacts stayed **loadout-checked**, not
"equipped but never called", reworded to "no **offensive** …"; `PACT_EXCLUSIVE_GROUPS` stops them
stacking, `RESERVE_STRATAGEMS` guarantees four slots, and `hasLegalLoadout` enforces the floor at
pick time. Goldens regenerated (the offer draw reshuffles).

**N6 · Time/samples Valor. Done (DEC-2).** `MissionReport` carries `samples?: { common, rare, super }`
and `timePct`; `performanceValor` (in `rewards.ts`) prices time remaining up to `TIME_VALOR_MAX` 0.2
and samples at `common 0.0015 / rare 0.004 / super 0.02` (wiki.gg/Sample-calibrated) capped at
`SAMPLE_VALOR_CAP` 0.3, so the squad-level term never exceeds 0.5 and scales itself with difficulty
via the game's rarity mix. `diverValor` sources it from `lastReport`, so the mission just reported
boosts that draft for every diver. The report form collects samples and time with icon + slider
fields (`ui/RangeField.vue`, number above slider, browser spinners dropped), the sample sliders sized
to `SAMPLE_AVAILABILITY`; a live readout previews the added Valor. AGENTS.md reward math is updated.

**N7 · Valor meter. Done.** `ValorMeter.vue` is a lore-named gauge fed by `ceilingRange` and the
new `maxValorFor(difficulty)` display scale (strongest eligible misfortune + top pacts + the
performance cap). It stacks the three Valor sources as coloured segments (team gold, pacts red,
performance teal), animates a burning tip that brightens with the fill (reduced-motion safe), and
replaces the raw `valor 6` text with a tier ladder (base → S+, reached rungs lit) plus the odds to
reach the top. It renders live in the pacts window (responding to pact toggles and the misfortune
switch), locked in the diving Briefing, and locked-with-performance in the reward draft — so the
same number and odds carry from pacts through briefing (QA-U1) and the performance term is legible.
The gauge uses Reka's `ProgressRoot`/`ProgressIndicator` for the accessible progressbar semantics
(`role`, `aria-valuenow/max/valuetext`).

**N19 · S+ unpreviewable in low bands.** **Done** — `stepOdds` (`rewards.ts:23-28`) caps the S→S+
rung at `S_PLUS_UPGRADE_CAP` and `UPGRADE_PREVIEW_FLOOR` is now 0.1, so the S+ step clears the
preview floor at max Valor. AGENTS.md now states the S+ guarantee precisely (S+ / Liberty's Cross
only, never a plain S ceiling).

**N23 · Star→options flat early.** **Done** — `STARS_TO_OPTIONS` is now `[1,1,2,3,4,4]`
(`config.ts:60`), so 1★=1, 2★=2, 3★=3, 4★=4, 5★=4 (capped). Team performance is felt at every star.

**N24 · Pact redundancy is free risk. Done (DEC-1).** The observed case (`Barebones` subsuming
`Primary Concern`) went with `barebones` in Batch A. The general fix is same-axis mutual exclusion:
`PACT_EXCLUSIVE_GROUPS` keeps restrictions that tax one strength out of both the offer
(`rollPactOffer`) and the pick (`SET_PACTS`, `applyPactToggle`); the UI greys "Conflicts with …".
Directional subsumption (`PACT_SUBSUMES`) stays wired for future rules.

**N25 · Pacts are "take everything".** With no squad cost and only a failed-pact option penalty,
optimal play is always all playable pacts. Likely intended; the "0 to all" copy undersells it.

**N27 · S+ frequency at altitude.** At max pacts + accepted risk on diffs 7–10, Liberty's Cross
appeared in 7 of ~12 picks. **Done (monitor)** — the missing `S_PLUS_UPGRADE_CAP` (0.1) is now
applied to the final rung in `stepOdds` (`rewards.ts:23-28`), so altitude alone can't make Liberty's
Cross routine (~8% at max Valor). Revisit only if the live rate still feels high.

**N33 · Reward options skew to base tiers even at a high ceiling. Done (DEC-10, retuned after
playtest).** Observed on room `YK3SUN`, Super Helldive (10), misfortune accepted and all pacts
locked: the header read `ceiling S+`, but the draft offered B/B/C/C. Cause: `tierWeight` weighted
`TIER_ROLL_WEIGHT_BASE ** (ceilingIndex − tierIndex)` with no base-tier floor, so lower tiers
weighed *exponentially* more — at an S+ ceiling, C=8, B=4, A=2, S=1 (~53% C). **First pass:**
options rolled in `[baseTierFor(difficulty) .. ceiling]` weighted exponentially toward the ceiling
(`rollRewardOptions` took an explicit `floor`; `diverOptions` passes the base tier,
`catchUpOptionsFor` passes base for both ends). **Playtest retune (room `7KRDS3`):** at diff 6 with
Valor 2 a draft showed 3 S of 4 — the exponential faithfully cashed a ceiling that was too cheap.
Root cause was the ceiling roll: `min(0.8, Valor·(1+bandPos)/3^step)` let a single risk-2
misfortune reach S 15% at diff 6 and **67–80% at diffs 8–10** (base A is one rung from S). Fixes:
- **Ceiling:** S and S+ are Valor-gated — `A→S` ramps from `S_VALOR_FLOOR` 4 (`min(0.8, max(0,
  Valor−3)·(1+bandPos)/18)`) and `S→S+` from `S_PLUS_VALOR_FLOOR` 8 (`min(0.1, max(0,
  Valor−7)·(1+bandPos)/40)`). Below the floor the rung cannot roll, so Valor 2 never reaches S at
  any difficulty; the preview floor dropped to 0.05 so a reachable S is never hidden.
- **Draft:** leads with **exactly one** option at the ceiling, then fills the rest a band down,
  weighted toward the top. No more top-tier flood.
`ENGINE_VERSION` 13 → 14; goldens regenerated. Covered by `tierWeight` (floor + skew),
`rollCeiling` (S/S+ gates), and `rollRewardOptions` (floor, one-ceiling guarantee, S+ fallback,
degraded band) in `rewards.spec.ts`.

**N36 · Mandatory 4 slots vs equip-restricting misfortunes. Done.** The pact half landed with
DEC-1; this is the misfortune half. A squad-binding rule must be fieldable by **every seated
diver**, so `misfortuneStrandedDivers` (`selectors.ts`) reports the divers a drawn rule would
strand below `STRATAGEM_SLOTS_REQUIRED`, and `ACCEPT_MISFORTUNE` refuses an accept when any diver
is stranded (`reducer.ts`) — the squad could otherwise never ready up. Declining and rerolling
stay open. `WheelPanel` disables "Lock it in", names who can't field it, and greys the switch to
accept, so the floor is legible before the vote. `No Stratagems` stays out of the equip ban-list
(behavioral: four slots still equip, they just can't be called); `Oops, All Orbitals` is the rule
that most often strands an early squad (the base kit fields two orbitals, reserve adds no more).
Covered by `misfortuneStrandedDivers` (selectors), the accept-refusal/allowed cases (reducer), and
the `oopsAllOrbitals` / `noStratagems` legality checks (pacts). `ENGINE_VERSION` 12 → 13; goldens
regenerated (the scripted crusade declines `oopsAllOrbitals` draws it can't field).

**N37 · Oops, All Orbitals too narrow. Done.** Playtest report: a diver holding 13 stratagems could
not accept the rule because only two of them were orbitals — the other eleven were Eagles, sentries,
support and emplacements, none of them legal. The category was broadened to the game's **red**
stratagems: `oopsAllOrbitals` → **`oopsAllAirstrikes`** (name "Oops, All Airstrikes", rule "Eagle and
orbital stratagems only"). `isAirstrikeStratagem` (`Eagle` or `Orbital`) replaces the orbital-only
filter in `legalStratagemCount`, and `BLOCKED_UNDER_MISFORTUNE` now only blocks the pacts that stay
redundant under the wider rule (`packLight`, `thirsty`, `primaryConcern`, `openField` — *Grounded*,
*Ship Silent* and *Anti-Tank Abstinent* are meaningful again since Eagles/Orbitals can still be
chosen). `ENGINE_VERSION` 14 → 15; goldens regenerated.

### Batch C

**N8 · Reward reroll + ban (the token economy). Done (DEC-4).** One flexible reward token per
bonus-honors win (`rewardTokens`, capped at `REWARD_TOKEN_CAP` 3), spent by its owner during a
reward draft:
- `REROLL_REWARDS{seed}` redraws the diver's own offer. The per-diver `rewardRerollSeed` folds a
  fresh client seed into `diverOptions`, turning both the ceiling and option streams; the reducer
  refuses a seed that re-derives the offer in hand, so a token always moves the draft.
- `BAN_REWARDS{optionIds}` is a separate multi-select flow: the diver picks any/all offered
  non-choice items to add to `bannedItemIds`, which `diverOptions` and `catchUpOptionsFor` exclude
  for the rest of the crusade. Banning **forfeits that mission's reward pick** (`rewardBanned`
  resolves the draft with no item), so the whole offer may be cleared; Liberty's Cross cannot be
  banned.
Both are self-service; `enforceSelf` coerces `playerId`. AGENTS.md gained the "Reward tokens & squad
honors" section. No token source besides N38 (the earlier skip-a-reward idea was dropped).

**N38 · Bonus-stat squad honors. Done (DEC-11).** Once every diver has picked, `DivePhaseRewards`
swaps the locked Valor meter for `BonusCeremony.vue`: like the Wheel, the contest is **spun on
click** (`SPIN_BONUS{seed}`, host-only), then the host awards the winner (`AWARD_BONUS`, host-only,
post-spin) and the token is **banked immediately** — no claim step. When only one diver can win
(solo, or a squad where everyone else sat the draft out) the spin resolves the ceremony by itself,
since the selection would be redundant. A slot-machine reveal (reusing
`ReelText`) plays on the seed. The contest is `rollBonus(bonusSeed)` (stream salt 4) over
`BONUS_STATS` — all 12 HD2 end-screen stats with a `most`/`least` direction, tunable in config. The
app never captures the stats: the host reads the real end screen and picks, matching
`REPORT_RESULT`'s honor-system boundary. **Honors are limited** (`bonusEligible`): a token only
lands on a full-star clear, and only on the squad-size cadence (`BONUS_TOKEN_INTERVAL`: 4 divers
every mission, 3 or 2 every other, solo every third) — otherwise the reward phase skips the
ceremony and shows why. Per mission, soft gate (`ADVANCE` never waits; an unspun/unawarded contest
dies with the mission reset). `DiverState` carries `rewardTokens`/
`bannedItemIds`/`rewardRerollSeed`/`rewardBanned`; `DiveState` carries `bonusSeed`/`bonusWinnerId`,
reset each mission. `ENGINE_VERSION` 13 → 14; goldens unchanged. Covered by reducer tests
(spin/award/reroll/ban/reset) and the solo E2E ceremony + ban flow.

**N14 · Squad reward indicators. Done.** `DivePhaseRewards` derives the other divers' draft state
(banked item or still choosing, plus `skipsCurrentDraft`) and `RewardDraft` renders an icon-only
chip per diver: the banked item's art when picked, a pulsing gold dot while choosing, a muted dash
for a skipped draft. Each chip is `role="img"` with a tooltip/`aria-label` naming the diver and
their pick; reduced-motion guarded. Purely presentational — no rules touched. Covered by the
two-diver assertion in `e2e/room.spec.ts`.

**N16 · Incoming-player Valor from run performance. Closed (DEC-7).** Rejected as conflicting with
the canon "Field Promotion restores altitude, never rarity" (`selectors.ts`): a joiner already
inherits the current mission's squad-level performance through `lastReport`, and any additional
run-performance term would let a fresh diver reach S/S+ without taking risk. No code. Reopen only if
live play shows joiners are meaningfully behind.

**N22 · Field Promotion re-rolls on every claim. Done (repro confirmed).** Reproduced: a joiner with
`catchUpGranted = 4` saw 7 unique candidates across four claims. Cause: `catchUpOptionsFor` rolled
`catchUpOwed` options against the shrinking owed count and growing owned set, so each claim re-rolled
a fresh slot. Fixed without storing state (invariant 4): the full `catchUpGranted` grant rolls once
against the joiner's starting kit (the inventory they were seated with) and claimed items are
filtered out of the returned draft, so a promotion is a fixed N-item draft. No `ENGINE_VERSION` bump
— the rules (base tier, zero Valor, N picks) are unchanged, only the offer's stability is.

**N26 · Failure path rework. Accepted (DEC-8: keep current rule).** The owner reviewed the
alternatives (first-failure-free, difficulty drop, squad choice) and kept the current rule: repeat
the operation at the same difficulty, forfeit one item (owner-scoped, host-only), front carries over,
fresh misfortune. The confirmed-good parts from QA stay as the regression baseline. No code.

### Batch D

**N2 · Faction strains. Done (DEC-5).** Strains landed as an **optional, operation-long team-risk
commitment**. A strain is a subfaction of the drawn front, rolled with the front at the operation's
first spin (`deriveStrain`, `wheel.ts`) and gated per-strain by `STRAIN_MIN_DIFFICULTY` like
misfortunes. The spin opens the wheel decision: the squad (host-only, like the misfortune) answers
the misfortune and the strain call **independently** — either may be locked first, and a dedicated
`strain` phase carries the strain when the misfortune is locked first. The phase only advances to
pacts once both calls are in; declining is free and zero-risk.
Accepting adds the strain's **team risk to every mission** of the operation (compounding over its
2–3 missions) and locks until the operation ends: a **win** rolls a fresh front+strain on `ADVANCE`;
a **failure** restarts at mission 1, keeps the front, and **reopens the strain decision** (same
draw, re-decidable). The call may still flip in the pact window until the first pact lock. Strain
reroll is a mission-1-only token sink mirroring the front gate, and a front reroll redraws the
strain with it. Strains are **flavor + risk, never rule-bearing** — the app cannot observe enemy
composition, so no unverifiable restriction is attached; the real subfaction reshapes loadout
decisions in-game and the app only prices the risk. Carrot is **extra Valor only**. Implementation:
`shared/data/strains.ts` (nine subfactions, three per front) with `STRAIN_RISK` (2–3) /
`STRAIN_MIN_DIFFICULTY` in config; strain into `teamRiskOf` / `maxValorFor` /
`ceilingRangeForDifficulty`; `strainId` + `strainAccepted` + `strainDecided` on `DiveState`; a
three-part `(misfortune × front × strain)` combo key; strain-aware `REROLL_WHEEL` guards; host-only
`ACCEPT_STRAIN` (whitelist + `HOST_ONLY_ACTIONS`); the `strain` phase in the seatable set, the
phase key and the home phase labels; a WheelPanel front-card accept/decline treatment with its own
reel and reroll dice (the strain reels **after** the front settles, since it is a subfaction of
it), strain emblems tinted to the front accent (`public/images/strains/` + `strainImageUrl`), and a
lock-icon decision indicator (open/closed + tooltip) replacing the old text stamp; the diving
briefing names the active strain. `SAVE_SCHEMA_VERSION` 8 → 9
(`migrateV8toV9` defaults the fields and widens legacy combo keys), `ENGINE_VERSION` 16 → 17,
goldens regenerated (the scripted crusade now decides strains — accepting on even operations and
risk-3 draws). Covered by strain catalog/derivation tests, reducer tests (compounding, decline,
failure reopen, op-completion clear, reroll/redraw/refusal), selector tests, the v8→v9 migration
tests, and the updated solo/room/a11y E2E flows.

**N10 · Crash / host-loss resilience.** Host migration exists (`removeDiver`, `reducer.ts:85`;
server migration). **Most of the listed gaps have since landed** (verified while starting Batch D):
`connectionFailed` handling + a reconnect panel, "You are now host" / "Host moved to …" /
"Connection lost — reconnecting…" toasts, presence dots, and a reachable host-only "Hand over host"
control in `SquadStrip` (so the old "`TRANSFER_HOST` is unreachable" note is stale). What remains is
the **mid-match void/abort path** (DEC-9): there is still no way to cancel the current mission with
no forfeit, so a crash forces playing/reporting it or a full `END_DIVE`.

**N15 · Identical incoming kits.** Likely expected, not aliasing: every mid-crusade joiner gets the
same surplus kit (`room.ts:72`), and an untouched cache is exactly that kit. Verify with a repro; if
caches must differ it is really N16 territory.

**N17 · Onboarding. Done.** The loop primer ships as `DiveGuide.vue` (six beats: spin → decide →
pact → dive → report → reward, plus a Valor/ceiling explainer and the three accountability tells
from `ACCOUNTABILITY_LABELS`), shared by two surfaces:
- a persistent **Guide** slide-over (`GuideDrawer.vue`, nav `IconGuide`), mounted globally in
  `app.vue` like the Codex/Warbonds drawers so it never unmounts the dive session;
- a one-shot **first-run / link-join primer**: `useDiveIntro` (`griffdive:dive-intro:v1`) marks it
  seen per browser, and the dive opens the guide the moment a diver is seated. The Warbonds intro
  now follows it (`watch(guideOpen)` hands off once the primer closes) so first-timers read one
  panel at a time instead of two stacked modals.
Inline `AppTooltip`s on the Valor meter title, its ceiling ladder, and the header ceiling badge
explain the term and the odds. Presentation + a localStorage flag only — no engine, schema, or
rule change, so no `ENGINE_VERSION` bump and goldens untouched (per the rule-change checklist).
Covered by `e2e/guide.spec.ts` and the updated one-shot assertions in `e2e/warbonds.spec.ts`.

**N39 · Team reroll-token economy.** The strain (N2) adds a second operation-long token sink beside
the front, so the shared reroll pool needs more sources. Audit the current supply
(`REROLL_TOKENS_PER_OPERATION` 1/op plus the free overrule on already-completed combos) against the
new demand; candidate sources: a full-star clear on a strain-accepted operation, an
operation-complete bonus, or a bonus-honors team award. Design pass, no code yet.

### Post-v1 / R&D

**N3 · Campaign API / MO boosts.** New server proxy route + cache (respect rate limits/ToS), with
campaign data injected into state like seeds so the engine stays pure. Offline must degrade
gracefully. Engine purity (invariant 1) forbids fetching inside `shared/engine/**`.

### Shipped outside the batches

**N31 · Remove open-dive lobby / matchmaking.** Griffdive targets an already-engaged squad (Discord,
friends), so public matchmaking is a liability. Removed the whole feature: `openToLobby` flag and
`TOGGLE_OPEN` action (engine + host-only list), `LobbyEntry` + `lobby` message, `LOBBY_ROOM`
pseudo-room, `listLobby`/`lobbyEntryFor`, `GET /api/lobby`, the `/lobby` page, the "Open to lobby"
header toggle, the "Browse open dives" link and lobby perk, the store's `lobbyRooms`, the
`griffdive_open_rooms` gauge, and the lobby unit + E2E specs. The deploy smoke-check moved from
`/api/lobby` to `/`. The `lobby` **phase** (a created-but-unlaunched room, `createLobbyState`)
remains — it is not matchmaking. Rooms are invite-link/code only.

**N32 · Kit ordering.** Added `shared/data/ordering.ts` (`compareKitItems` / `sortKitItems`): within
the inventory, stratagems group by role — Eagle/Orbital, then support (`Supply`), then
emplacements/turrets (`Defense`) — and every bucket sorts best-tier-first with display-name
tiebreaks, so rewards slot into a stable order across catalog refreshes. `InventoryGrid` renders the
sorted kit. Covered by `shared/data/ordering.spec.ts` (including a total-order check over the real
stratagem catalog).

## Accepted / notes

- **N28 (`F1`) · `holdingsEmpty` is unreachable.** Needs ~19 failures per diver; fine as a safety
  net. No action.
- **N30 (`F4`) · Failure cannot lower difficulty or set `achieved`.** Verified by inspection; a
  diff-10 wipe restarts the diff-10 op. Keep unless N26 changes it.

## Regression baseline (confirmed working)

Preserve these when touching the related code:

- **Seating window:** a fresh join during `rewards` is rejected cleanly with `dive-locked`.
- **`skipsCurrentDraft`:** a diver seated during `diving` never blocks the reward draft.
- **Field Promotion:** sizing `difficulty − variant start` capped at `CATCHUP_CAP`, base-tier-only
  offers, cache-vs-promotion one-time choice, self-service claims.
- **Host authority & coercion:** self-service actions coerced to sender; `FAIL_PACT` accepted from
  the diver or host; `KICK_DIVER` parks the inventory and cannot remove the host.
- **Determinism/sync:** 24 automated missions matched REST snapshots to the live client; no desync.
- **Action-log cap:** enforced at 200 entries.
- **Forfeit matrix:** failure restart semantics, star forcing, `completedCombos` preserved on
  failure, owner-scoped forfeit, host-only enforcement, armor passives forfeitable.

## Testing notes

- Engine unit + golden tests live beside each module (`shared/engine/*.spec.ts`,
  `shared/engine/__goldens__/`); regenerate with `GRIFFDIVE_UPDATE_GOLDENS=1 pnpm test`.
- The dev engine module is not dynamically importable from the page, and the dev server is only
  reachable from the browser host; past QA drove flows through the real UI plus raw WebSocket
  clients against `GET /api/rooms/:code`. Reuse that harness for the repros here (N15, N22).
