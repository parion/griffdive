<script setup lang="ts">
// The host's call at the bottom of a post-dive beat: a gold bar on phones, a
// footer button elsewhere. Everyone else reads who the squad is waiting on.
defineProps<{
  label: string
  canControl: boolean
  waiting: string
  // Holds the call while something still gates it.
  locked?: boolean
  phone?: boolean
}>()

const emit = defineEmits<{ go: [] }>()
</script>

<template>
  <PhoneActionBar v-if="phone">
    <template #primary>
      <button
        v-if="canControl && !locked"
        class="bar-cta cta-sweep"
        type="button"
        @click="emit('go')"
      >
        <span class="disp">{{ label }}</span>
      </button>
      <span
        v-else
        class="bar-gate"
      ><span class="bar-gate-word quiet">{{ canControl ? label : waiting }}</span></span>
    </template>
  </PhoneActionBar>
  <footer
    v-else
    class="foot"
  >
    <button
      v-if="canControl"
      class="cta cut cta-sweep"
      type="button"
      :disabled="locked"
      @click="emit('go')"
    >
      {{ label }}
      <svg
        v-if="!locked"
        width="22"
        height="14"
        viewBox="0 0 22 14"
        aria-hidden="true"
      >
        <path
          d="M0 0h5l7 7-7 7H0l7-7zM10 0h5l7 7-7 7h-5l7-7z"
          fill="currentColor"
        />
      </svg>
    </button>
    <p
      v-else
      class="waiting"
      role="status"
    >
      {{ waiting }}
    </p>
  </footer>
</template>

<style scoped>
.foot { display: flex; justify-content: center; }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: min(100%, 440px);
  min-height: 60px;
  padding: 0 26px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35), 0 0 34px rgba(255, 214, 66, 0.26);
  color: var(--on-gold);
  font: 800 18px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cta:hover { filter: brightness(1.06); }
.cta:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }
.waiting { margin: 0; color: var(--muted); font-size: 14px; text-align: center; }
</style>
