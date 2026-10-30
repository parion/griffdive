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

### Copy and voice

The terminal look is the theme; the words are plain. A player should understand every line the
first time they read it, mid-session, on a phone. Playtest feedback flagged invented ceremony
("sworn", "front locked", "live-synced", "Form 5-E") as confusing and fake-sounding, so:

- **Say what happens, in the player's words.** Helldivers 2 vocabulary (stratagem, extract,
  reinforce, Major Order, front, op) is welcome; invented bureaucracy is not. Prefer "Front" to
  "Front locked", "Up to 4 players" to "live-synced". Pacts keep their one ritual verb: they are
  **sworn** ("Swear your pacts", "Swear 1 pact", the SWORN stamp).
- **One name per thing on screen.** Player-facing terms: **Directive** (the wheel's squad rule),
  **Pacts** (sworn), **Strain**, **Front**, **Loot odds** (the
  odds bar; `Valor`/`ValorRoll` stay code and rules-doc terms only), **Armory** (the full item
  catalog; `codex` stays the component, route and metrics name), **Kit**, **Warbonds**, **Brasch's
  Bargains**. Risk is shown as skulls and called risk.
- **Earn every label.** Skip eyebrows and kickers that restate the heading or only add flavour; never
  show the same fact twice (a tier-grouped list doesn't badge each card with its tier).
- **Controls do what they say.** A "hold to" control requires a hold (see `AppHoldButton`).

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
- **Banners**: every standing message — an error, a removal, a blocked join, a locked shop, a
  server restart — is one `AppBanner` (`app/components/app/AppBanner.vue`), never a hand-rolled
  strip. One shape: a square tone glyph (`i` teal **info**, `!` orange **warn**, `×` red **error**,
  padlock khaki dashed **locked**), a 3px tone edge, a faint tone wash, then the copy (an optional
  bold `title` in the tone colour leads it) and optional `#actions` (`.btn.tiny.ghost`). It lays
  out by its own container, not the viewport: under 420px the actions drop beneath the copy.
  `floating` pins it to the top of the viewport (safe-area aware, over any layout) for app-level
  state such as the restart notice; `live` breathes the glyph for an ongoing process. Toasts
  (`AppToastStack`) are the transient twin — same edge language, gone on their own; use a banner
  when the message stands until the state changes. `/kit` (05b) shows every tone, the narrow
  layout, the floating banner and the toasts.
- **Motion**: ambient loops are CSS classes (`.pulse/.rise/.stamp/.slam/.glow/.blinkc/.glitch/…`);
  one-shot reveals use `motion-v` presets in `app/utils/motion.ts` (`riseIn/slamIn`, `SPRING_SNAP`,
  `SPRING_POP`). Animation is presentation, never rules; every effect honors
  `prefers-reduced-motion`. **Forward actions sweep:** actionable controls that move the squad on
  carry `.cta-sweep` only while live (disabled controls never sweep). The wheel, the odds strip and
  the loot pins keep their state in the engine; motion only reveals it.
- **The boot frame**: `app/spa-loading-template.html` is the pre-app splash for the SSR-off shell.
  It is self-contained on purpose — inline CSS, the vendored Archivo face and the brand-mark paths —
  so the first paint needs no app CSS or JS. `AppBootScreen.vue` is its in-app twin for every
  screen-level wait (the dive page's missing-state and awaiting-state fallbacks, including the
  host's first "You hold the wheel." frame), so the app has one loading language rather than plain
  text panels. A live wheel dial (rotating tick ring, gold arc, radar sweep) frames the griffin
  above the wordmark and the `CLIMB 3 → 10 · FREEDOM IS EARNED` rule; the chrome reads
  `SES GRIFFDIVE · DESTROYER TERMINAL`, and the boot rail signs off `Protocol 1017`. A CRT static
  layer is an inline SVG-noise tile (no image request) that sits over the whole frame. Both twins
  mirror the terminal palette, honor reduced motion, and expose one status line to assistive tech.
- **Share cards**: link previews carry the Bridge hero as a still — hazard rails, the kicker, the
  `FREEDOM / IS / EARNED.` stack with its tier rules, a 3 → 10 tier ladder, and the griffin in a
  wheel dial over the wordmark. `scripts/og-image.mjs` (`pnpm og:image`) renders it from
  `BRAND_MARK` to `public/og-image.png` (1200×630, the `og:image`/`twitter:image` in
  `nuxt.config.ts`, absolute on `https://griffdive.com`) and `branding/github-social-preview.png`
  (1280×640, uploaded by hand in the repo settings). The SPA is SSR-off, so every route shares the
  one card; re-run the script when the mark, the creed or the palette changes.

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
  Loot, current beat filled gold, finished beats checked), the connection lamp and the session
  menu. Kit, Armory, Warbonds and Brasch's Bargains no longer live up here: they are the
  **`DiveSidebar`** rail (see *Kit, Armory, Warbonds* below). Back to the Bridge lives
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

#### Bridge — the home page (`pages/index.vue` + `components/bridge/`)

The Bridge is the game's front door: a scrolling landing page that sells the mode and gets a squad
into a dive. `index.vue` owns the data (saves, live rooms, hosting); each section is a `Bridge*`
component. Top to bottom:

- **`BridgeField`** — the page's backdrop, fixed behind every section (`.bridge` is
  `isolation: isolate` so the field and the hero haze paint above the body's ground). A tactical
  grid fainter than the dive's `.grid-bg` — 44px cells, a major line and node dot every fourth —
  drifts one major cell toward the bottom right every 12 seconds on a loop (fast enough that the
  hairlines glide; a crawl of a few px/s reads as shimmer). A mouse lights the grid around the
  cursor: a gold-lit copy of the grid shows through a soft radial window that trails the pointer
  and brightens with speed, over a warm haze. A reticle locks onto the nearest node (a 60ms glide
  between nodes) with a sector readout (`K·07`) and two hairlines along its row and column, then
  fades after a moment of stillness. Hovering a primary action (enabled `.cta-sweep` or
  `.btn.primary`) arms it: the node's row lights left to right and its column top to bottom across
  the whole field, a bright head on each leading edge, and the reticle's brackets fly out from the
  pointer to frame the button. The frame is teleported to `body` at the header's z-index so it
  shows around buttons inside opaque panels and the header. The lock holds while armed. A click drops a beacon: two rings ripple out from the point. On touch, a
  tap lights the grid and pings it briefly; scrolling never does. Performance contract: the drift
  is a WAAPI transform loop on the compositor (three synced copies: base grid, lit tile, reticle
  layer), the lit tile only shifts within one grid period so it never repaints, and the rAF loop
  runs only while the light is still settling — an idle Bridge costs no main-thread frames.
  Reduced motion: no drift, no trailing, no rings, no beam sweep or bracket flight (an armed
  reticle appears lit at once); the light and reticle still follow the pointer. The field is `aria-hidden` and ignores pointers.

- **Hero** (one viewport tall on desktop): the kicker, the crusade's creed as the headline —
  **"Freedom is earned."**, typeset as a three-line stack with `FREEDOM` and gold `EARNED.` in the
  display face and a small tracked `IS` centred between rules that run the width of the headline
  (the connector is never a display word) — a one-paragraph pitch, chevron anchor links to the
  four beats, and the
  **`BridgeDeploy`** drop console: the gold **Host a squad dive** CTA over two matching halves,
  **Join a squad** (six-cell room code + Join) and **Play solo** (one full-width **Solo drop**
  button — no name field: a fresh browser files its callsign on the host tutorial that opens the
  dive, and a returning one reuses its saved name). Under the console, outside its box, three
  quiet icon buttons: **View armory**, **Set warbonds** (the Variant & warbonds dialog: variant,
  front plan, owned warbonds) and **Import save** (stacked icon-over-label in three columns on
  phones). Beside the copy sits the hero's showcase slot, decided on mount (it stays empty until
  then, so a returning squad never sees the wheel flash):
  - **`BridgeRecord`** whenever there is anything to resume (or live rooms are still being
    checked): the service record as a gold-topped panel whose card list scrolls in place
    (`--rec-max`, about a viewport tall). Each card is a row — difficulty emblem; tags (live room
    code, saved, achieved, squad avatars), the crusade's name in caps (a solo save is named after
    its diver as they are now), difficulty, op and mission, and a 3→10 ladder; then the actions:
    the primary (Resume / Open / Host) full width over the secondary and the export/delete icons.
    Live rooms carry a teal edge. A narrow record moves the actions under the card.
  - Otherwise **`BridgeWheel`**: the dive's real `WheelOfAdversity`, spinning itself to a fresh
    seed every few seconds while in view (paused off-screen or in a hidden tab; one still draw
    under reduced motion), with a caption card naming the landed directive, its rule and its
    skulls. The caption holds the previous draw until the wheel lands. The wheel is `inert` and
    `aria-hidden`; the caption carries the meaning.
