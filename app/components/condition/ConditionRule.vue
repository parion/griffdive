<script setup lang="ts">
import type { Condition } from '~~/shared/data/conditions'

// A rule with its glossary words underlined; each opens its definition on
// demand (ConditionKeyword). Parenthetical detail is set apart as an aside so
// the headline reads first. Plain spans only, so it nests inside a button card.
defineProps<{ condition: Pick<Condition, 'ruleParts'> }>()
</script>

<template>
  <span class="condition-rule-text"><template
    v-for="(part, index) in condition.ruleParts"
    :key="index"
  ><span
    :class="{ 'rule-aside': part.aside }"
  ><ConditionKeyword
    v-if="part.keyword"
    :keyword="part.keyword"
  >{{ part.text }}</ConditionKeyword><template v-else>{{ part.text }}</template></span></template></span>
</template>

<style scoped>
.rule-aside {
  font-size: 0.86em;
  font-style: italic;
  color: var(--dim);
}
</style>
