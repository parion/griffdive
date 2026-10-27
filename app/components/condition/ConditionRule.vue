<script setup lang="ts">
import type { Condition } from '~~/shared/data/conditions'

// A rule with its glossary words underlined; each opens its definition on
// demand (ConditionKeyword). Plain spans only, so it nests inside a button card.
defineProps<{ condition: Pick<Condition, 'ruleParts'> }>()
</script>

<template>
  <span class="condition-rule-text"><template
    v-for="(part, index) in condition.ruleParts"
    :key="index"
  ><ConditionKeyword
    v-if="part.keyword"
    :keyword="part.keyword"
  >{{ part.text }}</ConditionKeyword><template v-else>{{ part.text }}</template></template></span>
</template>
