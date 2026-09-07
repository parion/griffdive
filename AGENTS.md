# Griffdive — Project Source of Truth

Griffdive is a squad roguelike companion app for **Helldivers 2**. It wraps the game's missions in a
challenge campaign: squads climb the difficulty ladder with scavenged loadouts, spin a Wheel of
Misfortune before every dive, and individually choose pacts — the more risk accepted, the rarer the
loot. The name nods to the Halo fan-favorite Griffball, and to Griffin, who dives.

This document is the authority for game rules, architecture, and conventions. It is written for AI
coding agents and human contributors. **Any change that alters rules, data shapes, or architecture
must update this file in the same commit.**

> Fan project. Not affiliated with or endorsed by Sony Interactive Entertainment or Arrowhead Game
> Studios. Non-commercial, no ads, no monetization.

## Status

Phase 0 (foundation), Phase 1 (solo core), Phase 2 (realtime squads) and Phase 3 (lobby) are
complete: `pnpm lint`, `pnpm test`, `pnpm typecheck` green (186 tests incl. a deterministic golden
crusade replay 3→10 and the server sync suite); playable solo UI with named localStorage saves +
JSON export/import; realtime rooms with join links, presence, host authority + migration,
reconnection; open-dive lobby with filters and instant join — verified by a live two-peer smoke
test and the Playwright E2E suite (solo flow, two-browser room sync, lobby join) against the
production build. Mid-crusade catch-up (Field Promotion + legacy caches, `LEAVE_DIVE`) has landed;
Phase 4 (polish + deploy) is next. See [Roadmap](#roadmap).

---

## Commands

pnpm only (`pnpm-lock.yaml` is canonical).

| Command | Status | Purpose |
| --- | --- | --- |
| `pnpm install` | exists | Install deps (`postinstall` runs `nuxt prepare`) |
| `pnpm dev` | exists | Dev server at `http://localhost:3000` |
| `pnpm build` | exists | Production build (Node/Nitro server) |
| `pnpm preview` | exists | Preview production build |
| `pnpm generate` | exists | Static build (pure client-side SPA — solo/offline only — no WebSocket server) |
| `pnpm lint` | exists | ESLint via `@nuxt/eslint` module |
| `pnpm lint:fix` | exists | Auto-fix lint/style issues |
| `pnpm test` | exists | Vitest (engine unit + golden tests) |
| `pnpm test:watch` | exists | Vitest watch mode |
| `pnpm test:e2e` | exists | Playwright (solo flow, room sync, lobby join; production build on :3173) |
| `pnpm typecheck` | exists | `nuxt typecheck` (vue-tsc) |
| `pnpm test:e2e` | Phase 3 | Playwright (dive flow, room sync) |

Update this table the moment a command lands.

---

## Design north star

Griffdive fuses three systems. Each contributes a specific, researched lesson:

| Inspiration | What we take |
| --- | --- |
| **Penitent Crusade** (helldivers2challenges.com) | The campaign ladder: start at difficulty 3 with surplus gear, climb one difficulty per completed operation, reach difficulty 10. Stars → reward option count. Failure = repeat difficulty + forfeit an item. |
| **Wheel of Misfortune** (community challenge) | The ritual: spin a challenge wheel + an enemy-front wheel before every mission. Overrule/reroll results already completed on that front. Extraction required for a win. |
| **Hades Pact of Punishment** | Chosen-risk economy: hand-picked ranked conditions ("heat") gate rarer bounties. Conditions must tax *different* player strengths so no pick is strictly dominant. |

Design principles — every gameplay decision must honor these:

1. **Risk is chosen, never forced.** A zero/low-risk dive is always available (Penitent Crusade
   baseline). Wheel randomness is bounded by a difficulty-scaled pool, and rerolls exist.
2. **Risk is legible.** Before committing to a dive, the UI shows exactly what tier ceiling the
   current risk buys (skull icons à la Dead Cells cursed-biome doors / Hades' Erebus gates). No
   hidden math.
3. **Reward scales with stakes.** Flat drops regardless of difficulty is the documented failure of
   both Penitent Crusade and Dead Cells' late-game cursed chests. Risk must move the odds.
4. **Guarantee rarity class, never specific items** (Balatro skip tags). Players buy a *chance* at
   better gear, not a shopping list.
5. **Misfortunes reshape decisions, not stats** (Deep Rock Galactic's mutator design). A misfortune
   should change loadout strategy, route, or behavior — not just make numbers bigger.
6. **Team risk is shared; personal risk is personal** (Slay the Spire 2 co-op model). The whole squad
   carries the misfortune; each diver carries their own pacts and drafts their own rewards.
7. **Failure is a setback, not a wipe.** Repeat the difficulty, forfeit one item, keep climbing.

---

## Game rules (canonical spec)

### Core loop

A **crusade** (= run) is played by a squad of 1–4 divers in the real game. An **operation** is a
variable-length set of missions at the crusade's current difficulty (wiki.gg/Difficulty): 2
missions at difficulties 3–4, 3 missions at 5 and up. The **front (faction) is drawn once per
operation**, with the operation's first spin, and persists across its missions — a failure
restart keeps it. Every mission begins with a fresh misfortune draw. Per mission:
1. **Spin** — the squad spins the Wheel of Misfortune: one **misfortune** (team-wide restriction)
   for this mission; the operation's first spin also draws the **front** (Terminids / Automatons /
   Illuminate).
2. **Decide** — before any pact exists, the squad (host executes, IRL voice vote) **accepts or
   declines** the drawn misfortune. Declining runs a zero-team-risk dive; accepting applies the
   misfortune's **team risk** (1–5) to every diver's luck for this mission. A reroll redraws and
   resets the decision.
3. **Pact** — each diver is dealt a personal **pact offer**: 2 pacts on difficulties 3–6, 3 on 7+,
   rolled deterministically from the wheel seed (per diver) once the decision is in. The offer
   pool filters out pacts the accepted misfortune makes redundant or impossible; a declined draw
   offers from the full catalog. Each diver privately picks any subset of their offer (0 to all).
   The reward-tier preview updates live with their personal ceiling.
4. **Dive** — play the mission in Helldivers 2. Success = main objectives complete **and** the squad
   extracts. Objectives complete + squad wipe = failure (extraction rule).
5. **Report** — squad records outcome: success (stars 1–max, optional time %) or failure (no stars).
6. **Rewards** (success only) — each diver is offered N options rolled against their personal tier
   ceiling and picks one. All rewards go to the diver's personal inventory — stratagems included.
   Armor rewards are **passives**, never armor pieces (see inventory model).
7. **Advance** — next mission, which draws a fresh misfortune. Completing all missions of an
   operation bumps the crusade difficulty by +1. Failure restarts the operation (mission 1) at the
   same difficulty, keeps the front, and the squad forfeits one item.

The crusade is **achieved** ("Griffdive achieved") when the squad completes an operation at
difficulty 10. The run may then end, or continue in endless mode (post-v1).

### Starting variants

| Variant | Squad size | Start difficulty | Start kit notes |
| --- | --- | --- | --- |
| Standard | 3–4 | 3 (Medium) | Surplus/outdated starting gear |
| Solo/Duo | 1–2 | 3 | + Orbital Precision Strike |
| Super | 3–4 | 4 (Challenging) | Melee secondaries only, Integrated Explosives, Ballistic Shield |
| Solo/Duo Super | 1–2 | 4 | Same as Super + Orbital Precision Strike |
| Quickplay | any | 7 (Suicide Mission) | Extra stratagems + boosters at start |

Warbonds are premium, per-player purchases, so ownership is declared **per diver**, never by the
host: each diver self-declares their owned warbonds (`SET_WARBONDS`, self-service, any phase;
default all). Reward offers roll against the diver's own catalog — a diver is never offered items
from warbonds they don't own. Starting kits are not warbond-filtered.

### Team layer — misfortunes (Wheel)

Exactly one misfortune per **mission**, drawn from the pool eligible at the operation's
difficulty. The draw is an offer, not a verdict: in a dedicated **decision** phase before pacts
roll, the squad (host executes, IRL voice vote) **accepts or declines** it. Declining runs a
zero-team-risk dive; accepting applies the misfortune's **team risk** (1–5) to every diver's luck
for this mission. A reroll redraws and resets the decision.

Starter catalog (all values tunable in `shared/engine/config.ts`; ids and shape are the contract):

| Misfortune | Rule | Team risk | Enters pool at | Accountable via |
| --- | --- | --- | --- | --- |
| No Backpacks | No backpack stratagems | 1 | diff 3 | loadout |
| No Sentries | No sentry stratagems | 1 | diff 3 | loadout |
| No Boosters | No boosters equipped | 1 | diff 3 | loadout |
| No Resupplies | Never call resupply | 4 | diff 3 | field |
| No Eagles | No Eagle stratagems | 2 | diff 4 | loadout |
| Fragile Liberty | Light armor only | 2 | diff 4 | loadout |
| No Orbitals | No orbital stratagems | 2 | diff 5 | loadout |
| Primary Only | Primaries only — no support weapons, no pickups or swaps (stratagems allowed) | 3 | diff 5 | field |
| Stealth | No raised alarms or bot detections | 3 | diff 5 | field |
| Oops, All Orbitals | Orbital stratagems only | 3 | diff 6 | loadout |
| Zero Deaths | Any diver death = mission failure | 4 | diff 7 | field |
| No Reserves | No one gets reinforced this mission | 4 | diff 7 | field |
| No Stratagems | No stratagems at all, not even resupply | 5 | diff 9 | loadout |
| Melee Only | Melee weapons only | 5 | diff 9 | field |
| Pacifist | No diver scores a kill | 5 | diff 9 | stats |

**Accountability:** misfortunes are held to the same standard as pacts (see Personal layer) —
every wheel rule must be checkable through the loadout screen, live in the field, or the
end-of-mission stats screen. *Secondary Only* was discarded for this (nothing attributes which
gun fired, and its checkable residue — no support weapons — is worth 1–2 risk, not 4) and was
replaced by *No Reserves*; *Primary Only* was re-ruled to its observable core (no support
weapons, no pickups or swaps — carried gear is visible on every model). *Melee Only* stays: its
breach is the one rule that is literally audible (any gunshot), and support weapons are visibly
absent. *Pacifist* is the clean stats-channel rule — stratagem kills count to the caller, so a
zero-kill squad is forced into genuine support builds.

**Rerolls:** rerolling a wheel result is free if the squad already completed that exact
(misfortune × front) combo earlier in this crusade (the video's overrule rule). Otherwise the squad
spends a reroll token — 1 token per operation, spendable on either wheel. Never rerollable into an
outcome the pool doesn't allow at the current difficulty. **The front (faction) locks in for the
whole operation**: it can only be rerolled during the operation's first mission decision window
(`missionIndex === 0`, enforced in the reducer and `canRerollWheel`); misfortune rerolls stay
available in any decision or pact window (until the first pact lock).

**Fronts:** the front is drawn with the operation's first spin (one per operation) and only affects
combo tracking (and future front-specific content). It exists for flavor and the reroll economy.

### Personal layer — pacts

Each diver picks 0–3 pacts per mission, but never straight from the catalog: once the wheel
decision is in, the engine **rolls each diver a personal pact offer** — 2 pacts on difficulties
3–6, 3 on 7+ (`PACT_OPTIONS` in `shared/engine/config.ts`). The offer is a deterministic
derivation of the wheel seed per diver (`pactOfferFor` in `shared/engine/selectors.ts`), so every
client computes the same 2–3 pacts with no extra sync; it is never stored. The pool filters out
pacts the **accepted** misfortune makes redundant or impossible; a declined draw offers from the
full catalog. Pacts are personal restrictions worth **pact risk** (1–3), and pact risk adds only
to that diver's luck.

**Accountability rule:** every pact in the catalog must be verifiable in Helldivers 2 through one
of three channels — the **loadout screen** (equipped gear and stratagems, visible pre-dive), the
**field** (resupply beacons, carried gear, deaths and reinforce prompts, all visible live), or the
**end-of-mission stats screen** (stims used, deaths, reinforcements per player). Pacts with no
observable trace — usage only the diver themselves can see — are banned from the catalog (the old
*Sidearm Purist* was discarded for exactly this: nothing in HD2 attributes kills or shots to a
weapon slot).

Starter catalog:

| Pact | Rule | Pact risk | Accountable via |
| --- | --- | --- | --- |
| Pack Light | I bring no backpack | 1 | loadout |
| Thirsty | I call and take no resupplies | 1 | field |
| Empty Pockets | I equip no booster | 1 | loadout |
| Anti-Tank Abstinent | I carry nothing anti-tank | 2 | loadout |
| Dead Weight | If I die, I refuse reinforcement — I stay dead | 2 | field |
| Stim Abstinent | I use no stims | 2 | stats |
| Loadout Loyalist | I use only my equipped loadout; no pickups or swaps | 2 | field |
| Primary Concern | I bring no support weapon | 2 | loadout |
| Grounded | I bring no Eagle stratagems | 2 | loadout |
| Ship Silent | I bring no orbital stratagems | 2 | loadout |
| Open Field | I bring no sentries, mines, or emplacements | 2 | loadout |
| Barebones | I fill no stratagem slots | 3 | loadout |
| Untouchable | I finish the mission without dying | 3 | field |

**Failed pacts:** a broken pact is marked **failed** (`FAIL_PACT{playerId,pactId}`) while the
mission runs — during the diving phase only, by the diver themselves or by the host refereeing the
squad (server refuses everyone else; the UI asks for a confirm since the mark is one-way). A
failed pact is **voided**: its pact risk stops counting toward luck, so both the ceiling previews
and the rolled offer drop, and it costs one reward option (`OPTIONS_LOST_PER_FAILED_PACT` in
`shared/engine/config.ts`, floored at one so the draft always completes and never deadlocks
ADVANCE). Failed pacts ride the diver's state (`failedPactIds`), reset with the pacts every
mission, and land in the action log for audit.

### Reward math

```
luck          = teamRisk + pactRisk
teamRisk      = accepted misfortune (0–5, 0 when declined)
pactRisk      = sum of the diver's picked pacts (max 8: the rolled
                2–3-pact offer bounds what a diver can stack)

base tier:     diff 3–5 → C   diff 6–7 → B   diff 8–10 → A
ceiling roll:  start at the base tier; each step to the next tier
               (C→B→A→S→S+) succeeds with odds
               min(0.8, luck × (1 + bandPos) / 3^step)
               bandPos = position within the difficulty band (0 floor → 1 top)
```

- Difficulty alone never buys S or S+; only stacked chosen risk does, and even max luck (13)
  leaves S+ below a coin flip. A zero-luck dive always rolls its base tier.
- The reward pool is personal: each diver rolls against the catalog of warbonds *they* declared
  (plus `warbondCode === 'none'` items, minus armor pieces) — never the squad's or the host's.
- Higher difficulties inside a band climb easier: diff 5 rolls into B more readily than diff 3,
  diff 10 into S more readily than diff 8 (`bandPosition`).
- Ceiling = the best tier that *can* appear in that diver's options; the roll is seeded from the
  offer seed (two rng streams: one ceiling, one options) so every client computes the same offer.
  Rolls are weighted toward the tier below the ceiling; the roll still guarantees one S-tier option
  beside it.
- **S+ = Diver's Choice.** No catalog item carries the S+ tier, so the S+ bonus slot is a free
  pick: the diver claims **any item from their own catalog** — same personal-pool rules as every
  reward (warbond-owned items only, armor pieces excluded, nothing already owned). The option
  rides a stable sentinel id (`DIVERS_CHOICE_OPTION_ID` in `shared/engine/rewards.ts`); the UI
  opens a minified codex picker for it, and `PICK_REWARD` carries the named item in
  `choiceItemId`. `pickedOptionId` always records the banked item's id.
- Previews stay legible: the UI shows base tier → best plausible tier (`maxCeiling`, per-step odds
  ≥ 0.2) with the odds of reaching it (`oddsToReach`).
- **Option count** comes from stars (team performance), lookup table `starsToOptions`:
  `[1,1,2,2,3,4]` (index = stars), capped at 4; S+ grants +1 (cap 5). Stars themselves are
  difficulty-capped per the game (wiki.gg/Missions): max 3 at diffs 3–4, 4 at 5–6, 5 at 7+; a
  completed mission never awards 0 and a failed mission awards none (`maxStarsFor` in
  `shared/engine/config.ts`).
- **Failed pacts forfeit stakes** (see Personal layer): each pact marked failed in the field voids
  its risk — luck, previews and the rolled offer all drop — and costs one reward option, floored
  at one so the draft always completes.
- Example curves: diff 3 with an intense misfortune (5) + two stacked pacts (4) → luck 9 → ceiling
  reaches **S** about a fifth of the time, **S+** rarely. Diff 10 with zero luck → **A**, never
  S. Risk pays at every altitude; nothing is guaranteed, but everything gets likelier.

### Inventory model

- **Personal:** primaries, secondaries, throwables, boosters, armor **passives**, and
  **stratagems** — each diver owns and rewards their own. Every diver starts with the full
  starting kit (stratagems included); stratagem rewards go to the diver who rolled them. There is
  no shared pool — a deliberate deviation from Penitent Crusade's sharing rule.
- **Armor = passives, not pieces.** Armor rewards are passive unlocks: the reward pool never offers
  armor pieces (`category === 'armor'` excluded in `rewardPoolFor`). Any armor piece (any weight or
  rating) is freely wearable as long as its passive is owned; the catalog's armor pieces exist as
  the passive → piece mapping (codex display). Losing a passive in a forfeit removes the ability to
  wear armor carrying it.
- **Forfeit on failure:** the squad collectively picks exactly one item to lose — any item from any
  diver's personal inventory (stratagems included). Host executes the pick (simple majority voice
  vote IRL; the app doesn't police it).

### Mid-crusade joining — Field Promotion & legacy caches

Divers drop in and out. A diver seated mid-crusade starts on the variant's surplus kit — which is
useless at altitude — so the engine grants a **Field Promotion**: a one-time catch-up that restores
*altitude, never rarity*.

- **Sizing:** one option per completed operation behind (`difficulty − variant start difficulty`),
  capped at `CATCHUP_CAP` (4) in `shared/engine/config.ts`.
- **Tier:** options roll at the **current difficulty's base tier with luck 0** — the engine's own
  "a zero-luck dive always rolls its base tier" rule. No ceiling roll, so S/S+ and Diver's Choice
  are structurally unreachable. Risk remains the joiner's choice from their first mission; the
  promotion only buys altitude parity.
- **Derivation:** the offer derives from the last spun seed (`catchUpOptionsFor` in
  `shared/engine/selectors.ts`) — deterministic, never stored, no reroll surface.
- **Ceremony is soft:** the joiner claims picks whenever it suits them (`CLAIM_CATCHUP_OPTION`,
  self-service, one per pick). It never gates squad progress — unlike the reward draft, where
  `allDiversPicked` blocks `ADVANCE`.
- **Legacy caches:** every departure (kicked via `KICK_DIVER` or voluntary via `LEAVE_DIVE`, both
  self-service) parks the diver's inventory as `legacyCaches[playerId]` instead of deleting it.
  A mid-crusade joiner with an untouched promotion may claim one cache wholesale
  (`CLAIM_CACHE`) *instead of* rolling the promotion — claiming after rolling options is refused,
  so the two never stack. The same diver rejoining under their stored playerId reclaims their
  unclaimed cache automatically (soft-kick parity: their link still seats them).
- **Seating window:** fresh joins only seat in `lobby/spin/decision/pacts/diving` — never during
  `rewards`/`forfeit` (that would grant a draft for a mission the joiner never dove) or
  `complete`. The server rejects with `dive-locked`. A joiner seated mid-mission
  (`diving`) gets `skipsCurrentDraft` and sits out that mission's reward draft instead of
  blocking it; the flag clears on the mission reset.
- The last diver out abandons the crusade: the room resets to a fresh lobby (parked caches die
  with it).

### Save model

Anonymous/local-first. Named save slots in `localStorage` (`SaveDoc` in `shared/types/save.ts`,
stamped with save-schema + engine + catalog versions), normalized on load via
`shared/engine/saves.ts`, plus JSON export/import (Penitent Crusade parity). **Pre-alpha policy:
saves are not migratable.** Mechanics are still being established, so schema/engine changes may
freely break old saves — version stamps exist for diagnostics only, normalization drops
incompatible docs, and no new migration steps get written. The migration chain reopens at the
alpha release, when the schema freezes. No accounts in v1 —
session link is the identity. Crusade state includes: settings, difficulty, mission index,
`achieved` flag, `frontId`, inventories, per-diver warbond declarations,
`completedCombos` (misfortune × front), reroll tokens, action log (capped), RNG seed history,
legacy caches parked by departed divers, per-diver catch-up bookkeeping.

---

## Architecture

Nuxt 4 full-stack app in SPA mode (`ssr: false` — no server rendering; the app is
localStorage/WS-driven with no SEO surface): Vue 3 frontend, Nitro server (REST + WebSocket),
and a pure TypeScript game engine compiled against both sides via `shared/`. Nitro serves the
app shell (`app/spa-loading-template.html` shows until Vue mounts) plus deep-link fallback for
all routes; static hosts need a `/*` → shell fallback instead.

### Directory map

```
app/
  pages/           index (new crusade / host / join / continue), dive/[id] (solo + room flow),
                   lobby (open dives), codex
  components/      dive/ (WheelPanel, PactPicker, RewardDraft, FieldPromotionCard — the mid-crusade
                   catch-up ceremony, DiversChoiceCard — the special
                   S+ "Diver's Choice" offer card, DiversChoicePicker — its minified codex
                   modal, InventoryGrid, CrusadeSetup, WarbondPicker,
                   JoinNameGate — name gate held while joining),
                   ui/ (ItemCard, TierBadge, RiskPips, ChangelogModal — GitHub deploy log shown
                   from the pre-alpha header chip),
  composables/     useDiveSession (unified local/room driver), useDiveEngine (local reducer +
                   persist), useGameSocket (WS, reconnect, stored playerId), useSaves,
                   useRecentRooms (visited room codes; feeds the home "Continue" online list),
                   useChangelog (GitHub deployments + commits → changelog entries, 10-min cache)
  stores/          session.ts (Pinia: selfId, snapshot, online, lobby list)
  utils/           seed.ts (client seed generation)
  assets/css/      main.css — global HD2 theme (two-font system, see Conventions)
server/
  routes/ws.ts     defineWebSocketHandler — single endpoint, ?room={code|__lobby__}
  utils/           room-sync.ts (hello/action/close/lobby core; KV + peers injected),
                   room-storage.ts (useStorage('rooms') adapter), peers.ts (process-wide
                   peer directory shared by the WS route and metrics),
                   metrics.ts (Prometheus registry: presence gauges + dive counter)
  plugins/         metrics.ts (binds the gauges, serves /metrics on internal :9091)
  api/             rooms/index.post.ts (create), rooms/[code].get.ts (snapshot),
                   lobby/index.get.ts (list)
shared/
  engine/          config.ts, types.ts, reducer.ts, rng.ts, wheel.ts, pacts.ts,
                   rewards.ts, progression.ts, selectors.ts, saves.ts, room.ts
  types/           save.ts (SaveDoc + SAVE_SCHEMA_VERSION), messages.ts (WS contracts,
                   host-only action list)
  utils/           room-code.ts (room-code alphabet + validator)
  data/            items (equipment.ts, stratagems.ts), warbonds.ts, fronts.ts,
                   misfortunes.ts, pacts.ts, catalog.ts (aggregation + CATALOG_VERSION),
                   images.ts (imageURL filename → /images/<dir> URL resolver,
                   difficultyImageUrl for the 1–10 difficulty emblems)
scripts/
  import-catalog.mjs  upstream → shared/data converter (report-only mode: --report)
  upstream/           vendored MIT constants (snapshot commit recorded in _upstream-commit.json)
public/images/        bundled item art keyed by folder: equipment/ (weapons, throwables,
                      boosters), armor/, armorpassives/, svgs/ (stratagems), warbonds/,
                      difficulty/ (1–10 difficulty emblems), faction/ (front emblems)
e2e/                  Playwright specs (solo flow, room sync, lobby join)
playwright.config.ts  production-build webServer on :3173 (WebSocket included)
vitest.config.ts     mirrors Nuxt aliases (~~, ~) so engine + server tests resolve
```

### Engine invariants (non-negotiable)

1. `shared/engine/**` and `shared/data/**` are **pure TS**: no Vue, no Nitro/h3, no browser APIs, no
   `Date.now()`, no `Math.random()`. Time and randomness are injected (seeded PRNG; clock passed in
   or recorded by callers). The engine is deterministic: `(state, action, seed) → state`.
2. **All game rules live in the engine.** Components render state; they never compute rules. If a
   calculation touches risk, tiers, options, or progression, it belongs in `shared/engine/`.
3. **The server validates every action through the same reducer clients use.** Client state is
   never trusted; snapshots are authoritative. `REPORT_RESULT` is honor-system (companion-app trust
   boundary) but the action log makes runs auditable.
4. **Spins are seeds.** A wheel result = seed + deterministic derivation, so a reveal syncs as one
   integer and every client computes the same wheel. Store seeds, not derived results.
5. **All tunable numbers live in `shared/engine/config.ts`** (risk values, thresholds, star tables,
   reroll tokens). No magic numbers scattered in UI or data files.

### Sync protocol (Phase 2)

Host-authoritative, room-per-dive. Nitro WebSocket via `nitro.experimental.websocket` in
`nuxt.config.ts`; single endpoint `/ws?room={code}` (`__lobby__` = lobby listener pseudo-room).
Room state lives in `useStorage('rooms')` (memory driver first; swap to Redis by config only) as
`StoredRoom { code, state, updatedAt }`, pruned on access after a 12h TTL. Live connections live
in an in-process peer directory (crossws pub/sub topics are global to the process — deliberately
unused); horizontal scale later means a Redis-backed directory or sticky sessions.

| Direction | Message | Payload |
| --- | --- | --- |
| C→S | `hello` | `{ name?, playerId? }` — stored playerId reattaches (reconnect) |
| C→S | `action` | `{ action: EngineAction }` (validated server-side) |
| C→S | `ping` | heartbeat — answered with `pong` |
| S→C | `welcome` | `{ selfId, hostId, roomCode, snapshot, online }` |
| S→C | `state` | `{ snapshot, applied (EngineAction \| null), online }` — after each applied change; also an `applied: null` presence refresh the moment a seated diver's last connection drops; `online` = diver ids with live connections |
| S→C | `lobby` | `{ rooms: LobbyEntry[] }` — open dives with slots |
| S→C | `error` | `{ code, message }` — `room-not-found`, `room-full`, `dive-locked`, `not-host`, `not-in-room`, `bad-action`, `bad-room`, `bad-message` |

REST fallbacks: `POST /api/rooms` → `{ code }`; `GET /api/rooms/:code` → `{ code, state }` (404);
`GET /api/lobby` → `{ rooms }`. Self-service actions (`SET_PACTS`, `SET_WARBONDS`, `PICK_REWARD`,
`SET_NAME`) are
coerced to the sender — a client can never act as another diver.

Canonical engine actions (the reducer union; keep names stable):

`START_DIVE{settings}` `SPIN_WHEEL{seed}` `ACCEPT_MISFORTUNE{accepted}`
`REROLL_WHEEL{wheel,seed}` `SET_PACTS{playerId,pactIds}` `FAIL_PACT{playerId,pactId}` `SET_WARBONDS{playerId,warbondCodes}`
`REPORT_RESULT{outcome,stars,timePct?}` `FORFEIT_ITEM{itemRef}` `PICK_REWARD{playerId,optionId,choiceItemId?}`
`CLAIM_CATCHUP_OPTION{playerId,optionId}` `CLAIM_CACHE{playerId,cacheOwnerId}` `LEAVE_DIVE{playerId}`
`ADVANCE{}` `END_DIVE{}` `KICK_DIVER{playerId}`
`SET_NAME{playerId,name}` `TRANSFER_HOST{playerId}` `TOGGLE_OPEN{open}`

Authority rules: host-only actions are `START_DIVE`, `SPIN_WHEEL`, `ACCEPT_MISFORTUNE`,
`REROLL_WHEEL`, `REPORT_RESULT`, `FORFEIT_ITEM`, `ADVANCE`, `END_DIVE`, `KICK_DIVER`,
`TRANSFER_HOST`, `TOGGLE_OPEN`. `SET_PACTS`, `SET_WARBONDS`, `PICK_REWARD`, `SET_NAME`,
`CLAIM_CATCHUP_OPTION`, `CLAIM_CACHE`, `LEAVE_DIVE` are self-service.
`FAIL_PACT` is sent by the target diver or the host (server refuses everyone else). Host disconnect →
`TRANSFER_HOST` to the earliest joiner; none left → room hibernates in storage with a TTL.
Reconnect = re-`hello` with stored playerId → server replays snapshot.
`KICK_DIVER` (host, any phase, lobby included) removes a diver who left or is blocking the
squad: their pending pact lock or reward pick stops gating progress, their personal inventory
leaves with them, and the host can never be kicked. It is a soft kick — the removed client
shows a removal notice, but their invite link still seats them again as a fresh diver.

### Lobby / matchmaking (Phase 3)

Rooms flagged `open` (via `TOGGLE_OPEN`, exposed as the "Open to lobby" header toggle for room
hosts) publish a `LobbyEntry` (room code, squad size/slots free, difficulty, variant, front,
host name) to lobby listeners and `GET /api/lobby`. The lobby page (`/lobby`) lists them with
difficulty/variant/front filters; joining = hitting `/dive/{code}`, which the server accepts if
slots are free. No queue infrastructure — presence only.

### Deployment

One Node service (Nitro) on Fly.io (`griffdive.fly.dev`, `ams` region), WebSocket + REST + static
app together — per-page HTML is a fixed ~2.6 KB gzip shell, so client assets, not rendered pages,
dominate bandwidth. To cut egress further, serve the static app from a CDN (unmetered free egress,
e.g. Cloudflare Pages with a `/*` shell fallback) and keep only WS + REST on the Node service.
`pnpm generate` remains supported for a static, offline, solo-only build. Storage driver swap
(memory → Redis) is config-only for horizontal scale later.

Monitoring: `server/plugins/metrics.ts` exposes a Prometheus registry (`@prometheus-io/client`)
on internal port 9091 (`METRICS_PORT` to override) — default Node metrics plus
`griffdive_online_players`, `griffdive_active_rooms`, `griffdive_open_rooms` (gauges, snapshotted
from the peer directory and lobby at scrape time) and `griffdive_dives_started_total` (counter,
reset per process — query with `increase()` across deploys). `fly.toml`'s `[metrics]` has Fly
scrape it every 15s into the managed Grafana at fly-metrics.net; the port is never registered in
`[http_service]`, so it is unreachable from the public internet.

CI/CD: `.github/workflows/ci.yml` runs lint/typecheck/unit tests + the Playwright E2E suite on
every PR and push to `main`. **Releases are batched:** the `deploy` job (push to `main` +
`workflow_dispatch`, needs both green) targets the `production` GitHub environment, which is
configured with a required reviewer — merges to `main` queue up as "Waiting" runs until the
accumulated batch is approved and ships as one deploy. The `environment:` reference is what
creates the GitHub deployment record (this — not Fly's GitHub app integration — feeds the
"production deployments" UI and the in-app changelog); the job runs `flyctl deploy
--remote-only --wait-timeout 300` against the `Dockerfile` + `fly.toml` in repo using the
`FLY_API_TOKEN` repo secret (an app-scoped deploy token), then smoke-checks `/api/lobby` before
the deployment is marked success. `.github/workflows/preview.yml` deploys a per-PR review app
(`pr-<n>-parion-griffdive.fly.dev`, via `superfly/fly-pr-review-apps` with `fly.review.toml` and
the org-scoped `FLY_REVIEW_TOKEN` secret) whose URL shows in the PR UI; the app is destroyed
when the PR closes. The image
runs `node .output/server/index.mjs` on internal port 8080. `fly.toml` pins one machine
(`min_machines_running = 1`, `auto_stop_machines = false`): room state is an in-memory KV and live
peers live in an in-process directory — more than one machine splits squads across processes, and
every deploy restarts the process, wiping in-flight rooms (the approval gate's batching directly
reduces wipe frequency). Don't touch those two settings until
the Redis swap lands.

---

## Data catalog

- **Schema:** items are `{ id, displayName, type: 'equipment'|'stratagem', category, tags[],
  warbondCode, antitank?, tier }` with `tier ∈ 'c'|'b'|'a'|'s'` (community default tier list;
  tier-maker customization is post-v1). Optional fields: `index?` (upstream ordering), `imageURL?`
  (bare filename; resolved to `public/images/<dir>/` by `shared/data/images.ts`), and armor-set
  extras `armorRating? speed? stamina? passive?`. Categories: `primary secondary throwable booster armor armorPassive` (equipment) and
  stratagem categories (`Supply Eagle Orbital Defense` etc.).
- **Seed source:** constants from [Selenestica/hd2-random-strat](https://github.com/Selenestica/hd2-random-strat)
  (MIT) — vendored at `scripts/upstream/` (snapshot commit recorded there), converted to our
  schema by `node scripts/import-catalog.mjs` (re-run after every upstream refresh), attributed in
  `shared/data/` headers and CREDITS.
  Stratagem SVGs from [Nvigneux/Helldivers-2-Stratagems-icons-svg](https://github.com/nvigneux/Helldivers-2-Stratagems-icons-svg);
  equipment images from [helldivers.wiki.gg](https://helldivers.wiki.gg/wiki/Helldivers_2). Asset
  licensing: respect upstream terms; hot-link or bundle only what the licenses allow.
- **Versioning:** `CATALOG_VERSION` bumped whenever items/warbonds change (Helldivers 2 patches add
  warbonds). Saves record catalog + engine versions as diagnostics only; pre-alpha they buy no
  compatibility — incompatible saves are dropped, not migrated. Migration machinery returns at the
  alpha release.

---

## Conventions

- **TypeScript strict** everywhere; no `any` in shared code. Types live beside their module;
  cross-boundary types in `shared/types/`.
- **Import engine explicitly** via `~~/shared/engine/*` and `~~/shared/data/*` (auto-imports apply
  only to `shared/utils/` and `shared/types/`). Keep engine imports explicit — grep-ability beats
  magic.
- **Naming:** components `PascalCase.vue` grouped by domain folder; composables `useThing`;
  engine modules lowercase noun/verb; types/interfaces `PascalCase`; catalog ids `camelCase`
  (upstream parity). Components register under their bare file name (`pathPrefix: false` in
  `nuxt.config.ts`) — templates use bare PascalCase (`<WheelPanel>`), never the folder-prefixed
  alias.
- **Components are dumb about rules.** They take state + emit intents. No tier math, no risk math,
  no progression logic in `app/components/**` — call engine selectors instead.
- **Styles:** single global theme (HD2 palette: Super Earth gold/khaki, alert red, stratagem teal)
  in `app/assets/css/`; scoped styles for specifics. Mobile-first — divers check their phone between
  missions. Typography mirrors the game's two-font system: `--font-body` (Chakra Petch, the FS
  Sinclair stand-in) for body/UI, `--font-display` (Archivo at `font-stretch: 125%`, the Swiss 721
  Extended stand-in) for big headings only. The display font is a vendored variable woff2
  (`public/fonts/`, OFL included) because the width axis can't be resolved through `@nuxt/fonts`;
  Chakra Petch resolves via the module. Chakra Petch has no weight above 700; anything heavier
  belongs on the display font. Typography mirrors the game's two-font system: `--font-body` (Chakra Petch, the FS
  Sinclair stand-in) for body/UI, `--font-display` (Archivo at `font-stretch: 125%`, the Swiss 721
  Extended stand-in) for big headings only. The display font is a vendored variable woff2
  (`public/fonts/`, OFL included) because the width axis can't be resolved through `@nuxt/fonts`;
  Chakra Petch resolves via the module. Chakra Petch has no weight above 700; anything heavier
  belongs on the display font.
- **Animations are presentation, never rules.** Motion lives in components/CSS and reacts to
  state changes (watch `wheel.seed`, `phase`); it must never drive or gate engine actions.
  Defaults: `motion-v` (`<Motion>`, `<AnimatePresence>`, `<MotionConfig>`, auto-registered by
  `motion-v/nuxt`) for springs, exits and shared-element/layout work; CSS keyframes + the global
  `name="phase"` Vue transitions for ambient loops and phase swaps; shared spring/pop presets in
  `app/utils/motion.ts` (`SPRING_SNAP`, `SPRING_POP`, `SPRING_SOFT`, `riseIn`, `popIn`). Easing
  and duration tokens live in `main.css` (`--ease-out`, `--ease-snap`, `--dur-*`). Reduced motion
  is mandatory: `<MotionConfig reduced-motion="user">` in `app/app.vue` for motion-v, the
  `@media (prefers-reduced-motion: reduce)` guard in `main.css` for CSS, and an explicit
  `matchMedia` check inside any JS-driven effect (e.g. `ReelText`). E2E runs with
  `reducedMotion: 'reduce'` so flows assert settled state, not timing.
- **Comments:** code is self-documenting; comment only *why*, never *what*. No comment noise.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
  Never commit secrets. The repo is git-initialized; the first commit is this file + Phase 0
  tooling.
- **Dependencies:** get approval before adding runtime deps. Currently approved adds:
  `@nuxt/eslint`, `vitest`, `vue-tsc`, `@nuxt/fonts` (Phase 0; fonts is build-time dev dep);
  `@vueuse/core`, `@pinia/nuxt`, `nanoid` (Phase 2);
  `@playwright/test` (Phase 3).   `motion-v` (Phase 4; the only approved animation runtime —
  springs, `AnimatePresence`, shared-element layout). `@prometheus-io/client`
  (server metrics registry; the official continuation of `prom-client`).
  `@nuxt/test-utils` remains optional until a Nuxt-runtime test actually needs it.

## Testing strategy

- **Engine unit tests** (Vitest, colocated `*.spec.ts`): reducer transitions, reward math at every
  score boundary (0, 2, 4, 6, 9), pact validity vs each misfortune, reroll rules, forfeit paths,
  mid-crusade catch-up (promotion sizing/rolls, cache claims, departure parking, seating window).
- **Golden tests:** seeded runs (`mulberry32`) recorded as JSON snapshots — spin results, reward
  option sets, full crusade replays. Goldens live in `shared/engine/__goldens__/`; regenerate with
  `GRIFFDIVE_UPDATE_GOLDENS=1 pnpm test`. Pre-alpha, a reducer change that breaks goldens just
  regenerates them (saves are not migratable — see Save model); from alpha on, breaking changes
  must bump the engine version + write a migration, or revert.
- **Server tests** (Vitest, fake KV + fake peers in `server/utils/room-sync.spec.ts`): room
  join/spin/pick flows, host authority + coercion, host migration, reattachment, room-full,
  TTL pruning, lobby list, metrics gauges/counters (`metrics.spec.ts`). (`@nuxt/test-utils` +
  Playwright browser flows land in Phase 3+.)
- **E2E (Playwright, `e2e/*.spec.ts` via `@playwright/test`):** `playwright.config.ts` boots the
  production build (`pnpm build` + Nitro server, port 3173, WebSocket included). Specs: solo dive
  flow (spin → pacts → report → rewards → advance), two-browser room sync (late joiner, host
  authority, pact lock-in), lobby join (open dive → filter → one-click join). Chromium only;
  `pnpm exec playwright install chromium` after a fresh clone.

---

## Roadmap

Each phase lands shippable. Update AGENTS.md (commands, status) as part of each phase's final commit.

- **Phase 0 — Foundation.** `git init`; ESLint (`@nuxt/eslint`), Vitest, `pnpm typecheck` wired and
  passing; `shared/` structure + engine skeleton (`config.ts`, `types.ts`, `reducer.ts` noop-pass);
  data catalog imported from upstream with attribution and `CATALOG_VERSION`. *Done when:*
  `pnpm lint && pnpm test && pnpm typecheck` all green on a skeleton reducer test.
- **Phase 1 — Solo core (offline playable).** Full engine: wheel, pacts, rewards, progression,
  forfeits, saves (slots + export/import + migrations). UI: home (crusade setup/variants), dive flow
  (spin → pact → report → reward draft), inventory + codex pages. Golden tests for a full scripted
  crusade. *Done when: a complete solo crusade 3→10 can be played, saved, reloaded, and replayed
  deterministically from seeds.*
- **Phase 2 — Realtime squads.** Nitro WebSocket rooms, message contracts, join links (`/dive/:code`,
  6-char nanoid), presence, host authority + validation, reconnection, host migration, Pinia session
  store. *Done when: two browsers play one synced dive; killing the host migrates it; late joiners
  get the snapshot.*
- **Phase 3 — Lobby.** Open-room flag, lobby topic broadcast, lobby page + filters, instant join,
  Playwright E2E. *Done when: a stranger can find an open dive and join in one click.*
- **Phase 4 — Polish + deploy.** Wheel animation juice, reward draft ceremony, theme pass, PWA
  affordances, Fly.io deploy + smoke test. *Done when: production URL serves a full multiplayer
  dive.*
- **Phase 5 — Post-v1 backlog.** Specialists (PC parity), tier-maker custom rarity tables, heat
  ladders/bounties (clear risk N to claim N+1), endless mode, accounts + cloud saves, i18n.

## Attribution & licensing

- Design + code inspiration: [hd2-random-strat](https://github.com/Selenestica/hd2-random-strat) by
  Selenestica (MIT) — Penitent Crusade mechanics and the item/tier constants.
- Icons: Nvigneux stratagem SVGs. Images: helldivers.wiki.gg. Keep CREDITS current with every asset
  added.
- Griffdive's own code: MIT (matching upstream). Confirm with the owner before adding any license
  file.
