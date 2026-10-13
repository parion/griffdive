# Privacy

Griffdive is a free, non-commercial fan project for **Helldivers 2**. It has no accounts, no
cookies, no analytics and no advertising. This page is a plain-language description of exactly what
the code stores, where, for how long, and how to get rid of it. It is mirrored in the app at
[`/privacy`](./app/pages/privacy.vue).

_Last updated: 13 October 2026._

## What is stored

**On your device (browser `localStorage`)** — nothing leaves the browser unless you host or join an
online dive:

- Save slots and personal session mirrors (crusade state, inventories, names).
- Recent room codes, and the seat id for each room you have joined (so a refresh keeps your seat).
- Your diver name, your warbond declarations, and "you have seen the intro" flags.

Clearing site data in your browser deletes all of it.

**On the server** — only when you create or join a dive, and only what the dive needs:

- The room code, the seated divers' names (as typed, at most 32 characters), their inventories, and
  the crusade's progress and audit log.
- If any diver pins the dive as saved: the save's name and who pinned it.
- If the host pastes a Steam lobby link: that link, so the squad can jump into the in-game lobby.
- If a diver continues a save as a new session: the uploaded save, which seats that diver as host.

**Transiently, in memory only:** your IP address, used to rate-limit abuse (at most 10 room
creations per minute and 20 join attempts per minute per address). It is never written to disk,
never logged, and never exported to metrics. Action floods are limited per seat id, not per IP.

## What is never collected

- No cookies and no cookie-like tracking. Nothing follows you across sites.
- No analytics, no telemetry beacons, no advertising, no fingerprinting, no third-party scripts.
- No accounts, no email addresses, no passwords.
- No third-party requests from your browser: fonts, icons and game art are all served by Griffdive
  itself, so visiting it does not tell Google Fonts, a CDN or an image host that you exist.
- No personal data in operational metrics or logs. The Grafana dashboard's counters are aggregate
  (for example "missions started", "join attempts by result", "rooms by phase") and carry no names,
  ids, room codes or IP addresses. Server logs contain errors and counts only.
- The server fetches the community war API to show the live Major Order; that request carries no
  user data.

## How long it is kept

| Data | Retention |
| --- | --- |
| Rooms that were never launched | Pruned 12 hours after the last activity |
| Crusades in progress | Pruned 30 days after the last activity |
| Pinned (saved) dives | Kept until the host unpins them; past 500 saved dives the oldest are unpinned and age out |
| Aggregate metrics | Fly.io's managed Prometheus retention |
| Logs | Fly.io's log retention |

Nothing is archived or sold. A room that a squad leaves is simply left to age out.

## Who can see what

- **Anyone with the room code (or the invite link containing it) can join that dive.** The code is
  the only access control, so treat it like a password for the squad.
- Divers' names, their kit and the host's Steam lobby link are visible to everyone seated in the
  room. Don't type a name you don't want strangers with the link to see.
- Griffdive operators can reach the room state on the server (for example to debug or operate the
  service). No one reads it routinely.

## Your choices and rights

- **Play without a server:** the static/offline build, and any local save slot, never contact the
  server at all. Nothing is stored anywhere but your browser.
- **Clear everything on your device:** clear site data for the site in your browser.
- **Remove server data:** ask the host to unpin the dive and stop using it; it then ages out on the
  timers above. Because there are no accounts, we cannot locate "your" data without the room code —
  that is the trade-off of account-free play. If you have a room code and want the room deleted,
  open an issue and include the code.
- **Access, rectification, erasure, restriction, objection:** the same route applies — the room code
  is the only handle we can act on. You can also lodge a complaint with your local data protection
  supervisory authority.

## Lawful basis

There is no consent-based processing, so there is nothing to opt into or withdraw:

- **Running the dive you asked for** (performance of the service you requested): room state, seat
  identity, saved dives, the Steam link.
- **Legitimate interest in a usable service**: transient IP addresses for rate limiting and abuse
  protection, aggregate metrics to keep the single server healthy.

No special-category data, no profiling, no automated decision-making, and no selling or sharing with
third parties beyond the hosting provider.

## Where it runs

The server runs on **Fly.io** (region `ams`, Amsterdam), which also stores room state on its volume
and provides the metrics and log store. Fly.io is a sub-processor for that hosting; its data
processing agreement covers it. Nothing is served from anywhere else.

## Contact and changes

Griffdive is not directed at children; it is a companion app for a mature-rated game.

Questions, deletion requests or corrections: open an issue at
[github.com/parion/griffdive/issues](https://github.com/parion/griffdive/issues).

This notice is versioned with the code. If a future change stores, exports or logs anything new, the
same commit must update this file and the in-app page.
