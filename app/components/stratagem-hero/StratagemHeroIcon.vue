<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { heroStratagem } from '~~/shared/data/stratagemCodes'

const props = defineProps<{
  stratagemId: string
}>()

const item = computed(() => ITEMS_BY_ID.get(props.stratagemId) ?? null)
const image = computed(() => (item.value ? itemImageUrl(item.value) : undefined))
// Mission stratagems carry no catalog art: they read as a yellow call tile.
const initials = computed(() =>
  (heroStratagem(props.stratagemId)?.name ?? '?')
    .split(/[\s-]+/)
    .filter(word => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map(word => word[0]!.toUpperCase())
    .join(''))
</script>

<template>
  <span
    class="hero-icon cut-sm"
    :class="{ mission: !image }"
  >
    <img
      v-if="image"
      :src="image"
      alt=""
      draggable="false"
    >
    <span
      v-else
      aria-hidden="true"
    >{{ initials }}</span>
  </span>
</template>

<style scoped>
.hero-icon {
  display: inline-grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  background: var(--raised);
  border: 1px solid var(--line-3);
  overflow: hidden;
}

.hero-icon img {
  width: 88%;
  height: 88%;
  object-fit: contain;
}

.hero-icon.mission {
  background: rgba(255, 214, 66, 0.12);
  border-color: var(--gold);
  color: var(--gold);
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: clamp(14px, 30cqi, 40px);
  container-type: inline-size;
}
</style>
