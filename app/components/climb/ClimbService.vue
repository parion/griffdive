<script setup lang="ts">
import { PROMOTION_DISPATCHES, SPECIALIST_RANK_TITLES, SUCCESSION_DISPATCH, specialistById } from '~~/shared/data/specialists'
import { fillDispatch, meritsEarnedBy, meritsToNextRank, promotionsDue, specialistRankOf } from '~~/shared/engine/specialists'
import type { DiveState } from '~~/shared/engine/types'

// The squad's specialists on the climbs page: rank, what this mission earns
// them when the squad moves on, and the dispatch for anyone it promotes. The
// engine banks the merits at ADVANCE; this only announces them.
const props = defineProps<{
  state: DiveState
  selfId: string | null
}>()

const promotions = computed(() => new Map(promotionsDue(props.state).map(entry => [entry.diverId, entry])))

const records = computed(() => props.state.divers.flatMap((diver) => {
  const commission = diver.commission
  const specialist = specialistById(commission?.specialistId)
  if (!commission || !specialist) {
    return []
  }
  const earned = meritsEarnedBy(props.state, diver)
  const merits = commission.merits + earned.cleanOperation + earned.commendation
  const rank = specialistRankOf(merits)
  const promotion = promotions.value.get(diver.id)
  const name = diver.id === props.selfId ? 'You' : upperName(diver.name)
  const values = { name: upperName(diver.name), specialist: specialist.name, predecessor: upperName(commission.predecessor) ?? '' }
  const toNext = meritsToNextRank(merits)
  return [{
    id: diver.id,
    name,
    specialist: specialist.name,
    title: SPECIALIST_RANK_TITLES[rank],
    earned,
    broken: commission.ordersBroken,
    next: toNext === null ? null : `${toNext} to ${SPECIALIST_RANK_TITLES[rank + 1]}`,
    promotion: promotion
      ? fillDispatch(PROMOTION_DISPATCHES[promotion.to] ?? '', values)
      : null,
    succession: commission.predecessor && !promotion
      ? fillDispatch(SUCCESSION_DISPATCH, values)
      : null,
  }]
}))
</script>

<template>
  <section
    v-if="records.length"
    class="service"
    aria-labelledby="service-h"
  >
    <h3
      id="service-h"
      class="cap"
    >
      Service record
    </h3>
    <ul class="records">
      <li
        v-for="record in records"
        :key="record.id"
        class="record"
        :class="{ promoted: record.promotion }"
      >
        <div class="line">
          <b>{{ record.name }}</b>
          <span class="spec">{{ record.specialist }}</span>
          <span class="rank">{{ record.title }}</span>
        </div>
        <div class="line facts">
          <span
            v-if="record.earned.cleanOperation"
            class="gain"
          >+{{ record.earned.cleanOperation }} clean operation</span>
          <span
            v-if="record.earned.commendation"
            class="gain"
          >+{{ record.earned.commendation }} commendation</span>
          <span
            v-if="record.broken"
            class="lost"
          >Orders broken</span>
          <span
            v-if="record.next"
            class="next"
          >{{ record.next }}</span>
        </div>
        <p
          v-if="record.promotion"
          class="dispatch"
        >
          {{ record.promotion }}
        </p>
        <p
          v-else-if="record.succession"
          class="dispatch quiet"
        >
          {{ record.succession }}
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.service { display: grid; gap: 8px; min-width: 0; }
.service .cap { margin: 0; }
.records { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.record {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-left: 2px solid var(--teal);
  background: color-mix(in srgb, var(--teal) 5%, var(--panel));
}
.record.promoted { border-left-color: var(--gold); background: color-mix(in srgb, var(--gold) 7%, var(--panel)); }
.line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; min-width: 0; }
.line b { font-size: 14px; }
.spec { color: var(--khaki); font-size: 12px; }
.rank { color: var(--teal); font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
.record.promoted .rank { color: var(--gold); }
.facts { font-size: 11px; color: var(--muted); }
.gain { color: var(--teal); font-weight: 700; }
.lost { color: var(--red); font-weight: 700; }
.dispatch { margin: 2px 0 0; color: var(--text); font-size: 12px; font-style: italic; line-height: 1.4; }
.dispatch.quiet { color: var(--dim); }
</style>
