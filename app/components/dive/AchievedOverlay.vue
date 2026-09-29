<script setup lang="ts">
import { createSaveDoc } from '~~/shared/engine/saves'
import { REWARD_TOKEN_CAP, baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  crusadeLabel: string
  mode: 'local' | 'room'
  slotName: string
}>()

const variant = computed(() => props.state.settings?.variant ?? 'standard')
const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const opNumber = computed(() => catchUpOpsBehind(props.state.difficulty, variant.value) + 1)

const itemsOwned = computed(() =>
  Object.values(props.state.personalInventories).flat().length)

const records = computed(() => [
  { label: 'Difficulty', value: String(props.state.difficulty), unit: difficultyName(props.state.difficulty) },
  { label: 'Missions', value: String(props.state.missionIndex), unit: 'flown' },
  { label: 'Operations', value: String(opNumber.value), unit: 'cleared' },
  { label: 'Combos', value: String(props.state.completedCombos.length), unit: 'cleared' },
  { label: 'Divers', value: String(props.state.divers.length), unit: 'extracted' },
  { label: 'Items', value: String(itemsOwned.value), unit: 'owned' },
])

// The ascending ladder: difficulty 3 at the short end up to the 504px goal at
// 10. Every rung below the peak reads cleared; 10 carries the goal flag.
const rungs = computed(() => Array.from({ length: 8 }, (_, i) => {
  const n = i + 3
  return {
    n,
    name: difficultyName(n),
    tier: baseTierFor(n),
    pips: missionsPerOperation(n),
    height: 120 + (n - 3) * 55,
    state: n < 10 ? 'cleared' : 'goal',
    delay: `${0.75 + i * 0.16}s`,
  }
}))

const tags = computed(() => props.state.divers.map((diver, index) => ({
  id: diver.id,
  initial: diver.name.trim().slice(0, 1).toUpperCase(),
  name: diver.name,
  isHost: diver.isHost,
  items: (props.state.personalInventories[diver.id] ?? []).length,
  tokens: diver.rewardTokens,
  delay: `${2.35 + index * 0.12}s`,
})))

const tokenChits = REWARD_TOKEN_CAP

const revealKey = ref(0)
function replay(): void {
  revealKey.value += 1
}

