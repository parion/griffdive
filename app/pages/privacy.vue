<script setup lang="ts">
// The concise, in-app half of the privacy notice. PRIVACY.md at the repo root
// is the authoritative text; keep the two in step whenever a data flow changes.
interface Section {
  h: string
  p?: string
  list?: string[]
}

const SECTIONS: Section[] = [
  {
    h: 'What this app stores',
    list: [
      'On this device (browser storage): save slots and session mirrors, the 12 most recent room codes (forgotten after 30 days), the seat id for each room you joined, your diver name, your warbond declarations, your tier lists (and which one your next crusade uses), the Tier Maker\'s display settings, and intro flags. The standalone Tier Maker at tiers.griffdive.com keeps its own library in that site\'s storage, and hands a list to the game only inside the link you follow. Clearing site data deletes all of it.',
      'On the server, only when you host or join a dive: the room code, the squad\'s names and kits, the host\'s custom tier list, the crusade\'s progress, a saved dive\'s name, the Steam lobby link if the host pastes one, and when the room was created and last active.',
      'While you are seated: a keyed, per-room fingerprint (HMAC) of the network address you joined from. If the host removes you, your seat id and that fingerprint stay with the room as a bar so the invite link cannot reseat you. The raw address is never written, and the fingerprint cannot be compared across rooms.',
      'If you file feedback in the app: the note, its category, an optional reply-to, the screen and engine build, and a short reference id. No IP address, diver name or room code.',
      'In memory only: your raw IP address, used to rate-limit abuse. It is never written to disk, logged or exported to metrics.',
    ],
  },
  {
    h: 'What it never does',
    list: [
      'No cookies, no analytics, no ads, no trackers, no browser fingerprinting.',
      'No accounts and no email addresses in the game. The separate feedback board asks for one only if you choose to post there.',
      'No third-party requests: fonts, icons and game art are all served by Griffdive. The feedback board is a separate site you reach by clicking through.',
      'No personal data in operational metrics or logs — the dashboard counters are aggregate only.',
    ],
  },
  {
    h: 'Who can see what',
    list: [
      'Anyone with the room code (or the invite link) can join that dive: the code is the access control.',
      'Names, kits and the host\'s Steam link are visible to everyone seated in the room.',
      'A kick bar is private: the removed browser (or a fresh browser on the same network) gets a refusal, while the squad only sees that the seat is gone.',
    ],
  },
  {
    h: 'How long it is kept',
    list: [
      'Rooms that were never launched: pruned 12 hours after the last activity.',
      'Crusades: pruned 30 days after the last activity.',
      'Saved dives: kept until the host unpins them (past 500 saves, the oldest age out).',
      'Seat fingerprints and kick bars: with the room (12 hours unlaunched, 30 days in progress, or while pinned).',
      'Feedback notes: 180 days, or the 500 newest notes, whichever bites first.',
      'Metrics and logs: Fly.io\'s retention. Nothing is archived or sold.',
    ],
  },
  {
    h: 'Your choices',
    list: [
      'Play without a server: the offline build and local save slots never contact the server.',
      'Clear site data in your browser to remove everything on this device.',
      'For server data, unpin the dive and let it age out. There are no accounts, so the room code is the only handle we can act on.',
      'For a feedback note, quote the reference shown when you filed it.',
    ],
  },
  {
    h: 'Feedback',
    list: [
      'In the app, Send feedback writes the note to this server only. No account, no email required, no third-party request.',
      'The public board at feedback.griffdive.com is a separate self-hosted service. Posting or voting there needs an emailed sign-in link or OAuth, and nothing from your dive is sent with you. Its emails are delivered by Resend, which sees the address and the message.',
      'Notes filed in the app are never published on the board.',
    ],
  },
  {
    h: 'Where it runs',
    p: 'The server runs on Fly.io (region ams, Amsterdam), which also stores room state and feedback notes and provides the metrics and log store, as a sub-processor. The feedback board is a second Fly app in the same region with its own Postgres database; Resend sends its emails and is its only other sub-processor. Processing is the dive you asked for, feedback you choose to file, and keeping the server usable and moderated (rate limiting, per-room keyed address fingerprints, aggregate metrics). No profiling, no automated decisions, nothing sold.',
  },
]
</script>

<template>
  <main
    id="main-content"
    class="page privacy"
    tabindex="-1"
  >
    <header class="page-header">
      <div>
        <h1>Privacy</h1>
        <p class="sub">
          Account-free by design: what Griffdive stores, where, and for how long.
        </p>
      </div>
      <span class="lbl">No cookies · no analytics · no ads</span>
    </header>

    <section
      v-for="section in SECTIONS"
      :key="section.h"
      class="block"
    >
      <h2 class="lbl">
        {{ section.h }}
      </h2>
      <p
        v-if="section.p"
        class="body"
      >
        {{ section.p }}
      </p>
      <ul
        v-if="section.list"
        class="body list"
      >
        <li
          v-for="item in section.list"
          :key="item"
        >
          {{ item }}
        </li>
      </ul>
    </section>

    <footer class="block foot">
      <p class="body">
        The full notice, including lawful basis and your rights, lives in the repository:
        <a
          class="link"
          href="https://github.com/parion/griffdive/blob/main/PRIVACY.md"
          rel="noopener"
        >PRIVACY.md</a>.
        Questions or deletion requests:
        <a
          class="link"
          href="https://github.com/parion/griffdive/issues"
          rel="noopener"
        >open an issue</a>.
      </p>
    </footer>
  </main>
</template>

<style scoped>
.privacy { max-width: 720px; }
h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-stretch: 125%;
  letter-spacing: 0.02em;
}
.block {
  display: grid;
  gap: 0.4rem;
  padding: 0.9rem 1rem;
  background: var(--panel);
  border: 1px solid var(--line-2);
}
.body { margin: 0; font-size: 0.92rem; line-height: 1.5; color: var(--text); }
.list { display: grid; gap: 0.35rem; padding-left: 1.1rem; }
.list li { overflow-wrap: anywhere; }
.foot { background: var(--ground); }
.link { color: var(--gold); text-decoration: none; }
.link:hover { text-decoration: underline; }
</style>
