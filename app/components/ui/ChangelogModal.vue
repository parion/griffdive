<script setup lang="ts">
import type { ChangelogEntry } from '~/composables/useChangelog'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { status, entries, error, load } = useChangelog()

const ENTRY_LABELS: Record<ChangelogEntry['state'], string> = {
  pending: 'On main — not yet live',
  in_progress: 'Deploying…',
  success: 'Live',
  failure: 'Deploy failed',
  error: 'Deploy failed',
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
    description="Recent deployments and commits from main."
    size="md"
    @update:open="value => { if (!value) emit('close') }"
  >
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
        <header class="row spread entry-head">
          <span class="row">
            <span
              class="state-dot"
              :data-state="entry.state"
            />
            <span>{{ ENTRY_LABELS[entry.state] }}</span>
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
          </span>
          <time
            v-if="entry.createdAt"
            class="muted small"
            :datetime="entry.createdAt"
          >{{ dateLabel(entry) }}</time>
        </header>
        <ul
          v-if="entry.commits.length > 0"
          class="commits"
        >
          <li
            v-for="commit in entry.commits"
            :key="commit.sha"
          >
            <span
              v-if="commit.type"
              class="ctype"
              :data-type="commit.type"
            >{{ commit.type }}</span>
            <a
              :href="commit.url"
              target="_blank"
              rel="noopener"
            >{{ commit.subject }}</a>
          </li>
        </ul>
      </li>
    </ol>
  </AppDialog>
</template>

<style scoped>
.entries {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.entry {
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
}

.entry:first-child { border-top: none; padding-top: 0; }

.entry-head {
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
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
.state-dot[data-state='unknown'] { background: var(--khaki); }
.state-dot[data-state='pending'] { background: transparent; border-color: var(--khaki); }

.sha {
  color: var(--muted);
  font-size: 0.75rem;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.commits {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.3rem;
}

.commits li {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.commits a { color: var(--text); }

.ctype {
  flex: none;
  min-width: 3.4em;
  text-align: center;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
}

.ctype[data-type='feat'] {
  color: var(--gold);
  border-color: color-mix(in srgb, var(--gold) 45%, transparent);
}

.ctype[data-type='fix'] {
  color: var(--teal);
  border-color: color-mix(in srgb, var(--teal) 45%, transparent);
}

.ctype[data-type='refactor'], .ctype[data-type='perf'] { color: var(--khaki); }

.failed { display: grid; gap: 0.4rem; justify-items: start; }
.error-text { color: var(--red); margin: 0; }
</style>
