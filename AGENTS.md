# Griffdive — Project Source of Truth

Griffdive is a squad roguelike companion app for **Helldivers 2**. It wraps the game's missions in a
challenge campaign: squads climb the difficulty ladder with scavenged loadouts, spin a Wheel of
Adversity before every dive, and individually choose pacts — the more risk accepted, the rarer the
loot. The name nods to the Halo fan-favorite Griffball, and to Griffin, who dives.

These documents are the authority for game rules, architecture, and conventions. They are written
for AI coding agents and human contributors. **Any change that alters rules, data shapes, or
architecture must update the relevant [`docs/agents/`](./docs/agents/) file in the same commit.**

> Fan project. Not affiliated with or endorsed by Sony Interactive Entertainment or Arrowhead Game
> Studios. Non-commercial, no ads, no monetization.

## Documentation index

This file is the **index**. Topic detail lives in `docs/agents/*.md`. Load a topic file **on
demand** — read it only when the task touches its area, and never preemptively read all of them.
A loaded file is mandatory instructions that override defaults.

| Topic | File | Load when |
| --- | --- | --- |
| Core loop, directives (misfortunes), strains, Major Orders, pacts, condition scaling, reward math, Brasch's Bargains (credits), tokens/honors, inventory, mid-crusade joining, save model | [`docs/agents/game-rules.md`](./docs/agents/game-rules.md) | changing `shared/engine/**` or `shared/data/**`, rules, reward math, or player-facing copy |
| Design north star, Destroyer Terminal design language, tokens/utilities/motion | [`docs/agents/design-language.md`](./docs/agents/design-language.md) | any component, CSS, motion, or layout work |
| Architecture, directory map, sync protocol, rooms, saved dives, Steam lobby codes, matchmaking | [`docs/agents/server-architecture.md`](./docs/agents/server-architecture.md) | navigating the tree, or server/WebSocket/room work |
| Deployment, hosting, monitoring, CI/CD | [`docs/agents/deployment.md`](./docs/agents/deployment.md) | Fly.io, Docker, metrics, or GitHub Actions |
| Data catalog (items, warbonds, tiers, upstream import) | [`docs/agents/data-catalog.md`](./docs/agents/data-catalog.md) | item/warbond data or `scripts/import-catalog.mjs` |
| Testing strategy (unit, golden, server, e2e) | [`docs/agents/testing.md`](./docs/agents/testing.md) | writing or running any test |
| Current status & roadmap | [`docs/agents/status-roadmap.md`](./docs/agents/status-roadmap.md) | planning, release, or phase work |

## Commands

pnpm only (`pnpm-lock.yaml` is canonical).

