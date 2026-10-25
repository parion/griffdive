<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import type { FeedbackCategory, FeedbackReceipt } from '~~/shared/types/feedback'
import { ENGINE_VERSION } from '~~/shared/engine/config'
import { FEEDBACK_CONTACT_MAX, FEEDBACK_MESSAGE_MAX, FEEDBACK_MESSAGE_MIN } from '~~/shared/types/feedback'

const { sheetOpen, boardUrl, hasBoard } = useFeedback()
const { push: pushToast } = useToasts()
const route = useRoute()

const CATEGORIES: { value: FeedbackCategory, label: string, hint: string }[] = [
  { value: 'bug', label: 'Bug', hint: 'Something broke' },
  { value: 'idea', label: 'Idea', hint: 'Something missing' },
  { value: 'balance', label: 'Balance', hint: 'Risk or loot feels off' },
  { value: 'other', label: 'Other', hint: 'Anything else' },
]

const category = ref<FeedbackCategory>('bug')
const message = ref('')
const contact = ref('')
// Honeypot. Kept out of the tab order and the accessibility tree.
const website = ref('')
const sending = ref(false)
const error = ref('')
const receipt = ref<string | null>(null)

const trimmed = computed(() => message.value.trim())
const canSend = computed(() => trimmed.value.length >= FEEDBACK_MESSAGE_MIN && !sending.value)

// Machine context the note needs to be actionable. The path is reduced to a
// known screen server-side; room codes and names never enter this payload.
const context = computed(() => ({
  version: `engine-${ENGINE_VERSION}`,
  path: route.path.split('?')[0] ?? '/',
}))

// A receipt is the only handle we can act on without accounts, so it must not
// vanish on an accidental close: clearing waits until the sheet reopens.
watch(sheetOpen, (open) => {
  if (open) {
    error.value = ''
    receipt.value = null
  }
})

async function send(): Promise<void> {
  if (!canSend.value) {
    return
  }
  sending.value = true
  error.value = ''
  try {
    const res = await $fetch<FeedbackReceipt>('/api/feedback', {
      method: 'POST',
      body: {
        category: category.value,
        message: trimmed.value,
        contact: contact.value.trim(),
        context: context.value,
        website: website.value,
      },
    })
    receipt.value = res.id
    message.value = ''
    contact.value = ''
  }
  catch (cause) {
    const status = (cause as { statusCode?: number }).statusCode
    error.value = status === 429
      ? 'Too many notes from this connection. Give it a few minutes and try again.'
      : 'The note did not reach the ship. Try again, or open an issue on GitHub.'
  }
  finally {
    sending.value = false
  }
}

async function copyReference(): Promise<void> {
  if (!receipt.value || !navigator.clipboard?.writeText) {
    return
  }
  try {
    await navigator.clipboard.writeText(receipt.value)
    pushToast('Feedback reference copied')
  }
  catch {
    pushToast('Could not copy the reference', 'warn')
  }
}

function another(): void {
  receipt.value = null
  error.value = ''
}
</script>

