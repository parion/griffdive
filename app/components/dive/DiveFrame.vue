<script setup lang="ts">
// The lit-pass dive shell: flat header, one stage, one squad dock. No rails,
// no persistent ladder. Each phase is a single lit object on the stage.
</script>

<template>
  <div class="shell">
    <slot name="header" />

    <main
      id="main-content"
      class="stage grid-bg"
      tabindex="-1"
    >
      <div
        class="stage-glow"
        aria-hidden="true"
      />
      <div class="stage-inner">
        <slot />
      </div>
    </main>

    <slot name="dock" />
  </div>
</template>

<style scoped>
.shell {
  height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  background: var(--ground);
}
.stage {
  position: relative;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: clamp(14px, 2.4vh, 28px) var(--pad-page) clamp(16px, 3vh, 32px);
  background-color: var(--ground);
  background-size: 44px 44px;
  container: stage / inline-size;
}
.stage-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 58% 48% at 50% 46%, rgba(255, 214, 66, 0.07), transparent 70%),
    linear-gradient(180deg, rgba(11, 12, 9, 0.2), rgba(11, 12, 9, 0.85));
}
.stage-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1180px;
  /* Auto block margins centre the beat when it is shorter than the stage and
     fall back to top-aligned scrolling when it is taller — unlike
     align-items: center, which would clip the top of an overflowing beat. */
  margin-block: auto;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vh, 24px);
  min-width: 0;
  min-height: 0;
}
.stage-inner :deep(> *) { min-width: 0; }

@media (max-width: 1020px) {
  .shell { height: auto; min-height: 100vh; grid-template-rows: auto minmax(0, 1fr) auto; overflow: visible; }
  .stage { overflow: visible; }
}
</style>