- A **facts strip** (difficulty climb, directive and pact counts, squad size), all read from
  engine data.
- Four **`BridgeBeat`** sections (numbered headline + copy beside a lit visual; the beat fades in
  and tells its visual it is `lit` once it scrolls into view):
  1. **Call** — `BridgeDirectives`: every wheel directive as sigil + skulls tiles on two
     counter-running belts (paused on hover, static under reduced motion; a screen-reader
     list carries the same content).
  2. **Pacts** — `BridgePacts`: three real `ConditionCard`s fan in, then two take the SWORN
     stamp; a tally shows the sworn skulls. Phones swipe the hand.
  3. **Climb · Loot** — `BridgeOdds`, the one interactive teaching aid: a 3→10 rung radio
     (difficulty emblems, base tier), a **Skulls taken** range, the shared `ValorRoll` line from
     `tierZones`, and four example draws at fixed d100 faces wrapped in `RewardReveal` — the
     same dice land rarer tiers as the rung and skulls rise; S+ shows Liberty's Cross. On
     arrival the dial walks itself up once; any touch hands it over.
- **`BridgeMajorOrder`** — the live order lives in the ship header, not the page: the Bridge
  teleports it (client-only) into `#header-mid` in `app.vue`, centred between the brand and the
  ship nav. It is a 44px band — red edge, the order's faction emblems, a "Major Order · 4D 13H"
  kicker over the front names, and **Start campaign** — that sheds detail by its own container
  width, never the viewport: below 440px the names collapse to the lead front plus a count
  ("Terminids +2"), below 520px the CTA reads "Start", from 640px the lead planet's liberation
  shows as a labelled bar (otherwise a thin red line along the band's foot), and from 1000px the
  risk/reroll carrots join. At 860px and below it leaves the header and pins to the bottom edge
  as a fixed bar (safe-area aware); the page pads its foot to clear it. With no order the header
  shows a quiet one-line state on desktop and nothing on phones. The worst case — a three-front
  order beside a full service record — fits without overflow from 360px to 1920px.
- A closing **"Your squad is waiting."** call whose **Suit up** link returns focus to the drop
  console, then the fan-project footer.

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
- The host gets **`CrusadeSetup`** (shared with the Bridge's setup dialog): on wide containers the
  top row pairs *Where to fight* with *Starting difficulty* — `FrontPlanPicker` features the live
  **Major Order** as the pre-selected card (its fronts as equal tiles on narrow widths, perks and
  countdown), with *Roll each op* stacked above *Lock a faction* beside it; the difficulty cards
  become horizontal number rows so the pair fills one row — then the **Starting kit** spans the
  full width beneath, packing its sections across two or three columns instead of leaving the left
  column empty. Selecting *Lock a faction* unfolds the factions right beside the card (above it on
  desktop, below on phones, via `motion-v`; instant under reduced motion). The kit keeps the Kit
  drawer's grammar — `KitSection` headers over `KitTile`s, with primaries, secondaries and
  throwables in their own sections — and, in SEAF mode, blue "?" tiles ending each section, one per
  item the pack rolls there. On launch each diver gets **`KitReveal`**, an `AppDialog` over the
  wheel page (`useKitReveal` arms it) where the "?" tiles flip to the rolled items one by one
  (`.tile.fresh` landing flash, scrolled into view). It stays up until the diver presses "To the
  wheel" (Skip while dealing), clicks out or hits Escape; it waits behind the host tutorial, the
  Warbonds drawer and the Field Promotion gate so one modal shows at a time. Reduced motion shows
  the finished kit at once. Squadmates see a **Stand by** card with a Declare warbonds CTA instead
  of disabled controls (the host's picks are local until launch). Diver names are all caps.
- **Risk never shows as a Valor number.** Each plan and mode carries its per-mission risk as
  `RiskPips` skulls (`frontPlanRisk` / `modeValorAt` from the engine). `RiskSetup` totals them
  (`setupRiskOf`, out of 5) and states the game's core trade beside the total — **"More skulls,
  higher-tier rewards"** with a C→S tier ladder that brightens as it climbs — rather than an odds
  table: setup teaches the rule the whole run plays by.
- One pinned **launch bar**: the compact `RiskSetup` (one row on desktop, two on phones) beside the
  hold-to-launch CTA (`AppHoldButton`: a pointer or touch press must be held — letting go early shakes the button hard and shows "KEEP HOLDING" — while keyboard and assistive-tech activation confirm directly; stacked and full width on phones); the Bridge dialog shows the same total
  inline. There is no pre-launch checklist.

#### Call — `DivePhaseWheel`

One lit call: `WheelOfAdversity` (a real seeded SVG wheel inside a gold tick bezel; the hub button
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
directive clears them. The **Kit** tab of the `DiveSidebar` shows the Kit everywhere, greying
the items the pending pick would ban.

#### Dive — `DivePhaseDiving`

The field screen is one column: the teal-lit directive card (ACTIVE / BROKEN) and accepted strain,
then a **Pacts sworn** ledger — one row per pact (diver, lit skulls, name, one-tap "Mark broken",
confirm on the second tap). Each row is an accordion (`PactLedger`, shared with the phone) that
opens on the vow and its accountability line, lit by a gold edge; your own pacts start open,
everyone else's start shut. Hosts call **Extracted** or **Mission failed**; squadmates get a
waiting gate. Beside the column the `DiveSidebar` opens its **Kit** panel for every diver on
desktop (`fieldKit`), non-modal so the field screen stays live; the Hide control or the KIT tab
folds it away. It closes again when the beat ends (or the report form opens) unless the diver
picked a panel of their own meanwhile. On a phone the panel never opens by itself.

#### Report — `MissionReport`

The report window is a two-column lit form on desktop and one column on phones: mission stars,
credit haul (sample tubes + time cells), and the **Squad Honors** card. Honors are rolled by filing:
no spin button — the card carries the **`HonorsReel`** slot reel, flush to its right edge and filling the width (full width under the title on phones), which winds down onto
the seeded stat after **File report** is pressed (`HONORS_REEL_MS`, then a `HONORS_DWELL_MS` beat) before
the rewards screen is brought in. When honors are not due the reel is replaced by a plain message
naming the next mission they return. The filed report must still qualify or the engine strikes the
spin and claws back an auto-banked solo token. Every Next mission / Start operation control locks
until the host awards the honors; the locked control is a quiet dashed "Award honors first" (`.cta-locked` on desktop, the `.bar-gate` on phones), never a dimmed primary. Phone
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
tiles and status — the phone reward draft renders the same board (compact, one column), never a
status-only summary — and the reroll control spends a banked honors token. An S+ roll is **Liberty's Cross**, shown
not as a card but as the full-width **`LibertyCrossBand`** above the cards (crest, lore line, "Claim
any item" opening the armory picker). Naming an item selects the Cross and the CTA banks it; the
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
while they wait. Both beats share **`MissionBankedHaul`** (the haul hero card). At the operation's end, **`OperationCleared`** carries the climb
to the next difficulty — the next in-game difficulty emblem slams in over rays, above a 3–10
chevron ladder underlined in each rung's base tier — then regroups like the mission beat: the haul, the squad's picks and Brasch's shelf as a **last
call** (the shelf restocks at the new altitude only when the next operation starts). Its backdrop
is alive: two ray fields counter-rotate behind the emblem, a halo breathes, embers rise and the
headline takes one pass of light — all stilled by reduced motion.

#### ValorRoll — the one odds primitive

`app/components/valor/ValorRoll.vue` draws the Valor odds line (labelled **Loot odds** on screen): tier zones whose widths are
cumulative reach chances, a ruler, zone labels with odds (or percentage-point gains), and pins at
each rolled face. The call, pacts, dive (locked) and loot (pins) screens all use it, so the same
visual grammar explains every roll. Zones under 0.5% read `<1%`; 0% zones are silent. When a
preview improves the line, each growing tier is labelled `+N` and lights one clean gold chunk at
its leading edge; a shrinking tier keeps its settled odds label and no red block, since the bar
already shows the narrower zone. The signed movement stays in the zone tooltip. It is presentation
only and reads `tierZones` from the engine.

#### Kit, Armory, Warbonds

**`DiveSidebar`** is the one home for the dive's slide-overs: **Kit, Armory (`codex` in code), Warbonds and Brasch's
Bargains**, on every dive shell (the lobby and the briefings stand outside it and keep the global
Armory/Warbonds drawers). On desktop it is `DiveFrame`'s `aside`: a permanent 52px rail of vertical
tabs at the right edge (glyph, vertical label, and for Bargains the credit balance with its gold
lamp, disabled with its reason mid-mission), and a non-modal panel that opens to the rail's left at
`clamp(340px, 32vw, 34rem)`. One panel at a time; the active tab is gold-edged, a second click, the
panel's Hide control or Esc folds it, and the rail never moves. State is `useDrawers().sidePanel`
(`codexOpen` / `warbondsOpen` are flags over it, so the tutorial, lobby and Field Promotion gate
still just call `openWarbonds()`). Bargains shuts itself when the squad drops into the field.
On a phone (`sheet`) the rail is a four-up row pinned just above the action bar (`PhoneShell`'s
`dock` slot) and the panel rises over the stage from it (up to 64dvh, Hide or a tap anywhere off the dock folds it down; panels slide in and out
symmetrically, tucked behind the rail and the action bar, never over them); the
phone top bar and action bar no longer carry Kit, Armory or credit tiles. Components hosted here
stay rule-free: they only render engine selectors.

The Kit (`KitPanel`) keeps the lean diver list (a segmented strip with a gold lamp on the
selected diver), jump chips (each with its group's accent square) over the earned-only switch, and
live ban washes. Each `KIT_SECTIONS` group declares its `art`: **gear** groups (weapons,
throwables) set the transparent renders in a lit 16:10 well, brightened and drop-shadowed over an
accent spotlight; **icon** groups (armor passives, boosters, stratagems) show the square in-game
icon full size over a blurred copy of itself, so each frame glows in its own colour. Stratagem
groups take their in-game frame colours (Eagle/Orbital red, Supply blue, Defense green). Tiles
carry a tier stripe and lift on hover; banned icons drop their glow.

#### Join briefing and host tutorial

Illustrative, not verbose. `BriefingLayout` is the shared page; `BriefingJoin` ("You've been
drafted.") and `BriefingHost` ("You hold the wheel.") are thin wrappers that supply the kicker, a
one-line lede and the five step lines. The host sees it as a full page on first seating and as a
`Host tutorial` dialog (`review`) from the session menu; a squadmate replays it as the **Field
manual**.

- **The card** holds the only required input, **Your name** (focused on load, prefilled from a
  saved name). Filing it (Enter, leaving the field, or a saved name after a beat) plays the
  **class strike**: A–D struck one by one, E lands in red, a GRIFFDIVER stamp and one line —
  "Helldivers are Class A. You're Class E: surplus gear, no arsenal." — then the **starting gear**
  unfolds beneath, grouped by kind (`kitGroups`: Stratagems, Primary, Secondary, Throwables, Armor
  passives, Boosters, each edged in its category accent). The squad seats and difficulty follow.
  The strike is presentation only: the way in never waits on it, and reduced motion lands it at
  once.
- **The page** borrows the Bridge's grammar: the full page sits over the same drifting
  `BridgeField` grid, up to 1440px wide. The **hero** puts the kicker (hazard bar), the headline,
  the lede and a chevron run of the five steps (each opens its box below and scrolls to it; hidden
  under 520px where it would only wrap) on the left, the card on the right; phones read top-down.
  Both columns hang from the top (no forced viewport height) and the left column sticks while the
  card grows through the class strike and kit, so the headline never floats in a centred void.
- **How to Griffdive** is its own full-width section under the hero: a display heading with a
  who-acts legend, then five big boxes in one row (Reka `Tabs`): Spin, Swear, Dive, Report, Loot,
  each a numbered glyph (`IconWheel`, `IconPact`, `IconHellpod`, `IconStar`, `IconLoot`) with a
  Host / You / Everyone line and its bottom edge tinted by who acts (gold = you, teal = host,
  khaki = everyone). The open box turns gold and points down into one lit **stage**: the step's
  outlined number, title and one line beside its **`BriefingPreview`** — a looping scene of the
  beat drawn from real data (the wheel landing on a directive, two pacts taking the SWORN stamp,
  the hellpod drop, three stars and the report bars, three tiered loot cards with one BANKED),
  plus a **Next** button. Scenes are drawn at 150px and scaled whole by the parent's `--pv-zoom`
  (CSS `zoom`, up to 2× on wide stages); pact names bind `fitWord` so a long name never splits.
  Steps share one grid cell and stay mounted (`force-mount`, inactive ones hidden), so the stage
  holds the tallest step's height and the Next button sits pinned to the bottom of the copy column:
  nothing shifts when a description runs long. Only the live and the outgoing step draw a scene
  (the rest keep a same-sized slot), so each loop starts fresh. A switch slides the old step out
  and the new one in, in reading direction. Scenes are CSS loops whose resting
  styles are the final frame, so reduced motion shows the beat played out and swaps steps
  instantly.
- **The way in** — the primary **Start the dive** / **Join the dive** beside **Set warbonds** — rises
  in under **Your name** inside the card on wide containers (≥900px). Below that, and in the
  review dialog, it is the page's last block and sticks to the bottom edge, so it stays in reach
  from the card through every step; on phones the warbonds button shrinks to its glyph. One
  `createReusableTemplate` body feeds both spots and container queries pick which shows. The primary is disabled until there is a name; once filed, Enter in
  the field submits.

There is no More fold, odds dial or deck-plan diagram.

#### Phone shell

`usePhoneShell` swaps the desktop tree for `DivePhone` (`PhoneShell` + `Phone*`). It is a fixed
column: `PhoneTopBar` (identity, Squad, menu — no beat tabs, to give the stage the room), a
scrolling stage, the sidebar's tool rail, and a pinned `footer.phone-bar`. The bar never changes shape — its CTA label stays on one line and
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

`app/pages/kit.vue` (`/kit`, `robots: noindex`) is the live design sheet. Token swatches read the
CSS custom properties at runtime; catalog facts, warbond counts and kit examples come from the data;
and the specimens embed the shipping components (`BridgeOdds`, `WheelOfAdversity`, `ConditionCard`,
`ValorRoll`, `DivePhaseTabs`, `AppHoldButton`, `AppStarRating`, `AppDialog`, `AppTooltip`, Liberty's
Cross, reward reveal, crusade strip). It is a dev/review surface, never a product page: the Bridge
footer links it only on a dev server or the Fly staging app, and `server/middleware/kit-gate.ts`
plus `app/middleware/kit-gate.ts` keep production on a 404. Staging is recognised by
`FLY_APP_NAME` ending in `-staging` (`shared/kit-access.ts`), so the same image is safe in
production.
