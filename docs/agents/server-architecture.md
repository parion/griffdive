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
                   three-rail shell and per-phase UI live in components/dive/), codex,
                   kit (hidden, unlinked foundations route — see Destroyer Terminal design language)
  components/      dive/ (DiveFrame — the no-scroll terminal shell (header · climb strip ·
                   Squad/wheel-pool rail · phase · Valor rail · Mission-phases bar), DiveTopBar —
                   the dive header (crusade · difficulty emblem · room code/copy · nav),
                   CrusadeStrip — the horizontal 3→10 climb, PhaseRail — the bottom six mission
                   beats (a readout, not a control), PhaseCue — the "whose move" lead
                   (squad rail on desktop, a band on phones), WheelOfMisfortune — the seeded spinning SVG wheel,
                   BriefingOverlay — the first-run Griffdiver dossier, ArmoryDrawer — the Kit
                   drawer (phone shell only), KitPanel — the lean Kit (diver
                   names, owned items by category, ban washes), KitValorRail — the desktop
                   right rail's Kit/Valor tabs with their status bars, CrusadeLadder —
                   the vertical 3→10 ladder (achieved screen), SquadStrip — diver rail, presence,
                   name, host moderation,
                   DivePhaseLobby/DivePhaseWheel/DivePhaseDiving/DivePhaseRewards/
                   DivePhaseForfeit/DivePhaseComplete — one panel per engine phase, each
                   owning its local form state and emitting intents,
                   PactScreen — the dedicated pacts screen (team-risk summary bar,
                   hold-to-lock CTA), MissionReport +
                   SampleCanister/SegmentedBar — the dedicated two-column mission
                   report, ForfeitPicker — the per-diver surrender picker,
                   AchievedOverlay — the full-bleed Griffdive achieved takeover,
                   DivePhone + DivePhoneShell/PhoneTopBar/PhoneCrusadeBar/PhoneSquadBar/
                   PhoneWheel/PhonePacts/PhoneValor/PhoneReport/PhoneDiving/
                   PhoneRewardDraft/PhoneActionBar — the fixed phone shell, its per-phase
                   layouts and the pinned bottom action bar (Valor detail + the phase's
                   forward action),
                   WheelPanel, MajorOrderPicker — the pre-spin MO chooser, rendered in
                   the faction card's pre-roll slot,
                   MajorOrderCard — the in-game-style MO panel (emblem, countdown,
                   order overview, planet liberation bars),
                   PactPicker, RewardDraft — the reward draft (a stars→options
                   badge, the per-step CeilingTrack with a sliding marker, a
                   pod-drop cabinet of RewardPod reveal cards stamped Banked/Banned,
                   and the always-on reward-token bar whose post-pick CTA opens the settlement),
                   RewardsSettlement — the post-draft screen: the Squad Honors
                   contest above the Requisition shelf when honors is due, or the
                   shelf above a disabled honors panel when it isn't; desktop and
                   phone share it,
                   RequisitionStock — the post-draft rotating shelf (per-diver
                   seeded items with tier×type prices, the sample purse and
                   buy controls; titled **Brasch's Bargains**),
                   MissionReportSummary — the left-rail report card,
                   ValorMeter — the live Valor gauge
                   and tier-ceiling ladder, BonusCeremony — the dedicated
                   end-of-mission honors screen (iconographic seeded reel,
                   hold-to-confirm award) that banks a reward token,
                   FieldPromotionCard — the mid-crusade
                   catch-up ceremony, DiversChoiceCard — the special
                   S+ "Liberty's Cross" offer card, DiversChoicePicker — its minified codex
                   modal, CrusadeSetup, WarbondPicker,
                   JoinNameGate — name gate held while joining),
                   codex/CodexBrowser — the shared catalog browser (filter + tier grid),
                   warbonds/WarbondBrowser — the shared warbond owner list (single column,
                   acquisition specials last; each banner starts blurred and dimmed, then
                   resolves on hover/focus/tap, click toggles),
                   ui/ (BrandMark — the Griffdive chevron mark, ItemCard, TierBadge, RiskPips — risk
                   dots, with a rolling back-and-forth state while a wheel draw reels,
                   SampleCanister/SegmentedBar — the report's tinted sample tubes and
                   click-to-set time bar (both scrub: press and drag sets the value; the
                   tube's liquid level is the indicator and its editable number the keyboard
                   path), HoldButton — the press-and-hold confirm,
                   ChangelogModal — GitHub deploy log shown from the alpha header chip, AppDrawer —
                   the themed right-hand Reka
                    Drawer shell (keeps the dive session mounted), CodexDrawer/WarbondDrawer —
                    its two slide-overs, IconBook/IconWarbond — the nav leading icons,
                   AppDialog/AppTabs/AppTooltip —
                   the themed Reka primitives every modal, tab strip and icon-only control builds
                   on),
  composables/     useDiveSession (unified local/room driver), useDiveView (session-derived
                   shell state: self/phase/canControl/name draft), useDiveEngine (local reducer +
                   persist),                    useGameSocket (WS, reconnect, stored playerId), useSaves,
                   useDrawers (global Codex/Warbonds slide-over visibility, so the dive can
                   open the Warbonds panel without unmounting), useWarbondIntro (one-shot
                   dive-start Warbonds prompt memory), useDiveIntro (one-shot dive-start
                   "How a dive works" primer memory), useOwnedWarbonds (localStorage-backed
                   warbond declaration shared by the Warbonds drawer, the home setup and every
                   seated dive),
                   useRecentRooms (visited room codes; feeds the home "Continue" online list),
                   useMajorOrder (live war proxy → the picker's suggestion; null offline),
                   useChangelog (GitHub deployments + commits → changelog entries, 10-min cache),
                   usePhoneShell (the 1020px breakpoint as JS, so the dive can swap the whole
                   three-rail tree for the phone shell)
  stores/          session.ts (Pinia: selfId, snapshot, online)
  utils/           seed.ts (client seed generation), kit.ts (Kit categories + owned-item list),
                   valor.ts (Valor source split + colours shared by the rail tab and meter)
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
  api/             rooms/index.post.ts (create), rooms/[code].get.ts (snapshot),
                   war/major-order.get.ts (cached live MO proxy)
shared/
  engine/          config.ts, types.ts, reducer.ts, rng.ts, wheel.ts, pacts.ts,
                   rewards.ts, progression.ts, selectors.ts, saves.ts, room.ts
  types/           save.ts (SaveDoc + SAVE_SCHEMA_VERSION), messages.ts (WS contracts,
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
                      boosters), armor/, armorpassives/, svgs/ (stratagems), warbonds/,
                      difficulty/ (1–10 difficulty emblems), faction/ (front emblems)
public/               PWA surface: icon.svg (brand source) + generated pwa-*.png /
                      maskable-icon-512x512.png / apple-touch-icon-180x180.png.
                      Regenerate with `pnpm pwa:assets` (config in pwa-assets.config.ts)
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
`StoredRoom { code, state, updatedAt, saved? }`, pruned on access after a 12h TTL unless `saved`
pins it (see Saved dives). Storage is read-modify-write, so `room-sync.ts` serializes every
mutation of a room behind an in-process per-room lock (`withRoomLock`): the process is
single-threaded but `await` interleaves handlers, and without the lock a joiner's `SET_WARBONDS`
and the host's `START_DIVE` clobber each other (the memory driver hid this by sharing one object).
Multi-machine needs a distributed lock alongside the storage swap. Live connections live
in an in-process peer directory (crossws pub/sub topics are global to the process — deliberately
unused); horizontal scale later means a Redis-backed directory or sticky sessions.

| Direction | Message | Payload |
| --- | --- | --- |
| C→S | `hello` | `{ name?, playerId? }` — stored playerId reattaches (reconnect) |
| C→S | `action` | `{ action: EngineAction }` (validated server-side) |
| C→S | `save-dive` | `{ name? }` — any seated diver pins the room past the idle TTL (see Saved dives) |
| C→S | `unsave-dive` | host-only: returns the room to the ordinary idle TTL |
| C→S | `set-steam` | `{ link }` — host-only: relays a `steam://joinlobby/…` link to the room; blank clears it (see Steam lobby codes) |
| C→S | `ping` | heartbeat — answered with `pong` |
| S→C | `welcome` | `{ selfId, hostId, roomCode, snapshot, online, saved, steam }` |
| S→C | `state` | `{ snapshot, applied (EngineAction \| null), online, saved, steam }` — after each applied change; also an `applied: null` presence refresh the moment a seated diver's last connection drops; `online` = diver ids with live connections |
| S→C | `error` | `{ code, message }` — `room-not-found`, `room-full`, `dive-locked`, `not-host`, `not-in-room`, `bad-action`, `bad-room`, `bad-message`, `rate-limited` |

REST fallbacks: `POST /api/rooms` → `{ code }`; `GET /api/rooms/:code` → `{ code, state }` (404).
Self-service actions (`SET_PACTS`, `SET_WARBONDS`, `PICK_REWARD`, `BUY_ITEM`,
`SET_NAME`) are
coerced to the sender — a client can never act as another diver.

**Transport hardening:** the server whitelists `action.type` against the reducer union and guards
`reduce`, so an unknown or malformed action is rejected (`bad-action`) instead of persisting
`undefined` state; the reducer defaults unknown actions to a no-op and the WS handler catches
anything else, so one bad message never stops the process-wide server. Joins are rate-limited per
address (20/min → `rate-limited`), actions per diver (120/10s, silently dropped), and room creation
per address (10/min → 429) with a `MAX_ROOMS` cap (503). `server/plugins/room-sweeper.ts` reaps idle
rooms every 15 min so the `MAX_ROOMS` backstop rarely matters.

Canonical engine actions (the reducer union; keep names stable):

`START_DIVE{settings}` `SPIN_WHEEL{seed}` `ACCEPT_MISFORTUNE{accepted}` `ACCEPT_STRAIN{accepted}`
`DEAL_PACTS{}` `SET_MAJOR_ORDER{order}` `REROLL_WHEEL{wheel,seed}` `SET_PACTS{playerId,pactIds}` `FAIL_PACT{playerId,pactId}` `FAIL_MISFORTUNE{}` `SET_WARBONDS{playerId,warbondCodes}`
`REPORT_RESULT{outcome,stars,timePct?}` `FORFEIT_ITEM{itemRef}` `PICK_REWARD{playerId,optionId,choiceItemId?}`
`BUY_ITEM{playerId,itemId}`
`REROLL_REWARDS{playerId,seed}` `BAN_REWARDS{playerId,optionIds}` `SPIN_BONUS{seed}`
`AWARD_BONUS{playerId}` `CLAIM_CATCHUP_OPTION{playerId,optionId}` `CLAIM_CACHE{playerId,cacheOwnerId}`
`LEAVE_DIVE{playerId}` `ADVANCE{}` `END_DIVE{}` `KICK_DIVER{playerId}`
`SET_NAME{playerId,name}` `TRANSFER_HOST{playerId}`

Authority rules: host-only actions are `START_DIVE`, `SPIN_WHEEL`, `ACCEPT_MISFORTUNE`,
`ACCEPT_STRAIN`, `DEAL_PACTS`, `SET_MAJOR_ORDER`, `REROLL_WHEEL`, `REPORT_RESULT`, `FORFEIT_ITEM`, `FAIL_MISFORTUNE`, `SPIN_BONUS`, `AWARD_BONUS`, `ADVANCE`, `END_DIVE`,
`KICK_DIVER`, `TRANSFER_HOST`. `SET_PACTS`, `SET_WARBONDS`, `PICK_REWARD`, `BUY_ITEM`, `SET_NAME`,
`REROLL_REWARDS`, `BAN_REWARDS`, `CLAIM_CATCHUP_OPTION`, `CLAIM_CACHE`, `LEAVE_DIVE` are
self-service. Saved dives are outside the engine union: `save-dive` may be sent by any seated
diver, `unsave-dive` is host-only; the Steam lobby link is likewise outside the union and
host-only (`set-steam`, blank clears).
`FAIL_PACT` is sent by the target diver or the host (server refuses everyone else); `FAIL_MISFORTUNE`
is host-only, since the directive binds the whole squad. Host disconnect →
`TRANSFER_HOST` to the earliest joiner; none left → room hibernates in storage with a TTL.
Reconnect = re-`hello` with stored playerId → server replays snapshot.
`KICK_DIVER` (host, any phase, lobby included) removes a diver who left or is blocking the
squad: their pending pact lock or reward pick stops gating progress, their personal inventory
leaves with them, and the host can never be kicked. It is a soft kick — the removed client
shows a removal notice, but their invite link still seats them again as a fresh diver.

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
  parked **legacy cache** and their **Field Promotion** (see Mid-crusade joining) — "pick up
  previous equipment or roll".
- **Durability is the storage driver's.** Saved dives live in the same `useStorage('rooms')`
  namespace, which Nitro's `fs-lite` driver writes to `./.data/rooms` (`nuxt.config.ts`) — the
  `griffdive_data` Fly volume in production — so saves and live rooms survive deploys. Tests use a
  fake in-memory KV. The same single-machine constraint as live rooms applies (see Deployment);
  Redis remains the swap for horizontal scale.

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
