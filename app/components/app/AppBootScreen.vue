<script setup lang="ts">
import { BRAND_MARK } from '~/utils/brandMark'

withDefaults(defineProps<{ status?: string }>(), { status: 'Establishing uplink' })
</script>

<template>
  <div
    class="boot"
    role="status"
  >
    <span class="sr-only">Griffdive is loading.</span>

    <div
      class="boot__grid"
      aria-hidden="true"
    />
    <div
      class="boot__static"
      aria-hidden="true"
    />
    <div
      class="boot__scan"
      aria-hidden="true"
    />
    <div
      class="boot__vignette"
      aria-hidden="true"
    />

    <span
      class="boot__corner boot__corner--tl"
      aria-hidden="true"
    />
    <span
      class="boot__corner boot__corner--tr"
      aria-hidden="true"
    />
    <span
      class="boot__corner boot__corner--bl"
      aria-hidden="true"
    />
    <span
      class="boot__corner boot__corner--br"
      aria-hidden="true"
    />

    <div
      class="boot__bar boot__bar--top"
      aria-hidden="true"
    >
      <span class="boot__id">
        <i class="boot__lamp" />
        <b>SES Griffdive</b>
        <span class="boot__sep" />
        <span class="boot__dim">Destroyer terminal</span>
      </span>
      <span class="boot__fan">Helldivers 2 · fan project</span>
    </div>

    <div
      class="boot__stage"
      aria-hidden="true"
    >
      <div class="boot__scope">
        <span class="boot__halo" />
        <span class="boot__cross boot__cross--h" />
        <span class="boot__cross boot__cross--v" />

        <svg
          class="boot__dial boot__dial--outer"
          viewBox="0 0 240 240"
        >
          <circle
            cx="120"
            cy="120"
            r="106"
            fill="none"
            stroke="var(--khaki)"
            stroke-opacity=".42"
            stroke-width="1.4"
            stroke-dasharray="1.8 9.1"
          />
        </svg>

        <svg
          class="boot__dial boot__dial--arc"
          viewBox="0 0 240 240"
        >
          <circle
            cx="120"
            cy="120"
            r="98"
            fill="none"
            stroke="var(--gold)"
            stroke-opacity=".9"
            stroke-width="2"
            stroke-dasharray="118 497.8"
            transform="rotate(-90 120 120)"
          />
        </svg>

        <svg
          class="boot__dial"
          viewBox="0 0 240 240"
        >
          <circle
            cx="120"
            cy="120"
            r="84"
            fill="none"
            stroke="var(--line-3)"
            stroke-width="1"
          />
          <path
            d="M120 4v11M236 120h-11M120 236v-11M4 120h11"
            fill="none"
            stroke="var(--khaki)"
            stroke-opacity=".62"
            stroke-width="1.4"
          />
        </svg>

        <span class="boot__radar" />

        <svg
          class="boot__mark"
          :viewBox="BRAND_MARK.viewBox"
        >
          <g
            fill="none"
            stroke="var(--khaki)"
          >
            <path
              :d="BRAND_MARK.rim"
              :stroke-width="BRAND_MARK.rimWidth"
            />
            <path
              :d="BRAND_MARK.ticks"
              :stroke-width="BRAND_MARK.tickWidth"
            />
          </g>
          <g fill="var(--gold)">
            <path :d="BRAND_MARK.wings" />
            <path
              fill-rule="evenodd"
              :d="BRAND_MARK.head"
            />
          </g>
        </svg>
      </div>

      <div class="boot__title">
        <h1 class="boot__word disp">
          GRIFFDIVE
        </h1>
        <div class="boot__rule">
          <span class="hazard boot__hazard" />
          <span class="dash boot__dash" />
          <span class="boot__node" />
        </div>
        <p class="boot__tagline">
          <span>CLIMB <b>3 → 10</b></span>
          <i />
          <span>RISK BUYS <b class="gold">RARITY</b></span>
        </p>
      </div>
    </div>

    <div
      class="boot__bar boot__bar--bottom"
      aria-hidden="true"
    >
      <div class="boot__status">
        <span class="boot__status-word"><i class="boot__caret" />{{ status }}</span>
        <span class="boot__track"><i /></span>
      </div>
      <span class="boot__protocol">Protocol <b>1017</b></span>
    </div>
  </div>
