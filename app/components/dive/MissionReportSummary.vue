<script setup lang="ts">
import { maxStarsFor } from '~~/shared/engine/config'
import { performanceValor } from '~~/shared/engine/rewards'
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{ state: DiveState }>()

const report = computed(() => props.state.lastReport)
const success = computed(() => report.value?.outcome === 'success')
const stars = computed(() => report.value?.stars ?? 0)
const maxStars = computed(() => maxStarsFor(props.state.difficulty))
const samples = computed(() => report.value?.samples ?? null)
const timePct = computed(() => report.value?.timePct ?? 0)
const performance = computed(() => performanceValor(report.value))
</script>

<template>
  <section
    class="report-card"
    aria-label="Mission report"
  >
    <header class="rc-head">
      <span class="lbl">Report</span>
      <span
        class="rc-status"
        :class="{ fail: !success }"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          aria-hidden="true"
        ><path :d="success ? 'M5 12l5 5 9-10' : 'M6 6l12 12M18 6L6 18'" /></svg>
        {{ success ? 'Success' : 'Failed' }}
      </span>
    </header>

    <div
      class="rc-stars"
      role="img"
      :aria-label="`${stars} of ${maxStars} stars`"
    >
      <svg
        v-for="i in maxStars"
        :key="i"
        viewBox="0 0 24 24"
        class="rc-star"
        :class="{ on: i <= stars }"
      ><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" /></svg>
      <span class="rc-star-count">{{ stars }}/{{ maxStars }}</span>
    </div>

    <div
      class="rc-samples"
      aria-label="Samples extracted"
    >
      <span class="rc-sample">
        <span
          class="rc-dot common"
          aria-hidden="true"
        />
        {{ samples?.common ?? 0 }}
      </span>
      <span class="rc-sample">
        <span
          class="rc-dot rare"
          aria-hidden="true"
        />
        {{ samples?.rare ?? 0 }}
      </span>
      <span class="rc-sample">
        <span
          class="rc-dot super"
          aria-hidden="true"
        />
        {{ samples?.super ?? 0 }}
      </span>
    </div>

    <div class="rc-time">
      <div class="rc-time-head">
        <span>Time left</span>
        <span class="rc-time-val">{{ timePct }}%</span>
      </div>
      <div
        class="rc-bar"
        role="progressbar"
        aria-label="Time remaining"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="timePct"
        :aria-valuetext="`${timePct} percent`"
      >
        <span :style="{ width: `${timePct}%` }" />
      </div>
    </div>

    <div class="rc-perf">
      <span class="lbl">Performance</span>
      <span class="disp rc-perf-val">+{{ performance.toFixed(2) }}</span>
    </div>
  </section>
</template>

<style scoped>
.report-card {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 12px;
  border: 1px dashed var(--line-2);
}
.rc-head { display: flex; align-items: center; justify-content: space-between; }
.rc-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--teal);
}
.rc-status.fail { color: var(--red); }

.rc-stars { display: flex; align-items: center; gap: 3px; }
.rc-star { width: 18px; height: 18px; fill: var(--line-3); }
.rc-star.on { fill: var(--gold); }
.rc-star-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
}

.rc-samples { display: flex; align-items: center; justify-content: space-between; }
.rc-sample {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.rc-dot {
  width: 14px;
  height: 14px;
  border: 1px solid color-mix(in srgb, currentColor 45%, transparent);
}
.rc-dot.common { background: var(--sample-common); }
.rc-dot.rare { background: var(--sample-rare); }
.rc-dot.super { background: var(--sample-super); }

.rc-time { display: flex; flex-direction: column; gap: 5px; }
.rc-time-head {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.rc-time-val { color: var(--text); }
.rc-bar { height: 4px; background: var(--line-2); }
.rc-bar span {
  display: block;
  height: 4px;
  background: var(--teal);
  transition: width 0.5s var(--ease-out);
}

.rc-perf {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 9px;
  border-top: 1px solid var(--line-2);
}
.rc-perf-val {
  font-size: 0.95rem;
  color: var(--teal);
}
</style>
