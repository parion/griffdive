<script setup lang="ts">
import { ACCOUNTABILITY_LABELS } from '~/utils/accountability'

interface GuideStep {
  key: string
  title: string
  body: string
}

const STEPS: GuideStep[] = [
  {
    key: 'spin',
    title: 'Spin',
    body: 'The Wheel of Misfortune draws one team-wide restriction for the mission. The operation\'s first spin also draws the front — Terminids, Automatons or Illuminate — and a strain, a subfaction of that front.',
  },
  {
    key: 'decide',
    title: 'Decide',
    body: 'The squad accepts the rule — adding its team risk to everyone\'s Valor — or opts out for a safe dive. On the operation\'s first mission the strain gets its own separate call (see below). A drawn rule that would strand any diver below four stratagems cannot be accepted.',
  },
  {
    key: 'pact',
    title: 'Pact',
    body: 'Each diver is dealt a personal offer of two or three pacts and picks their own subset. Pact risk is personal: it raises only that diver\'s Valor.',
  },
  {
    key: 'dive',
    title: 'Dive',
    body: 'Play the mission in Helldivers 2. A win means the main objectives are complete and the squad extracts — objectives without extraction fail the operation.',
  },
  {
    key: 'report',
    title: 'Report',
    body: 'Record the outcome. Stars come from the clear; time remaining and samples feed a small squad performance term that nudges every diver\'s Valor.',
  },
  {
    key: 'reward',
    title: 'Reward',
    body: 'Each diver drafts one reward rolled against their own Valor ceiling, then a bonus-honors contest can bank a reward token — spend it to reroll your offer or ban items.',
  },
]

const CHECKS = Object.values(ACCOUNTABILITY_LABELS)
</script>

<template>
  <div class="dive-guide">
    <p class="muted small guide-lede">
      Griffdive wraps a Helldivers 2 operation in a squad challenge. Every mission
      runs the same six beats.
    </p>

    <ol class="guide-steps">
      <li
        v-for="(step, index) in STEPS"
        :key="step.key"
      >
        <span
          class="step-num"
          aria-hidden="true"
        >{{ index + 1 }}</span>
        <div class="step-body">
          <strong>{{ step.title }}</strong>
          <p>{{ step.body }}</p>
        </div>
      </li>
    </ol>

    <section class="guide-note">
      <h3>Reading the odds</h3>
      <p>
        <strong>Valor</strong> is the risk you chose: team risk from the accepted
        misfortune, your pact risk, plus a small performance bonus. Your
        <strong>ceiling</strong> is the best reward tier that Valor can roll — risk
        buys odds, never a guarantee.
      </p>
    </section>

    <section class="guide-note">
      <h3>Faction strains</h3>
      <p>
        A strain is a subfaction of the drawn front — Predator Strain Terminids, Jet
        Brigade Automatons, Vote Snatchers Illuminate.
      </p>
      <p>
        It is an <strong>optional, operation-long</strong> commitment. Accepting adds
        its team risk to <strong>every mission</strong> of the operation, compounding
        over its two or three dives, and it locks until the operation ends. Declining
        is free.
      </p>
      <p class="muted small">
        Strains are flavor and risk only — the real subfaction reshapes your loadout
        in-game; the app just prices the extra Valor.
      </p>
    </section>

    <section class="guide-note">
      <h3>Where rules are checked</h3>
      <p class="muted small">
        Every misfortune and pact has an observable tell, so the squad can hold each
        other to it:
      </p>
      <ul class="guide-checks">
        <li
          v-for="check in CHECKS"
          :key="check"
        >
          {{ check }}
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.dive-guide { display: grid; gap: 0.9rem; }
.guide-lede { margin: 0; }

.guide-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}
.guide-steps li {
  display: flex;
  gap: 0.7rem;
  padding: 0.55rem 0.7rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.step-num {
  flex-shrink: 0;
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 0.85rem;
}
.step-body { min-width: 0; }
.step-body strong {
  display: block;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.85rem;
  color: var(--khaki);
}
.step-body p { margin: 0.15rem 0 0; }

.guide-note {
  padding: 0.6rem 0.75rem;
  border-left: 2px solid var(--teal);
  background: color-mix(in srgb, var(--teal) 7%, transparent);
  border-radius: 6px;
}
.guide-note h3 {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--teal);
}
.guide-note p { margin: 0; }

.guide-checks {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.2rem;
}
.guide-checks li { color: var(--khaki); font-size: 0.85rem; }
</style>
