<script setup lang="ts">
withDefaults(defineProps<{ left?: boolean, right?: boolean }>(), { left: true, right: true })
</script>

<template>
  <div class="shell">
    <slot name="header" />
    <slot name="ladder" />

    <div
      class="body"
      :class="{ 'no-left': !left, 'no-right': !right }"
    >
      <aside
        v-if="left"
        class="rail rail-left scan"
        aria-label="Crusade"
      >
        <slot name="left" />
      </aside>

      <main
        id="main-content"
        class="center grid-bg scan"
        tabindex="-1"
      >
        <slot />
      </main>

      <aside
        v-if="right"
        class="rail rail-right"
        aria-label="Valor"
      >
        <slot name="right" />
      </aside>
    </div>

    <slot name="phases" />
  </div>
</template>

<style scoped>
/* The dive is a fixed terminal: header, climb strip, three rails and the
   mission-phase bar all share one viewport. Panels scroll internally, the page
   never does. */
.shell {
  height: 100vh;
  display: grid;
  grid-template-rows: 60px 84px minmax(0, 1fr) 52px;
  overflow: hidden;
  background: var(--ground);
}
.body {
  display: grid;
  grid-template-columns: 216px minmax(0, 1fr) 284px;
  min-height: 0;
}
.body.no-right { grid-template-columns: 216px minmax(0, 1fr); }
.body.no-left { grid-template-columns: minmax(0, 1fr) 284px; }

.rail {
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
  padding: var(--sp-5) var(--sp-4);
  background: var(--rail);
  min-height: 0;
  overflow-y: auto;
}
.rail-left { border-right: 1px solid var(--line-1); }
.rail-right { border-left: 1px solid var(--line-1); }

.center {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
  padding: var(--gap-panel) var(--pad-page);
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.center :deep(> *) { min-width: 0; }

/* One structural breakpoint: below this the shell flows and the rails follow
   the mission content instead of framing it. Everything inside is fluid. */
@media (max-width: 1020px) {
  .shell {
    height: auto;
    min-height: 100vh;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    overflow: visible;
  }
  .body { grid-template-columns: minmax(0, 1fr); }
  .body.no-right,
  .body.no-left { grid-template-columns: minmax(0, 1fr); }
  .rail { border: 0; padding: var(--sp-4) var(--pad-page); }
  .center { order: 1; overflow: visible; }
  .rail-left { order: 2; }
  .rail-right { order: 3; }
}
</style>
