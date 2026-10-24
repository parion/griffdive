# Architecture

> Part of the Griffdive docs set. Index: [`AGENTS.md`](../AGENTS.md).

Nuxt 4 full-stack app in SPA mode (`ssr: false` — no server rendering; the app is
localStorage/WS-driven with no SEO surface): Vue 3 frontend, Nitro server (REST + WebSocket),
and a pure TypeScript game engine compiled against both sides via `shared/`. Nitro serves the
app shell (`app/spa-loading-template.html` shows until Vue mounts) plus deep-link fallback for
all routes; static hosts need a `/*` → shell fallback instead.

### Directory map

```
app/
  pages/           index (Bridge home — new crusade / host / join / continue), dive/[id] (solo +
                   room flow — thin orchestrator: session driver + action handlers; the
                   lit-stage shell and per-phase UI live in components/dive/), codex,
                   kit (hidden, unlinked foundations route — see Destroyer Terminal design language)
  components/      dive/ (DiveFrame — the lit-pass shell: header · one scrolling stage ·
                   squad dock, no rails or climb strip, DiveTopBar — identity, PhaseTabs,
                   link lamp/session menu, PhaseTabs — Call/Pacts/Dive/Loot (desktop only),
                   SquadDock — seats, presence, honors tokens, Steam/invite, DiveMenu —
                   Bridge, tutorial, pin/unpin, new session, leave/end,
                   DivePhaseLobby — the standalone Hellpod Bays setup page (no shell),
                   DivePhaseWheel/DivePhaseDiving/DivePhaseRewards/
                   DivePhaseForfeit/DivePhaseComplete — one panel per engine phase, each
                   owning its local form state and emitting intents,
                   WheelOfMisfortune — the seeded spinning SVG wheel,
                   ConditionCard/ConditionSigil — directive and pact cards,
                   ValorRoll — the shared d100 odds line (zones, deltas, roll pins),
                   PactScreen — the self-service pacts hand,
                   KitSnapshot — the compact kit strip for non-hosts in the field,
                   MissionReport + SampleCanister + HonorsReel — stars, haul, time cells, honors reel,
                   RewardDraft + SquadDraftBoard + DiversChoicePicker + LibertyCrossBand/
                   LibertyCrossEmblem — one rolled card per option, the squad's picks,
                   the Cross picker and its crest,
                   OperationCleared — the climb screen after the last mission,
                   CrusadeLadder — the vertical 3→10 ladder (achieved screen),
                   FieldPromotionGate — the mid-crusade catch-up gate,
                   ForfeitPicker — one diver's dealt forfeit offer,
                   CrusadeSetup + FrontPlanPicker + StartingKit + SetupRisk — the shared
                   crusade setup (front plan, start difficulty, mode, issued kit, skull
                   total via setupRiskOf) used by the Bridge
                   dialog and the lobby,
                   DiveSidebar — the persistent tool rail on every dive shell (Kit, Codex,
                   Warbonds, Brasch's Bargains share one non-modal panel), hosting KitPanel
                   (the lean Kit), CodexBrowser, WarbondBrowser and BraschBargains
                   (the per-mission shop),
                   AchievedOverlay — the full-bleed Griffdive achieved takeover,
                   HostBriefing — the host's tutorial (fork of JoinBriefing),
                   JoinBriefing — the joiner's one-page briefing, also replayed as the
                   squadmate's Field manual
                   DivePhone + DivePhoneShell/PhoneTopBar/PhoneWheel/PhonePacts/
                   PhoneDiving/PhoneRewardDraft/PhoneActionBar — the fixed phone shell,
                   its per-phase layouts and the pinned bottom action bar (the frame lives in
                   DivePhoneShell; every phase fills its info / secondary / primary zones
                   through PhoneActionBar's deferred Teleports; the Squad sheet lives in
                   DivePhone), CrusadeSetup, WarbondPicker),
                   ui/ (BrandMark — the Griffdive mark, a griffin diving through the Wheel's
                   rim, rendered from utils/brandMark.ts; ItemCard, TierBadge, RiskPips — risk
                   dots, with a rolling back-and-forth state while a wheel draw reels,
                   SampleCanister — the report's tinted sample tubes (press and drag sets
                   the value; the tube's liquid level is the indicator and its editable
                   number the keyboard path), the report's time cells — tap targets that
                   set the extraction percentage, HoldButton — the press-and-hold confirm,
                   ChangelogModal — GitHub release log shown from the alpha header chip: one phase
                   card per deployment (on main / awaiting approval / deploying / live) with its
                   commits grouped by conventional type (utils/changelog.ts shapes it), AppDrawer —
                   the themed right-hand Reka
                    Drawer shell (keeps the dive session mounted), CodexDrawer/WarbondDrawer —
                    its two slide-overs, IconBook/IconWarbond — the nav leading icons,
                   AppDialog/AppTabs/AppTooltip —
                   the themed Reka primitives every modal, tab strip and icon-only control builds
                   on),
  composables/     useDiveSession (unified local/room driver), useDiveView (session-derived
                   shell state: self/phase/canControl/name draft), useDiveEngine (local reducer +
                   persist),                    useGameSocket (WS, reconnect, stored playerId,
                   per-person session mirror), useSaves, useSessionSaves (personal session
                   mirrors: list/mirror/delete/export),
                   useDrawers (the one open sidebar panel; `codexOpen`/`warbondsOpen` are
                   flags over it, so the dive can open Warbonds without unmounting — the
                   global drawers in `app.vue` only render where no sidebar is mounted), useWarbondIntro (one-shot
                   dive-start Warbonds prompt memory), useDiveIntro (one-shot dive-start
                   "How a dive works" primer memory), useOwnedWarbonds (localStorage-backed
                   warbond declaration shared by the Warbonds drawer, the home setup and every
                   seated dive),
                   useRecentRooms (visited room codes; feeds the home "Continue" online list),
                   useMajorOrder (live war proxy → the setup's Major Order plan; null offline),
                   useFrontPlan (the launcher's front plan; defaults to a live order),
                   useChangelog (GitHub release deployments + commits → phase-carded changelog
                   entries via utils/changelog.ts, 10-min cache),
                   usePhoneShell (the 1020px breakpoint as JS, so the dive can swap the whole
                   desktop tree for the phone shell)
  stores/          session.ts (Pinia: selfId, snapshot, online)
  utils/           seed.ts (client seed generation), kit.ts (Kit categories + owned-item list),
                   valor.ts (Valor source split + colours shared by the rail tab and meter),
                   brandMark.ts (the logo's only geometry — BrandMark.vue and icon.svg both
                   derive from it), changelog.ts (pure GitHub deployment/commit → release-card
                   shaping behind useChangelog, unit-tested)
  assets/css/      main.css — global HD2 theme (two-font system, see Conventions)
server/
  routes/ws.ts     defineWebSocketHandler — single endpoint, ?room={code}
  utils/           room-sync.ts (hello/action/close core; KV + peers injected; TTL sweep +
                   room-cap backstop), room-storage.ts (useStorage('rooms') adapter),
                   peers.ts (process-wide peer directory shared by the WS route and metrics),
                   rate-limit.ts (in-memory sliding-window limiter for joins/actions),
                   metrics.ts (Prometheus registry: presence gauges + dive counter),
                   major-order.ts (live war API → MajorOrderSelection; pure normalizer +
                   best-effort fetch)
  plugins/         metrics.ts (binds the gauges, serves /metrics on internal :9091),
                   room-sweeper.ts (reaps idle rooms every 15 min)
  api/             rooms/index.post.ts (create; an optional save body seeds a new session), rooms/[code].get.ts (snapshot),
                   war/major-order.get.ts (cached live MO proxy)
shared/
  engine/          config.ts, types.ts, reducer.ts, rng.ts, wheel.ts, pacts.ts,
                   rewards.ts, progression.ts, selectors.ts, saves.ts, room.ts
  types/           save.ts (SaveDoc + SessionSave + SAVE_SCHEMA_VERSION), messages.ts (WS contracts,
                   host-only action list)
  utils/           room-code.ts (room-code alphabet + validator)
  data/            items (equipment.ts, stratagems.ts), warbonds.ts, fronts.ts,
                   conditions.ts (the unified team + personal condition catalogue;
                   misfortunes.ts / pacts.ts are its scope views), strains.ts,
                   catalog.ts (aggregation + CATALOG_VERSION),
                   ordering.ts (kit presentation order: stratagem role → tier → name),
                   images.ts (imageURL filename → /images/<dir> URL resolver,
                   difficultyImageUrl for the 1–10 difficulty emblems)
 scripts/
   import-catalog.mjs  upstream → shared/data converter (report-only mode: --report)
   upstream/           vendored MIT constants (snapshot commit recorded in _upstream-commit.json)
 public/images/        bundled item art keyed by folder: equipment/ (weapons, throwables,
                      boosters), armorpassives/, svgs/ (stratagems), warbonds/,
                      difficulty/ (1–10 difficulty emblems), faction/ (front emblems)
public/               PWA surface, all generated by `pnpm pwa:assets`: icon.svg (written from
                      app/utils/brandMark.ts by scripts/build-icon.mjs; never hand-edit) +
                      pwa-*.png / maskable-icon-512x512.png / apple-touch-icon-180x180.png /
                      favicon.ico (config in pwa-assets.config.ts). brandMark.spec.ts fails
                      if icon.svg drifts from the geometry
e2e/                  Playwright specs (solo flow, room sync, Codex slide-over,
                      PWA affordances)
playwright.config.ts  production-build webServer on :3173 (WebSocket included)
pwa-assets.config.ts  @vite-pwa/assets-generator presets for the brand icon set
vitest.config.ts     mirrors Nuxt aliases (~~, ~) so engine + server tests resolve
```

