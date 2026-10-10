// The Griffdive mark's only definition: a griffin stooping through the Wheel's rim. Three
// swept feathers are the old dive chevrons; the rim's eight ticks are the 3 → 10 climb.
// BrandMark.vue renders it in currentColor; `pnpm pwa:assets` writes public/icon.svg from
// brandIconSvg() before generating the PWA icons and favicon.
export const BRAND_MARK = {
  viewBox: '34 64 444 444',
  center: [256, 286],
  rim: 'M465.3 294.5 A214 214 0 0 1 307.8 457.6 M204.2 457.6 A214 214 0 0 1 46.7 294.5',
  ticks: 'M457.1 323.2 L423.3 310.9 M429.1 375.8 L400 354.6 M387.8 418.6 L365.6 390.3 M336.2 448.4 L322.7 415 M175.8 448.4 L189.3 415 M124.2 418.6 L146.4 390.3 M82.9 375.8 L112 354.6 M54.9 323.2 L88.7 310.9',
  wings: 'M230 190 L54 80.9 L84 116.9 L230 226 Z M282 190 L458 80.9 L428 116.9 L282 226 Z M230 248 L86 158.7 L116 194.7 L230 284 Z M282 248 L426 158.7 L396 194.7 L282 284 Z M230 306 L118 236.6 L148 272.6 L230 342 Z M282 306 L394 236.6 L364 272.6 L282 342 Z',
  head: 'M256 128 L286 170 L286 316 L310 348 L256 472 L202 348 L226 316 L226 170 Z M224 354 L256 374 L288 354 L288 370 L256 392 L224 370 Z',
  rimWidth: 22,
  tickWidth: 12,
} as const

export function brandIconSvg(): string {
  const m = BRAND_MARK
  const [cx, cy] = m.center
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Griffdive">
  <defs>
    <linearGradient id="gd-glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#23271c"/>
      <stop offset="1" stop-color="#131511"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#gd-glow)"/>
  <g transform="translate(256 256) scale(0.86) translate(-${cx} -${cy})">
    <g fill="none" stroke="#b8b08d">
      <path d="${m.rim}" stroke-width="${m.rimWidth}"/>
      <path d="${m.ticks}" stroke-width="${m.tickWidth}"/>
    </g>
    <g fill="#ffd642">
      <path d="${m.wings}"/>
      <path fill-rule="evenodd" d="${m.head}"/>
    </g>
  </g>
</svg>
`
}
