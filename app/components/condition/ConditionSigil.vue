<script setup lang="ts">
const props = withDefaults(defineProps<{
  id: string
  size?: number
}>(), { size: 64 })

// A line sigil per condition. These are Griffdive marks, not in-game art:
// conditions have no canonical emblem, so each rule gets one legible object.
const paths: Record<string, string[]> = {
  noBackpacks: ['M8 9h16v13H8z', 'M12 9V6a4 4 0 0 1 8 0v3', 'M8 15h16'],
  packLight: ['M8 9h16v13H8z', 'M12 9V6a4 4 0 0 1 8 0v3', 'M8 15h16'],
  noSentries: ['M6 18h20', 'M9 18v-4h14v4', 'M12 14V9h8v5', 'M16 9V5'],
  openField: ['M6 19h20', 'M10 19v-5h12v5', 'M13 14l3-5 3 5'],
  noBoosters: ['M10 18h6l-1 4h-4z', 'M11 18V9l5-5 2 2-4 4v8'],
  emptyPockets: ['M10 18h6l-1 4h-4z', 'M11 18V9l5-5 2 2-4 4v8'],
  noResupplies: ['M10 6h8v18h-8z', 'M10 10h8', 'M13 3h2v3h-2z'],
  thirsty: ['M10 6h8v18h-8z', 'M10 10h8', 'M13 3h2v3h-2z'],
  noEagles: ['M4 18 12 8l4 4 4-4 8 10', 'M12 8l-2-4 4 2 4-2-2 4'],
  grounded: ['M4 18 12 8l4 4 4-4 8 10', 'M12 8l-2-4 4 2 4-2-2 4'],
  fragileLiberty: ['M12 4l8 3v7c0 5-3 8-8 10-5-2-8-5-8-10V7z', 'M12 8v10M8 12h8'],
  noOrbitals: ['M12 3v18', 'M3 12h18', 'M6 6l12 12', 'M18 6 6 18'],
  shipSilent: ['M12 3v18', 'M3 12h18', 'M6 6l12 12', 'M18 6 6 18'],
  primaryOnly: ['M3 14h18l3-3v6h-9l-3 5h-4l3-5H3z'],
  primaryConcern: ['M3 14h18l3-3v6h-9l-3 5h-4l3-5H3z', 'M7 7l14 14'],
  oopsAllAirstrikes: ['M3 15 21 6l-7 13-3-5z', 'M11 14l4 3'],
  zeroDeaths: ['M12 3a7 7 0 0 0-7 7c0 3 1.5 5 3.5 6V20h2v-2h3v2h2v-4c2-1 3.5-3 3.5-6a7 7 0 0 0-7-7Z', 'M9 10h.01M15 10h.01'],
  noReserves: ['M12 21V7', 'M7 12l5-5 5 5', 'M5 3h14'],
  deadWeight: ['M12 21V7', 'M7 12l5-5 5 5', 'M5 3h14', 'M4 4l16 16'],
  noStratagems: ['M4 6h16v12H4z', 'M8 10h8M8 14h5', 'M3 3l18 18'],
  radioSilence: ['M5 12a7 7 0 0 1 14 0', 'M8 12a4 4 0 0 1 8 0', 'M12 12h.01', 'M3 3l18 18'],
  heavyLiberty: ['M7 5h10l3 4-2 3v8H6v-8L4 9z', 'M12 5v15', 'M8 13h8'],
  ironbound: ['M7 5h10l3 4-2 3v8H6v-8L4 9z', 'M12 5v15', 'M8 13h8'],
  featherweight: ['M5 19C5 11 11 5 19 5c0 8-6 14-14 14z', 'M5 19 14 10'],
  supplyLineCut: ['M4 8l8-4 8 4v8l-8 4-8-4z', 'M4 8l8 4 8-4', 'M12 12v8', 'M3 3l18 18'],
  noStims: ['M9 4h6v5l2 2v9H7v-9l2-2z', 'M12 9v8M9 13h6', 'M3 3l18 18'],
  objector: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 3v18', 'M12 12l6 6', 'M12 12l-6 6'],
  coldSteel: ['M12 3l3 9-3 3-3-3z', 'M8 15h8', 'M12 15v6'],
  cleanHands: ['M8 12V6a1.5 1.5 0 0 1 3 0v5', 'M11 11V5a1.5 1.5 0 0 1 3 0v6', 'M14 11V7a1.5 1.5 0 0 1 3 0v8c0 4-3 6-6 6s-5-2-6-5l-1-3a1.5 1.5 0 0 1 3-1l1 2'],
  meleeOnly: ['M5 19 19 5', 'M15 5h4v4', 'M7 17l-3 3'],
  pacifist: ['M4 14c5 0 8-3 8-8 5 0 8 3 8 8-5 0-8 3-8 8-5 0-8-3-8-8Z', 'M12 6v12'],
  antiTankAbstinent: ['M4 16h16l3-4-3-4H4z', 'M8 8v8', 'M4 13h7', 'M3 3l18 18'],
  loadoutLoyalist: ['M7 11h10v9H7z', 'M9 11V8a3 3 0 0 1 6 0v3'],
  untouchable: ['M12 3l8 3v7c0 5-3 8-8 10-5-2-8-5-8-10V6z', 'M8 12l3 3 5-6'],
  stimAbstinent: ['M9 4h6v5l2 2v9H7v-9l2-2z', 'M12 9v8M9 13h6', 'M3 3l18 18'],
}
const path = computed(() => paths[props.id] ?? ['M12 3l9 9-9 9-9-9z', 'M12 8v8M8 12h8'])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.35"
    stroke-linejoin="round"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path
      v-for="(d, index) in path"
      :key="index"
      :d="d"
    />
  </svg>
</template>