### Sync protocol (Phase 2)

Host-authoritative, room-per-dive. Nitro WebSocket via `nitro.experimental.websocket` in
`nuxt.config.ts`; single endpoint `/ws?room={code}`.
Room state lives in `useStorage('rooms')` — Nitro `fs-lite` writing to `./.data/rooms` (the
`griffdive_data` Fly volume in production), a fake in-memory KV in tests — as
`StoredRoom { code, state, updatedAt, saved? }`, pruned on access after an idle TTL — 12h for an
unlaunched lobby (`ROOM_TTL_MS`), 30 days once the crusade has launched (`CRUSADE_TTL_MS`), never
while `saved` pins it (see Saved dives). Stored states are normalized on read: rooms carry no
schema version, so `loadRoom` applies the idempotent subset of the save migrations
(`normalizeRoomState` in `shared/engine/saves.ts` — pre-v13 variant ids, fields added after the
room was written) before serving or reducing it, since rooms survive deploys on the Fly volume.
Storage is read-modify-write, so `room-sync.ts` serializes every
mutation of a room behind an in-process per-room lock (`withRoomLock`): the process is
single-threaded but `await` interleaves handlers, and without the lock a joiner's `SET_WARBONDS`
and the host's `START_DIVE` clobber each other (the memory driver hid this by sharing one object).
Multi-machine needs a distributed lock alongside the storage swap. Live connections live
in an in-process peer directory (crossws pub/sub topics are global to the process — deliberately
unused); horizontal scale later means a Redis-backed directory or sticky sessions.

