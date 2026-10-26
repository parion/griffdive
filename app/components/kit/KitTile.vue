<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { KitArt } from '~/utils/kit'

// One kit item as a lit tile: the art in its well, tier badge and name. With no
// item it is the blue "?" box — a slot a roll will fill — and `fresh` plays the
// landing flash on the tile that just replaced one.
const props = withDefaults(defineProps<{
  item: Item | null
  art: KitArt
  banSource?: 'misfortune' | 'pact' | null
  banPreview?: boolean
  reason?: string
  fresh?: boolean
  tierLabel?: string
}>(), { banSource: null, banPreview: false, reason: '', fresh: false, tierLabel: '' })

const image = computed(() => (props.item ? itemImageUrl(props.item) : undefined))
const title = computed(() => {
  if (!props.item) {
    return props.tierLabel ? `Rolled at launch · ${props.tierLabel}-tier` : 'Rolled at launch'
  }
  return props.reason
    ? `${props.item.displayName} — ${props.reason}${props.banPreview ? ' (if taken)' : ''}`
    : props.item.displayName
})
</script>

<template>
  <li
    class="tile"
    :class="[
      `art-${art}`,
      item ? '' : 'mystery',
      banSource ? `banned ban-${banSource}` : '',
      { preview: banPreview, fresh },
    ]"
    :style="{ '--tier': item ? `var(--tier-${item.tier})` : 'var(--mystery)' }"
    :title="title"
  >
    <div class="media">
      <template v-if="item">
        <img
          v-if="image && art === 'icon'"
          class="glow"
          :src="image"
          alt=""
          loading="lazy"
          draggable="false"
          aria-hidden="true"
        >
        <img
          v-if="image"
          class="art"
          :src="image"
          alt=""
          loading="lazy"
          draggable="false"
        >
        <span
          v-if="banSource"
          class="wash"
          :class="banSource === 'misfortune'
            ? (banPreview ? 'hazard-soft' : 'hazard')
            : (banPreview ? 'hazard-soft-red' : 'hazard-red')"
          aria-hidden="true"
        />
        <span
          class="tier-badge sm"
          :data-tier="item.tier"
        >{{ item.tier.toUpperCase() }}</span>
      </template>
      <template v-else>
        <span
          class="qmark"
          aria-hidden="true"
        >?</span>
        <span
          v-if="tierLabel"
          class="tier-badge sm q-tier"
          aria-hidden="true"
        >{{ tierLabel }}</span>
      </template>
    </div>
    <span class="name">{{ item ? item.displayName : 'Rolled at launch' }}</span>
    <span
      v-if="banSource"
      class="sr-only"
    >Banned: {{ reason }}{{ banPreview ? ' (if taken)' : '' }}</span>
  </li>
</template>

<style scoped>
.tile {
  --ban: var(--red);
  --mystery: #4a90ff;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: linear-gradient(180deg, var(--panel), var(--ground));
  box-shadow: inset 0 0 0 1px var(--line-2), inset 0 -2px 0 var(--tier);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: box-shadow var(--dur-fast), transform var(--dur-fast) var(--ease-out);
}
.tile:hover {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent, var(--line-3)) 70%, var(--line-3)), inset 0 -2px 0 var(--tier);
  transform: translateY(-2px);
}
.tile.ban-misfortune { --ban: var(--gold); }
.tile.banned { box-shadow: inset 0 0 0 1px var(--ban); }
.tile.preview { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ban) 55%, transparent); }

.media {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.art-gear .media {
  aspect-ratio: 16 / 10;
  background:
    radial-gradient(ellipse 60% 50% at 50% 55%, rgba(255, 255, 255, 0.07), transparent 70%),
    radial-gradient(ellipse 80% 70% at 50% 62%, color-mix(in srgb, var(--accent, var(--khaki)) 20%, transparent), transparent 72%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 4px),
    var(--ground);
  border-bottom: 1px solid var(--line-1);
}
.art-icon .media { aspect-ratio: 1; padding: 16% 16% 10%; }

.art {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform var(--dur-med) var(--ease-out), filter var(--dur-med);
}
.art-gear .art {
  padding: var(--sp-2) var(--sp-3);
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.65)) brightness(1.18) contrast(1.08);
}
.art-icon .art {
  width: 100%;
  height: 100%;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
}
.glow {
  position: absolute;
  inset: 22% 22% 16%;
  width: 56%;
  height: 62%;
  object-fit: cover;
  filter: blur(14px) saturate(1.6);
  opacity: 0.7;
  pointer-events: none;
  transition: opacity var(--dur-med);
}
.tile:hover .art { transform: scale(1.06); }
.tile:hover .glow { opacity: 0.9; }

.tile.banned .art { filter: grayscale(1); opacity: 0.4; }
.tile.preview .art { opacity: 0.3; }
.tile.banned .glow,
.tile.preview .glow { display: none; }
.wash { position: absolute; inset: 0; opacity: 0.26; pointer-events: none; }
.media .tier-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: var(--ground);
}

.name {
  display: -webkit-box;
  margin: var(--sp-1) var(--sp-2) var(--sp-2);
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
  overflow-wrap: break-word;
  hyphens: auto;
  text-transform: uppercase;
  color: var(--text);
}
.art-icon .name { margin-top: 0; text-align: center; }
.tile.banned .name { color: var(--muted); }

/* The "?" box: a slot a roll will fill. Blue so it never reads as a tier. */
.tile.mystery {
  background:
    radial-gradient(ellipse 70% 60% at 50% 45%, color-mix(in srgb, var(--mystery) 24%, transparent), transparent 75%),
    linear-gradient(180deg, color-mix(in srgb, var(--mystery) 12%, var(--panel)), var(--ground));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mystery) 70%, var(--line-2)), inset 0 -2px 0 var(--mystery);
}
.tile.mystery:hover { transform: none; }
.tile.mystery .media {
  background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--mystery) 10%, transparent) 0 6px, transparent 6px 12px);
  border-bottom: 1px solid color-mix(in srgb, var(--mystery) 30%, transparent);
}
.qmark {
  color: var(--mystery);
  font: 800 2rem / 1 var(--font-display);
  font-stretch: 125%;
  text-shadow: 0 0 14px color-mix(in srgb, var(--mystery) 70%, transparent);
  animation: qPulse 2.4s ease-in-out infinite;
}
.art-icon .qmark { font-size: 1.6rem; }
.q-tier { color: var(--mystery); border-color: color-mix(in srgb, var(--mystery) 60%, transparent); }
.tile.mystery .name { color: var(--mystery); }

.tile.fresh { animation: kitLand 560ms var(--ease-out) both; }
.tile.fresh::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tier) 55%, transparent), transparent 70%);
  animation: kitFlash 700ms var(--ease-out) both;
}

@keyframes qPulse {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}
@keyframes kitLand {
  0% { transform: scale(0.55) translateY(10px); opacity: 0; filter: brightness(2.6); }
  55% { transform: scale(1.09); opacity: 1; filter: brightness(1.6); }
  100% { transform: none; opacity: 1; filter: none; }
}
@keyframes kitFlash {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
</style>
