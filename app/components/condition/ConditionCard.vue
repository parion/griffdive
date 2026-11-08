<script setup lang="ts">
import type { Condition } from '~~/shared/data/conditions'

const props = withDefaults(defineProps<{
  condition: Condition
  risk: number
  selected?: boolean
  // A stamped verdict: SWORN, HELD, BROKEN, SKIPPED.
  stamp?: string
  stampTone?: 'gold' | 'teal' | 'red'
  blocked?: string
  note?: string
  disabled?: boolean
  compact?: boolean
  open?: boolean
  tilt?: number
  selectable?: boolean
}>(), {
  selected: false,
  stamp: '',
  stampTone: 'gold',
  blocked: '',
  note: '',
  disabled: false,
  compact: false,
  open: false,
  tilt: 0,
  selectable: true,
})

const emit = defineEmits<{
  select: []
  toggleDetails: []
}>()

const accountability = computed(() => {
  switch (props.condition.accountability) {
    case 'loadout': return 'Visible on the loadout screen'
    case 'field': return 'Squad checks during the mission'
    default: return 'Visible on the end-of-mission stats'
  }
})

const expanded = computed(() => !props.compact || props.open)
const detailsId = useId()

function choose(): void {
  if (props.selectable && !props.disabled) {
    emit('select')
  }
}
</script>

<template>
  <article
    v-if="compact"
    class="condition compact"
    :class="{ selected, disabled, broken: stampTone === 'red' }"
    :style="{ '--tilt': `${tilt}deg` }"
  >
    <button
      v-if="selectable"
      class="pick-area"
      type="button"
      :aria-label="`Swear ${condition.name} pact`"
      :aria-pressed="selected"
      :disabled="disabled || Boolean(blocked)"
      @click="choose"
    >
      <span class="condition-head">
        <RiskPips
          :value="risk"
          :max="risk"
          :tone="selected ? 'gold' : 'red'"
        />
        <span class="risk-word cap">Risk {{ risk }}</span>
        <span
          v-if="stamp"
          class="stamp compact-stamp disp"
          :class="stampTone"
          aria-hidden="true"
        >{{ stamp }}</span>
      </span>
      <span class="media">
        <ConditionSigil
          :id="condition.id"
          :size="54"
        />
      </span>
      <span
        class="condition-name disp"
        :style="fitWord(condition.name)"
      >{{ condition.name }}</span>
      <span class="select-hint cap">{{ selected ? 'Tap to unswear' : 'Tap to swear' }}</span>
    </button>
    <div
      v-else
      class="compact-face"
    >
      <span class="condition-head">
        <RiskPips
          :value="risk"
          :max="risk"
          :tone="selected ? 'gold' : 'red'"
        />
        <span class="risk-word cap">Risk {{ risk }}</span>
        <span
          v-if="stamp"
          class="stamp compact-stamp disp"
          :class="stampTone"
          aria-hidden="true"
        >{{ stamp }}</span>
      </span>
      <span class="media">
        <ConditionSigil
          :id="condition.id"
          :size="54"
        />
      </span>
      <span
        class="condition-name disp"
        :style="fitWord(condition.name)"
      >{{ condition.name }}</span>
    </div>
    <button
      class="details-toggle cap"
      type="button"
      :aria-label="`${expanded ? 'Hide' : 'Read'} ${condition.name} rules`"
      :aria-expanded="expanded"
      :aria-controls="detailsId"
      @click.stop="emit('toggleDetails')"
    >
      {{ expanded ? 'Less' : 'Details' }}
    </button>
    <div
      v-show="expanded"
      :id="detailsId"
      class="details-content"
    >
      <span class="condition-rule">“<ConditionRule :condition="condition" />”</span>
      <span
        v-if="note"
        class="note"
      >{{ note }}</span>
      <span class="accountability cap">
        <span
          class="watch"
          aria-hidden="true"
        />
        {{ accountability }}
      </span>
      <span
        v-if="blocked"
        class="blocked"
      >{{ blocked }}</span>
    </div>
  </article>

  <component
    :is="selectable ? 'button' : 'article'"
    v-else
    class="condition"
    :class="{ selected, disabled, expanded, broken: stampTone === 'red' }"
    :style="{ '--tilt': `${tilt}deg` }"
    :type="selectable ? 'button' : undefined"
    :aria-pressed="selectable ? selected : undefined"
    :disabled="selectable ? disabled || Boolean(blocked) : undefined"
    @click="choose"
  >
    <span class="condition-head">
      <RiskPips
        :value="risk"
        :max="risk"
        :tone="selected ? 'gold' : 'red'"
      />
      <span class="risk-word cap">Risk {{ risk }}</span>
    </span>

    <span
      v-if="stamp"
      class="stamp disp"
      :class="stampTone"
      aria-hidden="true"
    >{{ stamp }}</span>

    <span class="media">
      <ConditionSigil
        :id="condition.id"
        :size="78"
      />
    </span>

    <span
      class="condition-name disp"
      :style="fitWord(condition.name)"
    >{{ condition.name }}</span>

    <span class="condition-rule">“<ConditionRule :condition="condition" />”</span>
    <span
      v-if="note"
      class="note"
    >{{ note }}</span>
    <span class="accountability cap">
      <span
        class="watch"
        aria-hidden="true"
      />
      {{ accountability }}
    </span>
    <span
      v-if="blocked"
      class="blocked"
    >{{ blocked }}</span>
  </component>
