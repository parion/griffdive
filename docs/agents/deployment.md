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
on internal port 9091 (`METRICS_PORT` to override) — default Node metrics plus the Griffdive
families below. `fly.toml`'s `[metrics]` has Fly scrape it every 15s into the managed Grafana at
fly-metrics.net; the port is never registered in `[http_service]`, so it is unreachable from the
public internet. The dashboard lives in-repo at `grafana/griffdive-overview.json` (import it in the
Grafana UI; it prompts for the Prometheus datasource) and `pnpm dashboard:preview` renders
`grafana/dashboard-preview.html` + `.png` — a mock-series layout preview so a dashboard change can
be reviewed without Grafana access.

**Metric families** (counters reset per process — query them with `increase()`/`rate()`; a
`changes(process_start_time_seconds[5m])` annotation marks deploys):

| Family | What it answers |
| --- | --- |
| `griffdive_online_players`, `griffdive_active_rooms` (gauges, scrape-time) | Presence now — seated divers, rooms with a live connection |
| `griffdive_rooms_by_phase{phase}`, `griffdive_room_difficulty{difficulty}`, `griffdive_saved_dives` (gauges, 2-minute census) | Where stored rooms sit: stuck phases, ladder distribution, pin pressure against the save cap |
| `griffdive_rooms_created_total{source}`, `griffdive_room_create_rejected_total{reason}`, `griffdive_room_lookups_total{result}`, `griffdive_http_requests_total{route,status}` | Arrival: fresh vs resumed rooms, dead invite links, growth limits, cold hits (PWA/browser navigation never reaches the server) |
| `griffdive_ws_hello_total{result}`, `griffdive_rejoins_total{gap}`, `griffdive_divers_joined_total{kind}`, `griffdive_divers_departed_total{kind}`, `griffdive_presence_changes_total{direction}`, `griffdive_host_transfers_total{reason}`, `griffdive_rooms_swept_total` | Seating and retention: join failures, returning divers by silence gap (the no-accounts retention proxy), squad churn, host fragility, TTL reaps |
| `griffdive_dives_started_total`, `griffdive_missions_started_total{difficulty}`, `griffdive_operation_restarts_total{difficulty}`, `griffdive_operations_completed_total{difficulty}`, `griffdive_crusades_achieved_total`, `griffdive_crusades_ended_total`, `griffdive_reports_total{outcome,difficulty}` | The play funnel: crusades launched → missions begun → operations climbed → achieved, plus restarts and honor-system outcomes |
| `griffdive_directive_decisions_total{decision,condition,difficulty}`, `griffdive_directive_refusals_total`, `griffdive_strain_decisions_total`, `griffdive_major_order_total{kind}` (front plan at launch: `live`/`manual`/`rolled`), `griffdive_wheel_rerolls_total{kind}`, `griffdive_pacts_picked_total{condition}`, `griffdive_pacts_failed_total{condition}`, `griffdive_directives_failed_total{condition}`, `griffdive_ceiling_total{tier}`, `griffdive_valor_at_report`, `griffdive_pact_picks` | Risk & balance: is chosen risk real, which rules land or misfire, what loot tiers the economy actually rolls |
| `griffdive_rewards_picked_total`, `griffdive_purchases_total`, `griffdive_forfeits_total` (tier + category), `griffdive_samples_haul{rarity}`, `griffdive_report_time_pct`, `griffdive_mission_stars{difficulty}`, `griffdive_reward_rerolls_total`, `griffdive_reward_bans_total`, `griffdive_honors_spun_total`, `griffdive_honors_awarded_total`, `griffdive_warbond_edits_total` | Economy & outcomes: loot by tier, shelf affordability, forfeit cost, sample hauls, tokens and honors usage |
| `griffdive_phase_dwell_seconds{phase}`, `griffdive_squad_size`, `griffdive_build_info{engine,image}` | Friction and identity: how long rooms spend in each phase (lobby dwell = onboarding), squad sizes at mission start, which build is live |
| `griffdive_feedback_total{category}`, `griffdive_feedback_rejected_total{reason}` | The feedback inbox: what kind of notes arrive, and how many submissions the limiter or validation refused (never the text) |

Gameplay counters are derived at the action seam in `server/utils/room-sync.ts` from the
`(before, after, action)` triple the reducer produced — the observability layer reads engine
selectors, it never re-derives rules. Label cardinality is bounded by design (conditions, strains,
item tiers/categories, difficulties); never label by room code, player id or IP. Known blind spots:
solo play started from the Bridge runs entirely in the browser (`useDiveEngine` + localStorage) and
is invisible, and `REPORT_RESULT` is honor-system — treat outcomes as directional.

**Feedback inbox.** `POST /api/feedback` writes a single JSON array to
`useStorage('feedback')` (`./.data/feedback/inbox`, same `griffdive_data` volume as rooms), capped
at the 500 newest notes and pruned past 180 days. `pnpm feedback:export` prints it newest-first;
against production, pull it off the volume and pipe it in:

```sh
fly ssh console --app griffdive -C 'cat /app/.data/feedback/inbox' | pnpm feedback:export -
```

The in-app sheet is the no-account path. The **public board** is a separate Fly app running
[self-hosted Fider](../deploy/fider/README.md) (`griffdive-feedback`, region `ams`, its own Postgres
and certificate). It is never contacted by the game app: the only coupling is the
`NUXT_PUBLIC_FEEDBACK_BOARD_URL` public runtime config, which adds the click-through link. The
board lives at `https://feedback.griffdive.com` (sign-in email via Resend); staging sets the URL in
`fly.staging.toml`, production leaves it unset until a release sets it with `fly secrets set`. Fider requires an email or OAuth sign-in to post, which is exactly why
it cannot be embedded — see `PRIVACY.md` → Feedback.

CI/CD: `.github/workflows/ci.yml` runs lint/typecheck/unit tests + the Playwright E2E suite on
every PR and push to `main`; pushes never deploy to production. **Staging:** after CI and E2E pass,
every push to `main` runs the `deploy-staging` job, which deploys `fly.staging.toml`
(`griffdive-staging.fly.dev`, own `griffdive_staging_data` volume, idle-stops, no reviewer gate,
`staging` GitHub environment) using the `FLY_STAGING_TOKEN` repo secret (a deploy token scoped to
the staging app) and smoke-checks `/`. Merges accumulate there until a release. One-time setup:
`fly apps create griffdive-staging`, `fly volumes create griffdive_staging_data --app
griffdive-staging --region ams --size 1`, `fly tokens create deploy --app griffdive-staging`, and
the `staging` environment in GitHub. **Releases are batched and started by hand:**
when the accumulated merges are ready, run *CI/CD → Run workflow* from `main`
(`workflow_dispatch`), which re-verifies the batch and then hands to the `deploy` job. That job
targets the `production` GitHub environment, which is configured with a required reviewer, so the
release sits as "Waiting" until approved and ships as one deploy. The `environment:` reference is
what creates the GitHub deployment record (this — not Fly's GitHub app integration — feeds the
"production deployments" UI and the in-app changelog); dispatching replaced the old per-merge
deploy job, whose waiting runs were cancelled by the next merge and left a failed deployment
record behind every time. The job runs `flyctl deploy --remote-only --wait-timeout 300` against
the `Dockerfile` + `fly.toml` in repo using the `FLY_API_TOKEN` repo secret (an app-scoped deploy
token), then smoke-checks `/api/rooms` before the deployment is marked
success. `.github/workflows/preview.yml` deploys a per-PR review app
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
