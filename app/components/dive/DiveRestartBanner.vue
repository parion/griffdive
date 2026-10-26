<template>
  <p
    class="restart-banner"
    role="status"
  >
    <span
      class="pulse"
      aria-hidden="true"
    />
    <span>
      <strong>Griffdive is doing a quick restart.</strong>
      Your dive is saved and picks up right where it left off — hang tight.
    </span>
  </p>
</template>

<style scoped>
/* Fixed so it sits over both the desktop board and the phone shell without
   adding height to a dive page that is exactly one viewport tall. */
.restart-banner {
  position: fixed;
  inset-block-start: var(--sp-4);
  inset-inline: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  width: fit-content;
  max-width: min(90vw, 30rem);
  margin: 0 auto;
  padding: var(--sp-3) var(--sp-5);
  background: var(--panel);
  border: 1px solid var(--line-3);
  border-left: 3px solid var(--teal);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  font-size: var(--fs-sm);
}

.pulse {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  background: var(--teal);
  animation: pulse 1.2s var(--ease-out) infinite alternate;
}

@keyframes pulse {
  to { opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce) {
  .pulse { animation: none; }
}
</style>