| Command | Status | Purpose |
| --- | --- | --- |
| `pnpm install` | exists | Install deps (`postinstall` runs `nuxt prepare`) |
| `pnpm dev` | exists | Dev server at `http://localhost:3000` |
| `pnpm build` | exists | Production build (Node/Nitro server) |
| `pnpm preview` | exists | Preview production build |
| `pnpm generate` | exists | Static build (pure client-side SPA — solo/offline only — no WebSocket server) |
| `pnpm pwa:assets` | exists | Write `public/icon.svg` from `app/utils/brandMark.ts`, then regenerate PWA icons, favicon + head links from it (`@vite-pwa/assets-generator`) |
| `pnpm dashboard:preview` | exists | Render `grafana/dashboard-preview.html` + `.png` from `grafana/griffdive-overview.json` (mock-series layout preview; needs Playwright's chromium for the PNG) |
| `pnpm lint` | exists | ESLint via `@nuxt/eslint` module |
| `pnpm lint:fix` | exists | Auto-fix lint/style issues |
| `pnpm test` | exists | Vitest (engine unit + golden tests) |
| `pnpm test:watch` | exists | Vitest watch mode |
| `pnpm test:e2e` | exists | Playwright (solo flow, room sync, join briefing, Codex slide-over, session saves, PWA affordances; production build on :3173) |
| `pnpm typecheck` | exists | `nuxt typecheck` (vue-tsc) |

Update this table the moment a command lands.

## Engine invariants (non-negotiable)

1. `shared/engine/**` and `shared/data/**` are **pure TS**: no Vue, no Nitro/h3, no browser APIs, no
   `Date.now()`, no `Math.random()`. Time and randomness are injected (seeded PRNG; clock passed in
   or recorded by callers). The engine is deterministic: `(state, action, seed) → state`.
2. **All game rules live in the engine.** Components render state; they never compute rules. If a
   calculation touches risk, tiers, options, or progression, it belongs in `shared/engine/`.
3. **The server validates every action through the same reducer clients use.** Client state is
   never trusted; snapshots are authoritative. `REPORT_RESULT` is honor-system (companion-app trust
   boundary) but the action log makes runs auditable.
4. **Spins are seeds.** A wheel result = seed + deterministic derivation, so a reveal syncs as one
   integer and every client computes the same wheel. Store seeds, not derived results.
5. **All tunable numbers live in `shared/engine/config.ts`** (risk values, thresholds, star tables,
   reroll tokens). No magic numbers scattered in UI or data files.

## Conventions

- **TypeScript strict** everywhere; no `any` in shared code. Types live beside their module;
  cross-boundary types in `shared/types/`.
- **Import engine explicitly** via `~~/shared/engine/*` and `~~/shared/data/*` (auto-imports apply
  only to `shared/utils/` and `shared/types/`). Keep engine imports explicit — grep-ability beats
  magic.
- **Naming:** components `PascalCase.vue` grouped by domain folder; composables `useThing`;
  engine modules lowercase noun/verb; types/interfaces `PascalCase`; catalog ids `camelCase`
  (upstream parity). Components follow Nuxt's default naming (`pathPrefix` left on): the folder path
  plus the file name make the registered name, with the overlap deduped — `components/kit/KitPanel.vue`
  is `<KitPanel>`, `components/app/AppDialog.vue` is `<AppDialog>`. **Every file name carries its
  folder's prefix** (`briefing/BriefingHost.vue`, never `briefing/Host.vue`) so the name is greppable
  and the file never lies about its tag. A new component goes in its domain folder, or starts a new
  one named for the prefix (`liberty-cross/` → `LibertyCross*`). Shared Reka wrappers live in
  `app/` (`App*`), glyphs in `icon/` (`Icon*`). See
  [Nuxt component names](https://nuxt.com/docs/4.x/directory-structure/app/components#component-names).
- **Components are dumb about rules.** They take state + emit intents. No tier math, no risk math,
  no progression logic in `app/components/**` — call engine selectors instead.
- **Accessibility layer.** Reka UI is the primitive layer: import components explicitly from
  `reka-ui` (never rely on auto-imports). Repeated chrome gets a themed `App*` wrapper in `app/` —
  `AppDialog` (modals: `v-model:open`, required `title`, optional `description`/`size`
  (`sm`–`xl`)/`dismissible`/`showClose`/`hideTitle` (title kept for assistive tech, header row dropped), `#title`/`#description`/`#actions` (header, right)/`#footer` slots) and `AppTooltip` (`content`, `disabled`; carries its own
  provider). Do not hand-roll dialogs, focus traps, scroll locks or tab strips (reach for Reka's `Tabs` directly and wrap it in `app/` once a second use appears). One-off controls
  use the Reka primitive directly (`RadioGroup` in `AppStarRating`/`CrusadeSetup`, `Checkbox` in
  `ConditionCard`) so the semantics live with the component. The global foundation lives in
  `main.css` (`:focus-visible` ring, `.sr-only`, `.skip-link`) and `app.vue` (skip link →
  `#main-content`, carried by every page `<main>` with `tabindex="-1"`). `.sr-only` pins itself with
  explicit offsets — an absolutely positioned label with auto offsets takes the viewport as its
  containing block, so a rail could no longer clip it and the page grew a scrollbar. Dialogs are `aria-modal`,
  trap focus, and restore focus to their trigger on close; `e2e/a11y.spec.ts` guards the
  foundation.
- **Styles:** single global theme (HD2 palette: Super Earth gold/khaki, alert red, stratagem teal)
  in `app/assets/css/`; scoped styles for specifics. Mobile-first — divers check their phone between
  missions. Typography mirrors the game's two-font system: `--font-body` (Chakra Petch, the FS
  Sinclair stand-in) for body/UI, `--font-display` (Archivo at `font-stretch: 125%`, the Swiss 721
  Extended stand-in) for big headings only. The display font is a vendored variable woff2
  (`public/fonts/`, OFL included) because the width axis can't be resolved through `@nuxt/fonts`;
  Chakra Petch resolves via the module. Chakra Petch has no weight above 700; anything heavier
  belongs on the display font.
- **Animations are presentation, never rules.** Motion lives in components/CSS and reacts to
  state changes (watch `wheel.seed`, `phase`); it must never drive or gate engine actions.
  Defaults: `motion-v` (`<Motion>`, `<AnimatePresence>`, `<MotionConfig>`, auto-registered by
  `motion-v/nuxt`) for springs, exits and shared-element/layout work; CSS keyframes + the global
  `name="phase"` Vue transitions for ambient loops and phase swaps; shared spring/pop presets in
  `app/utils/motion.ts` (`SPRING_SNAP`, `SPRING_POP`, `riseIn`, `slamIn`). Easing
  and duration tokens live in `main.css` (`--ease-out`, `--ease-snap`, `--dur-*`). Reduced motion
  is mandatory: `<MotionConfig reduced-motion="user">` in `app/app.vue` for motion-v, the
  `@media (prefers-reduced-motion: reduce)` guard in `main.css` for CSS, and an explicit
  `matchMedia` check inside any JS-driven effect (e.g. `HonorsReel`). E2E runs with
  `reducedMotion: 'reduce'` so flows assert settled state, not timing.
- **Comments:** code is self-documenting; comment only *why*, never *what*. No comment noise.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
  Never commit secrets. The repo is git-initialized; the first commit is this file + Phase 0
  tooling.
- **Privacy:** Griffdive is account-free and its telemetry is aggregate-only — no name, id, IP or
  room code ever becomes a metric label or a log line. The full data inventory (client
  `localStorage`, server room/save state, transient IPs for rate limiting, retention windows,
  hosting) lives in [`PRIVACY.md`](./PRIVACY.md) and is mirrored in-app at
  `app/pages/privacy.vue`. Any change that stores, exports or logs a new field must update both in
  the same commit.
- **Dependencies:** get approval before adding runtime deps. Currently approved adds:
  `@nuxt/eslint`, `vitest`, `vue-tsc`, `@nuxt/fonts` (Phase 0; fonts is build-time dev dep);
  `@vueuse/core`, `@pinia/nuxt`, `nanoid` (Phase 2);
  `@playwright/test` (Phase 3).   `motion-v` (Phase 4; the only approved animation runtime —
  springs, `AnimatePresence`, shared-element layout). `@prometheus-io/client`
  (server metrics registry; the official continuation of `prom-client`). `@vite-pwa/nuxt` +
  `@vite-pwa/assets-generator` (Phase 4; the installable PWA manifest, Workbox service worker and
  the icon/head-link generator, the latter a build-time dev dep). `reka-ui` (Phase 4; the Vue port
  of Radix primitives — the accessible Toast in `app/AppToastStack.vue`; headless, import components
  explicitly).
  `@nuxt/test-utils` remains optional until a Nuxt-runtime test actually needs it.

## Attribution & licensing

- Design + code inspiration: [hd2-random-strat](https://github.com/Selenestica/hd2-random-strat) by
  Selenestica (MIT) — Penitent Crusade mechanics and the item/tier constants.
- Icons: Nvigneux stratagem SVGs. Images: helldivers.wiki.gg. Keep CREDITS current with every asset
  added.
- Griffdive's own code: MIT (matching upstream). Confirm with the owner before adding any license
  file.
