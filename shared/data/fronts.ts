export type FrontId = 'terminids' | 'automatons' | 'illuminate'

export interface Front {
  id: FrontId
  displayName: string
  /** Faction identity color, so front text and card framing read as the faction. */
  accent: string
}

export const FRONTS: readonly Front[] = [
  { id: 'terminids', displayName: 'Terminids', accent: '#ff9f43' },
  { id: 'automatons', displayName: 'Automatons', accent: '#ff4b3e' },
  { id: 'illuminate', displayName: 'Illuminate', accent: '#b06bff' },
]