function exportCrusade(): void {
  if (!import.meta.client) {
    return
  }
  const doc = createSaveDoc(props.state, props.slotName, new Date().toISOString())
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `griffdive-${props.slotName.replace(/[^a-z0-9_-]+/gi, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="achieved">
    <header class="ach-head">
      <NuxtLink
        to="/"
        class="ach-brand"
        aria-label="Griffdive bridge"
      >
        <BrandMark :size="26" />
        <span class="disp ach-brand-word">Griffdive</span>
      </NuxtLink>
      <span class="ach-div" />
      <div class="ach-crusade">
        <span class="lbl ach-lbl">Crusade</span>
        <span class="ach-crusade-name">{{ crusadeLabel }}</span>
      </div>

      <p class="ach-pardon rv-rise">
        <span class="lbl ach-pardon-lbl">Ministry notice<br>Pardon</span>
        <span class="ach-pardon-copy">
          The Ministry has reviewed your file and finds your debt to liberty settled.
          Griffdiver, you are pardoned — restored to the franchise you squandered. Do not
          squander it again.
        </span>
      </p>

      <div
        v-if="mode === 'room'"
        class="ach-room"
      >
        <span class="lbl ach-lbl">Room</span>
        <span class="ach-room-code">{{ slotName }}</span>
      </div>

      <button
        type="button"
        class="icon-btn ach-replay"
        aria-label="Replay the victory reveal"
        @click="replay"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        ><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4h4" /></svg>
      </button>
    </header>

    <main
      id="main-content"
      :key="revealKey"
      class="ach-stage scan rv-shake"
      tabindex="-1"
    >
      <div
        class="ach-rays rv-rays"
        aria-hidden="true"
      />

      <div
        class="ach-marquee"
        aria-hidden="true"
      >
        <div class="rv-band ach-band">
          <div class="ach-band-inner">
            <span class="disp">Griffdive achieved</span>
            <span class="ach-diamond" />
            <span class="disp ach-band-ink">Difficulty {{ state.difficulty }} cleared</span>
            <span class="ach-diamond" />
            <span class="disp">Squad extracted</span>
            <span class="ach-diamond" />
          </div>
        </div>
      </div>

      <div class="ach-top">
        <div class="ach-hero">
          <div class="rv-rise ach-chip-row">
            <span class="ach-chip">CRUSADE COMPLETE</span>
            <span class="lbl ach-op">
              Operation {{ opNumber }} · {{ difficultyName(state.difficulty) }} · {{ opLength }}/{{ opLength }} missions
            </span>
          </div>
          <h1 class="ach-title">
            <span class="disp rv-slam ach-line">Griffdive</span>
            <span class="disp rv-slam ach-line gold">Achieved</span>
          </h1>
        </div>

        <div class="ach-ladder-wrap">
          <div
            class="ach-flag rv-flag"
            aria-hidden="true"
          >
            <span class="ach-flag-pole" />
            <span class="ach-flag-cloth">
              <BrandMark :size="18" />
            </span>
            <span class="ach-flag-foot" />
          </div>
          <ol
            class="ach-ladder"
            aria-label="Crusade ladder, all cleared"
          >
            <li
              v-for="r in rungs"
              :key="r.n"
              class="ach-rung"
              :style="{ height: `${r.height}px` }"
              :aria-label="`${r.name}, difficulty ${r.n}, tier ${r.tier}, cleared`"
            >
              <span
                class="rv-rung ach-rung-fill"
                :class="r.state"
                :style="{ animationDelay: r.delay }"
                aria-hidden="true"
              />
              <span class="ach-rung-top">
                <span
                  class="disp rv-num ach-rung-n"
                  :style="{ animationDelay: r.delay }"
                >{{ r.n }}</span>
                <span
                  class="tier-badge sm"
                  :data-tier="r.tier"
                >{{ r.tier }}</span>
              </span>
              <span
                class="ach-rung-pips"
                aria-hidden="true"
              >
                <span
                  v-for="p in r.pips"
                  :key="p"
                />
              </span>
            </li>
          </ol>
          <div class="rv-rise ach-peak">
            <span class="disp ach-peak-n">{{ state.difficulty }}</span>
            <span class="ach-peak-name">{{ difficultyName(state.difficulty) }}</span>
          </div>
        </div>
      </div>

      <section
        class="ach-record"
        aria-label="Crusade record"
      >
        <dl class="ach-stats">
          <div
            v-for="(row, i) in records"
            :key="row.label"
            class="rv-rise ach-stat"
            :style="{ animationDelay: `${1.55 + i * 0.08}s` }"
          >
            <dt class="lbl">
              {{ row.label }}
            </dt>
            <dd>
              <span class="disp ach-stat-n">{{ row.value }}</span>
              <span class="ach-stat-u">{{ row.unit }}</span>
            </dd>
          </div>
        </dl>

        <div
          class="ach-divider"
          aria-hidden="true"
        />

        <ul
          class="ach-tags"
          aria-label="Squad"
        >
          <li
            v-for="tag in tags"
            :key="tag.id"
            class="rv-tag ach-tag"
            :style="{ animationDelay: tag.delay }"
          >
            <span
              class="ach-tag-string"
              aria-hidden="true"
            />
            <div class="ach-tag-card">
              <span
                class="ach-tag-hole"
                aria-hidden="true"
              />
              <div class="ach-tag-head">
                <span
                  class="cut-sm disp ach-tag-av"
                  :class="{ host: tag.isHost }"
                >{{ tag.initial }}</span>
                <div class="ach-tag-id">
                  <span class="ach-tag-name">{{ tag.name }}</span>
                  <span class="lbl ach-tag-role">{{ tag.isHost ? 'Host' : 'Diver' }}</span>
                </div>
              </div>
              <div
                class="ach-tag-rule"
                aria-hidden="true"
              />
              <div class="ach-tag-stat">
                <div class="ach-tag-stat-row">
                  <span class="lbl ach-tag-hl">Requisitioned</span>
                  <span class="ach-tag-chits">
                    <span
                      v-for="chit in tokenChits"
                      :key="chit"
                      class="chit"
                      :class="{ on: chit <= tag.tokens }"
                    />
                  </span>
                </div>
                <div class="ach-tag-stat-row">
                  <span class="disp ach-tag-value">{{ tag.items }}</span>
                  <span class="ach-tag-suffix">ITEMS</span>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <nav
          class="rv-rise ach-actions"
          aria-label="Next"
        >
          <NuxtLink
            to="/"
            class="btn cut ach-next"
          >
            <span class="disp">Back to bridge</span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </NuxtLink>
          <button
            type="button"
            class="ghost ach-export"
            @click="exportCrusade"
          >
            <span>EXPORT CRUSADE</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            ><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
          </button>
          <button
            type="button"
            class="ghost ach-endless"
            disabled
            aria-label="Continue in endless mode, locked until after v1"
          >
            <span class="ach-endless-l">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                aria-hidden="true"
              ><rect
                x="5"
                y="11"
                width="14"
                height="10"
              /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              CONTINUE · ENDLESS
            </span>
            <span class="ach-endless-r">POST-V1</span>
          </button>
        </nav>
      </section>
    </main>
  </div>
</template>

<style scoped>
.achieved {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr);
  overflow: hidden;
  background: var(--ground);
}

.ach-head {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  height: 56px;
  padding: 0 var(--sp-5) 0 var(--sp-7);
  border-bottom: 1px solid var(--line-1);
  background: var(--ground);
}
.ach-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
  flex-shrink: 0;
}
.ach-brand:hover { text-decoration: none; }
.ach-brand-word { font-size: 17px; letter-spacing: 0.06em; }
.ach-div { width: 1px; height: 28px; background: var(--line-2); flex-shrink: 0; }
.ach-crusade { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.ach-lbl { font-size: 10px; }
.ach-crusade-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.ach-pardon {
  flex-grow: 1;
  min-width: 0;
  margin: 0 var(--sp-4);
  display: flex;
  align-items: center;
  gap: var(--gap-panel);
  height: 42px;
  padding: 0 var(--sp-4);
  border: 1px dashed color-mix(in srgb, var(--gold) 45%, transparent);
  background: color-mix(in srgb, var(--gold) 4%, transparent);
  animation-delay: 2.6s;
}
.ach-pardon-lbl {
  flex-shrink: 0;
  font-size: 9px;
  line-height: 1.3;
  color: var(--gold);
}
.ach-pardon-copy {
  font-size: 11.5px;
  line-height: 1.3;
  color: var(--khaki);
}

.ach-room {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 var(--sp-4);
  border: 1px solid var(--line-2);
  flex-shrink: 0;
}
.ach-room-code {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.32em;
  color: var(--text);
}
.ach-replay {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.ach-stage {
  position: relative;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--sp-8) var(--pad-page) 0;
}

.ach-rays {
  position: absolute;
  right: -260px;
  top: -390px;
  width: 900px;
  height: 900px;
  border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, rgba(255, 214, 66, 0.075) 0deg 5deg, transparent 5deg 15deg);
  pointer-events: none;
  animation-delay: 2.1s;
}

.ach-marquee {
  position: absolute;
  left: -90px;
  right: -90px;
  top: 410px;
  height: 88px;
  transform: rotate(-5deg);
  transform-origin: 0 0;
  overflow: hidden;
  pointer-events: none;
}
.ach-band {
  position: absolute;
  inset: 0;
}
.ach-band-inner {
  position: absolute;
  left: 0;
  right: 0;
  top: 22px;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 28px;
  padding-left: 150px;
  background: var(--ground);
  white-space: nowrap;
  overflow: hidden;
}
.ach-band-inner .disp { font-size: 19px; letter-spacing: 0.12em; color: var(--gold); }
.ach-band-inner .ach-band-ink { color: var(--text); }
.ach-diamond { width: 8px; height: 8px; background: var(--gold); transform: rotate(45deg); }

.ach-top {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--sp-7);
  min-height: 504px;
}
.ach-hero {
  flex: 1 1 auto;
  min-width: 0;
  margin-top: var(--sp-6);
}
.ach-chip-row {
  display: flex;
  align-items: center;
  gap: var(--gap-panel);
  margin-bottom: var(--sp-5);
  animation-delay: 0.15s;
}
.ach-chip {
  padding: 5px 10px;
  border: 2px solid var(--gold);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--gold);
  white-space: nowrap;
}
.ach-op { font-size: 12px; color: var(--khaki); }
.ach-title {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ach-line {
  display: block;
  font-size: clamp(48px, 9vw, 120px);
  line-height: 0.9;
  letter-spacing: 0.02em;
  color: var(--text);
  transform-origin: 30% 60%;
}
.ach-line.gold {
  color: var(--gold);
  text-shadow: 0 0 40px rgba(255, 214, 66, 0.25);
  animation-delay: 0.5s;
}

.ach-ladder-wrap {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--sp-4);
  margin-top: var(--sp-4);
}
.ach-ladder {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 504px;
}
.ach-rung {
  position: relative;
  width: 42px;
  background: var(--panel);
  border: 1px solid var(--line-2);
}
.ach-rung-fill {
  position: absolute;
  inset: -1px;
  transform-origin: 50% 100%;
  border: 1px solid var(--gold);
  border-top-width: 4px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 22%, transparent), transparent 70%);
}
.ach-rung-fill.goal {
  background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 40%, transparent), transparent 80%);
}
.ach-rung-top {
  position: absolute;
  left: 0;
  right: 0;
  top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.ach-rung-n { font-size: 18px; color: var(--text); }
.ach-rung-pips {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 8px;
  display: flex;
  justify-content: center;
  gap: 3px;
}
.ach-rung-pips span { width: 6px; height: 6px; background: color-mix(in srgb, var(--gold) 55%, transparent); }

.ach-peak {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  animation-delay: 2.25s;
}
.ach-peak-n { font-size: 30px; color: var(--gold); }
.ach-peak-name { font-size: 12px; font-weight: 700; letter-spacing: 0.2em; color: var(--text); }

.ach-flag {
  position: relative;
  width: 70px;
  height: 96px;
  animation-delay: 2.05s;
}
.ach-flag-pole {
  position: absolute;
  left: 20px;
  top: 0;
  width: 3px;
  height: 96px;
  background: var(--gold);
}
.ach-flag-cloth {
  position: absolute;
  left: 23px;
  top: 2px;
  width: 50px;
  height: 32px;
  display: grid;
  place-items: center;
  padding-right: 10px;
  background: var(--gold);
  clip-path: polygon(0 0, 100% 0, 80% 50%, 100% 100%, 0 100%);
  box-shadow: 0 0 30px rgba(255, 214, 66, 0.5);
  color: var(--on-gold);
}
.ach-flag-foot {
  position: absolute;
  left: 14px;
  bottom: -2px;
  width: 15px;
  height: 4px;
  background: var(--gold);
}

.ach-record {
  position: relative;
  margin: var(--sp-7) calc(-1 * var(--pad-page)) 0;
  padding: var(--sp-6) var(--pad-page) var(--sp-8);
  background: var(--rail);
  border-top: 1px solid var(--line-3);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  grid-template-rows: auto auto;
  gap: var(--sp-6);
}
.ach-stats {
  grid-column: 1 / -1;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  border: 1px solid var(--line-1);
  background: var(--ground);
}
.ach-stat {
  display: flex;
  flex-direction: column-reverse;
  justify-content: center;
  gap: 10px;
  padding: var(--sp-5) var(--sp-6);
  border-left: 1px solid var(--line-1);
}
.ach-stat:first-child { border-left: 0; }
.ach-stat dd {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.ach-stat-n { font-size: clamp(28px, 3.2vw, 46px); color: var(--gold); }
.ach-stat-u { font-size: var(--fs-sm); font-weight: 700; color: var(--dim); }

.ach-divider {
  grid-column: 1 / -1;
  height: 2px;
  background: repeating-linear-gradient(90deg, var(--line-5) 0 10px, transparent 10px 14px);
}

.ach-tags {
  grid-column: 1;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-5);
}
.ach-tag {
  position: relative;
  padding-top: 22px;
  transform-origin: 50% 0;
}
.ach-tag-string {
  position: absolute;
  left: 30px;
  top: 0;
  width: 2px;
  height: 30px;
  background: repeating-linear-gradient(180deg, var(--dim) 0 4px, transparent 4px 6px);
}
.ach-tag-card {
  position: relative;
  min-height: 158px;
  padding: var(--sp-5);
  background: var(--panel);
  border: 1px solid var(--line-2);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.ach-tag-hole {
  position: absolute;
  left: 25px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--rail);
  border: 1px solid var(--line-5);
}
.ach-tag-head {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding-top: 6px;
  min-width: 0;
}
.ach-tag-av {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  font-size: 17px;
  background: var(--line-2);
  color: var(--text);
}
.ach-tag-av.host { background: var(--gold); color: var(--on-gold); }
.ach-tag-id { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ach-tag-name {
  font-size: var(--fs-body);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ach-tag-role { font-size: 10px; }
.ach-tag-rule {
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--line-4) 0 6px, transparent 6px 10px);
}
.ach-tag-stat { display: flex; flex-direction: column; gap: 7px; margin-top: auto; }
.ach-tag-stat-row { display: flex; align-items: center; gap: 10px; }
.ach-tag-hl { font-size: 10px; }
.ach-tag-chits { margin-left: auto; display: inline-flex; gap: 3px; }
.ach-tag-value { font-size: 30px; color: var(--gold); }
.ach-tag-suffix {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.ach-actions {
  grid-column: 2;
  grid-row: 2;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  animation-delay: 3.05s;
}
.ach-next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 0 22px;
  background: var(--gold);
  color: var(--on-gold);
}
.ach-next .disp { font-size: 18px; }
.ach-export,
.ach-endless {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 18px;
  color: var(--text);
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.16em;
}
.ach-endless { border-style: dashed; }
.ach-endless:disabled { opacity: 0.5; cursor: not-allowed; }
.ach-endless-l { display: flex; align-items: center; gap: 10px; }
.ach-endless-r { font-size: 10px; letter-spacing: 0.16em; }

.rv-band { animation: bandIn 0.7s var(--ease-out) both; }
.rv-slam { animation: slamIn 0.5s var(--ease-impact) both; }
.rv-shake { animation: shake 0.38s linear 0.72s both; }
.rv-rung { animation: rungOn 0.34s var(--ease-out) both; }
.rv-num { animation: numOn 0.34s linear both; }
.rv-flag { animation: flagIn 0.6s var(--ease-out) both; }
.rv-rays { animation: raysIn 1.2s ease-out both; }
.rv-rise { animation: riseIn 0.5s var(--ease-out) both; }
.rv-tag { animation: tagDrop 0.6s var(--ease-out) both; }

@media (max-width: 1020px) {
  .achieved {
    position: static;
    min-height: 100dvh;
    grid-template-rows: auto auto;
    overflow: visible;
  }
  .ach-head { flex-wrap: wrap; height: auto; padding: var(--sp-4); gap: var(--sp-3); }
  .ach-pardon { order: 3; flex-basis: 100%; height: auto; padding: var(--sp-3); margin: 0; }
  .ach-stage { padding: var(--sp-6) var(--pad-page); }
  .ach-marquee { top: 340px; }
  .ach-top { flex-direction: column; min-height: 0; }
  .ach-ladder-wrap { align-self: stretch; align-items: flex-start; overflow-x: auto; }
  .ach-record { grid-template-columns: minmax(0, 1fr); }
  .ach-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ach-tags { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ach-actions { grid-column: 1; grid-row: auto; }
}

@media (prefers-reduced-motion: reduce) {
  .rv-band,
  .rv-slam,
  .rv-shake,
  .rv-rung,
  .rv-num,
  .rv-flag,
  .rv-rays,
  .rv-rise,
  .rv-tag { animation-delay: 0s !important; }
}
</style>
