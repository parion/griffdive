export type FrontId = 'terminids' | 'automatons' | 'illuminate'

export interface Front {
  id: FrontId
  displayName: string
}

export const FRONTS: readonly Front[] = [
  { id: 'terminids', displayName: 'Terminids' },
  { id: 'automatons', displayName: 'Automatons' },
  { id: 'illuminate', displayName: 'Illuminate' },
]
