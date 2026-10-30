# Game rules (canonical spec)

> Part of the Griffdive docs set. Index: [`AGENTS.md`](../AGENTS.md).

### Core loop

A **crusade** (= run) is played by a squad of 1–4 divers in the real game. An **operation** is a
variable-length set of missions at the crusade's current difficulty (wiki.gg/Difficulty): 2
missions at difficulties 3–4, 3 missions at 5 and up. The **front (faction) is drawn once per
operation**, with the operation's first spin, and persists across its missions — a failure
restart keeps it. Every mission begins with a fresh misfortune draw. Per mission:
1. **Spin** — the squad spins the Wheel of Misfortune: one **misfortune** (team-wide restriction)
   for this mission; the operation's first spin also draws the **front** (Terminids / Automatons /
   Illuminate) and its **strain** (an optional subfaction). The run's **front plan** — follow the
   live **Major Order**, lock one faction, or roll every operation — is chosen at crusade setup and
   pins (or frees) that draw for the whole run — see Operation layer.
2. **Decide** — before any pact exists, the squad (host executes, IRL voice vote) **accepts or
   declines** the drawn misfortune. Declining runs a zero-team-risk dive; accepting applies the
   misfortune's **team risk** (1–5) to every diver's Valor for this mission. A reroll redraws and
   resets the decision. A rule the squad cannot field (one that would strand a diver below HD2's
   four required stratagems) cannot be accepted — see Mandatory four stratagems. On the operation's
   first mission the call then passes to the **strain**: accepting commits the squad for the whole
   operation and adds the strain's team risk to every mission of it — see Faction strains. Once
   both calls are in, the wheel holds on a **deal** step: the host presses **Deal the pacts**
   (host-only `DEAL_PACTS`) to open the hand.
3. **Pact** — each diver is dealt a personal **pact offer**: 2 pacts on difficulties 3–6, 3 on 7+,
   rolled deterministically from the wheel seed (per diver) once the hand is dealt. The offer
   pool filters out pacts the accepted misfortune makes redundant or impossible; a declined draw
   offers from the full catalog. Each diver privately picks a subset of their offer (0 to all; a
   pick strictly implied by another is refused — see Redundant picks).
   The odds line previews the tier chances their personal Valor buys, before a pact is sworn.
4. **Dive** — play the mission in Helldivers 2. Success = main objectives complete **and** the squad
   extracts. Objectives complete + squad wipe = failure (extraction rule).
5. **Report** — squad records outcome: success (stars 1–max, optional time %) or failure (no stars,
   no reward draft — each diver faces a forfeit offer instead). A success opens the reward draft at
   once; the rules only HD2's stats screen can prove, and — on a full-star clear — **bonus honors**,
   are settled afterwards on the squad-climbs page (see Squad climbs — stats check, Penance &
   squad honors).
