# Deployment

> Part of the Griffdive docs set. Index: [`AGENTS.md`](../AGENTS.md).

One Node service (Nitro) on Fly.io (`griffdive.fly.dev`, `ams` region), WebSocket + REST + static
app together — per-page HTML is a fixed ~2.6 KB gzip shell, so client assets, not rendered pages,
dominate bandwidth. To cut egress further, serve the static app from a CDN (unmetered free egress,
e.g. Cloudflare Pages with a `/*` shell fallback) and keep only WS + REST on the Node service.
`pnpm generate` remains supported for a static, offline, solo-only build. Room state persists on the
`griffdive_data` Fly volume (Nitro `fs-lite`, `.data/rooms` under the app workdir); swapping to
Redis for horizontal scale is config-only, though multi-machine also requires moving the in-process
peer directory.

Monitoring: `server/plugins/metrics.ts` exposes a Prometheus registry (`@prometheus-io/client`)
on internal port 9091 (`METRICS_PORT` to override) — default Node metrics plus
`griffdive_online_players`, `griffdive_active_rooms` (gauges, snapshotted
from the peer directory at scrape time) and `griffdive_dives_started_total` (counter,
reset per process — query with `increase()` across deploys). `fly.toml`'s `[metrics]` has Fly
scrape it every 15s into the managed Grafana at fly-metrics.net; the port is never registered in
`[http_service]`, so it is unreachable from the public internet.

CI/CD: `.github/workflows/ci.yml` runs lint/typecheck/unit tests + the Playwright E2E suite on
every PR and push to `main`. **Releases are batched:** the `deploy` job (push to `main` +
`workflow_dispatch`, needs both green) targets the `production` GitHub environment, which is
configured with a required reviewer — merges to `main` queue up as "Waiting" runs until the
accumulated batch is approved and ships as one deploy. The `environment:` reference is what
creates the GitHub deployment record (this — not Fly's GitHub app integration — feeds the
"production deployments" UI and the in-app changelog); the job runs `flyctl deploy
--remote-only --wait-timeout 300` against the `Dockerfile` + `fly.toml` in repo using the
`FLY_API_TOKEN` repo secret (an app-scoped deploy token), then smoke-checks `/api/rooms` before
the deployment is marked success. `.github/workflows/preview.yml` deploys a per-PR review app
(`pr-<n>-parion-griffdive.fly.dev`, via `superfly/fly-pr-review-apps` with `fly.review.toml` and
the org-scoped `FLY_REVIEW_TOKEN` secret) whose URL shows in the PR UI; the app is destroyed
when the PR closes. The image
runs `node .output/server/index.mjs` on internal port 8080. `fly.toml` pins one machine
(`min_machines_running = 1`, `auto_stop_machines = false`) and mounts the `griffdive_data` volume at
`/app/.data`: a volume binds to one machine, and live peers live in an in-process directory — more
than one machine splits squads across processes. Room state persists across deploys (the volume), so
restarts no longer wipe in-flight rooms; don't touch those two settings until storage and the peer
directory both move to Redis. Create the volume once before the first deploy that declares the
mount: `fly volumes create griffdive_data --region ams --size 1`.
