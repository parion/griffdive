# Griffdive

A squad roguelike companion app for **Helldivers 2**. Griffdive wraps the game's missions in a
challenge campaign: squads climb the difficulty ladder with scavenged loadouts, spin a Wheel of
Misfortune before every dive, and individually choose pacts — the more risk accepted, the rarer
the loot.

Fan project. Not affiliated with or endorsed by Sony Interactive Entertainment or Arrowhead Game
Studios. Non-commercial, no ads, no monetization. See [CREDITS.md](./CREDITS.md).

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server on `http://localhost:3000` |
| `pnpm build` / `pnpm preview` | Production build (Nitro server; REST + WebSocket) |
| `pnpm generate` | Static SPA build (solo/offline only — no WebSocket server) |
| `pnpm lint` / `pnpm lint:fix` | ESLint via `@nuxt/eslint` |
| `pnpm test` / `pnpm test:watch` | Vitest (engine unit + golden tests) |
| `pnpm test:e2e` | Playwright (production build on `:3173`) |
| `pnpm typecheck` | `nuxt typecheck` (vue-tsc) |
| `pnpm pwa:assets` | Regenerate PWA icons from `public/icon.svg` |

## Documentation

[`AGENTS.md`](./AGENTS.md) is the source of truth for game rules, architecture and conventions;
[`PLAN.md`](./PLAN.md) tracks playtest findings and the work between releases.