| Direction | Message | Payload |
| --- | --- | --- |
| C→S | `hello` | `{ name?, playerId?, knownIds?, warbondCodes? }` — stored playerId reattaches (reconnect); `warbondCodes` are the warbonds the browser declared, so a joiner's SEAF pack rolls against them at seating; `knownIds` (seats held in other rooms) let a forked-out diver reclaim their cache (see Personal session saves) |
| C→S | `action` | `{ action: EngineAction }` (validated server-side) |
| C→S | `save-dive` | `{ name? }` — any seated diver pins the room past the idle TTL (see Saved dives) |
| C→S | `unsave-dive` | host-only: returns the room to the ordinary idle TTL |
| C→S | `set-steam` | `{ link }` — host-only: relays a `steam://joinlobby/…` link to the room; blank clears it (see Steam lobby codes) |
| C→S | `ping` | heartbeat — answered with `pong` |
| S→C | `welcome` | `{ selfId, hostId, roomCode, snapshot, online, saved, steam }` |
| S→C | `state` | `{ snapshot, applied (EngineAction \| null), online, saved, steam }` — after each applied change; also an `applied: null` presence refresh the moment a seated diver's last connection drops; `online` = diver ids with live connections |
| S→C | `error` | `{ code, message }` — `room-not-found`, `room-full`, `dive-locked`, `not-host`, `not-in-room`, `bad-action`, `bad-room`, `bad-message`, `rate-limited` |

REST fallbacks: `POST /api/rooms` → `{ code, selfId }` (an optional `{ save, name }` body seeds the
room from a personal session save; `selfId` is the seeded owner seat, `null` for a fresh lobby); `GET /api/rooms/:code` → `{ code, state }` (404).
Self-service actions (`SET_PACTS`, `SET_WARBONDS`, `PICK_REWARD`, `FORFEIT_ITEM`, `BUY_ITEM`,
`SET_NAME`) are
coerced to the sender — a client can never act as another diver.

