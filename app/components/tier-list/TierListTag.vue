<script setup lang="ts">
import type { TierList } from '~~/shared/engine/tierList'

// The run's tier list as one chip: a custom list opens the whole list, the
// default tiers are plain text. `still` drops the button for cards that
// are themselves a click target.
const props = withDefaults(defineProps<{
  list: TierList | null | undefined
  showDefault?: boolean
  still?: boolean
}>(), { showDefault: false, still: false })

const open = ref(false)
const label = computed(() => (props.list ? `Tiers · ${props.list.name}` : 'Default tiers'))
</script>

<template>
  <template v-if="list">
    <span
      v-if="still"
      class="chip gold tl-tag"
      :title="`Custom tier list: ${list.name}`"
    >{{ label }}</span>
    <button
      v-else
      type="button"
      class="chip gold tl-tag"
      :aria-label="`Custom tier list ${list.name}. View the list`"
      @click="open = true"
    >
      {{ label }}
    </button>
    <TierListView
      v-if="!still"
      v-model:open="open"
      :list="list"
    />
  </template>
  <span
    v-else-if="showDefault"
    class="chip tl-tag"
  >{{ label }}</span>
</template>

<style scoped>
.tl-tag { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
</style>
