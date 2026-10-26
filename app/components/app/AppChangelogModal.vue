<script setup lang="ts">
import type { ChangelogEntry, ChangelogState } from '~~/shared/utils/changelog'
import { channelFor, CURRENT_RELEASE } from '~/utils/release'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { status, entries, error, load } = useChangelog()

const ENTRY_LABELS: Record<ChangelogState, string> = {
  pending: 'On main — not yet live',
  waiting: 'Awaiting approval',
  in_progress: 'Deploying…',
  success: 'Live',
  failure: 'Deploy failed',
  unknown: 'Deployed',
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function dateLabel(entry: ChangelogEntry): string {
  return entry.createdAt ? dateFormatter.format(new Date(entry.createdAt)) : ''
}

watch(() => props.open, (open) => {
  if (open) {
    void load()
  }
})
</script>

<template>
  <AppDialog
    :open="props.open"
    title="Changelog"
    :description="`${CURRENT_RELEASE.name} — release notes and recent deployments.`"
    size="md"
    @update:open="value => { if (!value) emit('close') }"
  >
    <section
      class="release"
      aria-labelledby="release-name"
    >
      <h3
        id="release-name"
        class="row release-head"
      >
        <span class="chip release-tag">{{ CURRENT_RELEASE.label }}</span>
        <span class="release-name">{{ CURRENT_RELEASE.name }}</span>
      </h3>
      <p class="release-summary">
        {{ CURRENT_RELEASE.summary }}
      </p>
      <ul
        v-if="CURRENT_RELEASE.highlights.length"
        class="release-highlights"
      >
        <li
          v-for="highlight in CURRENT_RELEASE.highlights"
          :key="highlight"
        >
          {{ highlight }}
        </li>
      </ul>
    </section>

    <p
      v-if="status === 'loading'"
      class="muted small"
    >
      Reading the deployment log…
    </p>
    <div
      v-else-if="status === 'error'"
      class="failed"
    >
      <p class="small error-text">
        {{ error }}
      </p>
      <button
        type="button"
        class="btn tiny"
        @click="load(true)"
      >
        Retry
      </button>
    </div>
    <p
      v-else-if="entries.length === 0"
      class="muted small"
    >
      No deployments yet — the crusade hasn't shipped.
    </p>
    <ol
      v-else
      class="entries"
    >
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="entry"
      >
        <header class="entry-head">
          <h3 class="row phase">
            <span
              class="state-dot"
              :data-state="entry.state"
            />
            <span class="phase-name">{{ ENTRY_LABELS[entry.state] }}</span>
            <span
              class="chip channel-tag"
              :data-channel="channelFor(entry.createdAt).id"
            >{{ channelFor(entry.createdAt).label }}</span>
            <a
              v-if="entry.state === 'pending'"
              class="sha"
              :href="entry.url"
              target="_blank"
              rel="noopener"
            >view on main</a>
            <a
              v-else-if="entry.shortSha"
              class="mono sha"
              :href="entry.url"
              target="_blank"
              rel="noopener"
            >{{ entry.shortSha }}</a>
          </h3>
          <time
            v-if="entry.createdAt"
            class="muted small"
            :datetime="entry.createdAt"
          >{{ dateLabel(entry) }}</time>
        </header>
        <section
          v-for="group in entry.groups"
          :key="group.type"
          class="group"
          :data-type="group.type"
        >
          <h4 class="lbl group-label">
            {{ group.label }}
          </h4>
          <ul class="commits">
            <li
              v-for="commit in group.commits"
              :key="commit.sha"
            >
              <a
                :href="commit.url"
                target="_blank"
                rel="noopener"
              >{{ commit.subject }}</a>
            </li>
          </ul>
        </section>
      </li>
    </ol>
  </AppDialog>
</template>

<style scoped>
.release {
  margin-bottom: 1.4rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--gold);
  background: color-mix(in srgb, var(--gold) 6%, transparent);
}

.release-head {
  margin: 0 0 0.5rem;
  gap: 0.6rem;
}

.release-name {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.release-tag,
.channel-tag {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--khaki);
}

.release-tag { color: var(--gold); }

.channel-tag[data-channel='beta'] { color: var(--gold); }

.release-summary {
  margin: 0 0 0.6rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.release-highlights {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  line-height: 1.45;
}

.entries {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.6rem;
}

.entry {
  border-top: 1px solid var(--line-2);
  padding-top: 1rem;
}

.entry:first-child { border-top: none; padding-top: 0; }

.entry-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  flex-wrap: wrap;
}

.phase {
  margin: 0;
  gap: 0.55rem;
}

.phase-name {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.state-dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid transparent;
}

.state-dot[data-state='success'] {
  background: var(--teal);
  box-shadow: 0 0 8px color-mix(in srgb, var(--teal) 60%, transparent);
}

.state-dot[data-state='failure'] { background: var(--red); }
.state-dot[data-state='in_progress'] { background: var(--gold); }
.state-dot[data-state='waiting'] { background: transparent; border-color: var(--gold); }
.state-dot[data-state='unknown'] { background: var(--khaki); }
.state-dot[data-state='pending'] { background: transparent; border-color: var(--khaki); }

.sha {
  color: var(--muted);
  font-size: 0.75rem;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.group {
  margin-top: 0.85rem;
}

.group-label {
  margin: 0 0 0.4rem;
}

.group[data-type='feat'] .group-label { color: var(--gold); }
.group[data-type='fix'] .group-label { color: var(--teal); }
.group[data-type='perf'] .group-label { color: var(--orange); }
.group[data-type='refactor'] .group-label { color: var(--khaki); }

.commits {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}

.commits li {
  position: relative;
  padding-left: 0.85rem;
  font-size: 0.85rem;
  line-height: 1.4;
}

.commits li::before {
  content: '';
  position: absolute;
  left: 0.1rem;
  top: 0.58em;
  width: 4px;
  height: 4px;
  background: var(--dim);
}

.group[data-type='feat'] .commits li::before { background: color-mix(in srgb, var(--gold) 55%, transparent); }
.group[data-type='fix'] .commits li::before { background: color-mix(in srgb, var(--teal) 55%, transparent); }
.group[data-type='perf'] .commits li::before { background: color-mix(in srgb, var(--orange) 55%, transparent); }
.group[data-type='refactor'] .commits li::before { background: color-mix(in srgb, var(--khaki) 55%, transparent); }

.commits a { color: var(--text); }

.failed { display: grid; gap: 0.4rem; justify-items: start; }
.error-text { color: var(--red); margin: 0; }
</style>
