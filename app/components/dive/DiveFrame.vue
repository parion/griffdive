<script setup lang="ts">
withDefaults(defineProps<{ rails?: boolean }>(), { rails: true })
</script>

<template>
  <div class="dive-frame">
    <div class="dive-strip">
      <slot name="strip" />
    </div>
    <div
      class="dive-body"
      :class="{ 'no-rails': !rails }"
    >
      <aside
        v-if="rails"
        class="rail rail-left scan"
        aria-label="Crusade"
      >
        <slot name="left" />
      </aside>
      <section
        class="dive-center"
        aria-label="Mission"
      >
        <slot />
      </section>
      <aside
        v-if="rails"
        class="rail rail-right scan"
        aria-label="Mission status"
      >
        <slot name="right" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.dive-frame {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px clamp(10px, 2vw, 22px) 28px;
  max-width: 1500px;
  margin: 0 auto;
  width: 100%;
}
.dive-strip {
  border: 1px solid var(--line-1);
  background: var(--rail);
  padding: 10px 14px;
  min-width: 0;
}
.dive-body {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr) 286px;
  gap: 10px;
  align-items: start;
}
.dive-body.no-rails { grid-template-columns: minmax(0, 1fr); }
.rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  top: 70px;
  max-height: calc(100vh - 84px);
  overflow-y: auto;
  padding-right: 2px;
}
.dive-center { display: grid; gap: 10px; min-width: 0; }

@media (max-width: 1180px) {
  .dive-body { grid-template-columns: 232px minmax(0, 1fr); }
  .rail-right { grid-column: 1 / -1; position: static; max-height: none; }
}
@media (max-width: 860px) {
  .dive-body { grid-template-columns: minmax(0, 1fr); }
  .rail { position: static; max-height: none; }
  /* On phones the mission content leads; the rails follow below it. */
  .rail-left { order: 2; }
  .dive-center { order: 1; }
  .rail-right { order: 3; }
  .dive-strip { padding: 8px 10px; }
}
</style>
