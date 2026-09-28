<script setup lang="ts">
import { WARBONDS } from '~~/shared/data/catalog'
import { warbondImageUrl } from '~~/shared/data/images'

const props = defineProps<{ warbondCodes: string[] }>()

const emit = defineEmits<{
  'update:warbondCodes': [codes: string[]]
}>()

const allSelected = computed(() => props.warbondCodes.length === WARBONDS.length)

function toggleAll(event: Event): void {
  emit('update:warbondCodes', (event.target as HTMLInputElement).checked
    ? WARBONDS.map(warbond => warbond.code)
    : [])
}

function toggle(code: string, checked: boolean): void {
  const set = new Set(props.warbondCodes)
  if (checked) {
    set.add(code)
  }
  else {
    set.delete(code)
  }
  emit('update:warbondCodes', [...set])
}
</script>

<template>
  <div class="field">
    <span class="row spread wb-head">
      <span class="lbl">Your warbonds</span>
      <label class="cap wb-all">
        <input
          type="checkbox"
          :checked="allSelected"
          @change="toggleAll"
        >
        all {{ WARBONDS.length }}
      </label>
    </span>
    <div class="warbond-grid">
      <label
        v-for="warbond in WARBONDS"
        :key="warbond.code"
        class="warbond cut-sm"
        :class="{ on: warbondCodes.includes(warbond.code) }"
      >
        <input
          type="checkbox"
          :checked="warbondCodes.includes(warbond.code)"
          @change="toggle(warbond.code, ($event.target as HTMLInputElement).checked)"
        >
        <span
          v-if="warbondImageUrl(warbond)"
          class="wb-media"
        >
          <img
            :src="warbondImageUrl(warbond)"
            alt=""
            loading="lazy"
            draggable="false"
          >
        </span>
        <span class="wb-name">{{ warbond.displayName }}</span>
        <span
          v-if="warbond.tier"
          class="tb wb-tier"
          :data-tier="warbond.tier"
        >{{ warbond.tier }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.field { display: grid; gap: 0.5rem; }
.wb-head { align-items: baseline; }
.wb-all { display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; }

.warbond-grid {
  display: grid;
  gap: 0.3rem;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
}

.warbond {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid var(--line-2);
  background: var(--ground);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.warbond:hover { border-color: var(--line-4); }
.warbond.on { border-color: var(--line-4); background: rgba(255, 214, 66, 0.05); }
.warbond input { flex-shrink: 0; }

.wb-media {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2rem;
  height: 1.3rem;
  overflow: hidden;
  background: var(--rail);
  border: 1px solid var(--line-1);
}
.wb-media img { width: 100%; height: 100%; object-fit: cover; }

.wb-name {
  min-width: 0;
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wb-tier { font-size: 0.62rem; min-width: 1.15rem; padding: 0.02rem 0.2rem; }
</style>
