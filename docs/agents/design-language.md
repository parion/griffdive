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
2. **Risk is legible.** Before committing to a dive, the UI shows exactly what tier ceiling the
   current risk buys (skull icons à la Dead Cells cursed-biome doors / Hades' Erebus gates). No
   hidden math.
3. **Reward scales with stakes.** Flat drops regardless of difficulty is the documented failure of
   both Penitent Crusade and Dead Cells' late-game cursed chests. Risk must move the odds — and the
   shelf: chosen risk rolls the draft ceiling, and the same ceiling caps the Requisition stock.
4. **Guarantee rarity class, never specific items** (Balatro skip tags). Players buy a *chance* at
   better gear, not a shopping list — with one deliberate exception: the **Requisition stock** sells
   named items for sample currency, priced by the tier risk bought (see Requisition — samples as
   currency). The wheel and the draft still guarantee classes.
5. **Misfortunes reshape decisions, not stats** (Deep Rock Galactic's mutator design). A misfortune
   should change loadout strategy, route, or behavior — not just make numbers bigger.
6. **Team risk is shared; personal risk is personal** (Slay the Spire 2 co-op model). The whole squad
   carries the misfortune; each diver carries their own pacts and drafts their own rewards.
7. **Failure is a setback, not a wipe.** Repeat the difficulty, forfeit one item, keep climbing.

### Destroyer Terminal design language

The whole UI speaks one terminal language (the redesign source lives at
`.orca/drops/Griffdive — Destroyer Terminal redesign.html`; extracted references under
`.orca/drops/extracted/`, both git-ignored). It is presentation only — it never touches the
engine.

- **Tokens** live in `app/assets/css/main.css`: surfaces `--ground/--rail/--panel/--raised`
  (`#0B0C09`/`#0E100B`/`#13150F`/`#1A1D15`), lines `--line-1…5`, inks
  `--text/--khaki/--muted/--dim/--on-gold`, signals `--gold/--red/--orange/--teal/--purple`,
  tiers `--tier-*`, plus the `--font-body` (Chakra Petch) / `--font-display` (Archivo 125%)
  pair, the ease/duration tokens, a 4px spacing scale (`--sp-1…8`) and **fluid** layout/type
  tokens (`--pad-page/--pad-panel/--gap-panel/--gap-grid`, `--fs-cap/sm/body/h1/display`) built on
  `clamp()`. Prefer the tokens and container queries (`@container`) over viewport `@media`; keep
  breakpoints structural and few. Legacy token names (`--bg`, `--bg-raised`, …) are kept as
  aliases.
- **Utilities**: type `.disp/.lbl/.cap/.sub/.vl/.odl`; shape `.cut/.cut-sm/.chev/.ticks/.hazard/
  .hatch/.scan/.grid-bg/.hex/.tag-shape`; panels `.panel/.sec/.sec-h/.dash`; controls `.btn/
  .ghost/.icon-btn/.chip/.nb`; data atoms `.tb/.tier-badge/.pips/.chit/.chits/.lamp/.stp/.chan`.
- **Motion**: ambient loops are CSS classes (`.pulse/.rise/.stamp/.slam/.glow/.blinkc/.glitch/…`);
  one-shot reveals use `motion-v` presets in `app/utils/motion.ts` (`riseIn/slamIn`, with the
  `SPRING_SNAP` / `SPRING_POP` transitions). Animation is presentation, never rules; every effect
  honours
  `prefers-reduced-motion` (global CSS guard + explicit `matchMedia` in JS-driven reels and the
  wheel reveal).
  **Forward actions sweep:** every control that moves the squad on (Launch, the Spin hub, Deal,
  Lock in, Mission complete / File report, Squad Honors / Advance, Forfeit, the tutorial's Next)
  carries `.cta-sweep` — the pending-directive sheen — only while it is actionable (disabled
  controls never sweep). `--sweep` tints it: on the reward screen the continue buttons take the
  banked item's tier colour, sweeping faster for S and S+. **Reveals ramp with rarity:** reward
  pods land worst-to-best (`revealRank`), S holds a beat longer before landing, and emphasis
  scales with tier — A a quiet tier sheen, S a soft landing brighten plus a slow-breathing glow. **Liberty's Cross
  is not a pod:** `LibertyCrossBand` is a single full-width frame above the rolled pods (one box —
  no card inside a card) that lands last. It never flashes or bursts: a hairline of light draws
  across the reserved slot, the band opens from it (a `clip-path` polygon settling into the
  `cut-sm` silhouette), then `LibertyCrossEmblem` — the winged four-point cross in the Wheel's rim,
  the brand mark's swept-blade language — assembles feather by feather behind slow masked rays and
  a one-off soft bloom, and the claim button goes live. The timeline keys off one `--delay`;
  reduced motion and reloads skip straight to the open band. The phone draft renders the same
  band (narrow container query: crest beside the copy, claim button full width). Glows ride the
  unclipped `.pod-slot` as `drop-shadow` (the card's `clip-path` clips box-shadows); Motion owns
  the card's transform, so tier effects use filters only. Phone reward rows carry the same tier sheen.
  **The ceiling climbs first:** `CeilingTrack` is a compact, unlabeled bar whose home is the draft
  header's top right (the phone puts it under the title). On desktop the draft opens on it: the
  track is lifted centre stage over a dashed intro stage (a measured FLIP transform — it never
  leaves its header slot in the DOM) with a `Ceiling roll · Valor` kicker. From the base node it
  fills one tier per `CEILING_STEP`, popping each node it reaches with the caret riding the head;
  the failed step stalls red with a shake, the ceiling node fills solid, the stage flashes the
  ceiling's tier colour and an `X Tier` verdict slams in. After `CEILING_HOLD` the transform is
  released and the track docks into the corner over `CEILING_DOCK` while the stage fades; only then
  does the cabinet mount and the pods drop (timings in `app/utils/motion.ts`). Tapping the stage
  skips ahead. Per-step odds sit over each link. Reduced motion and resolved drafts skip the intro
  and land instantly; a reroll replays the whole sequence. Pods give ground in a short cabinet by
  shrinking the art stage, never the name or the Claim footer. **Drafts are social:** once the diver's own pods land,
  `SquadDraftBoard` shows each squadmate's offer as small tier-edged tiles with their ceiling and
  status — the banked tile pops and glows, the rest fade, bans are crossed out — and it stays up
  after the diver picks so the squad can compare pulls.
- **Shell**: `app.vue` renders the terminal header (brand mark + `ALPHA` + uplink + nav) on every
  route except the dive, which renders its own `DiveTopBar` (crusade + difficulty emblem + room
  code/copy + Tutorial + the labelled Codex/Warbonds ship nav — labels, never bare icons; the
  Kit needs no header entry on desktop because it lives in the right rail). `components/dive/DiveFrame.vue` is the
  no-scroll dive shell — grid rows `60px 84px minmax(0,1fr) 52px` and fluid columns
  `clamp(184px,15vw,216px) 1fr clamp(248px,21vw,284px)` (the rails give ground on landscape
  tablets and small laptops and reach their design widths by ~1360px):
  header · `CrusadeStrip` (the horizontal 3→10 climb) · left rail (Squad, led by `PhaseCue`) ·
  centre phase · right rail (`KitValorRail`: **Kit** and **Valor** tabs) · `PhaseRail` (bottom
  Mission phases). The centre is a named `center` inline-size container and each wide phase
  (`WheelPanel`, `MissionReport`, `DivePhaseDiving`, `BonusCeremony`) is its own container, so
  phases adapt to the width they actually get, not the viewport: the wheel stacks its decision
  cards under a smaller wheel below ~620px (scrolling the drawn directive into view once the spin
  lands), the report drops to one column below 720px, the honors reel stacks over its Spin, and
  the reward token bar wraps. A narrow `CrusadeStrip` keeps names only on the current rung (the
  others keep number + tier; names stay in their accessible labels). The tutorial drops its
  dossier column at ≤1180px. The Valor tab doubles as a readout: the live total over a bar split by source (directive gold,
  strain orange, Major Order teal, mode khaki, pacts red — the same colours as the meter's cells and
  legend, via `app/utils/valor.ts`). This total, the meter's head and the phone/landing Valor figures
  all render through `ValorFigure`, which drops the fractional tail — decimal point included — to
  smaller type so the digits left of the decimal read as the headline. The tab choice is shell state
  and survives phase changes; it defaults to Kit. The rail carries nothing else: no Valor explainer, no honors token banks, no
  forfeit "carries over" card.
  The left rail collapses to a `56px` icon column (persisted in `localStorage`): the header chevron
  expands it back, while collapsed each diver becomes their first letter with the active lamp to its
  left and thin token bars beneath, the Steam card shrinks to a single icon button (no labels), and
  the Squad heading, `PhaseCue` and `MissionReportSummary` drop out.
  **One lead per beat:** `PhaseCue` answers "whose move is it?" (`Your move` gold / `Stand by`
  teal), fed by `awaitingDiverIds` + `canControl` — the answer to playtesters losing the thread
  between phases. On desktop it sits in the squad rail under the Squad heading (`rail`; a banner
  atop the centre column pushed the fixed terminal into scroll), and every diver chip carries the
  matching lamp — gold and pulsing on whoever `actingDiverIds` says the squad is waiting on (the
  host on host-run beats), teal otherwise — with a status naming the beat ("spinning", "choosing
  pacts", "in game", …). `PhaseRail` is a progress readout, never
  a control: the current beat is an underlined gold label (a filled gold chevron read as a second
  Spin button) and finished beats show a check. The old wheel-pool card was dropped (the wheel
  already shows every rule).
  `WheelOfMisfortune.vue` is a real SVG wheel whose rotation is derived from the wheel seed.
  On the `rewards` phase the centre swaps between the `RewardDraft` pod cabinet and the
  `RewardsSettlement` screen — the draft's post-pick CTA hands off to the settlement, which carries
  the `BonusCeremony` honors contest **and** the `RequisitionStock` shelf (the shop lives here, never
  in the draft); when honors aren't due that turn the ceremony is replaced by a disabled panel and the
  shelf stays available. The left rail gains `MissionReportSummary` on the rewards phase.
  The Kit (`KitPanel.vue`) is deliberately lean: an optional row of diver names (no warbonds, no
  token chits), a sticky toolbar (an **Earned only** switch that hides the starting kit, and jump
  chips that scroll to each group), then the diver's own items by category with live ban washes.
  Stratagems split by type (Eagle / Orbital / Supply / Defense) and every group always renders —
  an empty one reads "None" (or "None earned yet" in earned mode) so a missing booster is stated,
  not implied. Every owned item shows,
  the shared reserve stratagems included (they are most of a fresh diver's stratagem loadout);
  the separate reserve block, the "stratagems fieldable" readiness block and the key bar are
  gone — playtesters could not read them. On desktop it is the rail's Kit tab and has no other entry
  point (the desktop lobby, which has no right rail, shows no Kit). The phone shell's header
  opens the same panel in an in-app drawer (`ArmoryDrawer.vue`), titled **Kit** in every player-facing string (code keeps the `armory`
  names). The
  Griffdiver Briefing (`BriefingOverlay.vue`) is presented as the **Griffdive tutorial**: a framed
  dialog (hazard edge, `TRAINING` badge, "Step n of 6") over the dimmed dive, never a full-bleed
  takeover — players mistook the old briefing for the game. It opens once at first seat, commits
  the name typed on its Identify step, never chains into the Warbonds panel (its Warbonds step
  covers ownership), and is replayable from the dive header's Tutorial control. One structural breakpoint (1020px) flows the
  shell and stacks the rails. Below it `usePhoneShell` swaps the whole three-rail tree for
  `DivePhone` (`DivePhoneShell` + `Phone*`), a fixed-band shell whose phase content is a
  bottom-sheet/fixed-footer layout. Portrait tablets share that shell: its column grows to
  `min(100vw, 720px)` rather than floating as a phone strip, and phone phase bodies must stay
  fluid to that width (pinned CTAs fill the sheet). `PhaseCue` rides there as a slim fixed band under the squad
  bar (`band` prop) so phase bodies keep their no-scroll layout. Phone rules from the mobile
  checkup: the pinned footer CTA is always the phase's *live* action (the wheel's is "Spin the
  wheel" before the draw, never a dead deal gate); self-service actions (`PICK_REWARD` and kin)
  gate on the diver's own state, never on `canControl`, which is host control; short phones
  (≤740px tall) shrink the wheel so the decision sheet stays reachable; the wheel phase body is a
  drawer — the wheel sticks to the top and the directive/strain sheet scrolls up over it (the phase
  body scrolls, never the page), collapsing for each fresh draw and expanding once the spin lands; nav controls keep their
  text labels on phones; and nothing may widen the layout viewport — flex items holding long live
  text (the Major Order's faction indicator) need `min-width: 0`.
- **Armory detection**: the Armory never computes bans.
  `armoryRules(state, diver, previewPactIds?)` lists the active misfortune/pact rules and
  `itemBannedInArmory(state, diver, item, previewPactIds?)` returns why a stratagem is greyed; both
  wrap `stratagemBanReason` in `shared/engine/pacts.ts` — the same predicate `legalStratagemCount` /
  `hasLoadout` use, so the screen and the floor can never disagree. The pact screen reports its
  unsworn selection up as preview ids: the Kit ghost-greys what those pacts *would* ban — dashed
  frames, a pulsing ghost overlay on the tile media, dashed reason labels, dashed
  `Pact · if sworn` rule chips and preview-banned floor pips — while the count drops live, and the
  preview clears the moment the hand is locked (sworn bounds show solid, never ghosted). Preview
  ids already sworn are deduped.
- **Foundations kit**: a hidden, unlinked `app/pages/kit.vue` (`/kit`, `robots: noindex`; includes a replayable Liberty's Cross specimen) specimens
  the tokens/atoms so contributors can sanity-check the language. It is dev reference, not a
  product surface.
