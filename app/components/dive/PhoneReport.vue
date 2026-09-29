<script setup lang="ts">
import { STARS_TO_OPTIONS, maxStarsFor, sampleAvailability } from '~~/shared/engine/config'
import { performanceValor } from '~~/shared/engine/rewards'
import { currentFront } from '~~/shared/engine/selectors'
import { factionImageUrl } from '~~/shared/data/images'
import type { DiveState, SampleCounts } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  baseValor: number
}>()

const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const stars = defineModel<number>('stars', { required: true })
const time = defineModel<number>('time', { required: true })
const samples = defineModel<SampleCounts>('samples', { required: true })

const maxStars = computed(() => maxStarsFor(props.state.difficulty))
const sampleMax = computed(() => sampleAvailability(props.state.difficulty))
const front = computed(() => currentFront(props.state))
const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))

const performance = computed(() => performanceValor({
  outcome: 'success',
  stars: stars.value,
  timePct: time.value,
  samples: { ...samples.value },
}))

const total = computed(() => props.baseValor + performance.value)
const options = computed(() => Math.min(
  STARS_TO_OPTIONS[stars.value] ?? 1,
  STARS_TO_OPTIONS.length - 1,
))
const honors = computed(() => stars.value >= maxStars.value)
</script>

<template>
  <div class="phone-report">
    <div class="scroll">
      <section
        class="banner cut-sm"
        aria-label="Mission complete"
      >
        <span class="flash" />
        <span class="hazard bar" />
        <div class="banner-body">
          <h1 class="disp banner-title">
            Mission complete
          </h1>
          <div class="banner-meta">
            <span
              v-if="frontImage"
              class="meta-front"
            >
              <img
                :src="frontImage"
                alt=""
              >{{ front?.displayName }}
            </span>
            <span class="meta-sep">/</span>
            <span class="meta-extract">Objectives + extraction</span>
          </div>
        </div>
        <span class="hazard bar" />
      </section>

      <section
        class="card stars"
        aria-label="Stars"
      >
        <div class="card-head">
          <span class="lbl">Stars · max {{ maxStars }}</span>
          <span class="card-num">
            <span class="disp n">{{ stars }}</span><span class="disp d">/{{ maxStars }}</span>
          </span>
        </div>
        <StarRating
          v-model="stars"
          :length="maxStars"
          size="lg"
        />
        <div
          class="honors"
          :class="{ on: honors }"
          role="status"
        >
          {{ honors
            ? 'Full stars · squad honors unlocked'
            : `Squad honors · need ${maxStars} stars` }}
        </div>
      </section>

      <section
        class="card"
        aria-label="Samples"
      >
        <span class="lbl">Samples</span>
        <SampleCanister
          v-model="samples.common"
          :max="sampleMax.common"
          tone="common"
          label="Common"
          icon="/images/svgs/Common_Sample_Icon.svg"
        />
        <SampleCanister
          v-if="sampleMax.rare > 0"
          v-model="samples.rare"
          :max="sampleMax.rare"
          tone="rare"
          label="Rare"
          icon="/images/svgs/Rare_Sample_Icon.svg"
        />
        <SampleCanister
          v-if="sampleMax.super > 0"
          v-model="samples.super"
          :max="sampleMax.super"
          tone="super"
          label="Super"
          icon="/images/svgs/Super_Sample_Icon.svg"
        />
      </section>

      <section
        class="card"
        aria-label="Time remaining"
      >
        <SegmentedBar
          v-model="time"
          :max="100"
          label="Time remaining"
          tone="var(--teal)"
        />
      </section>
    </div>

    <footer class="report-foot">
      <section
        class="performance ticks"
        aria-label="Performance"
      >
        <div class="perf-cell">
          <span class="lbl teal">Performance</span>
          <span
            class="disp perf-v teal"
            aria-live="polite"
          >+{{ performance.toFixed(1) }}</span>
        </div>
        <span class="perf-div" />
        <div class="perf-cell">
          <span class="lbl">Valor</span>
          <span class="perf-valor">
            <span class="disp">{{ baseValor }}</span>
            <span class="disp teal">+{{ performance.toFixed(1) }}</span>
          </span>
        </div>
        <div
          class="perf-options"
          role="img"
          :aria-label="`${stars} stars gives ${options} reward options`"
        >
          <span class="opt-line"><b>{{ stars }}</b>★ → {{ options }} options</span>
          <span class="opt-crates">
            <i
              v-for="n in options"
              :key="n"
            />
          </span>
        </div>
      </section>

      <div class="foot-actions">
        <button
          class="btn primary cut file"
          type="button"
          @click="emit('submit')"
        >
          <span class="disp">File report</span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <button
          class="ghost cancel"
          type="button"
          @click="emit('cancel')"
        >
          Cancel
        </button>
      </div>
      <p class="total-note">
        Valor {{ baseValor }} → {{ total.toFixed(1) }}
      </p>
    </footer>
  </div>
