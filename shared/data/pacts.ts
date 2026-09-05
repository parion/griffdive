export interface Pact {
  id: string
  name: string
  rule: string
}

export const PACTS: readonly Pact[] = [
  { id: 'packLight', name: 'Pack Light', rule: 'I bring no backpack' },
  { id: 'thirsty', name: 'Thirsty', rule: 'I call and take no resupplies' },
  { id: 'stimAbstinent', name: 'Stim Abstinent', rule: 'I use no stims' },
  { id: 'antiTankAbstinent', name: 'Anti-Tank Abstinent', rule: 'I carry nothing anti-tank' },
  { id: 'deadWeight', name: 'Dead Weight', rule: 'If I die, I refuse reinforcement — I stay dead' },
  { id: 'loadoutLoyalist', name: 'Loadout Loyalist', rule: 'I use only my equipped loadout; no pickups or swaps' },
  { id: 'barebones', name: 'Barebones', rule: 'I fill no stratagem slots' },
  { id: 'sidearmPurist', name: 'Sidearm Purist', rule: 'I fight with my secondary only' },
]