**Transport hardening:** the server whitelists `action.type` against the reducer union and guards
`reduce`, so an unknown or malformed action is rejected (`bad-action`) instead of persisting
`undefined` state; the reducer defaults unknown actions to a no-op and the WS handler catches
anything else, so one bad message never stops the process-wide server. Joins are rate-limited per
client address (20/min → `rate-limited`, `ROOM_JOIN_LIMIT` overrides it for the e2e server; keyed on `Fly-Client-IP`, then `X-Forwarded-For`, then the
socket — behind Fly's proxy the socket address is the proxy's), actions per diver (120/10s, silently dropped), and room creation
per address (10/min → 429; `ROOM_CREATE_LIMIT` overrides it, which only the e2e server does) with a `MAX_ROOMS` cap (503). `server/plugins/room-sweeper.ts` reaps idle
rooms every 15 min so the `MAX_ROOMS` backstop rarely matters.

Canonical engine actions (the reducer union; keep names stable):

`START_DIVE{settings,seed?,majorOrder?}` `SPIN_WHEEL{seed}` `ACCEPT_MISFORTUNE{accepted}` `ACCEPT_STRAIN{accepted}`
`DEAL_PACTS{}` `REROLL_WHEEL{wheel,seed}` `SET_PACTS{playerId,pactIds}` `FAIL_PACT{playerId,pactId}` `FAIL_MISFORTUNE{}` `SET_WARBONDS{playerId,warbondCodes}`
`REPORT_RESULT{outcome,stars,timePct?,samples?}` `FORFEIT_ITEM{playerId,itemId}` `PICK_REWARD{playerId,optionId,choiceItemId?}`
`BUY_ITEM{playerId,itemId}`
`REROLL_REWARDS{playerId,seed}` `BAN_REWARDS{playerId,optionIds}` `SPIN_BONUS{seed}`
`AWARD_BONUS{playerIds}` `CLAIM_CATCHUP_OPTION{playerId,optionId}` `CLAIM_CACHE{playerId,cacheOwnerId}`
`LEAVE_DIVE{playerId}` `SET_AWAY{playerId,away}` `ADVANCE{}` `END_DIVE{}` `KICK_DIVER{playerId}`
`SET_NAME{playerId,name}` `TRANSFER_HOST{playerId}`

Authority rules: host-only actions are `START_DIVE`, `SPIN_WHEEL`, `ACCEPT_MISFORTUNE`,
`ACCEPT_STRAIN`, `DEAL_PACTS`, `REROLL_WHEEL`, `REPORT_RESULT`, `FAIL_MISFORTUNE`, `SPIN_BONUS`, `AWARD_BONUS`, `ADVANCE`, `END_DIVE`,
`KICK_DIVER`, `TRANSFER_HOST`. `SET_PACTS`, `SET_WARBONDS`, `PICK_REWARD`, `FORFEIT_ITEM`, `BUY_ITEM`, `SET_NAME`,
`REROLL_REWARDS`, `BAN_REWARDS`, `CLAIM_CATCHUP_OPTION`, `CLAIM_CACHE`, `LEAVE_DIVE`, `SET_AWAY` are
self-service. Saved dives are outside the engine union: `save-dive` may be sent by any seated
diver, `unsave-dive` is host-only; the Steam lobby link is likewise outside the union and
host-only (`set-steam`, blank clears).
`FAIL_PACT` is sent by the target diver or the host (server refuses everyone else); `FAIL_MISFORTUNE`
is host-only, since the directive binds the whole squad. Host disconnect →
`TRANSFER_HOST` to the earliest joiner still connected; none left → room hibernates in storage
with a TTL, and the first diver back takes the host role. A diver whose last connection stays down
for `AWAY_GRACE_MS` is marked away (`SET_AWAY`, issued by the server; also re-checked on every
`hello` so divers dropped across a server restart are caught) — see Mid-crusade joining.
Reconnect = re-`hello` with stored playerId → server replays snapshot.
`KICK_DIVER` (host, any phase, lobby included) removes a diver who left or is blocking the
squad: their pending pact lock or reward pick stops gating progress, their personal inventory
leaves with them, and the host can never be kicked. It is a soft kick — the removed client
shows a removal notice, but their invite link still seats them again as a fresh diver.