6. **Rewards** (success only) — the host files the report (stars + time + the samples the squad
   extracted), which banks a credit haul into every diver's purse. Each diver is then dealt N
   options; **every option rolls its own d100 tier** on the same Valor odds line, and the diver
   picks one — nothing waits on a stats rule, because the draft is paid first. All rewards go to
   the diver's personal inventory — stratagems included. Armor passives are **not** in the reward
   pool: the surplus kit and the SEAF Support Package still issue them, but the only way to earn
   another is **Brasch's Armor Pack** (see Brasch's Bargains — credits). The catalog has no armor
   pieces (see inventory model). Credits bank
   into each diver's purse for **Brasch's Bargains**, the shop that restocks every mission (see
   Brasch's Bargains — credits).
7. **Advance** — next mission, which draws a fresh misfortune (the front and strain persist).
   Completing all missions of an operation bumps the crusade difficulty by +1 and the next
   operation draws a fresh front+strain. Failure restarts the operation (mission 1) at the same
   difficulty, keeps the front, reopens the strain decision, and every diver forfeits one item from
   their own kit — see Mission failure — the forfeit offer.

The crusade is **achieved** ("Griffdive achieved") when the squad completes an operation at
difficulty 10. The run may then end, or continue in endless mode (post-v1).

### Starting variants

Squad size never gates a variant — a squad rarely fills before the first mission and its count
fluctuates all crusade. The host picks one of **three starting difficulties**; the hard and suicide
starts also pick a **mode**.

| Variant | Start difficulty | Kit notes |
| --- | --- | --- |
| Medium | 3 (Medium) | Surplus/outdated starting gear |
| Hard | 5 (Hard) | Surplus gear + a mode: SEAF Support Package or Super Penance |
| Suicide Mission | 7 (Suicide Mission) | Surplus gear + a mode: SEAF Support Package or Super Penance |

The two modes are **mutually exclusive**, chosen at launch and locked for the run
(`CrusadeSettings.mode`). They are the only kit difference between starts — every difficulty fields
the same surplus `BASE_KIT`:

- **SEAF Support Package** (`mode: 'seaf'`, the default) — the assisted ride. Rolls each diver
  their **own** pack on top of the surplus (`SEAF_SUPPORT_ROLLS`, keyed by start difficulty) and
  adds a small flat per-mission Valor bump (`SEAF_SUPPORT_VALOR`: +1 at diff 5, +2 at diff 7).
  See SEAF Support Package — the rolled pack.
- **Super Penance** (`mode: 'penance'`) — the hellish task, for the wicked. No support gear (bare
  surplus kit) and a larger flat per-mission Valor stake (`PENANCE_VALOR`: +2 at diff 5, +3 at
  diff 7). Marked in the launch UI by a Hades-style flame animation.

Warbonds are premium, per-player purchases, so ownership is declared **per diver**, never by the
host: each diver self-declares their owned warbonds (`SET_WARBONDS`, self-service, any phase;
default every progression warbond). The acquisition specials — the Super Citizen bundle
(`warbond0`) and the Superstore (`warbond1`) — sort last and are declared unowned; the Pre-Order
Bonus is dropped entirely (unobtainable, no reward-pool bearing — its contents were armor, which
the catalog no longer carries). Reward offers roll against the diver's own catalog — a diver is never
offered items from warbonds they don't own. The surplus kit is not warbond-filtered; the SEAF pack is (below).

### SEAF Support Package — the rolled pack

A fixed pack handed to the whole squad overlapped too much to lift anyone, so SEAF rolls a pack
**per diver** (`rollSupportKit` in `shared/engine/support.ts`):

| Start | Primary | Secondary | Throwable | Stratagem | Armor passive | Booster |
| --- | --- | --- | --- | --- | --- | --- |
| Hard (5) | 1 | 1 | 1 | 2 | 1 | 0 |
| Suicide Mission (7) | 2 | 1 | 1 | 4 | 2 | 1 |

- **One tier:** every slot draws only `SEAF_SUPPORT_TIER` (B) items, so divers' packs differ in
  shape, never in power. B is one rung above the diff-5 base tier (C) and the diff-7 base tier.
- **Personal pool:** items come from the diver's own declared warbonds (plus `warbondCode ===
  'none'`), never repeat an item they hold (the surplus included) and never repeat within the pack.
  A kind whose pool runs dry deals what it has.
- **Anti-tank floor:** the surplus kit fields no anti-tank, so a pack always holds at least
  `SEAF_SUPPORT_ANTITANK_MIN` (1) anti-tank item — a dealt stratagem is re-rolled into one when the
  roll missed. Counts per kind never change.
- **Dealt once, stored:** the pack is seeded by the diver's id alone (stream per kind, so retuning
  one count never reshuffles another), rolled when the crusade launches (`START_DIVE`, against the
  warbonds each diver declared by then) or when a diver is seated mid-crusade (`joinDiver`, against
  the warbonds the joiner's `hello` declared — the default set when it declared none), then recorded as `DiverState.supportKit` and merged into the inventory. A
  later warbond change never reshuffles it; a diver rejoining under the same id draws the same pack.
- **Launch reveal (presentation):** the setup's Starting Kit lays the surplus out like the Kit
  drawer (primaries, secondaries and throwables apart) and ends each section in blue "?" boxes — one
  per item the pack will roll there. After launch (and after seating mid-crusade) each diver's own
  `KitReveal` modal over the wheel fills those boxes one by one and stays up until the diver closes it. It is never stored or
  gated on: the pack is already dealt, the stage only stages it, and a plain reload never replays it.
- **At-stake gear:** the pack is forfeitable like any earned item (see Mission failure), but it is
  support gear, not winnings: it never parks in a legacy cache (`earnedKit` skips `supportKit`) and
  Earned-only views hide it.
- **Known trade-off:** a rolled pack no longer guarantees four red (Eagle/orbital) stratagems, so
  *Oops, All Airstrikes* stays off the wheel until every diver is stocked (see Wheel eligibility).

### Team layer — misfortunes / squad directives (Wheel of Adversity)

Exactly one misfortune (UI: **Squad Directive**) per **mission**, drawn from the **team-scoped**
slice of the unified **condition catalogue** (`shared/data/conditions.ts`). Nothing is gated: every
team rule is on the wheel at every difficulty — difficulty scales each rule's risk instead
(**Condition scaling**, below). The draw is an offer, not a verdict: in a dedicated **decision**
phase before pacts
roll, the squad (host executes, IRL voice vote) **accepts or declines** it. Declining runs a
zero-team-risk dive; accepting stakes the misfortune's **team risk** in Valor for every diver —
weighted by squad size — **1× solo, 1.25× duo, 1.5× trio, 1.75× four divers** — because the more
divers must hold one rule the harder it is (`TEAM_DIRECTIVE_VALOR_WEIGHTS` / `directiveWeightFor`,
read from the live roster; the operation-long strain, the live Major Order and the rolled-front
risk keep their own unweighted fixed values). Once accepted, the host
may mark it **failed** in the field if the squad breaks the rule (`FAIL_MISFORTUNE`, `diving` phase — or the squad-climbs page for a stats-verified directive,
host-only): the shared risk is voided for every diver and each forfeits one reward option — see
Failed directives. A reroll redraws and resets the decision (returning the squad to the `decision`
phase, before the deal). A squad-binding rule must be
fieldable by **every seated diver**: if accepting would strand even one diver below HD2's four
required stratagems, the engine refuses the accept (the UI disables "Lock it in" and names who
can't field it; opting out and rerolling stay open) — see Mandatory four stratagems.

Starter catalog (ids and shape are the contract; the per-difficulty values are tunable in
`CONDITION_RISK` in `shared/engine/config.ts`). "Risk d3→10" is the value at the floor and the
top of the ladder:

| Directive (id) | Rule | Risk d3→10 | Accountable via |
| --- | --- | --- | --- |
| Bare Backs (`noBackpacks`) | No backpack stratagems | 1 → 1 | loadout |
| Stand Down (`noSentries`) | No sentry stratagems (the EMS Mortar Sentry included) | 1 → 1 | loadout |
| Clean Living (`noBoosters`) | No boosters equipped | 1 → 1 | loadout |
| Ration Cut (`noResupplies`) | Nobody calls a resupply | 1 → 3 | field |
| Hangar Fire (`noEagles`) | No Eagle stratagems (the Eagle Smoke Strike included) | 1 → 2 | loadout |
| Fragile Liberty (`fragileLiberty`) | Everyone wears light armor | 1 → 2 | loadout |
| Heavy Burden (`heavyBurden`) | Everyone wears heavy armor | 1 → 2 | loadout |
| Orbital Blackout (`noOrbitals`) | No orbital stratagems (EMS and Smoke Strikes included) | 1 → 2 | loadout |
| Standard Issue (`primaryOnly`) | No support weapons, no pickups or swaps (secondaries and every other stratagem stay legal) | 2 → 3 | field |
| Oops, All Airstrikes (`oopsAllAirstrikes`) | Equip Eagle and orbital ("red") stratagems only (yellow calls like Resupply stay open). On the wheel only when **every** seated diver can field four | 2 → 3 | loadout |
| Spotless Record (`zeroDeaths`) | Any diver death **fails the directive**, not the mission (the mission plays on) | 3 → 5 | field |
| Martyrdom (`noReserves`) | No one is reinforced, so a fallen diver stays down (every other stratagem stays legal) | 2 → 4 | field |
| Deserted (`noStratagems`) | Stratagems only in the mission's first minute (Reinforce and SEAF resources like Artillery excepted) | 2 → 4 | field |
| Fix Bayonets (`meleeOnly`) | Kill with melee only (no guns, grenades or offensive stratagems) | 2 → 4 | field |
| Peacekeepers (`pacifist`) | No diver scores a kill (stratagem kills count to the caller) | 3 → 5 | stats |
| Stim Shortage (`stimShortage`) | Nobody uses a stim | 3 → 4 | stats |

Rule text carries extra detail in a `( )` aside, which the cards set smaller, lighter and italic so
the headline reads first (`RulePart.aside`).

**Wheel eligibility.** Every directive is on the wheel at every difficulty, with one gate:
`eligibleMisfortunes(inventories)` drops a directive that would leave **any** present diver below
four fieldable stratagems (`hasLegalLoadout`). In practice that is *Oops, All Airstrikes* — it
returns once every diver owns enough red stratagems — so a draw is never a dead end. A second
filter keeps a directive off the wheel while it would block a pact the squad owes as Penance
(`BLOCKED_UNDER_MISFORTUNE`: *Stim Shortage* vs Stim Abstinent, *Peacekeepers* vs Cold Steel). The
reducer (`SPIN_WHEEL`, `REROLL_WHEEL`) and the wheel component both pass `squadInventories(state)`
and `squadPenances(state)`, so the drawn segment is the same on every client.

**Condition scaling.** Misfortunes (team) and pacts (personal) are one catalogue, and the only
knob difficulty turns is **risk**, never eligibility. Each condition carries a `base` (its risk at
difficulty 3) and a `slope` (risk points per difficulty step):

```
conditionRiskAt(id, difficulty) = clamp(round(base + slope × (difficulty − 3)), 1, 5)
```

Slopes are per condition. The formula allows **negative** (inverse) slopes, but no condition uses
one today: the inverse *Stim Abstinent* and *Untouchable* curves were reversed in the balance pass —
losing healing or your life costs more where the enemy hits harder, not less. Flat is the right
shape when a burden's cost cancels out with altitude (*Dead Weight*: you die more often up high,
but so do squadmates, so the shared reinforce comes sooner). `maxValorFor(difficulty)` is only
guaranteed to grow from the floor to the top of the ladder, not per rung.

*Stealth* ("no raised alarms or bot detections") was **removed**: a drop gets called on nearly every
mission, so the rule was all but unfieldable. A bot-only *Commando* modifier is the backlog idea for
reviving it. `CONDITION_RISK`
in `shared/engine/config.ts` is the single source of truth; every Valor/odds computation reads
through `conditionRiskAt`.

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
(misfortune × front × strain) combo earlier in this crusade (the video's overrule rule). Otherwise
the squad spends a reroll token — 1 token per operation (`REROLL_TOKENS_PER_OPERATION`), plus
`MAJOR_ORDER_REROLL_BONUS` (1) banked by each completed live Major Order operation, spendable on any wheel
result. Never
rerollable into the result it would replace — a reroll must actually move (`REROLL_WHEEL` refuses a
same-result seed;
only the immediately replaced result is excluded, not every prior draw this window). **The front
and its strain lock in for the whole operation**: they can only be rerolled during the operation's
first mission decision window (`missionInOperation === 1`, enforced in the reducer and
`canRerollWheel`); a front reroll redraws the strain with it, and a strain reroll needs at least
two eligible subfactions on that front. A **Major Order** that pins a single front leaves nothing
to reroll into, so the front reroll is refused ("Only one front on this Major Order"). Misfortune
rerolls stay available in any decision or pact window (until the first pact lock).

**Fronts:** the front is drawn with the operation's first spin (one per operation) and drives combo
tracking and its strain roster. It exists for flavor and the reroll economy. The setup's **front
plan** decides how free that draw is: a **Major Order** narrows it to the live war's front(s), a
**locked** faction pins it, and a **rolled** plan leaves the whole roster — see Operation layer.

### Operation layer — front plan & Major Orders

The host chooses the run's **front plan** at crusade setup, beside the variant and mode (the
Bridge's setup dialog for solo, the Hellpod Bays lobby for online rooms), and it **locks at launch** for the
whole crusade — there is no mid-run change, so the call is visible before the first dive and the
wheel screen carries no picker. `settings.front` records the plan; `START_DIVE{settings, majorOrder}`
carries the pin the plan needs:

| Plan | Pin (`state.majorOrder`) | Front draw | Strain | Team risk / mission | Carrot |
| --- | --- | --- | --- | --- | --- |
| `majorOrder` | the live order (`live: true`) | within the order's active front(s) | none | `MAJOR_ORDER_RISK` (2) | `MAJOR_ORDER_REROLL_BONUS` (1) extra reroll token per completed operation |
| `locked` | `{ fronts: [front] }` (never live) | that front | none | 0 | none |
| `rolled` | `null` | full roster, fresh each operation | drawn as usual | `FRONT_ROLL_RISK` (1) | none |

A front is **active** only while at least one of its MO planets still needs liberation and can
actually be fought, so a multi-faction, planet-based order contributes just the fronts open now; a
gated planet (one behind another capture) adds its faction only once it opens, and a faction-only
kill task names its front directly.

The reducer validates the pair (`resolveFrontPlan` in `room.ts`): a `majorOrder` plan without a
live order, a `locked` plan without exactly one known front, or any malformed pin **degrades to
`rolled`**; a `locked` pin is stripped of `live` so it can never bank the carrot, and a `rolled`
plan drops any pin it was sent. Runs started before the setup-time choice carry no
`settings.front`: they keep whatever pin they had and roll without the rolled-front risk.

The rolled-front risk prices the blind: a squad that neither follows the war nor commits to one
enemy can't build for the front until the spin, so it earns a small fixed Valor on every mission
of the run, on top of any strain it takes. A pinned front (live or locked) draws **no strain** — the
front *is* the order, so there is no random subfaction and no operation-long subfaction risk. A
live order's fixed risk is the operation-long risk the strain would otherwise have supplied, so
following the war does not forfeit Valor potential; a manual lock is a preference with no risk and
no carrot, so only playing the actual war objective pays. A multi-front order still randomizes
within its fronts every operation; a single-front order (or a lock) refuses the front reroll.

Setup never shows risk as a Valor number: each plan's fixed risk (`frontPlanRisk`) and the mode's
(`modeValorAt`) render as skulls, and `setupRiskOf(settings)` — the same terms `teamRiskBreakdown`
charges once the run starts, at the start difficulty — is the setup's skull total, shown with the
rule it buys: more skulls, higher-tier rewards.

**Playing the war is the default:** whenever a live order is known, setup opens on the `majorOrder`
plan (featured first, tagged Recommended) until the host picks another; with no order it opens on
`rolled`.

**The pin is a run-long commitment:** completing an operation clears only the drawn front, so every
later operation redraws within the pin and, when the order is live, banks the reroll bonus and
carries the risk again. A failure restart keeps the pin with the locked front, like the front
itself. The engine is pure and has no clock, so nothing expires an order — the setup's countdown reads an
elapsed `expiresAt` as "ends soon", and the squad keeps playing the order it signed up for. On the
call screen a pinned run shows a one-line pin before the first spin ("Major Order pinned" or
"Faction locked" with the front(s)); a rolled run shows the drawn front after the spin, as before.
Playing toward an MO stays an **opt-in carrot, never a tax**. Tiers and rewards are untouched —
risk stays the only thing that buys rarity (principle 1: risk is chosen).
The Bridge's live-MO band carries a one-click **Start campaign** CTA that starts a solo crusade on
the `majorOrder` plan with the live order (the same `START_DIVE` pin the setup sends), so a diver
can drop straight onto the war front.

The MO's active front(s) and display metadata (`title`, `planets` — index, name, front, current
liberation % and whether the planet is currently reachable — and `expiresAt`) live on `state.majorOrder`; the metadata is pass-through (the
Bridge's MO band renders the planets) and syncs with the snapshot. The setup shows the order's
front(s) and countdown, but **not** the `title`: the in-game order text is long and says nothing
about the match, so Griffdive omits it. Once the front is drawn, the wheel's front pin names the MO
planet(s) on it (`majorOrderPlanetsForFront`), so a faction result tells the squad which world to
drop on. **The
engine is pure** — it consumes a front list it was handed and never knows about HTTP. **The live
API (Phase B) only fills the host's choice:** a cached server proxy
(`server/api/war/major-order.get.ts` → `server/utils/major-order.ts`) normalizes the community war
API — `api.helldivers2.dev/api/v1/assignments` joined to
`helldiverstrainingmanual.com/api/v1/war/campaign` for planet→faction and liberation, plus
`api.helldivers2.dev/api/v1/planets` for current owner and warp links — into a
`MajorOrderSelection` the setup's `FrontPlanPicker` offers as the Major Order plan (`useMajorOrder`,
refetched on mount; `useFrontPlan` owns the default). A target planet is reachable when its own
warp-link list contains a Super Earth-held world (a defense is always playable). A liberated target
(100%) or one still gated behind another capture contributes no front; if the planet roster fetch
fails, the proxy falls back to every incomplete target instead of blanking the order. Offline/static
builds, a failed fetch, or the `GRIFFDIVE_DISABLE_MO_API=1` kill switch disable that plan (an order
that vanishes under the selection falls back to `rolled`), leaving the lock and roll plans. The proxy caches for 10 minutes, retries once with a 6s
timeout, and serves its last good order (stale) when a refresh fails — it never caches a failure. It
answers `{ order, status }` — `active`, `none` (the API replied with an empty list), `no-front` (an
order exists but has no active front — no resolvable target, or every target is gated or already
liberated, e.g. sample gathering or a faction-less kill order),
or `unavailable` (a failed or garbled fetch) — so the setup can tell "No active Major Order" and
"has no open front yet" apart from "Failed to retrieve active MO". Task payloads are decoded **by
label**: `valueTypes[i]` labels `values[i]` (community reverse-engineered; 1 = faction, 12 = planet).
A planet slot resolves through the campaign join; otherwise a faction slot (2 Terminids, 3 Automatons,
4 Illuminate) names the front directly, so enemy-focused kill orders — including cross-faction ones —
resolve with no enemy table. Anything unrecognized contributes no front and leaves only the lock and
roll plans. Each task shape that names no front is
logged once per process (`[major-order] task names no front: …`, visible in `fly logs`), so a new order
type surfaces without flooding the stream; a known planet that is merely gated or already liberated
is an availability fact, not a decoder gap, so it is not logged.

### Team layer — faction strains

The front's **strain** is drawn with it at the operation's first spin — a subfaction of that front
(wiki.gg/Factions), gated per-strain by `STRAIN_MIN_DIFFICULTY` like misfortunes. It is an
**optional, operation-long team-risk commitment**, never a forced modifier. The spin opens the wheel
decision, and the squad (host executes, IRL voice vote) answers the misfortune and the strain call
**independently** — either may be locked first, and the phase only advances once both are in
(a dedicated `strain` phase carries the strain call when the misfortune is locked first; the
wheel then holds on the `deal` phase until the host deals the hand — see Core loop).
Declining is free and zero-risk — principle 1 (risk is chosen, never forced) stays intact, and a
surplus-kit squad is never handed an unfieldable operation. Accepting
commits the squad for the whole operation: the strain's **team risk** (2–3) is added to **every
mission's** Valor, compounding over the operation's 2–3 missions — a deliberately different scope
from the per-mission misfortune. The lock holds until the operation ends: a **win** rolls a fresh
front+strain with the next operation; a **failure** restarts at mission 1, keeps the front, and
**reopens the strain decision** (same draw, re-decidable). Like the misfortune, the call may still
flip in the pact window until the first pact lock.

Strains are **flavor + risk, never rule-bearing**: the app never observes enemy composition, so no
checkable restriction is attached — the real subfaction reshapes loadout decisions in-game and the
engine only prices the risk (`STRAIN_RISK` / `STRAIN_MIN_DIFFICULTY` in `shared/engine/config.ts`;
catalog in `shared/data/strains.ts`). The carrot is extra Valor only.

### Personal layer — pacts

Each diver picks 0–3 pacts per mission, but never straight from the catalog: once the wheel
decision is in, the engine **rolls each diver a personal pact offer** — 2 pacts on difficulties
3–6, 3 on 7+ (`PACT_OPTIONS` in `shared/engine/config.ts`). The offer is a deterministic
derivation of the wheel seed per diver (`pactOfferFor` in `shared/engine/selectors.ts`), so every
client computes the same 2–3 pacts with no extra sync; it is never stored. The pool filters out
pacts the **accepted** misfortune makes redundant or impossible; a declined draw offers from the
full catalog. Pacts are the **personal-scoped** slice of the same condition catalogue, and their
**pact risk** scales with the operation's difficulty exactly like a misfortune's (`conditionRiskAt`;
see Condition scaling), adding only to that diver's Valor. **Squad-only pacts** (`SQUAD_ONLY_PACTS`:
*Dead Weight*) are never dealt to a solo diver — with no squadmate to share a reinforce, the rule
collapses into "stay dead".

**Accountability rule:** every pact in the catalog must be verifiable in Helldivers 2 through one
of three channels — the **loadout screen** (equipped gear and stratagems, visible pre-dive), the
**field** (resupply beacons, carried gear, deaths and reinforce prompts, all visible live), or the
**end-of-mission stats screen** (stims used, deaths, reinforcements per player). Pacts with no
observable trace — usage only the diver themselves can see — are banned from the catalog (the old
*Sidearm Purist* was discarded for exactly this: nothing in HD2 attributes kills or shots to a
weapon slot).

Starter catalog:

| Pact | Rule | Risk d3→10 | Accountable via |
| --- | --- | --- | --- |
| Pack Light | I bring no backpack stratagem | 1 → 1 | loadout |
| Thirsty | I call no resupply and take none from others | 1 → 2 | field |
| Empty Pockets | I equip no booster | 1 → 1 | loadout |
| Anti-Tank Abstinent | I carry nothing anti-tank (no stratagem, weapon or grenade) | 1 → 4 | loadout |
| Dead Weight | If I die I can't be reinforced on my own (I return only when another diver needs reinforcing; squad only) | 2 → 2 | field |
| Stim Abstinent | I use no stims | 3 → 4 | stats |
| Loadout Loyalist | I use only my equipped loadout (no pickups or swaps) | 2 → 2 | field |
| Primary Concern | I bring no support weapon (secondaries and every other stratagem stay legal) | 1 → 3 | loadout |
| Grounded | I bring no offensive Eagle stratagems (the reserve Eagle Smoke Strike is exempt) | 2 → 2 | loadout |
| Ship Silent | I bring no offensive orbital stratagems (reserve EMS and Smoke are exempt) | 2 → 2 | loadout |
| Open Field | I bring no offensive sentries, mines or emplacements (the reserve EMS Mortar Sentry and shield relays are exempt) | 2 → 2 | loadout |
| Untouchable | I do not die (a death **fails this pact** and the mission plays on) | 3 → 4 | field |
| Featherweight | I wear light armor only | 1 → 2 | loadout |
| Ironbound | I wear heavy armor only | 1 → 1 | loadout |
| Radio Silence | I call no stratagem: red, blue, green or yellow alike (Reinforce excepted) | 3 → 4 | field |
| Cold Steel | Every kill I score is a melee kill (stats: kills = melee kills) | 2 → 3 | stats |
| Clean Hands | I deal no friendly-fire damage | 1 → 2 | stats |

### Rules glossary — keywords

A rule is one short headline; the words that carry real mechanics are **keywords**, defined once in
`shared/data/glossary.ts` (the Hades boon screen's side panels). A condition's source rule marks
them with `{shown text}` (the text is the keyword's id or term) or `{shown text|id}`; `parseRule`
strips the markup into `Condition.rule` (plain prose — toasts, ledgers, ban reasons keep working),
`Condition.ruleParts` (plain/keyword spans) and `Condition.keywords` (ids, in order). An unknown
keyword throws at load, and a spec fails if a glossary entry is used by no rule. The UI underlines
keywords inline (`ConditionRule`); the definition is **on demand only** — hover, focus or tap the
word and a small panel opens beside it (`ConditionKeyword`) — so veterans read past it and the
cards stay short. **To refine a rule, edit the definition once** — every rule using the word
changes.

Terms the catalog leans on: *stratagem* (four colors: red strikes, blue supply, green defense,
yellow mission), *offensive* (built to hurt the enemy; smoke, EMS and shield utility never
count), *reserve* (the four always-owned non-lethal stratagems), *support weapon* (a blue weapon
stratagem — primaries, secondaries and throwables are not), *Reinforce* (yellow, but only rules that
name it touch it — "no stratagems" never does) and *fails* (a broken rule is marked failed, never
mission failure: its risk is voided and everyone it bound loses a reward option; the mission plays
on — the same mark as Failed pacts / Failed directives below). Open Field bans offensive defenses
only: the Shield Generator Relay is legal (`NON_LETHAL_DEFENSES`).

**Pact interplay (new).** The armor pair (*Featherweight*, *Ironbound*) is mutually exclusive
(`PACT_EXCLUSIVE_GROUPS`) and blocked under either armor directive. Only behavioral pacts subsume
others (`PACT_SUBSUMES`): *Radio Silence* covers *Thirsty* — a
loadout rule is still checked on the loadout screen even when the stratagem is never called, so
*Radio Silence* does not cover *Pack Light*. *Deserted* leaves the loadout pacts open (a diver can
still call a support weapon or backpack in the first minute and hold it) and blocks only *Thirsty*.

**Redundant and conflicting picks:** a pact strictly implied by another picked pact never stacks
risk. `SET_PACTS` refuses it via `pactSubsumedBy` / `applyPactToggle` (`PACT_SUBSUMES` in
`shared/engine/pacts.ts`), and the UI greys a covered offer with "Covered by …". The map holds
only **behavioral** pacts (see Rules glossary): *Barebones* ("I fill no stratagem slots") was the
original subsuming pact and was removed because HD2 requires four equipped stratagems to ready up. (Anti-Tank Abstinent stays independent:
thermite and other anti-tank throwables are not stratagems.) Restrictions that tax the same
strength are instead **mutually exclusive** (`PACT_EXCLUSIVE_GROUPS`): *Grounded*, *Ship Silent* and
*Open Field* all tax stratagem variety, so an offer never draws two of them and `SET_PACTS` refuses
a same-group pick (the UI greys it "Conflicts with …").

**Mandatory four stratagems — reserve and the loadout floor:** HD2 requires four equipped
stratagems to ready up, so no pact may strand a diver below four. Every diver always owns a
non-lethal **reserve** of warbond-free utility — Orbital EMS Strike, Orbital Smoke Strike, Eagle
Smoke Strike, EMS Mortar Sentry (`RESERVE_STRATAGEMS` in
`shared/engine/config.ts`). Reserve stratagems are exempt from slot-removing *pacts*, which is why
the category pacts read "no **offensive**": smoke and stun are always legal filler, and a
mis-call never smuggles power back into a restricted loadout. Misfortunes are squad-binding, so the
exemption does not apply to them. `hasLegalLoadout` (pact bans + accepted misfortune + reserve,
against `STRATAGEM_SLOTS_REQUIRED`) is the hard floor: `SET_PACTS` refuses a pick that would drop
the diver below four, and the UI greys it "Leaves too few stratagems to ready up". The floor is
enforced at **both** ends: a pact that would strand the diver is refused at pick time, and a
misfortune that would strand **any** seated diver on its own is refused at the wheel decision
(`ACCEPT_MISFORTUNE`, via `misfortuneStrandedDivers` in `shared/engine/selectors.ts`) — the squad
could otherwise never ready up. *Deserted* is behavioral (four slots still equip, they just
cannot be called after the first minute), so it stays out of the equip ban-list; `Oops, All Airstrikes` is the loadout rule
that most often strands an early squad, since the base kit fields only three red stratagems (Eagle
Smoke Strike plus Orbital EMS/Smoke Strike) and reserve adds no more — so the wheel leaves it out
until every diver can field it.

**Failed pacts:** a broken pact is marked **failed** (`FAIL_PACT{playerId,pactId}`) while the
mission runs — during the diving phase only, by the diver themselves or by the host refereeing the
squad (server refuses everyone else; the UI asks for a confirm since the mark is one-way). A
failed pact is **voided**: its pact risk stops counting toward Valor, so both the odds line
and the rolled offer drop, and it costs one reward option (`OPTIONS_LOST_PER_FAILED_PACT` in
`shared/engine/config.ts`, floored at one so the draft always completes and never deadlocks
ADVANCE). Failed pacts ride the diver's state (`failedPactIds`), reset with the pacts every
mission, and land in the action log for audit. A stats-verified pact is judged later, on the
squad-climbs page, where a broken one is owed back as Penance instead (below).

**Squad climbs — stats check, Penance & squad honors.**

HD2's end-of-mission stats screen comes up *after* the report and the rewards, so what it proves is
settled **after the draft**, never before it. Once every diver has banked, the squad lands on the
**squad-climbs page** (`ClimbCleared`) — one page for the end of every mission and operation. It
carries the report strip (stars, time, samples, front, directive, strain), each diver's haul, the
**Stats check**, **Squad Honors**, Brasch's Bargains (hidden until the shop can open, i.e. after the
first operation) and the host's call to the next drop. At an operation's end the page also shows the
difficulty emblem and the climb ladder ("The squad climbs").

- **Rules.** Every rule on the `stats` accountability channel in force (Stim Abstinent, Cold
  Steel, Clean Hands; Peacekeepers and Stim Shortage among directives) is listed with its owner
  (`statsRules`) and attested **Held** (`HOLD_PACT`, `HOLD_MISFORTUNE`) or **Broke** (`FAIL_PACT`,
  `FAIL_MISFORTUNE`, a second confirming tap) — both one-way. A diver settles their own pacts, the
  host settles any diver's (as with field marks) and the squad directive. The `FAIL_PACT` window
  reopens in `rewards` for stats-channel pacts only (it is otherwise `diving`-only); field and
  loadout rules are judged live and never gate. Attestations (`DiverState.heldPactIds` /
  `brokenPactIds`, `DiveState.misfortuneHeld` / `misfortuneBroken`) reset with the pacts every
  mission. The draft is already banked, so a broke mark here never re-derives the offer (it is
  kept apart from the field's `failedPactIds`).
- **Penance.** A stats pact marked broke here is owed back: next mission the diver swears it again
  **without choosing it and without Valor** (`DiverState.penance`, `PenanceDebt`;
  `penanceIncurredBy`, applied by `ADVANCE`). The reward they banked in the mission they broke it
  rides on the debt (`itemId`). Hold the pact (and clear the mission) and the reward stays; break it
  again — in the field or on the next climbs page — or **fail the mission**, and the reward is
  **voided** (removed from the kit by `voidPenance`, before any forfeit offer is dealt). No second
  debt follows a voided one. Penance pacts: are sworn ahead of the diver's picks (`SET_PACTS`),
  never appear in the diver's offer, add no risk (`pactRiskOf`), cost no draft option when broken in
  the field (`optionsLostFor`), and the wheel never draws a directive that would block one
  (`eligibleMisfortunes(inventories, penance)`). A debt carries across an operation boundary; it
  is replaced at `ADVANCE` by whatever that mission's own check leaves owing, and is
  dropped when the crusade completes or the operation restarts after a failure. Penance is **purple** everywhere: purple skulls and a *Penance* tag
  in the Pacts sworn list, the owed strip on the pact screens (`PactPenance`) and the climbs-page
  row.
- **A broken directive** (stats-verified, host-attested) costs nothing now: it sets
  `directiveTax`, and **every diver's next draft loses one option** (`OPTIONS_LOST_PER_FAILED_DIRECTIVE`,
  floored at one). A directive broken in the field keeps its old rule (this draft, voided Valor).
- **Squad Honors** live on the same page: a due contest rolls **by itself** a beat after the page
  opens (`HONORS_AUTO_ROLL_MS`; the host's client sends `SPIN_BONUS`, with a host-only *Roll now*
  fallback), the reel winds down, and the host names the winner(s) from the same page. A solo diver
  (or a lone present diver) wins outright. The token it banks serves the **next** mission's draft.
- **The gate.** The draft is never gated. `ADVANCE` is refused until `climbSettled`: every stats rule
  attested (`climbBlockers().rules === 0`) and no honors contest due or unnamed
  (`honorsDue`). The page's CTA names what is left ("Settle 1 rule first", "Rolling Squad Honors",
  "Award honors first"); the engine, not the button, enforces it.
- Failed missions skip the page (there is no draft): the forfeit follows, and any Penance in
  progress is voided first.

**Failed directives:** the same rule applies to the squad's team directive. The host marks it
broken in the field (`FAIL_MISFORTUNE`, host-only, `diving` phase only; the UI asks for a confirm
since the mark is one-way) and `state.misfortuneFailed` is set. The unconditional restrictions it
imposed still stand for the mission, but its **shared risk is voided for every diver** — `teamRiskOf`
drops the directive's contribution, so every diver's Valor and odds preview fall — and each diver
forfeits one reward option (`OPTIONS_LOST_PER_FAILED_DIRECTIVE`, floored at one). The
operation-long strain and a live Major Order are untouched: they carry no rule to break. The mark
resets with the pacts every mission.

### Reward math

```text
Valor         = teamRisk + pactRisk
teamRisk      = accepted misfortune × directiveWeightFor(squad size)
                (1 / 1.25 / 1.5 / 1.75 for 1–4 divers) plus the accepted strain (2–3, felt on
                every mission of its operation) or the live Major Order
                commitment (2, same scope); plus the run-long mode's flat stake
                (SEAF +1/+2 or Super Penance +2/+3 at diffs 5/7, felt on every
                mission of the run); 0 when declined/unset, or when the
                directive was failed in the field
pactRisk      = sum of the diver's picked pacts (max 12 at diff 7+: the
                rolled 2–3-pact offer bounds what a diver can stack)

