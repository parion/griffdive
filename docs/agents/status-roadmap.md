# Status & roadmap

> Part of the Griffdive docs set. Index: [`AGENTS.md`](../AGENTS.md).

## Status

Phase 0 (foundation), Phase 1 (solo core) and Phase 2 (realtime squads) are
complete: `pnpm lint`, `pnpm test`, `pnpm typecheck` green (510 tests incl. a deterministic golden
crusade replay 3→10 and the server sync suite); playable solo UI with named localStorage saves +
JSON export/import; realtime rooms with join links, presence, host authority + migration,
reconnection — verified by a live two-peer smoke test and the Playwright E2E suite (solo flow,
two-browser room sync, Codex slide-over,
PWA affordances) against the production build. Mid-crusade catch-up (Field Promotion + legacy caches, `LEAVE_DIVE`)
has landed, as has the Phase 4 PWA layer (installable manifest, generated icons, Workbox service
worker with an offline shell + on-demand catalog art), the operation-long **faction strains**
(N2: optional, accept/decline, compounding team risk) and the run-long **Major Orders**
(host-set front commitment that stays pinned for the whole run, +1 reroll token per completed operation — manual picker plus the live war API).
**The Destroyer Terminal redesign has landed** — the whole UI moved to a single terminal language
(dark ground/rail/panel surfaces, gold/red/orange/teal/purple signals, cut frames, hazard stripes,
scanlines and a signature motion set). **The Lit pass then flattened the dive:** one header, one
lit stage and one squad dock replace the climb strip and both rails. The four beats (Call · Pacts ·
Dive · Loot) are the only navigation; hosts own the wheel/report chrome, while squadmates see
their own kit and self-service pacts without host clutter. The Bridge home is a scrolling landing page
(hero with the drop console beside the service record — or, with nothing to resume, the
self-spinning wheel · four "how it plays" beats with live engine-backed visuals · a closing call;
the live Major Order docks in the header, or pins to the bottom on phones), the wheel is a real spinning SVG wheel,
the Kit (UI name of the Armory) opens from the header and marks directive/pact bans per tile from
engine selectors, and an interactive six-beat Griffdiver Briefing onboards first-time divers.
Reward drafts now roll **one d100 per option** on the shared `ValorRoll` line (no ceiling-first
draft, no Ban UI), and Squad Honors rolls on a reel when the report files and is awarded from the dock (Next stays locked until it is). See
[Destroyer Terminal design language](./design-language.md#destroyer-terminal-design-language---the-lit-pass). Hybrid **saved
dives** have landed: any seated diver can pin a room server-side so it outlives the idle TTL and a
browser clearing its storage, resuming through the existing rejoin path (see Saved dives).
**Steam lobby codes** have landed too: the host can relay the `steam://joinlobby/…` link from the
in-game Helldivers 2 lobby so every seated diver can jump straight in (see Steam lobby codes).
**Personal session saves** have landed: every seated diver's browser mirrors the session, and any
save — solo or session — can seed a brand-new room where the forker hosts, absent divers' kits park
as claimable caches, and new players come aboard as usual (see Personal session saves).
**Rooms never reset:** Leave steps a diver away with their seat intact, the squad skips away
divers, and RESUME reseats them exactly where they were (see Mid-crusade joining).
**The condition catalogue is unified:** squad directives (team) and pacts (personal) are now one
catalogue, nothing is gated by difficulty, and a per-condition curve scales each rule's risk/Valor
with altitude (see Condition scaling). **Team directives outweigh pacts, by squad size:** an
accepted directive stakes its scaled risk × **1 / 1.25 / 1.5 / 1.75** for a squad of 1 / 2 / 3 / 4
(`TEAM_DIRECTIVE_VALOR_WEIGHTS`), because the more divers must hold one rule the harder it is — and
a solo diver's directive is effectively personal. **Broken directives fail like pacts:** the host can mark an accepted directive failed in
the field (`FAIL_MISFORTUNE`, host-only, `diving` phase) — its shared risk is voided for every diver
and each diver forfeits one reward option. **Failure is per-diver:** a failed mission deals each diver a seeded forfeit offer from their earned gear, capped at their rolled Valor ceiling (see Mission failure — the forfeit offer). UI copy calls the team scope **Squad Directive** and the
wheel the **Wheel of Adversity**; engine ids and the action union keep the `misfortune` name. The
Field manual slide-over was retired — the Griffdiver Briefing covers onboarding. **Samples became
Requisition currency:** a successful report banks a sample haul (time remaining is a multiplier) into
every diver's purse, and once their draft resolves a per-diver rotating **Requisition stock** — its
tiers drawn from the difficulty band — lets them buy named items, priced by tier then type. The
team-performance Valor term is gone; chosen risk is the only thing that moves the odds line.
**Brasch's Bargains became a shop paid in credits:** samples now bank as credits, and
the shop opens from the dive header (phone: a credit tile on the action bar) in every phase but the
mission itself, once the first operation is complete. Every mission restocks one random slot per primary, secondary, throwable and armor
passive (base tier up to one above), plus a stratagem slot per star past the third. A diver buys at
most one item per mission, and a bought kind isn't stocked again until the next operation (see
Brasch's Bargains — credits).
**Starting variants are now three difficulties:** squad size no longer gates a start (it fluctuates
all crusade), so the five squad-size/kit variants collapsed into Medium (3), Hard (5) and Suicide
Mission (7); the hard/suicide starts choose one of two mutually exclusive modes — the assisted
**SEAF Support Package** (a random B-tier pack rolled per diver + a small flat Valor bump) or **Super Penance** (bare kit + a
larger flat Valor stake, marked by a Hades-style flame) (see Starting variants).
**Beta (2026-10-25):** the header chip and changelog dialog now read the release channel from `app/utils/release.ts`. The save policy below is unchanged.
**Alpha has landed:** the save schema is frozen at v13 and the migration chain is open (see Save
model). See [Roadmap](#roadmap).

## Beta-readiness review (2026-10-24)

Pre-beta pass: dependencies upgraded, component tree reorganised to Nuxt's default naming, dead
code removed, docs audited against the code. Gate: lint, typecheck, 510 unit tests and 45 e2e
specs green on the upgraded stack.

**Spec relevance.** Every identifier and path the `docs/agents/` files cite was checked against the
tree; stale ones were fixed (`starsToOptions` → `STARS_TO_OPTIONS`, retired components, the old
`ui/`/`dive/` paths). The design-language layouts (lit-stage shell, Bridge, phone and tablet shells,
Hellpod Bays, ValorRoll) are still current and are pinned by the `phone-*`, `tablet-layout`,
`bridge` and `dive-sidebar` e2e specs. Retired and already marked so: the ceiling-first draft, the
Ban UI, the lobby/matchmaking. Not re-verified visually: pixel-level fidelity of each section.

**Game design (from `scripts/simulate-economy.mjs`, 4000 runs).**
- Brasch's Bargains pace well through B/A tier: a steady squad buys ~11 items over 20 missions
  (1.4 per operation), an eager one ~16. Buys per mission drop to 0.1-0.6 at difficulty 8-10 (cause not
  investigated).
- **Addressed after this review:** S-tier at 800 credits was effectively unreachable, and difficulty 3
  had a dead shop (haul 4-8 vs a 25-credit floor). Prices now ride one curve, 35/100/280/450, and the
  shop stays shut until the first operation completes, so early credits accumulate instead of
  stranding. A steady squad (60% of samples filed) buys an S about once per 6.6 missions in
  the S band (difficulty 8+) when it saves for one; a diver who always spends on the priciest
  affordable item almost never reaches S (~1 per 590 missions), so the SAVER policy in
  `scripts/simulate-economy.mjs` is the number to watch. Overall buys rose (steady ~11 per 20
  missions, level with the old curve).
- Open balance/design items still on the board in `PLAN.md`: N25 (pacts are strictly "take
  everything"), N39 (reroll-token sources), N13 (`fragileLiberty` early lock-out, blocked on DEC-6).

**Technical performance (production build).**
- Client JS 1.09 MB raw / 333 kB gzip over 21 chunks (largest 64 kB gzip); CSS 333 kB / 61 kB gzip.
  Build 8.4 s; unit suite 0.6 s; e2e 45 specs in ~32 s.
- Shipped weight was dominated by 44 MB of unreferenced `public/images/gauntletSpecialists` art
  (Specialists are Phase 5). Removed: `public/images` fell from 75 MB to 31 MB (production `.output` is now 38 MB), and the image/PWA
  cache story is unchanged (catalog art is still cached on demand, never precached).
- Not measured here: runtime frame rate on low-end phones, WebSocket load beyond the unit
  fakes, and Lighthouse. Do these on the staging deploy before the beta announcement.
- Open infra items before a public beta: N41 (rate limits trust a spoofable `X-Forwarded-For`)
  and N42 (per-IP session caps, faster lobby reaping, save TTL).

**Dependencies.** All at latest except TypeScript, held at 6.x: `vue-tsc` cannot load the TS 7
native port yet. `@vueuse/core` 15 replaced the websocket heartbeat `interval` with a `scheduler`
(`useGameSocket`). The regenerated PWA icons from `@vite-pwa/assets-generator` 2 were not adopted
(encoder churn only).

## Roadmap

Each phase lands shippable. Update the relevant `docs/agents/` files (commands, status) as part of each phase's final commit.

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
- **Phase 3 — Lobby (reverted).** Open-room flag, lobby broadcast, lobby page + filters and instant
  join were built, then deliberately removed: Griffdive targets an already-engaged squad (voice over
  Discord, friends), not public matchmaking. Rooms are invite-link/code only. See
  [Matchmaking — none](./server-architecture.md#matchmaking--none-deliberate).
- **Phase 4 — Polish + deploy (in progress).** Wheel animation juice, reward draft ceremony, theme
  pass, Fly.io deploy + CI/CD (approval-gated batch releases, PR previews, metrics) and PWA
  affordances (`@vite-pwa/nuxt`: installable manifest, generated icons, Workbox service worker with
  an offline app shell + on-demand catalog art) have landed, as have **Major Orders** (a run-long
  front plan chosen at setup — live order, locked faction, or rolled with +1 risk — plus the live
  war API; see Operation layer) and
  the **Destroyer Terminal redesign** (single terminal language, lit-stage dive shell, Bridge
  home, phone layout, hidden `/kit`; see Destroyer Terminal design language).
  **Observability expanded:** the Prometheus registry now covers the whole loop — arrivals and
  invite-link health, the room census (phase and difficulty), the play funnel, chosen-risk
  decisions, the reward economy and the no-accounts retention proxies — with the Grafana overview
  versioned in-repo (`grafana/griffdive-overview.json`; `pnpm dashboard:preview` renders a
  mock-series layout preview). See [Deployment](./deployment.md) → Monitoring.
  Remaining: the final polish pass. *Done
  when: production URL serves a full multiplayer dive.*
- **Phase 5 — Post-v1 backlog.** Specialists (PC parity), tier-maker custom rarity tables, heat
  ladders/bounties (clear risk N to claim N+1), endless mode, accounts + cloud saves, i18n.
