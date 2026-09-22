import type { FrontId } from './fronts'

// A strain is a subfaction of the drawn front (wiki.gg/Factions). It is
// deliberately flavor + risk, never rule-bearing: the app never observes enemy
// composition, so no checkable restriction is attached — the real subfaction
// reshapes loadout decisions in-game and the engine only prices the risk.
export interface Strain {
  id: string
  frontId: FrontId
  name: string
  blurb: string
}

export const STRAINS: readonly Strain[] = [
  {
    id: 'predatorStrain',
    frontId: 'terminids',
    name: 'Predator Strain',
    blurb: 'Cloaked hunters and hyper-aggressive stalkers — ambushes come early and from nowhere.',
  },
  {
    id: 'ruptureStrain',
    frontId: 'terminids',
    name: 'Rupture Strain',
    blurb: 'Burrowers surface under your feet: the ground is never safe.',
  },
  {
    id: 'sporeBurstStrain',
    frontId: 'terminids',
    name: 'Spore Burst Strain',
    blurb: 'Every corpse bursts into a spore cloud. Close-quarters kills choke the squad.',
  },
  {
    id: 'jetBrigade',
    frontId: 'automatons',
    name: 'Jet Brigade',
    blurb: 'Jump-pack infantry leap the line and drop behind cover.',
  },
  {
    id: 'incinerationCorps',
    frontId: 'automatons',
    name: 'Incineration Corps',
    blurb: 'Flamethrowers and incendiary rounds turn every approach into a firebreak.',
  },
  {
    id: 'cyborgLegion',
    frontId: 'automatons',
    name: 'Cyborg Legion',
    blurb: 'Cybernetically enhanced humans with shotguns, blades, and a mech that soaks stratagems.',
  },
  {
    id: 'mindlessMasses',
    frontId: 'illuminate',
    name: 'Mindless Masses',
    blurb: 'Endless Fleshmobs and Voteless: ammo and crowd control decide the mission.',
  },
  {
    id: 'appropriators',
    frontId: 'illuminate',
    name: 'Appropriators',
    blurb: 'Piloted walkers and swarming drones — and no Voteless to thin the herd.',
  },
  {
    id: 'voteSnatchers',
    frontId: 'illuminate',
    name: 'Vote Snatchers',
    blurb: 'Wretches and regenerating Crushers close the distance fast.',
  },
]