### First visit — host gate vs. join briefing

A browser with no stored seat in a room is held before its first `hello` (`awaitingJoin` in
`useGameSocket`) when it has no saved name **or** has never read the join briefing
(`griffdive:join-briefing:v1`, `useJoinBriefing`). While held, the dive page reads the room once
through `GET /api/rooms/:code` to tell the two first visits apart — the same test `joinDiver` uses
to crown a host:

- **Empty room** → the host's own fresh dive. The host connects straight away with no intermediate
  gate; the founding diver's first seat opens the host tutorial
  (`HostBriefing`, a full page).
- **Room with a squad** → a join by link. `JoinBriefing` renders as a full page from the pre-join
  snapshot (re-read every 10s so its roster stays live; `seatingBlocked` disables the join and says
  why). Confirming stores the name, marks the briefing and the one-shot Warbonds prompt seen, and
  opens the socket. Squadmates never get the host tutorial unasked — not even when hostship later
  migrates to them — and their Tutorial control opens the briefing as the **Field manual** dialog.

A browser that read the briefing and has a name joins the next invite with no gate at all.

### Matchmaking — none (deliberate)

Griffdive has **no open-dive lobby and no public matchmaking**. It is built for an already-engaged
squad (voice over Discord, friends), so rooms are joined only by invite link or room code — the
`/lobby` page, `openToLobby` flag, `TOGGLE_OPEN` action, `LobbyEntry`, `lobby` broadcast and
`GET /api/lobby` were all removed. The `lobby` **phase** is unrelated: it is simply a room that has
been created but has not yet launched its crusade (`createLobbyState`), and it remains.

### Saved dives

A **saved dive** is a server-side pin on the shared room record — `StoredRoom.saved`
(`DiveSaveInfo { name, savedAt, savedBy }` in `shared/types/messages.ts`). It is a hybrid of the
local-save and live-room models: the local recent-rooms index is the cache, the pinned room is the
durable copy. It is **not** per-diver state and never enters `DiveState`, the save schema or the
reducer.

- **Any seated diver saves, only the host removes** (`save-dive` / `unsave-dive` client messages,
  handled in `server/utils/room-sync.ts`, not the engine union). Saving pins the one authoritative
  room; unsaving returns it to the ordinary idle TTL.