</template>

<style scoped>
.boot {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(120% 72% at 50% 26%, rgba(58, 63, 46, 0.5) 0%, rgba(11, 12, 9, 0) 64%),
    radial-gradient(72% 50% at 50% 104%, rgba(74, 215, 200, 0.07) 0%, rgba(11, 12, 9, 0) 72%),
    var(--ground);
  color: var(--text);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  animation: boot-fade 0.5s var(--ease-out) both;
}

.boot *,
.boot *::before,
.boot *::after {
  box-sizing: border-box;
}

/* Backdrop ------------------------------------------------------------- */
.boot__grid {
  position: absolute;
  inset: -12%;
  z-index: 0;
  background-image:
    linear-gradient(rgba(184, 176, 141, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(184, 176, 141, 0.055) 1px, transparent 1px);
  background-size: 48px 48px;
  opacity: 0.8;
  -webkit-mask-image: radial-gradient(ellipse 66% 58% at 50% 44%, #000 18%, transparent 76%);
  mask-image: radial-gradient(ellipse 66% 58% at 50% 44%, #000 18%, transparent 76%);
}

.boot__static {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  opacity: 0.24;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  background-size: 140px 140px;
  image-rendering: pixelated;
  mix-blend-mode: screen;
  animation: boot-static 0.5s steps(6) infinite;
}

.boot__scan {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(236, 234, 218, 0.022) 0 1px,
    transparent 1px 3px
  );
}

.boot__vignette {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: radial-gradient(
    ellipse 82% 74% at 50% 45%,
    transparent 42%,
    rgba(0, 0, 0, 0.55) 100%
  );
}

.boot__corner {
  position: absolute;
  z-index: 5;
  width: 22px;
  height: 22px;
  border: 0 solid rgba(184, 176, 141, 0.3);
  pointer-events: none;
}
.boot__corner--tl {
  top: 14px;
  left: 14px;
  border-top-width: 1px;
  border-left-width: 1px;
}
.boot__corner--tr {
  top: 14px;
  right: 14px;
  border-top-width: 1px;
  border-right-width: 1px;
}
.boot__corner--bl {
  bottom: 14px;
  left: 14px;
  border-bottom-width: 1px;
  border-left-width: 1px;
}
.boot__corner--br {
  bottom: 14px;
  right: 14px;
  border-bottom-width: 1px;
  border-right-width: 1px;
}

/* Terminal bars -------------------------------------------------------- */
.boot__bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 clamp(18px, 3.4vw, 44px);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.2em;
  line-height: 1;
  text-transform: uppercase;
  animation: boot-fade 0.7s 0.15s var(--ease-out) both;
}

.boot__bar--top {
  height: 56px;
  border-bottom: 1px solid rgba(58, 63, 46, 0.5);
  background: linear-gradient(180deg, rgba(14, 16, 11, 0.88), rgba(14, 16, 11, 0));
}

.boot__bar--bottom {
  min-height: 64px;
  border-top: 1px solid rgba(58, 63, 46, 0.5);
  background: linear-gradient(0deg, rgba(14, 16, 11, 0.9), rgba(14, 16, 11, 0));
}

.boot__id {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--khaki);
  white-space: nowrap;
}
.boot__id b {
  color: var(--text);
  font-weight: 700;
  letter-spacing: 0.22em;
}

.boot__lamp {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  background: var(--teal);
  box-shadow: 0 0 9px rgba(74, 215, 200, 0.75);
  animation: boot-pulse 1.8s ease-in-out infinite;
}

.boot__sep {
  width: 1px;
  height: 10px;
  background: var(--line-4);
}

.boot__dim,
.boot__fan {
  color: var(--dim);
  font-weight: 400;
}
.boot__fan {
  letter-spacing: 0.18em;
}

.boot__status {
  display: flex;
  align-items: center;
  gap: clamp(12px, 2vw, 24px);
  flex-grow: 1;
  min-width: 0;
  max-width: 560px;
}

.boot__status-word {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  color: var(--muted);
  letter-spacing: 0.2em;
  white-space: nowrap;
}

