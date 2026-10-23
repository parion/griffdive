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
- **`SquadDock`** anchors the bottom: status lamps and names for every diver (`.seat` cards in
  mixed case — not the global `.chip` tag utility), open seats, Steam
  lobby and invite copy, and the squad-honors token picker once a contest is spun. For the host the
  Steam control toggles a **Steam lobby bar** docked just above the squad bar: pin or change the
  `steam://joinlobby/…` link, copy it, jump into the lobby, or remove it. Squadmates (and the host
  on a phone, which has no squad bar) get the join dialog instead. `DiveMenu` holds
  tutorial/field manual, Bridge, pin/unpin, new session, leave and end. On a phone the same dock
  lives in the **Squad** dialog, and host actions render inline there (a portalled dropdown would
  land under the modal overlay).
- **`PhaseTabs`** replaced the old "whose move?" cue. The current beat is the lead; host-only
  controls are visibly absent for squadmates rather than disabled chrome. A non-host sees "Stand by"
  and the host's name on the call, but still swears their own pacts and banks their own loot.

#### Call — `DivePhaseWheel`

One lit call: `WheelOfMisfortune` (a real seeded SVG wheel inside a gold tick bezel; the hub button
is the only spin control) fills the left column at stage height (`--wheel-size`). The landed wedge
lights gold and juts past the rim; labels on the wheel's left half flip to read upright; the hub
shows the drawn rule's skulls and "Risk N" — never "+N". There is no risk legend. The heading and
the drawn **Squad Directive** sit in the right column and, on the operation's first mission, the **strain** card.
The strain is a compact row (emblem, name, blurb, small take/skip). Both use the same take/skip
grammar; a stranded rule disables "Take it" with the reason. The
`ValorRoll` strip under them previews the percentage-point movement of hovering or picking a rule.
The host's **Deal the pacts** CTA waits until both calls are decided. Major Order pinning opens the
`MajorOrderPicker` dialog; a pinned order shows on the stage before the first spin as well as after
it. Rerolls sit under the deal CTA as quiet secondary controls.

#### Pacts — `PactScreen`

A centred, self-service hand of `ConditionCard`s dealt in with a stagger. Each card carries only
its lit risk skulls, the vow in quotes, any benched-kit note, the accountability line and the
inked SWORN stamp. There are no per-card odds words: hovering or picking previews the one odds
strip under the hand. The CTA is
"Swear N pacts" (or "Dive with no pacts"), and a locked diver sees the sworn stamp while the rest of
the squad finishes. There is no Kit rail: the header's **Kit** tile opens the same `ArmoryDrawer`
everywhere.

#### Dive — `DivePhaseDiving`

The field screen is two columns: the teal-lit directive card (HOLDING / BROKEN) and accepted strain
on the left over the locked odds line, and a **Pacts sworn** ledger on the right — one row per
pact (diver, lit skulls, name, one-tap "Mark broken", confirm on the second tap). Hosts call **Extracted** or **Mission failed**; squadmates
get their own `KitSnapshot` pane and a waiting gate. The kit is visible by default for non-hosts and
opens full-height from the header for everyone.

#### Report — `MissionReport`

The report window is a two-column lit form on desktop and one column on phones: mission stars,
credit haul (sample tubes + time cells), and the **Squad Honors** card. Honors are spun here, before
filing, so the squad knows what to chase; the card states why a turn is ineligible. The filed report
must still qualify or the engine strikes the spin and claws back an auto-banked solo token. Phone
reports pin **File report / File failure** in the fixed action bar.

#### Loot — `RewardDraft`

The draft is "Bank one item": one card per option, dealt in with a stagger. **The item art is the
card**: a 4:3 well (a square thumb on phones) letterboxes the whole catalog image with
`object-fit: contain` — never crop it — and the name is a quiet caption under it. Each card is
stamped with its **rolled tier and d100 face**, with the same odds line above carrying one pin per option. The old ceiling-climb intro,
`CeilingTrack`, ban flow and settlement screen are retired. Picking a card selects it; the CTA banks
it; a resolved draft waits on the squad. The **`SquadDraftBoard`** shows each squadmate's offered
tiles and status, and the reroll control spends a banked honors token. Liberty's Cross is one card,
not a band above the pods.

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
cumulative reach chances, a ruler, zone labels with odds (or percentage-point deltas), and pins at
each rolled face. It is used on the call, pacts, dive (locked) and loot (pins) screens, so the same
visual grammar explains every roll. Zones under 0.5% read `<1%`; 0% zones are silent. It is
presentation only and reads `tierZones` from the engine.

#### Kit, Codex, Warbonds

The Kit (`ArmoryDrawer` → `KitPanel`) is reached from the header on desktop and phone; there is no
persistent rail. It keeps the lean diver list, earned-only switch, jump chips and live ban washes.
Codex and Warbonds remain the shared drawers. Brasch's Bargains remains a slide-over from the credit
tile, never a phase screen.

#### Join briefing and host tutorial

`JoinBriefing` is still the joiner's one-page "You've been drafted." registry, and `BriefingOverlay`
is still the host's replayable Griffdive tutorial. Their deck-plan illustration now depicts the lit
stage or the phone shell, not three rails. The onboarding odds dial remains a teaching aid; the live
dive uses `ValorRoll`.

#### Phone shell

`usePhoneShell` swaps the desktop tree for `DivePhone` (`DivePhoneShell` + `Phone*`). It is a fixed
column: `PhoneTopBar` (identity, Squad, Kit, Codex, menu) over `PhaseTabs`, a scrolling stage, and a
pinned `footer.phone-bar`. The bar never changes shape — its CTA label stays on one line and
ellipsizes a long item name: optional detail above, an optional secondary
on the left and one primary action filling the rest, supplied through `PhoneActionBar`'s deferred
teleports. Report and forfeit actions use the same bar, and so do the `MissionCleared` and
`OperationCleared` interstitials (their `phone` variants put the host's CTA in the bar). The squad sheet is a dialog with inline
moderation; the wheel call is a flat top-down stage (directive, strain, wheel), not a bottom sheet.
Short phones keep the call's take/skip buttons reachable by scrolling, and tap targets stay at least
24px. No page-level horizontal overflow is allowed; long live text needs `min-width: 0`.

Portrait tablets share the phone shell, growing its column to `min(100vw, 720px)`. Landscape tablets
use the desktop shell until the structural breakpoint.

#### Accessibility

Dialogs trap focus, restore it on close and are `aria-modal`; the global skip link targets
`#main-content` on every page. Icon-only controls carry `aria-label`; phase beats expose
`aria-current="step"`; the odds line labels every zone and pin for assistive tech; decorative wheel
layers are `aria-hidden` and `pointer-events: none` so a rotating square can't steal a tap.
`e2e/a11y.spec.ts` guards the foundation.

#### Foundations kit

A hidden, unlinked `app/pages/kit.vue` (`/kit`, `robots: noindex`; includes a replayable Liberty's
Cross specimen) specimens the tokens/atoms so contributors can sanity-check the language. It is dev
reference, not a product surface.
