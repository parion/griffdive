<script setup lang="ts">
import type { KitArt } from '~/utils/kit'

// A kit group: the accent mark, title and count over a grid of KitTiles. The
// Kit drawer, the setup's Starting Kit and the launch reveal share it.
withDefaults(defineProps<{
  label: string
  accent: string
  art: KitArt
  count: number
  compact?: boolean
  empty?: string
}>(), { compact: false, empty: '' })
</script>

<template>
  <section
    class="kit-sec"
    :class="[`art-${art}`, { compact }]"
    :style="{ '--accent': accent }"
  >
    <header class="kit-sec-head">
      <span
        class="kit-sec-mark"
        aria-hidden="true"
      />
      <h3 class="kit-sec-title">
        {{ label }}
      </h3>
      <span
        class="kit-sec-rule"
        aria-hidden="true"
      />
      <span class="kit-sec-n">{{ count }}</span>
    </header>
    <p
      v-if="empty"
      class="none"
    >
      {{ empty }}
    </p>
    <ul
      v-else
      class="tiles"
    >
      <slot />
    </ul>
  </section>
</template>

<style scoped>
.kit-sec { display: grid; gap: var(--sp-3); min-width: 0; scroll-margin-top: 10rem; }
.kit-sec-head { display: flex; align-items: center; gap: var(--sp-3); }
.kit-sec-mark {
  width: 3px;
  height: 14px;
  flex-shrink: 0;
  background: var(--accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 60%, transparent);
}
.kit-sec-title {
  margin: 0;
  color: var(--text);
  font: 700 var(--fs-sm) var(--font-body);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.kit-sec-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--line-3), transparent); }
.kit-sec-n { color: var(--gold); font-size: var(--fs-sm); font-weight: 700; font-variant-numeric: tabular-nums; }

.none {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  color: var(--dim);
  font-size: var(--fs-sm);
  border: 1px dashed var(--line-2);
}

.tiles {
  display: grid;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.art-gear .tiles { grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); }
.art-icon .tiles { grid-template-columns: repeat(auto-fill, minmax(5.25rem, 1fr)); }
.compact.art-gear .tiles { grid-template-columns: repeat(auto-fill, minmax(6.75rem, 1fr)); }
.compact.art-icon .tiles { grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr)); }
</style>
