<script setup lang="ts">
import type { ChangelogEntry } from '~/composables/useChangelog'
import { SPRING_SNAP } from '~/utils/motion'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { status, entries, error, load } = useChangelog()

const closeBtn = ref<HTMLButtonElement | null>(null)

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
  document.documentElement.classList.toggle('modal-open', open)
  if (open) {
    void load()
    nextTick(() => closeBtn.value?.focus())
  }
})

function onKeydown(event: KeyboardEvent): void {
  if (props.open && event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.classList.remove('modal-open')
})
</script>

<template>
  <Teleport to="body">
    <AnimatePresence>
      <Motion
        v-if="open"
        key="backdrop"
        as="div"
        class="backdrop"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.15 }"
        @click="emit('close')"
      />
      <Motion
        v-if="open"
        key="dialog"
        as="div"
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        :initial="{ opacity: 0, y: 24, scale: 0.97 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 12, scale: 0.98 }"
        :transition="SPRING_SNAP"
      >
        <header class="row spread head">
          <div>
            <h2 id="changelog-title">
              Changelog
            </h2>
          </div>
          <button
            ref="closeBtn"
            type="button"
            class="btn tiny ghost"
            @click="emit('close')"
          >
            Close
          </button>
        </header>

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
      </Motion>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(9, 10, 7, 0.72);
}

.dialog {
  position: fixed;
  inset: 0;
  z-index: 41;
  margin: auto;
  width: min(620px, calc(100vw - 2rem));
  height: fit-content;
  max-height: min(82vh, 720px);
  overflow: auto;
  padding: 1.1rem 1.25rem 1.25rem;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

.head {
  align-items: baseline;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.6rem;
  margin-bottom: 0.75rem;
}

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
