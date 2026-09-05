export interface Misfortune {
  id: string
  name: string
  rule: string
}

export const MISFORTUNES: readonly Misfortune[] = [
  { id: 'noBackpacks', name: 'No Backpacks', rule: 'No backpack stratagems' },
  { id: 'noSentries', name: 'No Sentries', rule: 'No sentry stratagems' },
  { id: 'noBoosters', name: 'No Boosters', rule: 'No boosters equipped' },
  { id: 'noResupplies', name: 'No Resupplies', rule: 'Never call resupply' },
  { id: 'noEagles', name: 'No Eagles', rule: 'No Eagle stratagems' },
  { id: 'fragileLiberty', name: 'Fragile Liberty', rule: 'Light armor only' },
  { id: 'noOrbitals', name: 'No Orbitals', rule: 'No orbital stratagems' },
  { id: 'primaryOnly', name: 'Primary Only', rule: 'Primary weapon only (stratagems allowed)' },
  { id: 'stealth', name: 'Stealth', rule: 'No raised alarms or bot detections' },
  { id: 'oopsAllOrbitals', name: 'Oops, All Orbitals', rule: 'Orbital stratagems only' },
  { id: 'zeroDeaths', name: 'Zero Deaths', rule: 'Any diver death = mission failure' },
  { id: 'secondaryOnly', name: 'Secondary Only', rule: 'Secondary weapons only' },
  { id: 'noStratagems', name: 'No Stratagems', rule: 'No stratagems at all, not even resupply' },
  { id: 'meleeOnly', name: 'Melee Only', rule: 'Melee weapons only' },
]