.boot__caret {
  width: 6px;
  height: 8px;
  flex-shrink: 0;
  background: var(--gold);
  box-shadow: 0 0 8px rgba(255, 214, 66, 0.55);
  animation: boot-blink 1.1s steps(1) infinite;
}

.boot__track {
  position: relative;
  display: block;
  flex: 1 1 120px;
  height: 3px;
  min-width: 60px;
  overflow: hidden;
  background:
    repeating-linear-gradient(90deg, var(--line-2) 0 1px, transparent 1px 26px),
    var(--line-1);
}

.boot__track i {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  display: block;
  width: 36%;
  background: linear-gradient(90deg, rgba(74, 215, 200, 0) 0%, var(--teal) 42%, var(--gold) 100%);
  animation: boot-load 2.4s var(--ease-snap) infinite;
}
.boot__track i::after {
  content: '';
  position: absolute;
  top: -2px;
  right: 0;
  width: 2px;
  height: 7px;
  background: var(--gold-bright);
  box-shadow: 0 0 10px 2px rgba(255, 214, 66, 0.65);
}

.boot__protocol {
  flex-shrink: 0;
  color: var(--dim);
  letter-spacing: 0.2em;
  white-space: nowrap;
}
.boot__protocol b {
  margin-left: 4px;
  color: var(--gold);
  font-weight: 700;
  letter-spacing: 0.18em;
}

/* The lit object ------------------------------------------------------- */
.boot__stage {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(14px, 2.8vh, 34px);
  min-height: 0;
  padding: clamp(14px, 3vh, 36px) 16px;
}

.boot__scope {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(170px, min(60vw, 40vh), 380px);
  aspect-ratio: 1;
  flex-shrink: 0;
}

.boot__halo {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 214, 66, 0.17) 0%, rgba(255, 214, 66, 0) 68%);
  filter: blur(6px);
  animation: boot-breathe 3.8s ease-in-out infinite;
}

.boot__cross {
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(184, 176, 141, 0.26) 18%,
    rgba(184, 176, 141, 0.26) 82%,
    transparent 100%
  );
}
.boot__cross--h {
  width: 150%;
  height: 1px;
  transform: translate(-50%, -50%);
}
.boot__cross--v {
  width: 1px;
  height: 150%;
  transform: translate(-50%, -50%) rotate(90deg);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(184, 176, 141, 0.18) 18%,
    rgba(184, 176, 141, 0.18) 82%,
    transparent 100%
  );
}

.boot__dial {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.boot__dial--outer {
  animation: boot-spin 90s linear infinite;
}
.boot__dial--arc {
  animation: boot-spin 26s linear infinite reverse;
}

.boot__radar {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 214, 66, 0) 0deg,
    rgba(255, 214, 66, 0) 296deg,
    rgba(255, 214, 66, 0.05) 318deg,
    rgba(255, 214, 66, 0.36) 350deg,
    rgba(255, 214, 66, 0.8) 359deg,
    rgba(255, 214, 66, 0) 360deg
  );
  -webkit-mask: radial-gradient(circle, transparent 69%, #000 71%, #000 86%, transparent 88%);
  mask: radial-gradient(circle, transparent 69%, #000 71%, #000 86%, transparent 88%);
  animation: boot-spin 9s linear infinite;
  opacity: 0.9;
  pointer-events: none;
}

.boot__mark {
  position: relative;
  width: 41%;
  height: 41%;
  overflow: visible;
  filter: drop-shadow(0 0 20px rgba(255, 214, 66, 0.24));
  animation: boot-mark-in 0.8s 0.1s var(--ease-out) both;
}

/* Wordmark ------------------------------------------------------------- */
.boot__title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 1.4vh, 14px);
  width: 100%;
  min-width: 0;
  text-align: center;
}

.boot__word {
  margin: 0;
  color: var(--text);
  font-size: clamp(32px, 8.8vw, 72px);
  letter-spacing: 0.15em;
  line-height: 0.9;
  text-indent: 0.15em;
  text-shadow: 0 0 40px rgba(236, 234, 218, 0.1);
  animation: boot-word-in 0.8s 0.16s var(--ease-out) both;
}

.boot__rule {
  display: flex;
  align-items: center;
  gap: 9px;
  width: min(380px, 62vw);
  height: 6px;
}
.boot__hazard {
  width: clamp(34px, 6vw, 62px);
  height: 6px;
}
.boot__dash {
  height: 1px;
}
.boot__node {
  width: 6px;
  height: 6px;
  border: 1px solid var(--line-5);
}