</template>

<style scoped>
.condition {
  --edge: var(--line-3);
  position: relative;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px 16px;
  border: 1px solid var(--edge);
  background:
    radial-gradient(ellipse 90% 55% at 50% 0%, rgba(255, 214, 66, 0.06), transparent 70%),
    var(--panel);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transform: rotate(var(--tilt));
  transition:
    transform var(--dur-med) var(--ease-out),
    border-color var(--dur-med),
    box-shadow var(--dur-med),
    filter var(--dur-med);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}
.condition:not(.compact):hover:not(:disabled) {
  border-color: var(--line-5);
  filter: brightness(1.04);
}
.condition.selected {
  --edge: var(--gold);
  transform: rotate(0deg) translateY(-6px);
  background:
    radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255, 214, 66, 0.14), transparent 72%),
    var(--panel);
  box-shadow: 0 0 26px rgba(255, 214, 66, 0.14), inset 0 0 0 1px var(--gold);
}
.condition.broken {
  --edge: var(--red);
  background:
    radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255, 75, 62, 0.12), transparent 72%),
    var(--panel);
}
.condition.disabled,
.condition:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.condition.disabled:hover,
.condition:disabled:hover { filter: none; }

.condition-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 18px;
}
.condition-head :deep(.pips i) { width: 17px; height: 17px; }
.risk-word { color: var(--red); }
.selected .risk-word { color: var(--gold); }

.stamp {
  position: absolute;
  z-index: 4;
  top: 96px;
  right: 8px;
  padding: 3px 10px 2px;
  border: 3px solid currentColor;
  color: var(--gold);
  font-size: 18px;
  letter-spacing: 0.16em;
  transform: rotate(-7deg);
  animation: stampIn 0.42s var(--ease-out) both;
  background: rgba(11, 12, 9, 0.6);
  -webkit-mask-image: repeating-linear-gradient(118deg, #000 0 3px, rgba(0, 0, 0, 0.45) 3px 4px, #000 4px 9px);
  mask-image: repeating-linear-gradient(118deg, #000 0 3px, rgba(0, 0, 0, 0.45) 3px 4px, #000 4px 9px);
  pointer-events: none;
}
.stamp.teal { color: var(--teal); }
.stamp.red { color: var(--red); }

.pick-area,
.compact-face {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}
.pick-area { cursor: pointer; }
.pick-area:hover:not(:disabled) .condition-name { color: var(--gold); }
.pick-area:disabled { cursor: not-allowed; }
.condition.compact { cursor: default; }
.condition.compact:hover { border-color: var(--edge); filter: none; }
.compact .condition-head { justify-content: flex-start; }
.compact .risk-word { margin-right: auto; }
.compact-stamp {
  position: static;
  flex: 0 0 auto;
  padding: 2px 6px;
  border-width: 2px;
  font-size: 12px;
}
.select-hint {
  align-self: flex-end;
  color: var(--dim);
  font-size: 10px;
  text-align: right;
}
.selected .select-hint { color: var(--gold); }
.details-toggle {
  align-self: flex-end;
  min-width: 72px;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid var(--line-3);
  background: var(--ground);
  color: var(--khaki);
  font: 700 11px var(--font-body);
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
  cursor: pointer;
}
.details-toggle:hover { border-color: var(--gold); color: var(--gold); }
.details-content { display: flex; flex-direction: column; gap: 8px; }

.media {
  display: grid;
  place-items: center;
  min-height: 108px;
  border: 1px solid var(--line-2);
  background:
    linear-gradient(rgba(184, 176, 141, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(184, 176, 141, 0.04) 1px, transparent 1px),
    var(--ground);
  background-size: 26px 26px;
  color: var(--red);
  filter: drop-shadow(0 0 12px rgba(255, 75, 62, 0.14));
}
.selected .media {
  border-color: color-mix(in srgb, var(--gold) 45%, var(--line-2));
  color: var(--gold);
  filter: drop-shadow(0 0 16px rgba(255, 214, 66, 0.22));
}
.broken .media {
  border-color: color-mix(in srgb, var(--red) 45%, var(--line-2));
  color: var(--red);
}

.condition-name {
  font-size: min(clamp(22px, 2vw, 28px), 100cqi / var(--fit-len, 1));
  line-height: 1.02;
  color: var(--text);
}
.compact .condition-name { font-size: min(22px, 100cqi / var(--fit-len, 1)); }

.condition-rule {
  font-size: 15px;
  line-height: 1.45;
  color: var(--khaki);
}
.note {
  color: var(--orange);
  font-size: 12px;
  line-height: 1.35;
}
.accountability {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--line-2);
  color: var(--dim);
  font-size: var(--fs-sm);
  line-height: 1.3;
  white-space: normal;
}
.watch {
  width: 12px;
  height: 8px;
  border: 1px solid currentColor;
  border-radius: 50%;
  position: relative;
}
.watch::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: currentColor;
}
.blocked {
  color: var(--red);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.compact {
  padding: 12px 14px;
  gap: 8px;
  transform: none;
}
.compact.selected {
  transform: none;
}
.compact .media { min-height: 70px; }
.compact .condition-rule { font-size: 13px; }
</style>
