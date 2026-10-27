<script setup lang="ts">
import type { Condition } from '~~/shared/data/conditions'

// A rule with its glossary words lit. Plain spans only, so it nests inside a
// button card without breaking the markup; ConditionKeywords defines the words.
defineProps<{ condition: Pick<Condition, 'ruleParts'> }>()
</script>

<template>
  <span class="rule"><template
    v-for="(part, index) in condition.ruleParts"
    :key="index"
  ><span
    v-if="part.keyword"
    class="kw"
  >{{ part.text }}</span><template v-else>{{ part.text }}</template></template></span>
</template>

<style scoped>
.kw {
  color: var(--gold);
  text-decoration: underline dotted;
  text-decoration-color: color-mix(in srgb, var(--gold) 55%, transparent);
  text-underline-offset: 3px;
}
</style>