<template>
  <AppDialog
    v-model:open="sheetOpen"
    title="Send feedback"
    description="No account or email needed."
    size="md"
  >
    <section
      v-if="receipt"
      class="filed"
      aria-live="polite"
    >
      <p class="lbl gold">
        Filed
      </p>
      <p class="filed-copy">
        The note is in the inbox as
        <strong class="mono ref">{{ receipt }}</strong>.
        Keep this reference if you ever want it deleted or need a reply — without accounts it is
        the only handle we have.
      </p>
      <div class="filed-actions">
        <button
          type="button"
          class="btn tiny"
          @click="copyReference"
        >
          Copy reference
        </button>
        <a
          v-if="hasBoard"
          class="btn tiny ghost"
          :href="boardUrl"
          target="_blank"
          rel="noopener"
        >Open the board</a>
        <button
          type="button"
          class="btn tiny ghost"
          @click="another"
        >
          Send another
        </button>
      </div>
    </section>

    <form
      v-else
      id="feedback-form"
      class="fb"
      @submit.prevent="send"
    >
      <fieldset class="fb-field">
        <legend class="lbl">
          Category
        </legend>
        <RadioGroupRoot
          v-model="category"
          class="cats"
          aria-label="Feedback category"
        >
          <RadioGroupItem
            v-for="option in CATEGORIES"
            :key="option.value"
            :value="option.value"
            class="cat"
          >
            <span class="cat-label">{{ option.label }}</span>
            <span class="cat-hint">{{ option.hint }}</span>
          </RadioGroupItem>
        </RadioGroupRoot>
      </fieldset>

      <div class="fb-field">
        <label
          for="fb-message"
          class="lbl"
        >Your note</label>
        <textarea
          id="fb-message"
          v-model="message"
          :maxlength="FEEDBACK_MESSAGE_MAX"
          rows="4"
          required
          placeholder="What happened, or what would make the next dive better?"
        />
        <p class="fb-hint">
          {{ FEEDBACK_MESSAGE_MAX - message.length }} characters left. Please leave out room
          codes and other divers' names.
        </p>
      </div>

      <div class="fb-field">
        <label
          for="fb-contact"
          class="lbl"
        >Reply-to <span class="opt">optional</span></label>
        <input
          id="fb-contact"
          v-model="contact"
          type="text"
          :maxlength="FEEDBACK_CONTACT_MAX"
          autocomplete="off"
          placeholder="Discord handle, email, anything that reaches you"
        >
      </div>

      <div
        class="trap"
        aria-hidden="true"
      >
        <label for="fb-website">Website</label>
        <input
          id="fb-website"
          v-model="website"
          type="text"
          tabindex="-1"
          autocomplete="off"
        >
      </div>

      <p class="fb-context">
        Attached automatically: <span class="mono">{{ context.path }}</span> ·
        <span class="mono">{{ context.version }}</span>
      </p>

      <p
        v-if="error"
        class="fb-error"
        role="alert"
      >
        {{ error }}
      </p>

      <p class="fb-privacy">
        Stored on Griffdive's server for up to 180 days. No IP address, no account.
        <NuxtLink
          to="/privacy"
          class="link"
          @click="sheetOpen = false"
        >Privacy</NuxtLink>
      </p>
    </form>

    <template #footer>
      <div class="fb-foot">
        <template v-if="receipt">
          <span class="muted small">Thanks — notes are read between deployments.</span>
          <button
            type="button"
            class="btn tiny"
            @click="sheetOpen = false"
          >
            Close
          </button>
        </template>
        <template v-else>
          <a
            v-if="hasBoard"
            class="board-link"
            :href="boardUrl"
            target="_blank"
            rel="noopener"
          >Prefer the public board? Vote there →</a>
          <span
            v-else
            class="muted small"
          />
          <button
            type="submit"
            form="feedback-form"
            class="btn primary"
            :disabled="!canSend"
          >
            {{ sending ? 'Filing…' : 'File report' }}
          </button>
        </template>
      </div>
    </template>
  </AppDialog>
</template>

<style scoped>
.fb {
  display: grid;
  gap: 1rem;
}

.fb-field {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  border: 0;
}
.fb-field .lbl { padding: 0; }
.opt { color: var(--dim); font-weight: 400; letter-spacing: 0.04em; text-transform: none; }

.cats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}

.cat {
  display: grid;
  gap: 0.1rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--line-3);
  background: var(--ground);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast), color var(--dur-fast);
}
.cat:hover { border-color: var(--khaki); }
.cat[data-state='checked'] {
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.07);
  color: var(--gold);
}
.cat-label { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.cat-hint { font-size: 0.72rem; color: var(--muted); }
.cat[data-state='checked'] .cat-hint { color: var(--khaki); }

textarea { resize: vertical; min-height: 6rem; }

@media (max-width: 480px) {
  .fb { gap: 0.8rem; }
}

.fb-hint, .fb-context, .fb-privacy {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted);
  letter-spacing: 0.02em;
}
.fb-context { color: var(--dim); }
.fb-privacy { font-size: 0.72rem; }
.fb-error { margin: 0; color: var(--red); font-size: 0.85rem; }

.trap {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.fb-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.board-link { font-size: 0.75rem; color: var(--khaki); }
.board-link:hover { color: var(--gold); }

.filed { display: grid; gap: 0.75rem; }
.filed-copy { margin: 0; font-size: 0.92rem; line-height: 1.5; }
.ref { color: var(--gold); letter-spacing: 0.08em; }
.filed-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
</style>
