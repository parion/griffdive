# Design north star

> Part of the Griffdive docs set. Index: [`AGENTS.md`](../AGENTS.md).

Griffdive fuses three systems. Each contributes a specific, researched lesson:

| Inspiration | What we take |
| --- | --- |
| **Penitent Crusade** (helldivers2challenges.com) | The campaign ladder: start at difficulty 3 with surplus gear, climb one difficulty per completed operation, reach difficulty 10. Stars → reward option count. Failure = repeat difficulty + forfeit an item. |
| **Wheel of Misfortune** (community challenge) | The ritual: spin a challenge wheel + an enemy-front wheel before every mission. Overrule/reroll results already completed on that front. Extraction required for a win. |
| **Hades Pact of Punishment** | Chosen-risk economy: hand-picked ranked conditions ("heat") gate rarer bounties. Conditions must tax *different* player strengths so no pick is strictly dominant. |

Design principles — every gameplay decision must honor these:

1. **Risk is chosen, never forced.** A zero/low-risk dive is always available (Penitent Crusade
   baseline). Wheel randomness draws the whole catalogue every mission; difficulty scales each
   condition's risk, and rerolls exist.
2. **Risk is legible.** Before committing, the UI shows the tier odds the current risk buys as one
   d100 line: zone widths, percentage-point movement, and the face each option rolled. Skulls are
   costs. There is no numeric Valor total to decode.
3. **Reward scales with stakes.** Each reward option rolls its own tier on that line; altitude and
   chosen risk move the whole line, and Brasch's Bargains stocks higher tiers at altitude.
4. **Guarantee rarity class, never specific items** (Balatro skip tags). Players buy a *chance* at
   better gear, not a shopping list — with one deliberate exception: **Brasch's Bargains** sells
   one named item per mission for credits, from the operation's base tier up to one tier above.
