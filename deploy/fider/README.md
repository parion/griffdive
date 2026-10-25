# Fider — public feedback board

A separate, self-hosted [Fider](https://fider.io) instance at
`feedback.griffdive.com`, linked from the in-app feedback sheet. It is a
*second service*: the game app never loads a script, font or image from it, and
the board is only contacted when a diver chooses to click through.

That separation is the point. Fider requires an account (an emailed sign-in
link, or OAuth), so it cannot live inside an app that promises no accounts and
no third-party requests. The in-app sheet (`POST /api/feedback`) remains the
no-account path; the board is for public voting and a visible roadmap.

## Why this shape

| | Choice |
| --- | --- |
| Runtime | Fider's official `getfider/fider:stable` image, one 256 MB Fly machine |
| Database | Fly Postgres, one shared-cpu-1x machine |
| Storage | Postgres (`BLOB_STORAGE=sql`) — no volume, uploads survive redeploys |
| TLS | Fly terminates it (`SSL_AUTO=false`); `fly certs` for the custom domain |
| Idle | Suspends when nobody is reading; first request after idle is slower |
| Analytics | `GOOGLE_ANALYTICS` deliberately unset (it would set `_ga` cookies) |
| Metrics | Prometheus on private port 4000, scraped by Fly like the game app |

Fider is `AGPL-3.0`. Running the unmodified image is fine; if you patch it and
serve the patch, publish the source.

## One-time setup

```sh
# 1. The board app and its database
fly apps create griffdive-feedback
fly postgres create \
  --name griffdive-feedback-db \
  --region ams \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 3

fly postgres attach griffdive-feedback-db --app griffdive-feedback

# 2. Secrets (never in fly.toml)
fly secrets set --app griffdive-feedback \
  JWT_SECRET="$(openssl rand -hex 32)" \
  EMAIL_NOREPLY='noreply@griffdive.com' \
  EMAIL_SMTP_HOST='smtp.example.com' \
  EMAIL_SMTP_PORT='587' \
  EMAIL_SMTP_USERNAME='…' \
  EMAIL_SMTP_PASSWORD='…'

# 3. Ship it (`--ha=false`: one machine, not Fly's default pair)
fly deploy --config deploy/fider/fly.toml --ha=false

# 4. Custom domain + certificate
fly certs add feedback.griffdive.com --app griffdive-feedback
# then add the A + AAAA records it prints (`fly certs setup feedback.griffdive.com
# --app griffdive-feedback` repeats them); on Cloudflare keep them DNS-only
```

`DATABASE_URL` is set by `fly postgres attach`. `BASE_URL` lives in
[`fly.toml`](./fly.toml) and must match the public origin exactly — Fider builds
every sign-in link from it.

Finally, turn the link on in the game app (a plain env var, not a secret — public
runtime config is serialised into the SPA shell):

```sh
fly secrets set --app griffdive NUXT_PUBLIC_FEEDBACK_BOARD_URL='https://feedback.griffdive.com'
```

Leave it unset (or empty) to hide every board link while the instance is down.
The sheet's "File report" path keeps working either way.

## First visit checklist

1. Open the site and create the board (name, description, admin account).
2. **Site settings → Legal**: enable the privacy policy and terms pages. Paste a
   short notice that this is a separate service which stores the email or OAuth
   identity used to sign in. Link back to `https://griffdive.com/privacy`.
3. **Email**: send a test sign-in link before announcing the board.
4. Keep `GOOGLE_ANALYTICS` unset. If you ever set it, Fider ships GA4 and its
   `_ga` cookies, and the board needs a cookie notice.
5. Optional: enable GitHub OAuth (a diver-friendly alternative to email links).
   Configure it in the admin area, not in `fly.toml`.

## Operations

| Task | Command |
| --- | --- |
| Logs | `fly logs --app griffdive-feedback` |
| Backups | Fly Postgres snapshots; verify restores quarterly |
| Upgrade | Change the image tag in `fly.toml`, `fly deploy`, then smoke-test sign-in |
| Metrics | `[metrics]` in `fly.toml` → fly-metrics.net (separate app from the game) |
| Take it down | `fly apps suspend griffdive-feedback`, unset the board URL in the game app |

Rough cost at idle: one 256 MB shared-cpu-1x machine plus a 1× Postgres cluster
≈ **$5–8/month**, less when the board suspends.

## Local smoke test

```sh
docker compose -f deploy/fider/docker-compose.yml up
# board:  http://localhost:3000
# emails: http://localhost:8025
```

## What this does not do

- It does not replace the in-app inbox. Notes filed in the app never appear here;
  promote the good ones by hand if they deserve a public thread.
- It does not authenticate game sessions. A Fider account is only a board account.
- It does not accept anonymous posts. Fider's model is sign-in to post or vote;
  if that ever becomes unacceptable, the in-app sheet is the fallback, not a fork.
