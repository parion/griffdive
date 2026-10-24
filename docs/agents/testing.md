# Testing strategy

> Part of the Griffdive docs set. Index: [`AGENTS.md`](../AGENTS.md).

- **Engine unit tests** (Vitest, colocated `*.spec.ts`): reducer transitions, reward math at every
  score boundary (0, 2, 4, 6, 9), pact validity vs each misfortune, failed pacts and directives,
  reroll rules, forfeit paths,
  mid-crusade catch-up (promotion sizing/rolls, the frozen offer, cache claims and gating,
  departure parking, seating window). Catch-up spans sessions, so `room.spec.ts` also runs the
  whole join → claim → fork → join → claim lifecycle and checks **invariants after every step**
  (kits are sets; caches are non-empty earned gear) — single-step tests with toy caches once
  hid caches that stacked the starting kit.
- **Golden tests:** seeded runs (`mulberry32`) recorded as JSON snapshots — spin results, reward
  option sets, full crusade replays. Goldens live in `shared/engine/__goldens__/`; regenerate with
  `GRIFFDIVE_UPDATE_GOLDENS=1 pnpm test`. From alpha on, a reducer change that breaks goldens must
  bump the engine version + write a save migration (see Save model), or revert; during pre-alpha
  they were simply regenerated.
- **Server tests** (Vitest, fake KV + fake peers in `server/utils/room-sync.spec.ts`): room
  join/spin/pick flows, host authority + coercion, host migration, reattachment, room-full,
  TTL pruning, metrics gauges/counters (`metrics.spec.ts`). (`@nuxt/test-utils` +
  Playwright browser flows land in Phase 3+.)
- **Client util tests** (Vitest, `app/utils/*.spec.ts`): the brand mark ↔ `icon.svg` invariant
  (`brandMark.spec.ts`) and the changelog's release boundaries, deployment phases (waiting vs
  deploying vs live) and conventional-commit grouping (`changelog.spec.ts`).
- **E2E (Playwright, `e2e/*.spec.ts` via `@playwright/test`):** `playwright.config.ts` boots the
  production build (`pnpm build` + Nitro server, port 3173, WebSocket included). Specs: solo dive
  flow (spin → pacts → report → rewards → advance), two-browser room sync (late joiner, host
  authority, pact lock-in; a squad that all leaves finds its room waiting and RESUME reseats
  everyone; the squad never waits on a diver who left), Codex slide-over (opens over the dive without dropping the session),
  accessibility foundation (`a11y.spec.ts`: skip link, dialog focus trap/Escape/focus restore,
  star-rating keyboard navigation), phone host moderation
  (`phone.spec.ts`: a squadmate's hangar bay opens host actions; after launch the 390px Squad button
  opens the squad dialog with inline host actions), phone reward draft
  (`phone-rewards.spec.ts`: a non-host phone diver banks their own pick), phone layout
  (`phone-layout.spec.ts`: no sideways overflow at 360px with a multi-front live Major Order, the
  hangar's four bays in one row with the live order as the default plan and the launch in reach, the
  live spin CTA, tapping the report's larger time cells), the phone action bar
  (`phone-action-bar.spec.ts`: the bar is pinned to the bottom edge with a live primary action on every
  dive screen from the wheel to loot (the standalone hangar pins its own launch CTA), plus confirm-failure and the surrender bar), tablet layout (`tablet-layout.spec.ts`: at
  1024×768 every phase fits the centre stage without the page scrolling vertically, and the drawn
   directive's Take it is in view; at
  768×1024 the phone shell widens to the tablet), the join briefing (`join-briefing.spec.ts`: a
  named host skips every gate and gets the tutorial, a squadmate reads the one-page briefing — callsign
  focused on load, Enter files it and opens the squad card, issued kit, Codex drawer, the dial's
  scroll-in sweep — lands with no tutorial or Warbonds panel, and replays it as the
  Field manual; the spec uses one room because creation is rate-limited per IP), the SEAF launch
  reveal (`kit-reveal.spec.ts`: the setup kit's "?" boxes, a solo and an online launch dealing the
  pack before the wheel, a late joiner's own deal, no replay on reload), personal session saves
  (`session-saves.spec.ts`: a seated diver forks the live room into a new session, a solo save hosts
  an online session from the home record), the Field Promotion gate (`field-promotion.spec.ts`: a
  forked session seeded through `POST /api/rooms` — a forked-out diver reclaims their own kit, a
  new joiner claims a fallen diver's kit, the next takes promotion picks). Room creation is
  rate-limited per address (10/min in production) and the whole suite shares one address, as are WebSocket joins (20/min), so the e2e server runs with `ROOM_CREATE_LIMIT=200` and
  `ROOM_JOIN_LIMIT=400` (`playwright.config.ts`) — a capped join looks like a page stuck on
  "Loading dive…", since the client doesn't surface `rate-limited` — still prefer reusing a
  room inside a spec over creating another. The e2e server also sets `GRIFFDIVE_DISABLE_MO_API=1`:
  a live order would become the default front plan and drop the strain call, so specs that need an
  order mock `/api/war/major-order` per page, PWA affordances
  (manifest content type + icons served, SW reachable, shell head links). Chromium only;
  `pnpm exec playwright install chromium` after a fresh clone.