- **TTL exemption.** `loadRoom` and `sweepRooms` skip the `ROOM_TTL_MS` prune while `saved` is set,
  so a squad can pause for as long as it likes. The pinned set is capped at `MAX_SAVED_DIVES`
  (500): saving past the cap unpins the oldest other save, which then ages out normally. The cap —
  not the save itself — bounds storage cost (a save is just the room's JSON, ~tens of KB).
- **Resume is the existing rejoin path.** Reopen `/dive/:code` (the code/link is the anchor, so a
  cleared `localStorage` loses only the convenience list, not the dive). Known `playerId`s
  reattach; a fresh or identity-less joiner seats as a mid-crusade joiner and chooses between a
  parked **legacy cache** and their **Field Promotion** at the Field Promotion gate (see Mid-crusade joining) — "pick up
  previous equipment or roll".
- **Durability is the storage driver's.** Saved dives live in the same `useStorage('rooms')`
  namespace, which Nitro's `fs-lite` driver writes to `./.data/rooms` (`nuxt.config.ts`) — the
  `griffdive_data` Fly volume in production — so saves and live rooms survive deploys. Tests use a
  fake in-memory KV. The same single-machine constraint as live rooms applies (see Deployment);
  Redis remains the swap for horizontal scale.

### Personal session saves

A crusade can take hours, and the exact same friend group will rarely all be back online at once —
so saves must be per person, per session, not just per room. Every seated diver's browser keeps a
personal **session save**: a `SaveDoc` mirror of the room plus `roomCode` and `ownerId` (`SessionSave`
in `shared/types/save.ts`), written to `localStorage` (`griffdive:sessions:v1`) on each synced
snapshot by `useSessionSaves`/`useGameSocket` (debounced, capped at the 20 most recent; the last
*seated* snapshot is flushed the moment the seat disappears — a kick — and on unmount). It is
convenience state, never engine state — the room stays authoritative, and the mirror outlives the
server record. **Leaving never loses the crusade:** Leave marks the diver away (`SET_AWAY`) — their
seat, kit, purse and tokens stay in the room, the squad stops waiting on them, and RESUME on the
Bridge puts them back exactly where they were. A room is never reset (see Mid-crusade joining), so
RESUME is the way back to the same squad's room and **HOST** on a session save is the way to carry
the crusade on with someone else.

Any save — a session mirror or a local solo `SaveDoc` — can seed a **new session**: `POST /api/rooms`
accepts an optional `{ save, name }` body, runs `normalizeSaveDoc` (so save migrations apply), then
the pure `forkCrusade(state, ownerId, name)` in `shared/engine/room.ts`. The rules:

- **The continuing diver keeps their seat as host**, exactly where the crusade stopped — same
  difficulty, mission, front/strain, wheel, rerolls, Major Order and personal inventory. The purse
  and reward tokens belong to the session they were earned in, so the new session starts them at
  zero. The client
  pre-stores the returned `selfId` as the new room's seat before navigating, so the first `hello`
  reattaches that seat.
- **Every other diver leaves the squad and their earned gear parks as an ordinary legacy cache**
  (a diver who earned nothing parks nothing) — a new joiner claims a fallen diver's kit instead of
  their Field Promotion (or joins at the start difficulty with the variant's kit). **Only the latest
  session's departures park:** caches the save inherited from an earlier session are dropped, so
  forks never pile up stale kits.
- **Returning divers are recognized by the seats their browser remembers.** Caches keep the
  departed diver's id from the source room. A browser with no seat stored for the new room sends
  every `griffdive:player:*` id it holds as `hello.knownIds` (≤20); the server reuses the first one
  that matches a cache key, so `joinDiver` reclaims that diver's own kit. A cleared browser, or one
  whose kit was already claimed, simply joins fresh. No accounts or lineage tracking are involved.
- **A fork is a copy, never a move**: the original room, its pin and its invite link are untouched.
  New joiners seat through the existing mid-crusade path (see Mid-crusade joining).
- **Refusals and sanitizing**: a complete crusade is refused; an unstarted lobby continues as a fresh
  lobby; a malformed snapshot (no wheel where a decision needs one, no front past the spin, bad
  settings) is refused; the client-supplied seed is sanitized (divers defaulted, difficulty and array
  bounds clamped) before storage.
- **No forfeit deadlock**: a forked host stranded at `forfeit` with nothing to choose — nothing
  earned beyond the starting kit (or a mid-mission seating), the missing kits parked as caches the offer never draws from —
  resolves the failure (one item stripped from a cache when one exists) and restarts the operation.
  A host who had already chosen has that item removed instead.

Entry points: the Bridge Service record (**HOST** on any save, **NEW SESSION** on a live card that has
a mirror) and the dive header's **New session** control for any seated diver (room mode, never in
lobby/complete), with a confirm dialog. The server-side pin (Saved dives) still exists and remains
the resume-the-same-room anchor; session saves are what make the crusade portable between squads.

### Steam lobby codes

Helldivers squads in Discord organise around in-game **Steam lobbies**: the host opens a lobby and
shares a `steam://joinlobby/553850/<lobbyId>[/<steamId>]` deep link so everyone jumps straight in.
Griffdive relays that link — the host pastes it, every seated diver clicks it — as
**host-owned room metadata**, exactly like a saved dive: `StoredRoom.steam`
(`SteamLobbyInfo { link, setAt, setBy }` in `shared/types/messages.ts`). It never enters
`DiveState`, the save schema or the reducer, so a cosmetic URL never touches the pure engine.

- **Only the host sets it** (`set-steam` client message, handled in `server/utils/room-sync.ts`,
  outside the engine union); a blank link clears it. Any seated diver can click it.
- **Validation is shared and pure:** `normalizeSteamLobbyLink` in `shared/utils/steam-lobby.ts`
  scans the pasted text for the Helldivers 2 pattern (app id `553850`) and returns the normalized
  link or `null`, so surrounding chat paste never fails and another game's link never lands. The
  server re-validates; a non-link is refused (`bad-action`) before it reaches storage.
- **Presentation:** `SteamLobbyBox` sits under the squad strip in the dive's left rail (room mode
  only) — a Steam-blue join card that opens the deep link (the OS asks before launching Steam),
  plus copy/change/clear. The `IconSteam` mark comes from Simple Icons (CC0).
- **Undecorated by the engine:** no TTL weight, no reroll economy, no game-rule bearing. It rides
  `welcome`/`state` snapshots like `saved`.
