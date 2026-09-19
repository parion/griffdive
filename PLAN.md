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
| N2 | Faction strains (spore Terminids, vote-snatcher Illuminate) | Design | XL | Blocked (DEC-5) | new |
| N3 | Helldivers campaign API → MO boosts | Feature/Infra | XL | Phase 5 | new |
| N4 | Stars default to full | UX | S | Done | new |
| N5 | Mandatory 4 stratagems; remove `barebones`; early-game pact trap | Rules | M | Done (DEC-1: loadout-checked + reserve + exclusivity) | new |
| N6 | Time % + samples (common/rare/super) boost Valor slightly | Rules | M | Done (DEC-2) | new |
| N7 | Valor meter visual (lore-named) | UX | M | Todo (DEC-3 name: Valor) | new, QA-U1 |
| N8 | Reward ban + separate reward reroll | Rules/Design | L | Blocked (DEC-4) | new |
| N9 | `stimAbstinent` at max risk (`untouchable` already 3) | Balance | S | Done | new |
| N10 | Crash / host-loss resilience mid-match | Infra/UX | L | Blocked (DEC-9) | new, QA-T3 |
| N11 | Codex kicks host + no back link | Bug | S | Done | new |
| N12 | Faction reroll broken + no same-result reroll | Bug | S | Done (front gate + same-result refusal) | new, QA-T2/D1 |
| N13 | `fragileLiberty` locks out early players | Balance/Data | M | Blocked (DEC-6) | new |
| N14 | Squad reward indicators (icon-only) | UX | M | Todo | new |
| N15 | All incoming kits look identical | Bug? | S–M | Needs repro | new |
| N16 | Incoming Valor from current run performance | Design | M | Blocked (DEC-7) | new |
| N17 | Onboarding for link-joiners | UX | L | Blocked (N6/N7) | new |
| N18 | Rejoining under stored `playerId` does not reclaim legacy cache | Bug | S | Done | QA-T1/D3 |
| N19 | S+ unpreviewable in low difficulty bands | Balance/UX | S | Done | QA-U2 |
| N20 | Squad strip a11y (online dot + host crown indistinguishable) | UX | S | Done | QA-U3 |
| N21 | `MARK FAILED` confirm has no armed cue | UX | S | Done | QA-U4 |
| N22 | Field Promotion re-rolls its offer on every claim | UX/Design | M | Needs repro | QA-U5 |
| N23 | Star→options is flat early (3★ = 2 options) | Balance | S | Done | QA-B1 |
| N24 | Pact redundancy is free risk (subsumed pacts still count) | Balance | M | Done (exclusive groups + subsumption) | QA-B2 |
| N25 | Pacts are strictly "take everything" | Balance | S | Todo | QA-B3 |
| N26 | Failure path rework | Design | L | Blocked (DEC-8) | QA-B4 |
| N27 | S+ / Liberty's Cross frequency at altitude | Balance | S | Done (monitor) | QA-B5 |
| N28 | `holdingsEmpty` branch effectively unreachable | Infra | S | Accepted | QA-F1 |
| N29 | Stale mission counter during `forfeit` | UX | S | Done | QA-F2 |
| N30 | Failure cannot lower difficulty or set `achieved` | Rules | S | Accepted | QA-F4 |
| N31 | Remove open-dive lobby / matchmaking | Feature | M | Done | new |
| N32 | Kit ordering: stratagem role then tier | UX | S | Done | new |
| N33 | Reward options skew to base tiers even at a high ceiling | Balance/Bug | M | Blocked (DEC-10) | new |
| N34 | Copy-invite icon by session ID + lone-host share aside | UX | S | Done | new |
| N35 | Users-list waiting indicators (pacts/rewards) | UX | S | Done | new |
| N36 | Mandatory 4 slots vs equip-restricting misfortunes | Rules | M | Todo | new |

Also carried, positive: `F3` (failure copy/guardrails excellent) lives in the regression baseline.

## Decisions needed

