// Griffdiver lore — in-universe propaganda copy, presentation only.
//
// This module carries no game rules and is never saved: the engine doesn't
// know it exists. It is centralized here (like fronts/strains) so every surface
// tells the same story. Voice is Ministry-of-Truth satire: Super Earth's
// bureaucracy describes a penal legion as a generous path to redemption.

export type CitizenGrade = 'A' | 'B' | 'C' | 'D' | 'E'

export interface CitizenClass {
  grade: CitizenGrade
  label: string
  blurb: string
}

// One-line hook for the landing page — the whole premise in a breath.
export const GRIFFDIVER_TAGLINE
  = 'Helldivers are Class A citizens. You are Class E — a Griffdiver, cast to the front to earn '
    + 'your arsenal back one dive at a time.'

// The short in-world lede shown before a diver first enters the fight.
export const GRIFFDIVER_GATE_LEDE
  = 'Helldivers are Class A citizens: trusted, armed, and entitled to draw freely from '
    + 'Super Earth\'s arsenal. You are not a Helldiver. By order of the Ministry of Truth '
    + 'you are a Griffdiver — Class E, stripped of citizenship, and posted to the front to '
    + 'be redeemed before the light of liberty. No armory opens for you. Every weapon you '
    + 'carry, you earn one dive at a time.'

// Three orientation lines behind the gate's optional brief: lore mapped to the
// loop, so a new Griffdiver knows what the mode is asking of them.
export const GRIFFDIVER_BRIEF: readonly string[] = [
  'Your kit: surplus cast-offs and four stratagems, issued once. Better gear is drawn from the reward pool, never granted.',
  'Your sentence: a crusade. Climb from difficulty 3 to 10 and the Ministry will consider your debt to liberty settled.',
  'Their mercy: the Wheel of Misfortune. Chosen risk raises your Valor, and Valor buys rarer armaments — nothing here is free.',
]

// Citizen classifications, worst last — the ladder a Griffdiver fell down.
export const CITIZEN_CLASSES: readonly CitizenClass[] = [
  {
    grade: 'A',
    label: 'Class A — Citizens',
    blurb: 'The trusted. Full franchise, unrestricted arsenal, and the Ministry\'s confidence. Home to every Helldiver.',
  },
  {
    grade: 'B',
    label: 'Class B — Residents',
    blurb: 'Loyal non-combatants. Licensed small arms only, taxed twice, and grateful for the privilege.',
  },
  {
    grade: 'C',
    label: 'Class C — Conscripts',
    blurb: 'Armed and pointed at a front. Their service is compulsory, their citizenship provisional.',
  },
  {
    grade: 'D',
    label: 'Class D — Debtors',
    blurb: 'Labor battalions working off arrears. Their wages pay for their own keep. It is considered fair.',
  },
  {
    grade: 'E',
    label: 'Class E — Griffdivers',
    blurb: 'Convicted against freedom and cast to the front line. Redemption is possible. Gratitude is mandatory.',
  },
]

// Ceremony copy — short in-world lines layered onto the mechanical screens.
// Each is an addition, never a replacement: the player still needs the rules.
export const GRIFFDIVER_FORFEIT_LINE
  = 'Failure is a debt against liberty, and the Ministry does not forgive — it compounds.'

export const GRIFFDIVER_PROMOTION_LINE
  = 'A disgraced Griffdiver is recalled from another front. The promotion restores altitude, never honor.'

export const GRIFFDIVER_CACHE_LINE
  = 'A fallen Griffdiver\'s kit, salvaged from the line.'

export const GRIFFDIVER_COMPLETE_LINE
  = 'The Ministry has reviewed your file and finds your debt to liberty settled. Griffdiver, you are pardoned — restored to the franchise you squandered. Do not squander it again.'
