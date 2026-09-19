<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

const model = defineModel<string>({ required: true })

withDefaults(defineProps<{
  tabs: { value: string, label: string }[]
  label: string
  orientation?: 'horizontal' | 'vertical'
  activationMode?: 'automatic' | 'manual'
}>(), {
  orientation: 'horizontal',
  activationMode: 'automatic',
})
</script>

<template>
  <TabsRoot
    v-model="model"
    :orientation="orientation"
    :activation-mode="activationMode"
    class="app-tabs"
  >
    <TabsList
      v-if="tabs.length > 1"
      class="app-tabs-list"
      :aria-label="label"
    >
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        class="app-tabs-trigger"
      >
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.value"
      :value="tab.value"
      class="app-tabs-panel"
    >
      <slot :name="tab.value" />
    </TabsContent>
  </TabsRoot>
</template>

<style scoped>
.app-tabs { display: grid; gap: 0.75rem; }

.app-tabs-list {
  display: inline-flex;
  width: max-content;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.app-tabs-trigger {
  font: inherit;
  font-size: 0.78rem;
  padding: 0.28rem 0.75rem;
  background: transparent;
  border: 0;
  color: var(--muted);
  cursor: pointer;
}

.app-tabs-trigger[data-state='active'] {
  background: var(--bg-raised);
  color: var(--gold);
  font-weight: 700;
}
</style>