(samples are NOT Valor. They bank as credits — see
 Brasch's Bargains — credits — and never move the odds.)

(misfortune and pact risk are read through `conditionRiskAt(id, difficulty)`,
 so the same condition is worth different Valor at different altitudes;
 the directive's squad-size weight is applied by `directiveValorAt` on top)

base tier:     diff 3–5 → C   diff 6–7 → B   diff 8–10 → A
meter:         the Valor gauge tops out at 11; Valor past it is Luck
effective:     E = min(Valor, 11),  Luck = max(0, Valor − 11)
odds ladder:   the reach chance for each tier is a chain from the base tier;
               the draft no longer rolls one ceiling. Each option rolls its own
               d100 across these cumulative zones:
                 rung 1     0.95 × (1 − (1 − t)²)
                 rung 2     0.30 × (1 − (1 − t)²)
                 A→S        reach × min(0.95, min(0.8, max(0, E − sFloor + 1)
                                               × topAlt / 18) + Luck × 0.05)
                 S→S+       reach × min(0.2, min(sPlusCap, max(0, E − sPlusFloor + 1)
                                               × topAlt / 40) + Luck × 0.015)
               rung 1 / rung 2 = the first / second ordinary rung above the
                         base tier (C→B then B→A from a C base; B→A from a
                         B base). The second rung is a long reach: a low
                         dive can glimpse A but never farm it
               t = min(1, E × (1 + bandPos) / 22): the ordinary rungs ease
                         out and only touch their cap at the meter top at a
                         band's top, so every point of Valor up to 11 pays
               bandPos = position within the difficulty band (0 floor → 1 top);
                         the ordinary rungs use it
               topAlt = the smooth ladder altitude, 1.0 at diff 3 → 2.0 at
                        diff 10; the top rungs use it instead of bandPos so S/S+
                        scale with difficulty without sawtoothing at band edges
               sFloor / sPlusFloor = the S / S+ Valor floors, constant per band:
                        C / B / A → 3 / 3.5 / 4 and 5 / 6.5 / 8
               reach = the top-rung scale per band, C / B / A → 0.35 / 0.6 / 1:
                        S and S+ are a high-altitude prize, so below the A band
                        their odds (Luck included) are cut down
               sPlusCap = the S+ per-step cap, 0.1 below diff 6 then climbing
                        from 0.12 at diff 6 to 0.172 at diff 10 — Liberty's Cross
                        becomes a real chase where super samples appear
               A trickle of risk still can't buy the top at altitude, and
               neither top rung is ever guaranteed.

option roll:   each option rolls a d100 face on the odds line. Zone width is
               reach(tier) − reach(next tier), from the base tier to S+; the
               face's zone sets that option's tier. A stocked item of the rolled
               tier is drawn from the diver's personal pool (a nearest-stocked
               fallback moves the needle into the item's true tier). An S+ face
               is Liberty's Cross; a second S+ face in the same draft rerolls
               inside S, so the needle never disagrees with the card.
```

- Difficulty alone never buys S or S+; only stacked chosen risk does. The top rungs are **Valor
  gated** (`sValorFloorFor` / `sPlusValorFloorFor` in `shared/engine/config.ts`): the S / S+ floors
  are constant per difficulty band (`C / B / A → 3 / 3.5 / 4` and `5 / 6.5 / 8`). **The early ladder
  is scavenged, not looted:** each ordinary rung above the base tier has its own cap
  (`UPGRADE_STEP_CAPS` 0.95 / 0.3) and eases out toward it (quadratic, `upgradeOdds`), reaching it
  only at the meter top at a band's top, and the top rungs are scaled by the band's **reach**
  (`topRungReachFor`, C / B / A → 0.35 / 0.6 / 1). Playtests at diffs 3–5 — a full squad on
  directives, a strain and stacked pacts — banked A and S gear before diff 5 under the old shared
  0.8 cap (A ≈ 64%, S ≈ 27% per diver per mission at diff 3, Valor 8). A later playtest found the
  fix over-corrected: linear rungs hit flat 0.65 / 0.25 caps by Valor ~6, so at diff 5 a +3 pact
  (Valor 6.5 → 9.5) left B/A pinned at 65% / 16% and moved S by one point. Now that same pact moves
  B 79 → 93%, A 20 → 27% and S 2 → 5%; diff 3 at Valor 8 rolls A ≈ 10%, S ≈ 1%; even max overstack
  at diffs 3–5 stays under 30% A and 10% S. More chosen risk always improves every rung's odds up
  to the meter top, and diffs 8–10 are unchanged. The top rungs also
  use a smooth ladder altitude (`topRungAltitude`, 1.0 at diff 3 → 2.0 at diff 10) instead of the
  per-band `bandPosition`, so S+ climbs steadily with difficulty instead of dipping at every band
  boundary. **S+ scales with altitude**: its per-step cap rises from 0.12 at the super-sample
  threshold (diff 6) to 0.172 at diff 10, so Liberty's Cross is a real chase where super samples
  appear instead of a flat longshot. **The Valor meter tops out at 11** (`VALOR_METER_MAX`): Valor
  past it "breaks" the gauge and banks as **Luck**, which adds flat odds to the S / S+ rungs
  (`OVERFLOW_S_LUCK` / `OVERFLOW_S_PLUS_LUCK`), so overstacking is never wasted. Even absolute max
  overstack (Valor 24.25 — a four-diver squad, strain included) leaves S+ a longshot (≤20% at altitude;
  `S_PLUS_OVERFLOW_CAP`). A zero-Valor dive always rolls its base tier. Samples are a separate
  currency and never nudge Valor: chosen risk alone moves the odds line, so skill and loot never carry a
  run (they fund Brasch's Bargains instead).
- **Valor is surfaced as a roll, not a number.** `app/components/valor/ValorRoll.vue` draws the
  odds line as tier zones whose widths are the cumulative reach chances; a marker pin sits at each
  rolled option's d100 face. Hovering or focusing a pact previews the percentage-point movement each
  zone gains or loses. No screen shows a numeric Valor total and no rule is gated on the gauge.
  `VALOR_METER_MAX` and the Luck caps remain internal odds math.
- The reward pool is personal: each diver rolls against the catalog of warbonds *they* declared
  (plus `warbondCode === 'none'` items) — never the squad's or the host's. Armor passives are
  excluded from that pool: they are Brasch exclusives (see Brasch's Armor Pack), so a draft, a
  Liberty's Cross claim and a Field Promotion can never name one. The forfeit offer still takes
  a passive the diver bought.
- Higher difficulties inside a band climb easier: diff 5 rolls into B more readily than diff 3,
  diff 10 into S more readily than diff 8 (`bandPosition`).
- **Each option rolls its own tier.** The draft is seeded from the offer seed (one rng stream) so
  every client computes the same faces and items. An option's d100 face lands in a tier zone; a
  stocked item of that tier is drawn from the diver's personal pool. The difficulty's **base tier**
  stays a hard floor (a Super Helldive never offers C-tier gear). A thin pool falls back to the
  nearest stocked tier and the needle moves with it, so the roll never lies about the card.
- **S+ = Liberty's Cross.** No catalog item carries the S+ tier. A rolled S+ face becomes the Cross:
  the diver claims **any reward-eligible item from their own catalog** — same personal-pool rules as
  every reward (warbond-owned items only, nothing already owned, armor passives excluded). One Cross
  per draft; a second S+ face rerolls inside S. The option rides a stable sentinel id
  (`DIVERS_CHOICE_OPTION_ID` in `shared/engine/rewards.ts`); the UI opens a minified codex picker,
  and `PICK_REWARD` carries the named item in `choiceItemId`.
- **The offer is frozen at the deal.** `REPORT_RESULT` snapshots each drafting diver's holdings
  and bans into `DiverState.draftExcludedIds`, and `diverOptions` rolls against that snapshot, not
  live holdings — so a pick or a Bargains purchase never reshuffles an offer the squad has seen,
  and every client (and a reload) re-derives the same cards. `PICK_REWARD` refuses an item the diver
  has gained since the deal (a catch-up claim), so the frozen offer can't bank a duplicate. The
  snapshot resets with the pacts. A pre-snapshot save falls back to live holdings.
- **Drafts are public.** Options, their rolled tiers and picks are derived state every client
  already holds, so the draft shows the squad's: `draftSummaryFor` (options, top rolled tier, status,
  the banked option — a Cross pick maps to the Cross slot) feeds the squad board. The displayed
  ceiling is the best tier actually rolled (`topTierOf`), never a hypothetical the diver missed.
- Previews stay legible: every zone is labelled with its tier and odds (percentage points of
  movement while previewing a pact), a non-zero chance below 0.5% reads `<1%`, and a 0% zone is
  silent. The join briefing's onboarding dial reads the same zone chances (`tierZones`) as
  the live roll line, so onboarding and the draft can never disagree.
- **Option count** comes from stars (mission performance), lookup table `STARS_TO_OPTIONS`:
  `[1,1,2,3,4,4]` (index = stars), capped at 4. Stars themselves are
  difficulty-capped per the game (wiki.gg/Missions): max 3 at diffs 3–4, 4 at 5–6, 5 at 7+; a
  completed mission never awards 0 and a failed mission awards none (`maxStarsFor` in
  `shared/engine/config.ts`).
- **Failed pacts forfeit stakes** (see Personal layer): each pact marked failed in the field voids
  its risk — Valor, previews and the rolled offer all drop — and costs one reward option, floored
  at one so the draft always completes.
- Example curves: at diff 3 a single strong pact (Valor 3) reaches **S** ~4% of the time and two
  (Valor 6) ~16%; a maxed early stack (a four-diver squad, Valor 14.75 with a strain) reaches S
  ~49%, S+ ~8%. Diff 10 with zero Valor → **A**, never S. At diff 6 (where super samples appear) a
  strong build (Valor 10–11) reaches **S+** ~6–7%, climbing to ~12–14% at diff 10; max overstack
  reaches **S+** ~19% there (the cap binds for every squad size from diff 8). Squad size moves the
  directive's share: the strongest diff-10 directive alone is worth Valor 5 solo (S ~22%), 7.5 for
  a trio (S ~50%) and 8.75 for four divers (S ~64%, S+ ~6%). Risk pays at every altitude; nothing is
  guaranteed, but everything gets likelier.

### Brasch's Bargains — credits

Samples recovered on a mission are not a Valor term. They are exchanged for **credits**, the
currency of **Brasch's Bargains** (marked in the UI by a custom credit glyph, `icon/IconCredit.vue`).
A successful report banks each diver seated by report time a credit haul in their personal purse
(`DiverState.credits`) — a mid-mission joiner dove too, so the haul is theirs:

```text
haulValue   = common × 1 + rare × 3 + super × 12   (SAMPLE_CREDITS)
haul        = floor(haulValue × (0.5 + 0.5 × clamp(timePct,0,100)/100))
```

Extraction speed is a multiplier (`TIME_HAUL_FLOOR` 0.5 at no time left → 1.0 at a full clock), so a
fast clear banks more credits. The purse persists across missions and operations and belongs to the
session, like reward tokens: stepping away keeps it (the seat never leaves the room). A diver benched
by `KICK_DIVER` who later rejoins starts empty, and so does a new session forked from a save. There is
no cap. The game's own sample mix (commons dominate early, supers appear at diff 6) does the
difficulty scaling.

The report form caps each sample canister at `sampleReportCeiling(difficulty)` — twice the map's
spawn count (`SAMPLE_AVAILABILITY`). The **Sample Scanner** booster has a 15% chance to double every
sample pickup, so a squad can bring home more than the map spawned; the regular spawn table alone
would make those hauls unreportable. The filed count remains honor-system: the engine only clamps it
to a non-negative integer.

**Brasch's Bargains opens once the squad has completed an operation**, then stays open between
missions in every phase from `spin` to `rewards`. Credits bank from the first mission, so the first
purchase is a real saving. Until then it is shut (`'Opens after your first operation'`); the
clearing mission's `rewards` screen counts as complete, since that screen is the operation's last
call at the shop (`operationCompleted`: the difficulty is past the variant's start, or the last
mission of the operation is in `rewards`). It also closes in the `lobby`, while `diving`, while a failure's `forfeit` settles (a buy would
reshuffle the forfeit offers, which derive from the live kit) and once the crusade is `complete`
(`bargainsClosedReason`). It is the one deliberate exception to design principle 4 (it names
items):

- **Slots:** one item each for **primary**, **secondary** and **throwable** (`BARGAIN_SLOTS`).
  Difficulties where a mission can award a 4th star (diff 5+) add one random **stratagem** slot,
  and a 5th star (diff 7+) adds a second one (`bargainStratagemSlotsFor`). Two stratagem slots never
  offer the same stratagem. Armor passives are not a shelf slot; they are side stock (below).
- **Tiers:** each slot is a uniformly random item of its kind from the operation's **base tier up to
  one tier above it** (`BARGAIN_TIER_REACH`): C–B at diffs 3–5, B–A at 6–7, A–S at 8–10. Valor plays
  no part. A kind with nothing in that band steps to the nearest stocked tier, cheaper first.
- **Restocks every mission:** the shelf derives from the mission's `DiveState.bargainSeed` (stream
  salt 5, folded with the diver id) and the diver's `DiverState.bargain` deal: the holdings and bans
  it skips (`excludedIds`), frozen for the mission so a draft pick or a ban never reshuffles it. It is
  deterministic and never stored.
  - **Crusade start (`START_DIVE`):** the seed is injected (`START_DIVE.seed`). A seedless caller
    falls back to a hash of the host id.
  - **Every mission start (`ADVANCE`, and a failure restart):** the seed re-derives from the mission
    just played and every diver is dealt afresh.
  - **Seating mid-crusade:** the joiner is dealt the current mission's shelf.
- **Prices:** tier first, then type: `itemPrice = CREDIT_PRICE_TIER[tier] × CREDIT_PRICE_TYPE[category]`.
  C/B/A/S cost 35/100/280/450 — roughly 2.8× per tier through A, then a flatter step to S so the top
  stays in reach — so C/B sit within a mission or two's haul, A is a short save, and S (stocked from difficulty 8) lands about once per 6–7
  missions for a squad filing a modest share of the map's samples (`scripts/simulate-economy.mjs`;
  `SAVER=1` models a diver who skips small buys to afford a nearby S). Primaries ×1.25, everything
  else ×1. The Armor Pack is priced by band, not by a card's tier (below).
- **One buy per mission:** `BUY_ITEM` (self-service) deducts the price, banks the item in
  `personalInventories` and records it as `bargain.boughtItemId`. The shelf keeps its layout: the
  bought slot reads `bought` and every other slot `locked` until the next mission (`bargainShelfFor`
  returns each slot with a `status`).
- **A bought kind waits for the next operation:** the purchase's kind joins `bargain.boughtKinds` and
  that slot stays on the shelf empty, as `heldBack`, until a new operation begins (a failure restart keeps it). Stratagems
  are one kind, so buying one holds back both stratagem slots.
- **Soft:** buying never gates any phase. A diver who can't buy sees each card disabled with the
  engine's reason (`canBuyItem`).

#### Brasch's Armor Pack — passives on the side

Armor passives never appear in a reward draft, Liberty's Cross or a Field Promotion. The surplus
kit and the SEAF Support Package still issue them; the only way to **earn** another is the Armor
Pack. It sits beside the shelf, not on it: a **separate purchase** (a diver can buy one shelf item
and one pack in the same mission), **one pack per operation**, priced by the operation's base tier.

| Base band | Price | Ordinary cards | Hit card | S roll |
| --- | --- | --- | --- | --- |
| C (3–5) | 160 | C 30 / B 50 / A 20 | B 70 / A 30 | 1% |
| B (6–7) | 240 | B 45 / A 55 | B 30 / A 70 | 4% |
| A (8–10) | 360 | A 100 | A 100 | 8% |

- **Up to three duplicate-free passives** from the diver's own warbonds, minus everything they
  already own and anything banned. The pack never repeats a card; a pool with fewer than three left
  deals a smaller pack, and an empty pool closes the product.
- **One guaranteed hit:** the first card is the hit, drawn from the band's hit ladder; the other two
  fill from the ordinary ladder. A tier with nothing left steps to the nearest stocked tier — the
  hit looks up first, so its floor survives while any ordinary B/A passive remains. S is not an
  exhaustion upgrade while ordinary cards remain: it comes from the roll (or from a pool too thin
  to fill the pack without it), and never more than once.
- **One S roll per pack:** a single roll can lift the hit card to S, never more than one S per pack.
  The chance is 1% at base C, 4% at base B and 8% at base A; it reads 0% once the diver owns both S
  passives, and 100% ("S guaranteed") when the unowned pool is too thin to fill three cards without
  one.
- **Derived from the mission seed, then stored:** `BUY_ARMOR_PACK` derives the pull from the
  mission's `bargainSeed` (stream salt 7) folded with the diver id, then stores the seed and the
  dealt item ids in `DiverState.bargain.pack`. The stored pull is what the shelf and a reload show:
  a new mission in the same operation keeps it, a failure restart keeps it, a new operation clears
  it. The pull is not re-derived from live holdings, so a later forfeit cannot reshuffle the reveal.
- **At stake:** bought passives are earned gear, so a failure's forfeit can take one.
- **The reveal is presentation:** buying takes over the screen with `BraschPackReveal` — a sealed
  foil floats on a dark stage, tap/Enter tears it, a three-card deck appears and each card flies out
  and flips into a hand fan, with an S pull getting a gold burst and holo wash. It is low-text: the
  pack label, the tier and name on each card, and one "To the shelf" control. The pull is already
  banked; the full-screen stage is dismissible and the side card keeps a "View pull" replay.

**Tuning check:** `node --experimental-strip-types scripts/simulate-economy.mjs` Monte-Carlos a
full 3→10 climb (20 missions, 8 operations) for four collection profiles against the live
`config.ts`, spending greedily one buy per mission. Targets: a casual squad (~35% of spawns) buys
about 6 items per climb (mostly C/B); a steady one (~60%) ~11; an eager collector (~85% plus Sample
Scanner) ~15; the honor-system maxed haul (the 2× report ceiling) ~17. The shelf no longer carries a
passive slot, so those are slightly below the old totals; with the Armor Pack on (default) a
shelf-first diver spends most of the purse before the pack and buys almost none (~0.1 per climb
steady, ~0.2 eager, ~0.3 maxed). A passive-first collector (`PACKFIRST=1`) buys the pack before
shelf gear: ~1 pack per climb as steady, ~4 eager and ~5 maxed, with an S pack roughly every
11/4/4 climbs. `PACKS=0` reproduces the shelf-only numbers, and `SAVER=1` models a diver who skips
small buys to afford a nearby S (steady: an S about once per 5 missions at the top band). Re-run it
after touching `SAMPLE_CREDITS`, `TIME_HAUL_FLOOR`, `CREDIT_PRICE_*`, `ARMOR_PACK_PRICES` or
`ARMOR_PACK_ODDS`.

### Mission failure — the forfeit offer

A failed mission costs every diver one item, and the diver never picks freely (that made the loss a
formality: surrender the scrap). Instead the engine **deals each diver a forfeit offer** and they
choose the one item they lose. Only **earned gear** is ever at stake: the pool is the diver's kit
beyond the variant's bare surplus (`earnedItemsOf` — drafted rewards, Bargains buys, a Field
Promotion, a claimed cache, **and the diver's rolled SEAF Support Package** when that mode is chosen, so a SEAF
diver owes an item from the pack even before banking a first reward). The surplus starting kit was
never won, so it is never taken.

- **Who owes:** every present diver who dove the mission and has gear at stake — a mid-mission
  joiner included. A diver with only the bare surplus (e.g. a Super Penance failure on the crusade's
  first mission) or a diver who stepped away owes nothing. If no diver owes, the operation restarts
  immediately.
- **Offer size:** one item per star the difficulty could have awarded (`maxStarsFor`: 3 at diff 3–4,
  4 at 5–6, 5 at 7+), capped by the earned pool.
- **The loss keeps the same odds line.** The Forfeit offer is a ceiling-style draw
  (`rollRewardOptions`) against the diver's own kit, capped at the **rolled ceiling** their Valor
  bought for the mission (`diverRolledCeiling`; S+ stakes as S). It leads with
  the best item the ceiling reaches, then fills weighted toward the top, from the floor tier C up —
  so risk raises the tier at stake exactly as it raises the tier on offer. A zero-Valor dive only
  exposes gear up to the difficulty's base tier. A kit with nothing under the ceiling falls back to
  every earned item, so a diver holding any earned gear always owes something. Failed pacts and a failed
  directive void their risk first, as they do for rewards.
- **Seeded, never stored:** the offer derives from the mission's offer seed (set at the report, as
  on a clear) folded with the diver id, stream `FORFEIT_STREAM` (salt 6). Every client computes the
  same offer, and it is public (the squad sees each diver's choice).
- **Self-service:** `FORFEIT_ITEM{playerId,itemId}` — each diver surrenders one item from their own
  offer, once (a repeat or an item outside the offer is refused). Chosen items are only removed
  once **every present diver who owes has chosen** — held back so the offers (derived from the live
  kit) never reshuffle mid-choice — then the operation restarts together. A step-away, leave or kick
  that leaves nobody still choosing resolves the forfeit as well.

### Reward tokens & squad honors

**Honors roll on the squad-climbs page.** On a **full-star clear**
(`stars === maxStarsFor(difficulty)`) the mission offers one **bonus honors** contest (a
Mario-Party bonus star): a random stat from HD2's end-of-mission screen — kills, accuracy, deaths,
stims, samples, friendly fire, … — with a winning direction (*most* or *least*), each entry in
`BONUS_STATS` (`shared/engine/config.ts`). Honors are a **limited prize** (`bonusEligibleFor`): the
token only lands when the **squad-size cadence** is due — `BONUS_TOKEN_INTERVAL` awards a
four-diver squad every mission, a three- or two-diver squad every other mission, and a solo diver
every third. The report form only says whether honors are due (or why not and when they return,
`missionsUntilHonors`); it no longer rolls anything.

Once every draft is banked, the squad-climbs page (see above) rolls the contest by itself: `SPIN_BONUS{seed}`
(host-only, read from the filed report in the `rewards` phase) and the slot reel winds down onto the
seeded stat — the seed is what syncs (`rollBonus`, stream salt 4). **The app never captures the
stats**: the host reads HD2's stats screen and names the winner(s) (`AWARD_BONUS{playerIds}`,
host-only) on that page. Ties are common, so an award names **one or several** divers — every tied
diver banks a token. Awarding banks each winner's **one flexible reward token** immediately (capped
at `REWARD_TOKEN_CAP`, 3); there is no separate claim step. When only one diver can win (solo, or a
squad where everyone else sat the draft out), selection is redundant: the spin resolves the ceremony
and banks the token by itself. The engine still accepts a spin from the `diving` phase (and
`REPORT_RESULT` strikes one whose report no longer qualifies); the UI no longer sends it.

A token is spent by its owner during a reward draft on a **Reroll** (`REROLL_REWARDS`): redraw the
diver's own offer. A reroll must move (a seed that re-derives the same offer is refused, mirroring
`REROLL_WHEEL`), and the single offer stream turns both the rolled faces and the items. **Ban**
(`BAN_REWARDS`) remains in the engine for older sessions and saves, but the lit-pass UI no longer
offers it; the redesigned draft spends tokens on rerolls only.

The ceremony is a **hard gate** on `ADVANCE` (`honorsDue`, via `climbSettled`), never on the draft:
a token banked on the climbs page buys a reroll in the *next* mission's draft. The squad dock shows the rolled stat and the banked token but
no longer carries award controls. Claimed tokens persist across missions; reroll seeds and the old ban flag
reset with the pacts. Negative targeting (bans) did not violate "guarantee rarity class, never
specific items" — it narrows a pool, it never names a reward.

### Inventory model

- **Personal:** primaries, secondaries, throwables, boosters, armor **passives**, and
  **stratagems** — each diver owns and rewards their own. Every diver starts with the full
  starting kit (stratagems included) plus their own rolled SEAF pack in that mode; stratagem rewards go to the diver who rolled them. There is
  no shared pool — a deliberate deviation from Penitent Crusade's sharing rule.
- **Armor = passives, not pieces.** The catalog carries only armor passives (no pieces, no
  rating/speed/stamina). Any armor piece (any weight or rating) is freely wearable as long as its
  passive is owned. Passives are **Brasch exclusives**: the starting surplus and the SEAF Support
  Package issue them, and the Armor Pack is the only way to earn another (they never enter a reward
  draft, Liberty's Cross or Field Promotion). Losing a passive in a forfeit removes the ability to
  wear armor carrying it.
- **Forfeit on failure:** each diver loses exactly one earned item (stratagems included; never the
  starting kit) from their own personal inventory, chosen by that diver from a seeded, Valor-capped
  offer — see Mission
  failure — the forfeit offer. There is no squad-wide pick and no host call.

### Mid-crusade joining — Field Promotion & legacy caches

Divers drop in and out. A diver seated mid-crusade starts on the variant's surplus kit (plus a
rolled pack of their own in SEAF mode) — which is
useless at altitude — so the engine grants a **Field Promotion**: a one-time catch-up that restores
*altitude, never rarity*.

- **Sizing:** one option per completed operation behind (`difficulty − variant start difficulty`),
  capped at `CATCHUP_CAP` (4) in `shared/engine/config.ts`.
- **Tier:** options roll at the **current difficulty's base tier with Valor 0** — the engine's own
  "a zero-Valor dive always rolls its base tier" rule. At base tier with zero Valor, so S/S+ and Liberty's Cross
  are structurally unreachable. Risk remains the joiner's choice from their first mission; the
  promotion only buys altitude parity.
- **Derivation:** the offer is **frozen to the diver**: it derives from the diver's own id (a
  server-minted random id, fixed for the seat) folded with the picks already claimed
  (`catchUpOptionsFor` in `shared/engine/selectors.ts`) — deterministic, never stored, no reroll
  surface. The squad's wheel spins and rerolls never reshuffle it. **Every claim re-rolls a fresh
  offer** of `catchUpGranted` options; items the joiner already holds (and starting-kit/banned
  items) are excluded, so each offer stays full-size.
- **Settled before diving:** a joiner with a promotion pending (`promotionPending`: picks owed and
  an offer or cache to spend them on) is held at the **Field Promotion gate** — a non-dismissible
  dialog that opens once the briefing and Warbonds drawer are done (the offer draws from
  the declared warbonds) — and claims picks (`CLAIM_CATCHUP_OPTION`, self-service, one per pick) or
  a cache until it is spent. The gate holds only the joiner's own screen; it never gates squad
  progress through the engine — unlike the reward draft, where `allDiversPicked` blocks `ADVANCE`.
- **Inventories are sets.** No path ever stores an item id twice in a diver's kit: claims and
  restores merge (`mergeKit`).
- **Legacy caches hold earned gear only:** every departure (kicked via `KICK_DIVER` or voluntary via
  `LEAVE_DIVE`, both self-service) parks the diver's **earned kit** — their inventory minus the
  starting kit, each item once (`earnedKit` in `shared/engine/progression.ts`) — as
  `legacyCaches[playerId] = { name, itemIds }`, named after the diver who carried it so joiners
  see whose kit they inherit. A diver who earned nothing parks nothing. Caches are uncapped: claiming a
  fallen diver's kit is the encouraged way back to altitude.
- **Caches open after the first operation:** `availableCaches` offers nothing until the squad has
  completed at least one operation (`catchUpOpsBehind ≥ 1`) — the same point a joiner starts owing a
  promotion. A joiner with an untouched promotion may claim one cache wholesale (`CLAIM_CACHE`),
  merged onto their starting kit, *instead of* the promotion picks — claiming after rolling options
  is refused, so the two never stack. The same diver rejoining under a playerId that matches a
  cache reclaims it automatically — reissued the starting kit plus their earned gear, no promotion
  owed. That is the **voluntary-leave** path: a kicked diver is barred from reseating the same
  dive (seat id and keyed network fingerprint, see `KICK_DIVER` in the architecture docs), so their
  cached kit stays on offer to whoever else claims it. See Personal session saves for recognition
  across a new session.
- **Seating window:** fresh joins only seat in `lobby/spin/decision/strain/deal/pacts/diving` — never during
  `rewards`/`forfeit` (that would grant a draft for a mission the joiner never dropped into) or
  `complete`. The server rejects with `dive-locked`. A joiner seated mid-mission (`diving`) is a
  **full participant** in the mission they drop into: they draft from its filed report, bank its
  sample haul, stand for its forfeit on a failure and are eligible for Squad Honors. They never swore
  pacts for it, so only the squad's own directive, strain and Major Order risk lift their offer —
  they inherit the mission they fight in, never a shortcut past the pacts they did not take.
- **Stepping away (presence):** a diver who leaves, or whose connection stays down past the
  server's grace window (`AWAY_GRACE_MS`, 30s), is marked `away` (`SET_AWAY{playerId,away}`,
  self-service; also issued by the server). They keep their seat, kit, purse and tokens, and the
  squad simply stops waiting on them: pact lock-in, the reward draft (`allDiversPicked`,
  `awaitingDiverIds`), the misfortune fieldability check and every squad-size rule (directive
  weight, honors cadence, squad-only pacts) read the **present** divers (`activeDivers` /
  `squadSize` / `pactsSettled` in `shared/engine/selectors.ts`). A room where everyone stepped
  away never advances on its own. Reconnecting clears the mark; the host role moves to a present
  diver when the host steps away, and whoever comes back to a room whose host has stepped away
  takes it. A host who merely dropped (a server restart) keeps the role through the away grace.
- **A room is never abandoned:** the last seated diver cannot `LEAVE_DIVE` or be kicked, so a
  crusade is never reset — it waits for whoever comes back to it. Benching a diver for good is the
  host's `KICK_DIVER`: their earned gear parks as a legacy cache and the removed seat is barred
  from that room (`kicked` on any later join attempt).

### Save model

Anonymous/local-first. Named save slots in `localStorage` (`SaveDoc` in `shared/types/save.ts`,
stamped with the save epoch + save-schema + engine + catalog versions), validated on load via
`normalizeSaveDoc` in `shared/engine/saves.ts`, plus JSON export/import (Penitent Crusade parity).
**Beta was a clean slate (2026-10-26).** Alpha saves were discarded, not migrated: every version
restarted at 1 (`SAVE_SCHEMA_VERSION`, `ENGINE_VERSION`, `CATALOG_VERSION`), the alpha migration
chain and the read-time room normalization were deleted, and the Fly volumes were wiped. A beta save
carries `epoch: 'beta'` (`SAVE_EPOCH`), so an alpha export — no epoch, and a schema number that now
means something else — is refused rather than misread; so is a save from a newer schema than the
build reads. In the browser the save, session, recent-room and seat keys moved to new names
(`griffdive:saves:v2`, `griffdive:sessions:v2`, `griffdive:rooms:v2`, `griffdive:seat:*`), and
`app/plugins/purge-alpha-saves.client.ts` deletes the alpha keys on every boot; preferences (name,
warbonds, intros) carry over. **Beta policy: the schema is frozen and saves migrate.** Every later
breaking change bumps `SAVE_SCHEMA_VERSION` and adds a version-gated migration step to
`normalizeSaveDoc` (replacing its strict version check), or is reverted. Rooms carry no schema
version, so the same change must also normalize stored rooms on read in `loadRoom` (idempotent:
fill only absent fields, never overwrite) — they survive deploys on the volume. Normalization drops
only docs it cannot make sense of. No accounts in v1 —
session link is the identity. Crusade state includes: settings, difficulty, mission index,
`achieved` flag, `frontId`, `strainId`, the operation's `majorOrder`, inventories, per-diver warbond declarations,
`completedCombos` (misfortune × front × strain), reroll tokens, action log (capped), RNG seed
history, legacy caches (earned gear) parked by departed divers, per-diver catch-up bookkeeping, credit
purses and the mission's Brasch's Bargains seed and per-diver deals (the one Armor Pack pull
included).