</template>

<style scoped>
.phone-report { display: flex; flex-direction: column; min-height: 100%; }
.scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px 14px;
}

.banner {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--panel);
  border: 1px solid var(--line-4);
}
.flash {
  position: absolute;
  inset: 0;
  background: var(--gold);
  opacity: 0;
  pointer-events: none;
  animation: flashIn 0.6s 0.18s ease-out both;
}
.hazard {
  display: block;
  height: 6px;
  background-image: repeating-linear-gradient(-45deg, var(--gold) 0 8px, var(--ground) 8px 16px);
}
.banner-body {
  position: relative;
  padding: 11px 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.banner-title {
  margin: 0;
  font-size: 23px;
  color: var(--gold);
  white-space: nowrap;
  animation: slam 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.banner-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--khaki);
}
.meta-front { display: flex; align-items: center; gap: 5px; color: var(--red); }
.meta-front img { width: 14px; height: 14px; object-fit: contain; }
.meta-sep { color: var(--line-4); }
.meta-extract { color: var(--teal); }

.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  flex-shrink: 0;
}
.card-head { display: flex; justify-content: space-between; align-items: baseline; }
.card-num { display: flex; align-items: baseline; gap: 2px; }
.card-num .n { font-size: 22px; color: var(--gold); }
.card-num .d { font-size: 12px; color: var(--dim); }
.stars :deep(.star-rating) { display: flex; gap: 8px; }
.stars :deep(.star) { flex: 1 1 0; height: 52px; }
.honors {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border: 1px dashed var(--line-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.honors.on {
  border: 1px solid var(--gold);
  color: var(--gold);
  background-image: repeating-linear-gradient(-45deg, rgba(255, 214, 66, 0.28) 0 4px, transparent 4px 8px);
}

.report-foot {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--line-1);
  background: var(--ground);
}
.performance {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line-3);
  background-color: var(--panel);
}
.perf-cell { display: flex; flex-direction: column; gap: 4px; }
.perf-cell .lbl { font-size: 9px; }
.file .disp { font-size: 19px; }
.perf-v { font-size: 22px; }
.perf-valor { display: flex; align-items: baseline; }
.perf-valor .disp { font-size: 22px; color: var(--gold); }
.perf-valor .disp.teal { font-size: 22px; color: var(--teal); }
.perf-div { width: 1px; height: 32px; background: var(--line-2); }
.perf-options {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.opt-line { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.opt-line b { color: var(--gold); }
.opt-crates { display: flex; gap: 4px; }
.opt-crates i {
  width: 20px;
  height: 20px;
  border: 1px solid var(--line-3);
  background: var(--ground);
}
.teal { color: var(--teal); }

.foot-actions { display: flex; gap: 8px; }
.file {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
}
.cancel {
  width: 96px;
  height: 56px;
  flex-shrink: 0;
  color: var(--khaki);
}
.total-note {
  margin: 0;
  text-align: right;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
</style>
