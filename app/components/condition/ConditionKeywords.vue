<script setup lang="ts">
import { glossaryEntry } from '~~/shared/data/glossary'
import type { GlossaryEntry } from '~~/shared/data/glossary'

// The side panel of a rule: one line per highlighted word, defined once in the
// glossary. Plain spans only, so it nests inside a button card.
const props = defineProps<{ keywords: readonly string[] }>()

const entries = computed(() => props.keywords
  .map(glossaryEntry)
  .filter((entry): entry is GlossaryEntry => entry !== null))
</script>

<template>
  <span
    v-if="entries.length"
    class="keywords"
  >
    <span
      v-for="entry in entries"
      :key="entry.id"
      class="entry"
    >
      <b class="term">{{ entry.term }}</b>
      <span class="def">{{ entry.definition }}</span>
    </span>
  </span>
</template>

<style scoped>
.keywords {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0 0 10px;
  border-left: 2px solid color-mix(in srgb, var(--gold) 40%, var(--line-2));
}
.entry {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.term {
  color: var(--gold);
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.def {
  color: var(--dim);
  font-size: 12px;
  line-height: 1.4;
}
</style>