5. **Misfortunes reshape decisions, not stats** (Deep Rock Galactic's mutator design). A misfortune
   should change loadout strategy, route, or behavior — not just make numbers bigger.
6. **Team risk is shared; personal risk is personal** (Slay the Spire 2 co-op model). The whole squad
   carries the misfortune; each diver carries their own pacts and drafts their own rewards.
7. **Failure is a setback, not a wipe.** Repeat the difficulty, every diver forfeits one earned item
   from a dealt offer (tier-capped by the Valor they took on), keep climbing.

### Destroyer Terminal design language — the Lit pass

The whole UI speaks one terminal language. The redesign source is the **Griffdive Lit Pass** board
set; extracted references are git-ignored and presentation-only. Nothing here touches the engine.

- **Tokens** live in `app/assets/css/main.css`: surfaces `--ground/--rail/--panel/--raised`
  (`#0B0C09`/`#0E100B`/`#13150F`/`#1A1D15`), lines `--line-1…5`, inks
  `--text/--khaki/--muted/--dim/--on-gold`, signals `--gold/--red/--orange/--teal/--purple`,
  tiers `--tier-*`, plus the `--font-body` (Chakra Petch) / `--font-display` (Archivo 125%)
  pair, the ease/duration tokens, a 4px spacing scale (`--sp-1…8`) and **fluid** layout/type
  tokens (`--pad-page/--pad-panel/--gap-panel/--gap-grid`, `--fs-cap/sm/body/h1/display`) built on
  `clamp()`. Prefer the tokens and container queries (`@container`) over viewport `@media`.
- **Utilities**: type `.disp/.lbl/.cap/.sub/.vl/.odl`; shape `.cut/.cut-sm/.chev/.ticks/.hazard/
  .hatch/.scan/.grid-bg/.hex/.tag-shape`; panels `.panel/.sec/.sec-h/.dash`; controls `.btn/
  .ghost/.icon-btn/.chip/.nb`; data atoms `.tb/.tier-badge/.pips/.chit/.chits/.lamp/.stp/.chan`.
- **Motion**: ambient loops are CSS classes (`.pulse/.rise/.stamp/.slam/.glow/.blinkc/.glitch/…`);
  one-shot reveals use `motion-v` presets in `app/utils/motion.ts` (`riseIn/slamIn`, `SPRING_SNAP`,
  `SPRING_POP`). Animation is presentation, never rules; every effect honors
  `prefers-reduced-motion`. **Forward actions sweep:** actionable controls that move the squad on
  carry `.cta-sweep` only while live (disabled controls never sweep). The wheel, the odds strip and
  the loot pins keep their state in the engine; motion only reveals it.

#### Desktop shell — one lit stage

`app/components/dive/DiveFrame.vue` is the no-rail dive shell: a three-row grid of **header ·
stage · squad dock**, exactly one viewport tall on desktop. The stage is the only scroll area and
holds one lit object per beat; the old climb strip, left squad rail, right Kit/Valor rail and bottom
PhaseRail are gone. Each beat centres itself on the stage (`margin-block: auto` on the stage inner,
so a beat taller than the stage still scrolls from the top), and the beats are sized to land their
primary CTA above the fold on a 1440×900 desktop. A new beat always opens scrolled to its top.
Beat swaps never flash the previous screen: local UI (an open report form) stays mounted until
the engine's phase change unmounts it, rather than closing itself first.

**Diver names display in caps everywhere** — seats, ledgers, drafts, hosts named in copy, toasts.
State keeps the name as typed; templates pass it through `upperName()` (`app/utils/upperName.ts`),
and accessible names keep the typed case.

**Display names never split mid-word.** Card names in the display font bind `fitWord(name)`
(`app/utils/fitWord.ts`, measured Archivo advances) and cap their size at
`min(<size>, 100cqi / var(--fit-len))` inside an inline-size container, with
`overflow-wrap: normal`. A long word shrinks to fit its card; it never orphans its last letter.
Scoped classes must not reuse global utility names (`.chip`, `.sub`, `.cap`…) — scoped rules
merge with them.

- **`DiveTopBar`** carries the identity block (the in-game difficulty emblem shown as-is — never
  boxed in a hex or tinted — then the gold number, difficulty name,
  op number and mission pips, front emblem), the four **`PhaseTabs`** beats (Call · Pacts · Dive ·
  Loot, current beat filled gold, finished beats checked), and the action tiles — Brasch's Bargains
  (credit glyph + balance, disabled with its reason mid-mission, gold lamp when something is
  affordable), Kit, Codex, Warbonds, connection lamp and the session menu. Under 1240px Codex and
  Warbonds collapse to glyph buttons (keeping their accessible names) so the header stays one row
  down to 980px. Back to the Bridge lives
  in `DiveMenu`, because the global bridge header stands down on `/dive`.
- **`SquadDock`** anchors the bottom: status lamps and names for every diver (`.seat` cards —
  not the global `.chip` tag utility), open seats, Steam lobby and invite copy, and the
  squad-honors token picker once a contest is spun. For the host the Steam control toggles a
  **Steam lobby bar** docked just above the squad bar: pin or change the `steam://joinlobby/…`
  link, copy it, jump into the lobby, or remove it — removal closes the bar. A squadmate gets a
  direct **Join Game** link to the pinned lobby instead, and no Steam control at all while the
  host hasn't pinned one. Steam lives on those two dock controls, never on an individual seat.
  The host on a phone (which has no squad bar) gets the dialog instead. `DiveMenu` holds
  tutorial/field manual, Bridge, pin/unpin, new session, leave and end. On a phone the same dock
  lives in the **Squad** dialog, and host actions render inline there (a portalled dropdown would
  land under the modal overlay).
- **`PhaseTabs`** replaced the old "whose move?" cue. The current beat is the lead; host-only
  controls are visibly absent for squadmates rather than disabled chrome. A non-host sees "Stand by"
  and the host's name on the call, but still swears their own pacts and banks their own loot.

#### Setup — Hellpod Bays (`DivePhaseLobby`)

The room's setup is the one screen that stands outside the dive shells: no `DiveTopBar`,
`SquadDock`, `PhoneTopBar` or phone action bar, since there is no crusade to report on yet. It is a
single responsive page (container queries on `.hangar`) for phone and desktop alike:

- A slim **hangar bar**: back to the Bridge, the title, the room code (tap copies the invite) and
  the session menu.
- **Four bays in one row at every width**, each a lit well with an SVG hellpod standing over
  hazard-striped doors. A seated pod shows the diver's initial in its window (gold for you, teal
  well lamp for the squad); an open bay is a dashed ghost pod. Every bay is a big click target:
  an open bay copies the invite, your own pod opens Warbonds, and the host's tap on a squadmate
  opens **Make host / Kick diver**. On launch the pods drop through the doors (`podDrop`).