| DEC | Question | Blocks |
|-----|----------|--------|
| DEC-1 | Stratagem-restricting pacts: rule text is "equipped but never called" (accountability moves to field/loadout-with-intent), or provide a neutral fallback stratagem list for early players? | Resolved — N5, N24 |
| DEC-2 | Time/samples → Valor: target max bonus (e.g. +0.5 total, or +1.0), and sample rarity weights? | Resolved — N6 |
| DEC-3 | Luck meter name (candidates: Liberty's Favor, Dive Fortune, Providence), and do rerolls exclude only the immediately replaced result or every prior result this window? | Resolved — split: DEC-3a naming (N7), DEC-3b reroll scope (N12) |
| DEC-4 | Reward reroll token: banked across missions or per-mission? Ban scope: personal-crusade or squad-wide, and does a ban cost the whole reward pick? | N8 |
| DEC-5 | Strains: drawn per operation (with the front) or per mission? Flavor-only or rule-bearing modifiers? Which front/strains ship first? | N2 |
| DEC-6 | Light-armor fix: add a light starter passive, reword `fragileLiberty` to "no heavy armor", or gate the misfortune? | N13 |
| DEC-7 | Incoming-player Valor: cap, and the non-exploit rule (e.g. scales off the squad's banked performance, not a fresh join's). | N16 |
| DEC-8 | Failure rework direction (owner-flagged, to be spec'd): what replaces "repeat op + forfeit one item"? | N26 |
| DEC-9 | Mid-match crash semantics: void the mission with no forfeit, auto-pause, or keep the forfeit? | N10 |
| DEC-10 | Target distribution for rolled reward options under a ceiling (favor near-ceiling vs uniform), and the S+ guarantee fallback when the diver's S pool is empty. | N33 |

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

## Batches

Each batch lands shippable and green.

### Batch A — Hotfixes (unblocked)

Landed. N1, N4, N9, N11, N12 (faction-reroll gate), N18, N20, N21, N29, plus removing `barebones`
(the shippable half of N5). N12's same-result reroll exclusion landed with DEC-3b and the rest of N5
with DEC-1. `ENGINE_VERSION` bumped 9 → 10; goldens regenerated (Barebones removal reshapes the pact
offer draw).

### Batch A2 — UX follow-ups (unblocked)

Landed. N34, N35. No engine changes (presentation only) — no `ENGINE_VERSION` bump or golden regen.

### Batch B — Rules & economy (needs decisions)

N7, N25, N33, N36. N5/N24 landed with **DEC-1** (reserve kit, mutual exclusion, four-slot floor),
N6 landed with **DEC-2** (time/samples Valor), and N12's same-result reroll landed with **DEC-3b**.
N36 is the misfortune half of the DEC-1 loadout-floor work and needs no new decision; N7 (the Valor
meter) is now unblocked and waiting on its own build.

### Batch C — Rewards & catch-up

N8, N14, N16, N22, N26.

### Batch D — Content, resilience, onboarding

N2, N10, N15, N17.

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

**N7 · Valor meter.** Valor is `teamRisk + pactRisk + performance` (`valorOf` in `rewards.ts`)
surfaced today as raw `valor 6` (`dive/[id].vue`). Build the lore-named **Valor** gauge fed by
`ceilingRange` that teaches "risk buys odds, never guarantees". Fold in QA-U1: the diving Briefing
drops the odds entirely while the pacts window shows `~22% · valor 6` — carry the same number
through. Unblocked now that DEC-3a fixed the name.

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

**N33 · Reward options skew to base tiers even at a high ceiling.** Observed on room `YK3SUN`,
Super Helldive (10), misfortune accepted and all pacts locked: the header read `ceiling S+`, but the
draft offered just B (Oxygenator), B (Concussive Padding), C (Combat Hatchet) and C (Sterilizer).
Cause: `tierWeight` (`rewards.ts:105-111`) returns
`TIER_ROLL_WEIGHT_BASE ** (ceilingIndex - TIER_INDEX[tier])`, so lower tiers weigh *exponentially*
more — at an S+ ceiling the weights are C=8, B=4, A=2, S=1 (~53% C). A high ceiling therefore buys
a thin shot at S while flooding the draft with base-tier gear, which contradicts north star 3
("reward scales with stakes") and makes a deep, risky run feel unrewarding. Fix direction (DEC-10):
favor tiers near the ceiling, or clamp rolled options to a window beneath it, instead of weighting
toward the base. Related check: the guaranteed one-S slot (`rewards.ts:149-156`) silently vanishes
when the diver's candidate S pool is empty (everything owned, or none in their declared warbonds) —
verify and fall back to the highest available tier rather than dropping the guarantee.

**N36 · Mandatory 4 slots vs equip-restricting misfortunes.** The pact half landed with DEC-1, but
misfortunes carry the same four-slot tension and `hasLegalLoadout` already models it (an accepted
misfortune whose own bans strand the loadout is not blamed on a pact). Open questions: `noStratagems`
is behavioral — four slots still equip, they just cannot be called — so it should stay out of the
equip ban-list (it currently is); and `oopsAllOrbitals` needs four *orbital* stratagems, which an
early player owning only the base kit's two orbitals cannot field. Consider an equip-legality guard
at the **wheel decision** (warn before accepting, or refuse an impossible accept) with the reward
pool taken into account. No new decision needed; scope it once N6/N7 settle.

### Batch C

**N8 · Reward ban + reroll.** Separate reward reroll (earned over mission successes) plus a way to
spend your reward pick to ban offered item(s). Needs new actions (`REROLL_REWARDS`, ban), exclusion
support in `rollRewardOptions` (`rewards.ts:110`), `DiveState` fields, config, and an AGENTS.md
economy section. Negative targeting (bans) does not violate "guarantee rarity class, never specific
items", but scope must be defined (DEC-4).

**N14 · Squad reward indicators.** `RewardDraft.vue` already receives per-diver `pickedOptionId`;
render icon-only chips for other divers, plus a "picked" dot while waiting.

**N16 · Incoming-player Valor from run performance.** Conflicts with the canon "Field Promotion
restores altitude, never rarity" (`selectors.ts:118-126`). Any "average-ly on current run
performance" term must be a deliberate, capped, non-exploitable exception (DEC-7), and AGENTS.md
must be updated.

**N22 · Field Promotion re-rolls on every claim.** Claiming `catchUpOwed = N` shows N options, then
re-derives N−1, N−2, … so 3 picks can expose up to 6 candidates rather than one 3-item draft
(`selectors.ts:118-126`, `FieldPromotionCard.vue:19`). Verify intent; if a single draft was meant,
store the rolled options for the grant instead of re-deriving.

**N26 · Failure path rework.** Owner-flagged during play; the current rule (repeat op + forfeit one
item, `reducer.ts:289-314`) is to be re-spec'd (DEC-8). Keep the good parts confirmed in QA: one-item
rule, owner-scoping, host-only enforcement, "front carries over / fresh misfortune" copy.

### Batch D

**N2 · Faction strains.** Spore Terminids and vote-snatcher Illuminate differ enough to be modeled.
Proposed: `Strain { id, frontId, name, rule, minDifficulty, riskDelta }`, drawn with the front at
the operation's first spin (`wheel.ts:22`) and persisting for the op. The front wheel becomes
front+strain; combo tracking and the reroll economy must account for it. Cadence and rule-bearing
depth are DEC-5.

**N10 · Crash / host-loss resilience.** Host migration exists (`removeDiver`, `reducer.ts:85`;
server migration), but there is no mid-match void/abort path, no presence/host-change toast, and no
in-app host transfer control (QA-T3; `TRANSFER_HOST` exists in the reducer but is unreachable from
the UI). Mid-game HD2 crashes and host leaves throw off the operation. Needs the void semantics
(DEC-9), toasts ("You are now host", "Connection lost"), and a host-only "Hand over host" control.
Note: the worktree currently has uncommitted `connectionFailed` handling in `useGameSocket.ts` /
`useDiveSession.ts` that is a first step here — finish and commit it.

**N15 · Identical incoming kits.** Likely expected, not aliasing: every mid-crusade joiner gets the
same surplus kit (`room.ts:72`), and an untouched cache is exactly that kit. Verify with a repro; if
caches must differ it is really N16 territory.

**N17 · Onboarding.** First-run / link-join "How a dive works" primer (spin → decide → pact → dive →
report → reward), a persistent help drawer, and inline tooltips on Valor/ceiling. Reuse
`PactBriefing` and the accountability labels. Depends on N6/N7 so the explanation is stable.

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
