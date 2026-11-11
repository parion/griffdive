# Griffdive Beta — launch kit

Audience: Helldivers 2 veterans (hundreds of hours, bored of Helldive-on-autopilot, already run
squads over Discord). Tone: dry, in-universe, respects their time. No "revolutionary", no hype
adjectives. They've seen every companion app; lead with the rules, not the pitch.

Placeholders: `{URL}` (production URL), `{FEEDBACK}` (Fider board URL), `{CLIP}` (wheel→draft capture).

## Positioning

**One line:** A squad roguelike for Helldivers 2. Spin the Wheel of Adversity, swear pacts, climb
difficulty 3→10 on scavenged gear. The more risk you accept, the rarer the loot.

**Why veterans care:** you've unlocked everything. Griffdive takes it away and makes you earn it back
under rules you chose, with a companion app that does the bookkeeping while you play the actual game.

**Proof points (all true as of 2026-10-25):**
- Runs alongside the real game. No overlay, no mods, nothing touches your install.
- Free, account-free, no ads, no analytics. Link-based rooms, 1–4 divers, solo works too.
- Rarity is only bought with chosen risk. Difficulty alone never gives S-tier; stacked risk does.
- Every rule is checkable in-game (loadout screen, live in the field, or end-of-mission stats). If
  the squad can't verify a pact, it isn't in the catalogue.
- Installable PWA, built for a phone propped next to the monitor.
- Fan project; not affiliated with Sony or Arrowhead.

## Core hooks (pick per channel)

1. "Zero Deaths. Pacifist. Melee Only. Spin one." (directives)
2. "You start with surplus gear. Fail a mission and you forfeit an item you earned."
3. "Rarity is a roll you choose to stack: pacts raise the odds, Liberty's Cross is the chase."
4. "Follow the live Major Order and the app pins your fronts to the war."
5. "Hellpod to Super Penance: bare kit, bigger stake, for the wicked."

## Reddit — r/Helldivers (and r/HelldiversUnite)

**Title:** I built a free roguelike campaign wrapper for Helldivers 2: wheel of squad restrictions,
personal pacts, forfeit-on-fail. Beta is open.

**Body:**

> Fan project, free, no accounts, no ads.
>
> Griffdive is a companion web app. You play HD2 normally; the app runs the campaign around it.
>
> **How a dive works**
> - Spin the Wheel of Adversity: a squad directive (No Resupplies, Primary Only, Zero Deaths,
>   Pacifist, Melee Only, Oops All Airstrikes…) plus a front and an optional strain for the operation.
> - Squad votes to accept or decline. Accepting stakes risk for everyone.
> - Each diver is dealt a few personal pacts (Anti-Tank Abstinent, Stim Abstinent, Untouchable,
>   Dead Weight…) and picks what they'll swear to.
> - Play the mission. Report stars and samples.
> - Everyone drafts gear. Every option rolls its own tier on an odds line your risk bought.
>   Max risk can chase S+ (Liberty's Cross: any item from your own warbonds).
> - Fail and each diver gives up one earned item. Risk raises what's at stake, same as what's on offer.
>
> **Climb:** difficulty 3 → 10. Start at Medium, Hard or Suicide Mission; on Hard/Suicide pick the
> assisted SEAF Support Package or Super Penance (bare kit, bigger stake).
>
> **Details veterans will care about**
> - Pacts are only things the squad can verify: loadout, in-field, or the stats screen.
> - Never strands you below four stratagems. A smoke/EMS/shield reserve is always legal.
> - Brasch's Bargains: samples bank as credits, one shop buy per mission.
> - Major Order integration: lock your run to the live war front if you want.
> - 1–4 divers, join by link. Away divers are skipped, rejoining restores your seat.
>
> It's a beta. Balance numbers are tunable and I want your numbers: where is it too easy, where
> does a pact feel free, which directive is unfun?
>
> {URL} · Feedback: {FEEDBACK}
>
> Not affiliated with Sony or Arrowhead.

Post notes: flair "Fan Content"/equivalent, check sub rules on self-promo first, reply to every
early comment. Lead with a short capture ({CLIP}) of wheel → pact pick → draft.

## Discord / community servers (short)

> Griffdive beta is up: a free roguelike campaign layer for Helldivers 2. Spin a squad directive,
> swear personal pacts, climb 3→10, lose earned gear when you fail. Link-based rooms for 1–4.
> No accounts. {URL} — tell us what's broken or too soft: {FEEDBACK}

Ask server mods before posting; target squad/LFG and challenge-run channels, not general.

## X / Bluesky / Mastodon

1. `Beta is live. Griffdive: a roguelike campaign for Helldivers 2. Spin the Wheel of Adversity, swear pacts, climb 3→10 on scavenged gear. Free, no accounts. {URL}`
2. `"Zero Deaths." "Pacifist." "Melee Only." Your squad votes whether to accept. Accepting is how you get S-tier. {CLIP}`
3. `Fail a mission, lose something you earned. Rarity only comes from risk you chose. Griffdive beta: {URL}`

Add disclaimer in a reply or bio: fan project, not affiliated with Sony or Arrowhead.

## Content-creator pitch (DM / email)

> Subject: Squad challenge-run format for HD2, free beta
>
> Hi {name}, I'm Griffin, building Griffdive: a free companion app that turns Helldivers 2 into a
> roguelike campaign (wheel of squad restrictions, personal risk pacts, gear forfeits, 3→10 climb).
> Runs in a browser on a phone, nothing touches the game. Multiplayer rooms join by link, so a
> viewer-squad or Discord crew can play along. Beta is open; I'd value your read on balance more than
> coverage. Link: {URL}. Happy to set up a room or answer rules questions.

## Beta feedback asks (put these in every post)

1. Which directive or pact is a free pass, or unfieldable?
2. Does the Valor/odds line feel fair at difficulty 3–5 versus 8–10?
3. Is Brasch's Bargains pacing right? (Buys drop sharply at diff 8–10; cause not investigated.)
4. Any desync, join, or reconnect trouble in rooms?

## Launch checklist (blockers before posting publicly)

Flagged in `docs/agents/status-roadmap.md`, not marketing's to fix:
- [ ] **N41:** rate limits trust a spoofable `X-Forwarded-For`. Fix before driving traffic.
- [ ] **N42:** per-IP session caps, lobby reaping, save TTL.
- [ ] Lighthouse and low-end-phone frame rate unmeasured. Do on staging first.
- [ ] Confirm production URL, Fider board URL, and record `{CLIP}`.
- [ ] Owner confirms who posts and from which account.
- [ ] Check each subreddit/server's self-promotion rules.

## Claims to avoid

- Don't say "official", or imply Arrowhead/Sony endorsement.
- Don't promise Specialists, accounts, cloud saves, endless mode (Phase 5, not built).
- Don't say matchmaking/public lobbies exist; rooms are link-only by design.
- Don't present balance as final; it's beta.