- The host gets **`CrusadeSetup`** (shared with the Bridge's setup dialog): *Where to fight* —
  `FrontPlanPicker` with the live **Major Order** as the featured, pre-selected card (its fronts as
  equal tiles on narrow widths, perks and countdown); on wide containers it is one big button in
  the left column with *Lock a faction* and *Roll each op* stacked on the right — then *Starting
  difficulty* (three number cards, each with its **Base tier**) and, on 5/7, the SEAF/Penance pair,
  then the **Starting kit** (`StartingKit`: the issued gear grouped by kind, SEAF Support items
  edged teal). Squadmates see a **Stand by** card with a Declare warbonds CTA instead of disabled
  controls (the host's picks are local until launch). Diver names are all caps.
- **Risk never shows as a Valor number.** Each plan and mode carries its per-mission risk as
  `RiskPips` skulls (`frontPlanRisk` / `modeValorAt` from the engine). `SetupRisk` totals them
  (`setupRiskOf`, out of 5) and states the game's core trade beside the total — **"More skulls,
  higher-tier rewards"** with a C→S tier ladder that brightens as it climbs — rather than an odds
  table: setup teaches the rule the whole run plays by.
- One pinned **launch bar**: the compact `SetupRisk` (one row on desktop, two on phones) beside the
  hold-to-launch CTA (stacked and full width on phones); the Bridge dialog shows the same total
  inline. There is no pre-launch checklist.

#### Call — `DivePhaseWheel`

One lit call: `WheelOfMisfortune` (a real seeded SVG wheel inside a gold tick bezel; the hub button
and the primary **Spin the wheel** CTA both spin it) fills the left column at stage height
(`--wheel-size`). The landed wedge lights gold and juts past the rim; labels on the wheel's left
half flip to read upright; the hub shows the drawn rule's skulls and "Risk N" — never "+N". There
is no risk legend. The right column keeps one order before and after the draw: the **Squad
Directive** (or its pre-spin placeholder), a **front card** carrying the faction emblem, front name
and its Major Order planet(s), the **strain** as its own section inside that same card, the
`ValorRoll` strip, then the primary CTA. Both calls use the same take/skip grammar; a stranded rule
disables "Take it" with the reason, and either call can be flipped with a large two-way
**Taken / Skipped** toggle until the first pact locks (the strain only on the operation's first
mission). The pre-spin strip is the current team odds ("Base odds"); after the draw it previews the
movement accepting the directive would buy. Gains are labelled `B +18`; a tier that shrinks reads
its settled odds instead of a red negative, and the bar marks gains with one clean gold chunk at
the tier's leading edge rather than painting every boundary a different color. The host's CTA is
**Spin the wheel** before the draw and **Deal the pacts** (disabled until both calls are decided)
after it. The front plan (Major Order / locked faction / rolled) is chosen at setup with
`FrontPlanPicker`, never here; a pinned run shows its front card under the directive before the
first spin as well as after it. Rerolls sit under the deal CTA as quiet secondary controls.

#### Pacts — `PactScreen`

A centred, self-service hand of `ConditionCard`s dealt in with a stagger. Each card carries only
its lit risk skulls, the vow in quotes, any benched-kit note, the accountability line and the
inked SWORN stamp. There are no per-card odds words: hovering or picking previews the one odds
strip under the hand. The CTA is
"Swear N pacts" (or "Dive with no pacts"), and a locked diver sees the sworn stamp while the rest of
the squad finishes. The hand is local: a squad sync leaves your picks alone — only a fresh draw or
directive clears them. There is no Kit rail: the header's **Kit** tile opens the same `ArmoryDrawer`
everywhere.

#### Dive — `DivePhaseDiving`

The field screen is one column: the teal-lit directive card (HOLDING / BROKEN) and accepted strain,
then a **Pacts sworn** ledger — one row per pact (diver, lit skulls, name, one-tap "Mark broken",
confirm on the second tap). Each row is an accordion (`PactLedger`, shared with the phone) that
opens on the vow and its accountability line, lit by a gold edge; your own pacts start open,
everyone else's start shut. Hosts call **Extracted** or **Mission failed**; squadmates get a
waiting gate. Beside the column, every diver gets the **`KitDock`**: the Kit docked in
`DiveFrame`'s `aside` slot, at the right edge where the Kit drawer slides in, but non-modal so the
field screen stays live. It is open by default; its Hide control (and the header's Kit tile, while
docked) folds it to a slim KIT tab. The report form takes the stage without the dock. On a phone
the field kit is the same `KitDock` as a non-modal **sheet** pinned to the bottom of the scroll,
just above the action bar: a KIT handle that rises into the panel (up to 64dvh) and folds back down.

#### Report — `MissionReport`

The report window is a two-column lit form on desktop and one column on phones: mission stars,
credit haul (sample tubes + time cells), and the **Squad Honors** card. Honors are spun here, before
filing, so the squad knows what to chase; the card states why a turn is ineligible. The filed report
must still qualify or the engine strikes the spin and claws back an auto-banked solo token. Phone
reports pin **File report / File failure** in the fixed action bar.

#### Mission failed — `DivePhaseForfeit`

Deliberately bare, in the loot draft's grammar. A red kicker, the title and one line of copy sit over
`ForfeitPicker`: the diver's offer as the same tier-edged art cards as `RewardDraft` (letterboxed
4:3 well, tier letter, `fitWord` name, category line; a 104px thumb row on phones), staggered in.
Marking a card lights its edge red; one plain click button under the cards — **Remove <item>**, in
the pinned phone bar on phones — removes it (no hold-to-confirm, no container). The removed card
keeps its red edge with a **Confiscated** stamp while the rest fade, like a banked reward. Squadmates'
forfeits sit below in `SquadForfeitBoard`, the `SquadDraftBoard` grammar: name, status, and each diver's dealt items as icon tiles with the removed one struck red and the rest faded. A short note says who is still choosing. SEAF Support Package
items count as at-stake gear, so a SEAF diver always has a pack item to surrender. The `.sur-tile`
class is the e2e hook.

#### Loot — `RewardDraft`

The draft is "Bank one item": one card per option. **The item art is the
card**: a 4:3 well (a square thumb on phones) letterboxes the whole catalog image with
`object-fit: contain` — never crop it — and the name is a quiet caption under it. Each card is
stamped with its **rolled tier** only; the d100 faces live on the odds line above, one pin per option. The old ceiling-climb intro,
`CeilingTrack`, ban flow and settlement screen are retired. Picking a card selects it; the CTA banks
it; a resolved draft waits on the squad. The **`SquadDraftBoard`** shows each squadmate's offered
tiles and status, and the reroll control spends a banked honors token. An S+ roll is **Liberty's Cross**, shown
not as a card but as the full-width **`LibertyCrossBand`** above the cards (crest, lore line, "Claim
any item" opening the codex picker). Naming an item selects the Cross and the CTA banks it; the
band's claim button then shows the chosen name with "Change pick".

**The reveal is the fanfare.** Each card is wrapped in `RewardReveal` and cards deal in **left to
right** (`revealTimeline` in `app/utils/rewardReveal.ts`), with drama scaled by tier: C deals in, B
rises with a faint flash, A drops with a flash, sheen and shockwave ring, S flickers a charge in its
empty slot then slams in with a double ring, a jolt and an ambient glow. **Liberty's Cross unfurls
last** as the finale and stays a surprise until then: the band takes no space (no placeholder)
until its suspense beat, when its row folds open and pushes the cards down, then the beam → open →
crest plays. Hosts set `--cross-gap` to their flex gap so the collapsed row leaves no double gap. Every option's Valor pin is timed
(`pinDelay`) to strike the line as its card lands; S/S+ pins flare. Pacing lives in
`REVEAL_BEATS`. A draft that is already resolved on mount shows settled, and nothing gates input —
cards are pickable from the first frame. The squad's drafts (`SquadDraftBoard`) wait for the local
reveal to land (`revealDuration`): they appear with the settled cabinet, so a teammate banking early
never pre-empts the fanfare. Banking settles them at once; a reroll replays the hold. A pick is
local and survives the squad's syncs — only a genuinely new offer (a reroll) clears it.

Once **every** diver has banked (`allDiversPicked`, synced state, so the whole squad sees it), the
draft hands off to an interstitial; the engine stays in rewards and the host's ADVANCE is the only
way on. Mid-operation that is **`MissionCleared`** ("Regroup"): a mission track (secured drops lit
teal, the next one breathing gold), the diver's banked haul as a hero card with the credits it
earned, the squad's picks (`SquadDraftBoard`), and **Brasch's Bargains inline** so divers shop
while they wait. Both beats share **`BankedHaul`** (the haul hero card). At the operation's end, **`OperationCleared`** carries the climb
to the next difficulty — the next in-game difficulty emblem slams in over rays, above a 3–10
chevron ladder underlined in each rung's base tier — then regroups like the mission beat: the haul, the squad's picks and Brasch's shelf as a **last
call** (the shelf restocks at the new altitude only when the next operation starts). Its backdrop
is alive: two ray fields counter-rotate behind the emblem, a halo breathes, embers rise and the
headline takes one pass of light — all stilled by reduced motion.

#### ValorRoll — the one odds primitive

`app/components/dive/ValorRoll.vue` draws the Valor odds line: tier zones whose widths are
cumulative reach chances, a ruler, zone labels with odds (or percentage-point gains), and pins at
each rolled face. The call, pacts, dive (locked) and loot (pins) screens all use it, so the same
visual grammar explains every roll. Zones under 0.5% read `<1%`; 0% zones are silent. When a
preview improves the line, each growing tier is labelled `+N` and lights one clean gold chunk at
its leading edge; a shrinking tier keeps its settled odds label and no red block, since the bar
already shows the narrower zone. The signed movement stays in the zone tooltip. It is presentation
only and reads `tierZones` from the engine.

#### Kit, Codex, Warbonds

The Kit (`ArmoryDrawer` → `KitPanel`) is reached from the header on desktop and phone; there is no
persistent rail, except in the field, where `KitDock` docks the same `KitPanel` beside the stage. It keeps the lean diver list (a segmented strip with a gold lamp on the
selected diver), jump chips (each with its group's accent square) over the earned-only switch, and
live ban washes. Each `KIT_SECTIONS` group declares its `art`: **gear** groups (weapons,
throwables) set the transparent renders in a lit 16:10 well, brightened and drop-shadowed over an
accent spotlight; **icon** groups (armor passives, boosters, stratagems) show the square in-game
icon full size over a blurred copy of itself, so each frame glows in its own colour. Stratagem
groups take their in-game frame colours (Eagle/Orbital red, Supply blue, Defense green). Tiles
carry a tier stripe and lift on hover; banned icons drop their glow.
On a phone the Kit drawer rises from the bottom of the viewport
(`AppDrawer` `side="bottom"`: grip, swipe down to close) instead of sliding in from the right.
Codex and Warbonds remain the shared drawers. Brasch's Bargains remains a slide-over from the credit
tile, never a phase screen.

#### Join briefing and host tutorial

`JoinBriefing` is the joiner's one-page "You've been drafted." registry; `HostBriefing` is its fork for
the host ("You hold the wheel."): same registry, kit and risk dial, but the mission loop is the host's
duties (raise, launch, spin, call, report) plus a "Keep the table" strip. The host sees it as a full page
on first seating and as a `Host tutorial` dialog (`review`) from the session menu. In both, the squad
box unfolds and then fades in two actions beneath it — a secondary **Set warbonds** and the primary
**Join the dive** / **Start the dive** (the only CTA; the footer is identity + Back to base). Neither
action exists until the callsign is filed. The hero carries a reel of the high-res item renders and the
issued kit shows them at 52px. The deck-plan illustration depicts the lit stage or the phone shell. The
onboarding odds dial remains a teaching aid; the live dive uses `ValorRoll`.

#### Phone shell

`usePhoneShell` swaps the desktop tree for `DivePhone` (`DivePhoneShell` + `Phone*`). It is a fixed
column: `PhoneTopBar` (identity, Squad, Kit, Codex, menu) over `PhaseTabs`, a scrolling stage, and a
pinned `footer.phone-bar`. The bar never changes shape — its CTA label stays on one line and
ellipsizes a long item name: optional detail above, an optional secondary
on the left and one primary action filling the rest, supplied through `PhoneActionBar`'s deferred
teleports. Report and forfeit actions use the same bar, and so do the `MissionCleared` and
`OperationCleared` interstitials (their `phone` variants put the host's CTA in the bar). The squad sheet is a dialog with inline
moderation; the wheel call is a flat top-down stage (directive, front-and-strain card, odds, wheel),
not a bottom sheet. Short phones keep the call's take/skip buttons reachable by scrolling, and tap
targets stay at least 24px. No page-level horizontal overflow is allowed; long live text needs
`min-width: 0`.

Portrait tablets share the phone shell, growing its column to `min(100vw, 720px)`. Landscape tablets
use the desktop shell until the structural breakpoint.

#### Accessibility

Dialogs trap focus, restore it on close and are `aria-modal`; the global skip link targets
`#main-content` on every page. Icon-only controls carry `aria-label`; phase beats expose
`aria-current="step"`; the odds line labels every zone and pin for assistive tech; decorative wheel
layers are `aria-hidden` and `pointer-events: none` so a rotating square can't steal a tap.
`e2e/a11y.spec.ts` guards the foundation.

#### Foundations kit

A hidden, unlinked `app/pages/kit.vue` (`/kit`, `robots: noindex`; includes replayable Liberty's
Cross and reward-reveal specimens) specimens the tokens/atoms so contributors can sanity-check the language. It is dev
reference, not a product surface.