.boot__tagline {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 9px;
  margin: 0;
  color: var(--khaki);
  font-size: clamp(8px, 1vw, 10px);
  font-weight: 600;
  letter-spacing: 0.18em;
  line-height: 1.4;
  text-transform: uppercase;
}
.boot__tagline b {
  color: var(--text);
  font-weight: 700;
}
.boot__tagline b.gold {
  color: var(--gold);
}
.boot__tagline i {
  width: 4px;
  height: 4px;
  background: var(--line-5);
}

/* Motion --------------------------------------------------------------- */
@keyframes boot-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes boot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.28; }
}
@keyframes boot-breathe {
  0%, 100% { opacity: 0.55; transform: scale(0.96); }
  50% { opacity: 1; transform: scale(1.04); }
}
@keyframes boot-blink {
  0% { opacity: 1; }
  50% { opacity: 0.15; }
}
@keyframes boot-spin {
  to { transform: rotate(360deg); }
}
@keyframes boot-mark-in {
  from { opacity: 0.35; transform: scale(0.9); }
  to { opacity: 1; transform: none; }
}
@keyframes boot-word-in {
  from { opacity: 0.3; transform: translateY(7px) scale(1.015); }
  to { opacity: 1; transform: none; }
}
@keyframes boot-load {
  0% { transform: translateX(-105%); opacity: 0; }
  14% { opacity: 1; }
  82% { transform: translateX(275%); opacity: 1; }
  83%, 100% { transform: translateX(275%); opacity: 0; }
}
@keyframes boot-static {
  0% { background-position: 0 0; }
  20% { background-position: -37px 23px; }
  40% { background-position: 19px -31px; }
  60% { background-position: -11px -17px; }
  80% { background-position: 31px 7px; }
  100% { background-position: 0 0; }
}

/* Narrow and short screens --------------------------------------------- */
@media (max-width: 720px) {
  .boot__corner {
    width: 15px;
    height: 15px;
    opacity: 0.7;
  }
  .boot__corner--tl,
  .boot__corner--tr {
    top: 8px;
  }
  .boot__corner--tl,
  .boot__corner--bl {
    left: 8px;
  }
  .boot__corner--tr,
  .boot__corner--br {
    right: 8px;
  }
  .boot__corner--bl,
  .boot__corner--br {
    bottom: 8px;
  }

  .boot__bar {
    padding: 0 16px;
    font-size: 8px;
    letter-spacing: 0.16em;
  }
  .boot__bar--top {
    height: 48px;
  }
  .boot__fan {
    display: none;
  }

  .boot__bar--bottom {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px 12px;
    min-height: 0;
    padding: 13px 16px 16px;
  }
  .boot__status {
    display: contents;
  }
  .boot__status-word {
    grid-column: 1;
    grid-row: 1;
  }
  .boot__protocol {
    grid-column: 2;
    grid-row: 1;
  }
  .boot__track {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    max-width: none;
  }

  .boot__word {
    font-size: clamp(30px, 8.8vw, 54px);
  }
  .boot__rule {
    width: min(280px, 68vw);
  }
  .boot__tagline {
    gap: 7px;
    letter-spacing: 0.14em;
  }
}

@media (max-height: 560px) {
  .boot__stage {
    gap: 9px;
    padding: 10px 16px;
  }
  .boot__scope {
    width: clamp(140px, min(44vw, 40vh), 210px);
  }
  .boot__word {
    font-size: clamp(26px, 5.8vw, 42px);
  }
  .boot__title {
    gap: 6px;
  }
  .boot__rule {
    display: none;
  }
  .boot__bar--top {
    height: 42px;
  }
  .boot__bar--bottom {
    padding-top: 10px;
    padding-bottom: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .boot,
  .boot__bar,
  .boot__lamp,
  .boot__halo,
  .boot__caret,
  .boot__dial--outer,
  .boot__dial--arc,
  .boot__radar,
  .boot__mark,
  .boot__word,
  .boot__static {
    animation: none;
  }
  .boot__track i {
    animation: none;
    transform: translateX(0);
  }
}
</style>
