<script setup lang="ts">
import type { CrusadeVariant } from '~~/shared/engine/types'

defineProps<{ canControl: boolean }>()

const emit = defineEmits<{ start: [variant: CrusadeVariant] }>()

// Online-room lobby: the host configures and launches the crusade here. Seats
// are mirrored live in the squad rail; the bays below read the pre-launch mood.
const variant = ref<CrusadeVariant>('standard')

const bays = [1, 2, 3, 4]
</script>

<template>
  <section
    v-if="canControl"
    class="panel lobby"
  >
    <header class="sec-h">
      <h2 class="lbl">
        Hellpod bays
      </h2>
      <span class="dash" />
      <span class="chip">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          aria-hidden="true"
        ><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>
        Invite only
      </span>
    </header>

    <div
      class="bays"
      role="img"
      aria-label="Four hellpod bays — one host seated, three awaiting divers"
    >
      <article
        v-for="bay in bays"
        :key="bay"
        class="bay cut-sm"
        :class="bay === 1 ? 'seated' : 'open'"
      >
        <span class="bay-head cap">BAY {{ bay }}</span>
        <div class="bay-body">
          <svg
            class="pod"
            width="60"
            height="90"
            viewBox="0 0 84 126"
            aria-hidden="true"
          >
            <path
              d="M22 6 H62 L72 20 V88 L42 122 L12 88 V20 Z"
              :fill="bay === 1 ? '#1A1D15' : 'none'"
              stroke="currentColor"
              stroke-width="1.5"
              :stroke-dasharray="bay === 1 ? undefined : '5 4'"
              stroke-linejoin="round"
            />
            <rect
              x="22.5"
              y="18.5"
              width="39"
              height="39"
              fill="#0B0C09"
              stroke="#3A3F2E"
            />
            <path
              v-if="bay !== 1"
              d="M42 30 V46 M34 38 H50"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <span
            v-if="bay === 1"
            class="seat disp"
          >HOST</span>
        </div>
        <span class="bay-status cap">{{ bay === 1 ? 'Seated' : 'Awaiting diver' }}</span>
      </article>
    </div>

    <div class="launch">
      <div class="launch-copy">
        <span class="lbl">Starting variant</span>
        <span class="muted small">Only the host launches the crusade — divers can join until then.</span>
      </div>
      <CrusadeSetup
        v-model:variant="variant"
        start-label="Launch crusade"
        @start="emit('start', variant)"
      />
    </div>
  </section>
  <p
    v-else
    class="panel waiting"
  >
    <span
      class="lamp orange pulse"
      aria-hidden="true"
    />
    Waiting for the host to launch the crusade…
  </p>
</template>

<style scoped>
.lobby { gap: 1rem; }

.bays {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
}

.bay {
  display: grid;
  gap: 0.4rem;
  justify-items: center;
  padding: 0.6rem 0.5rem;
  border: 1px dashed var(--line-3);
  background: var(--rail);
  color: var(--dim);
}
.bay.seated {
  border-style: solid;
  border-color: var(--line-4);
  color: var(--gold);
  background: rgba(255, 214, 66, 0.05);
}

.bay-head { justify-self: start; }

.bay-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 5.6rem;
}
.pod { color: currentColor; }

.seat {
  position: absolute;
  font-size: 0.7rem;
  color: var(--text);
}
.bay-body { position: relative; }

.bay-status { color: var(--muted); }
.bay.seated .bay-status { color: var(--gold); }

.launch {
  display: grid;
  gap: 0.7rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--line-2);
}
.launch-copy { display: grid; gap: 0.15rem; }

.waiting { display: flex; align-items: center; gap: 0.6rem; margin: 0; }

@media (max-width: 640px) {
  .bays { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
