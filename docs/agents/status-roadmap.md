# Status & roadmap

> Part of the Griffdive docs set. Index: [`AGENTS.md`](../AGENTS.md).

## Status

Phase 0 (foundation), Phase 1 (solo core) and Phase 2 (realtime squads) are
complete: `pnpm lint`, `pnpm test`, `pnpm typecheck` green (285 tests incl. a deterministic golden
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
scanlines and a signature motion set). The dive is a fixed, no-scroll terminal (60px header with
the room code + copy control · 84px climb strip · three rails · 52px Mission-phases bar), the
Bridge home fits one desktop view (hero + climb ladder · 6-step mission loop · Valor odds ladder ·
deploy rail with code-cell join and the service record · a full-width Major Order band and footer),
the wheel is a real spinning SVG wheel, the Kit (UI name of the Armory) marks
directive/pact bans per tile from engine selectors and ghost-previews the pact
screen's unsworn selection, and an interactive six-beat Griffdiver
Briefing (Identify · Spin · Pact · Reward · Warbonds · Deploy) onboards first-time divers. Engine,
sync, saves and data are untouched; see
[Destroyer Terminal design language](./design-language.md#destroyer-terminal-design-language). Hybrid **saved
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
and each diver forfeits one reward option. UI copy calls the team scope **Squad Directive** and the
wheel the **Wheel of Adversity**; engine ids and the action union keep the `misfortune` name. The
Field manual slide-over was retired — the Griffdiver Briefing covers onboarding. **Samples became
Requisition currency:** a successful report banks a sample haul (time remaining is a multiplier) into
every diver's purse, and once their draft resolves a per-diver rotating **Requisition stock** — its
tiers drawn from the ceiling risk bought — lets them buy named items, priced by tier then type. The
team-performance Valor term is gone; chosen risk is the only thing that moves the ceiling (see
Requisition — samples as currency).
**Starting variants are now three difficulties:** squad size no longer gates a start (it fluctuates
all crusade), so the five squad-size/kit variants collapsed into Medium (3), Hard (5) and Suicide
Mission (7); the hard/suicide starts choose one of two mutually exclusive modes — the assisted
**SEAF Support Package** (extra gear + a small flat Valor bump) or **Super Penance** (bare kit + a
larger flat Valor stake, marked by a Hades-style flame) (see Starting variants).
**Alpha has landed:** the save schema is frozen at v13 and the migration chain is open (see Save
model). See [Roadmap](#roadmap).

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
  an offline app shell + on-demand catalog art) have landed, as have **Major Orders** (host-set
  front commitment + reroll bonus, manual picker plus the live war API; see Operation layer) and
  the **Destroyer Terminal redesign** (single terminal language, three-rail dive shell, Bridge
  home, phone layout, hidden `/kit`; see Destroyer Terminal design language).
  Remaining: the final polish pass. *Done
  when: production URL serves a full multiplayer dive.*
- **Phase 5 — Post-v1 backlog.** Specialists (PC parity), tier-maker custom rarity tables, heat
  ladders/bounties (clear risk N to claim N+1), endless mode, accounts + cloud saves, i18n.
