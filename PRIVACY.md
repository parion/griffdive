# Privacy

Griffdive is a free, non-commercial fan project for **Helldivers 2**. It has no accounts, no
cookies, no analytics and no advertising. This page is a plain-language description of exactly what
the code stores, where, for how long, and how to get rid of it. It is mirrored in the app at
[`/privacy`](./app/pages/privacy.vue).

_Last updated: 25 October 2026._

## What is stored

**On your device (browser `localStorage`)** — nothing leaves the browser unless you host or join an
online dive:

- Save slots and personal session mirrors (crusade state, inventories, names).
- Recent room codes (the 12 most recent, forgotten after 30 days), and the seat id for each room you have joined (so a refresh keeps your seat).
- Your diver name, your warbond declarations, and "you have seen the intro" flags.

Clearing site data in your browser deletes all of it.

**On the server** — only when you create or join a dive, and only what the dive needs:

- The room code, the seated divers' names (as typed, at most 32 characters), their inventories, and
  the crusade's progress and audit log.
- While a diver is seated: a keyed fingerprint (HMAC) of the network address the dive was joined
  from, scoped to that room. If the host removes a diver, the removed seat's id and fingerprint
  stay with the room as a bar so the invite link cannot seat them again. The raw address is never
  written, the fingerprint cannot be compared across rooms, and it never reaches logs or metrics.
- If any diver pins the dive as saved: the save's name and who pinned it.
- If the host pastes a Steam lobby link: that link, so the squad can jump into the in-game lobby.
- If a diver continues a save as a new session: the uploaded save, which seats that diver as host.
- If you file feedback in the app: the note, its category, an optional reply-to, the screen and
  engine build you were on, and a short reference id. No IP address, no diver name, no room code.

**Transiently, in memory only:** your raw IP address, used to rate-limit abuse (at most 10 room
creations per minute and 20 join attempts per minute per address). It is never written to disk,
never logged, and never exported to metrics. Action floods are limited per seat id, not per IP.
The only address-derived data on disk is the keyed per-room fingerprint above.

## What is never collected

- No cookies and no cookie-like tracking. Nothing follows you across sites.
- No analytics, no telemetry beacons, no advertising, no browser fingerprinting, no third-party
  scripts.
- No accounts, no email addresses, no passwords in the game. The separate feedback board
  (`feedback.griffdive.com`) asks for an email or an OAuth sign-in only if you choose to post or
  vote there, and it is never contacted by the app.
- No third-party requests from your browser: fonts, icons and game art are all served by Griffdive
  itself, so visiting it does not tell Google Fonts, a CDN or an image host that you exist. The
  feedback board is a separate site reached only by clicking through to it.
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
| Seat fingerprints and kick bars | With the room: 12 hours (unlaunched), 30 days (in progress), or while pinned |
| Feedback notes | 180 days, or the 500 newest notes, whichever bites first |
| Aggregate metrics | Fly.io's managed Prometheus retention |
| Logs | Fly.io's log retention |

Nothing is archived or sold. A room that a squad leaves is simply left to age out.

## Who can see what

- **Anyone with the room code (or the invite link containing it) can join that dive.** The code is
  the only access control, so treat it like a password for the squad.
- Divers' names, their kit and the host's Steam lobby link are visible to everyone seated in the
  room. Don't type a name you don't want strangers with the link to see.
- A kick bar is private to the server. The removed browser (or a fresh browser on the same network)
  sees a refusal; other divers only see that the seat is gone.
- Feedback notes are readable by the operators — that is what they are for. They never enter
  metrics or logs, and only the category is counted.
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
- **Remove a feedback note:** quote the reference shown when you filed it. The note text itself is
  the only other handle, so include enough of it to identify the entry.
- **Access, rectification, erasure, restriction, objection:** the same route applies — the room code
  is the only handle we can act on. You can also lodge a complaint with your local data protection
  supervisory authority.

## Lawful basis

There is no consent-based processing, so there is nothing to opt into or withdraw:

- **Running the dive you asked for** (performance of the service you requested): room state, seat
  identity, saved dives, the Steam link, and feedback you choose to file.
- **Legitimate interest in a usable service**: transient IP addresses for rate limiting,
  per-room keyed fingerprints for host moderation (keeping a removed diver out of that dive), and
  aggregate metrics to keep the single server healthy.

No special-category data, no profiling, no automated decision-making, and no selling or sharing with
third parties beyond the hosting provider and the feedback board's email sender.

## Feedback

There are two separate paths, deliberately:

- **In the app** (*Send feedback*): the note goes to this server and is described above. No account,
  no email required, no third-party request. It lives in the same Fly app as the dives.
- **The public board** at `feedback.griffdive.com` is a self-hosted Fider instance on its own Fly app
  and Postgres database. The app never contacts it; you only reach it by clicking a link. Posting or
  voting there requires an emailed sign-in link (or an OAuth provider, if enabled), so Fider stores
  that address, and **Resend** delivers the sign-in and notification emails, so it sees the address
  and the message. Nothing from the game is sent with you — not your room code, diver name, kit or
  saves — and the board carries its own privacy page.

Notes filed in the app are not published on the board. If one is worth a public thread, an operator
reposts it by hand.

## Where it runs

The server runs on **Fly.io** (region `ams`, Amsterdam), which also stores room state and feedback
notes on its volume and provides the metrics and log store. The feedback board is a second Fly app
in the same region with its own Postgres database. Fly.io is a sub-processor for that hosting; its
data processing agreement covers it. **Resend** is the board's only other sub-processor: it sends
the board's emails and never receives anything from the game. Nothing is served from anywhere else.

## Contact and changes

Griffdive is not directed at children; it is a companion app for a mature-rated game.

Questions, deletion requests or corrections: open an issue at
[github.com/parion/griffdive/issues](https://github.com/parion/griffdive/issues).

This notice is versioned with the code. If a future change stores, exports or logs anything new, the
same commit must update this file and the in-app page.
