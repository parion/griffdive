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
- **E2E (Playwright, `e2e/*.spec.ts` via `@playwright/test`):** `playwright.config.ts` boots the
  production build (`pnpm build` + Nitro server, port 3173, WebSocket included). Specs: solo dive
  flow (spin → pacts → report → rewards → advance), two-browser room sync (late joiner, host
  authority, pact lock-in; a squad that all leaves finds its room waiting and RESUME reseats
  everyone; the squad never waits on a diver who left), Codex slide-over (opens over the dive without dropping the session),
  accessibility foundation (`a11y.spec.ts`: skip link, dialog focus trap/Escape/focus restore,
  non-dismissible name gate, star-rating keyboard navigation), phone host moderation
  (`phone.spec.ts`: the 390px squad bar opens the moderation bottom sheet), phone reward draft
  (`phone-rewards.spec.ts`: a non-host phone diver banks their own pick), phone layout
  (`phone-layout.spec.ts`: no sideways overflow at 360px with a multi-front live Major Order, the live
  spin CTA, touch-scrubbing the report time bar), the phone action bar
  (`phone-action-bar.spec.ts`: the bar is pinned to the bottom edge with a live primary action on every
  screen from lobby to honors, plus confirm-failure and the surrender bar), tablet layout (`tablet-layout.spec.ts`: at
  1024×768 every phase fits the centre column without the page scrolling vertically, and the drawn
   directive's Lock it in is in view; at
  768×1024 the phone shell widens to the tablet), the join briefing (`join-briefing.spec.ts`: a
  named host skips every gate and gets the tutorial, a squadmate reads the one-page briefing — callsign
  focused on load, Enter files it and opens the squad card, issued kit, Codex drawer, the dial's
  scroll-in sweep — lands with no tutorial or Warbonds panel, and replays it as the
  Field manual; the spec uses one room because creation is rate-limited per IP), personal session saves
  (`session-saves.spec.ts`: a seated diver forks the live room into a new session, a solo save hosts
  an online session from the home record), the Field Promotion gate (`field-promotion.spec.ts`: a
  forked session seeded through `POST /api/rooms` — a forked-out diver reclaims their own kit, a
  new joiner claims a fallen diver's kit, the next takes promotion picks). Room creation is
  rate-limited per address (10/min) and the whole suite shares one address — prefer reusing a
  room inside a spec over creating another, PWA affordances
  (manifest content type + icons served, SW reachable, shell head links). Chromium only;
  `pnpm exec playwright install chromium` after a fresh clone.
