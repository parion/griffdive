<script setup lang="ts">
export type BannerTone = 'info' | 'warn' | 'error' | 'locked'

const props = withDefaults(defineProps<{
  tone?: BannerTone
  title?: string
  // Pinned to the top of the viewport over any layout: for app-level state
  // (a server restart) that is not owned by one panel.
  floating?: boolean
  // An ongoing process rather than a settled fact: the glyph breathes.
  live?: boolean
}>(), {
  tone: 'info',
  title: undefined,
  floating: false,
  live: false,
})

const slots = defineSlots<{
  default?: () => unknown
  actions?: () => unknown
}>()

// Errors interrupt; everything else waits its turn.
const role = computed(() => (props.tone === 'error' ? 'alert' : 'status'))
</script>

<template>
  <div
    class="banner-wrap"
    :class="{ floating }"
  >
    <div
      class="banner"
      :class="[tone, { live }]"
      :role="role"
    >
      <span
        class="glyph"
        aria-hidden="true"
      >
        <IconLock v-if="tone === 'locked'" />
        <svg
          v-else
          class="mark"
          viewBox="0 0 16 16"
        >
          <template v-if="tone === 'info'">
            <rect
              x="7"
              y="3"
              width="2"
              height="2"
            />
            <rect
              x="7"
              y="6.5"
              width="2"
              height="6.5"
            />
          </template>
          <template v-else-if="tone === 'warn'">
            <rect
              x="7"
              y="3"
              width="2"
              height="6.5"
            />
            <rect
              x="7"
              y="11"
              width="2"
              height="2"
            />
          </template>
          <path
            v-else
            d="M4.2 2.8 8 6.6l3.8-3.8 1.4 1.4L9.4 8l3.8 3.8-1.4 1.4L8 9.4l-3.8 3.8-1.4-1.4L6.6 8 2.8 4.2z"
          />
        </svg>
      </span>
      <p class="copy">
        <strong
          v-if="title"
          class="title"
        >{{ title }}</strong>
        <slot />
      </p>
      <div
        v-if="slots.actions"
        class="actions"
      >
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The wrapper is the size container, so a banner lays itself out by the room
   it is given (a phone stage, a drawer, a desktop page), not by the viewport. */
.banner-wrap { container-type: inline-size; min-width: 0; }

.banner {
  --tone: var(--teal);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-3) var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  background: color-mix(in srgb, var(--tone) 8%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--tone) 35%, var(--line-2));
  border-left: 3px solid var(--tone);
  color: var(--text);
  font-size: var(--fs-sm);
  line-height: 1.4;
}
.banner.warn { --tone: var(--orange); }
.banner.error { --tone: var(--red); }
.banner.locked {
  --tone: var(--khaki);
  background: transparent;
  border-style: dashed;
  border-left-style: solid;
  color: var(--khaki);
}

.glyph {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  align-self: start;
  background: var(--tone);
  color: var(--ground);
}
.glyph svg { width: 14px; height: 14px; }
.glyph .mark { fill: currentColor; }
.locked .glyph { background: none; color: var(--tone); border: 1px solid var(--tone); }
.live .glyph { animation: banner-breathe 1.2s var(--ease-out) infinite alternate; }

.copy { margin: 0; align-self: center; }
.title { color: var(--tone); font-weight: 700; margin-inline-end: 0.4em; }
.locked .title { color: var(--text); }

.actions { display: flex; flex-wrap: wrap; gap: var(--sp-2); justify-content: flex-end; }

/* Narrow rooms: the actions drop under the copy, aligned with it. */
@container (max-width: 420px) {
  .banner { grid-template-columns: auto minmax(0, 1fr); }
  .actions { grid-column: 2; justify-content: flex-start; }
}

.floating {
  position: fixed;
  inset-block-start: calc(env(safe-area-inset-top, 0px) + var(--sp-4));
  inset-inline: var(--sp-3);
  z-index: 50;
  width: auto;
  max-width: 34rem;
  margin-inline: auto;
  animation: banner-drop var(--dur-med) var(--ease-out);
}
.floating .banner {
  background: color-mix(in srgb, var(--tone) 8%, var(--raised));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

@keyframes banner-breathe { to { opacity: 0.35; } }
@keyframes banner-drop { from { opacity: 0; translate: 0 -0.75rem; } }

@media (prefers-reduced-motion: reduce) {
  .live .glyph,
  .floating { animation: none; }
}
</style>
