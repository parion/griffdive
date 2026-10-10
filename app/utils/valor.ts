// The team-risk split as the Valor rail paints it: one colour per source, so
// the tab bar, the meter's cells and its legend all read the same way.
export interface ValorSources {
  teamRisk: number
  pactRisk: number
  misfortuneRisk?: number
  strainRisk?: number
  majorOrderRisk?: number
  modeRisk?: number
  modeLabel?: string
}

export interface ValorSegment {
  id: 'team' | 'misfortune' | 'strain' | 'mo' | 'mode' | 'pact'
  name: string
  value: number
  color: string
  // Directive, strain and pacts stay in the legend at zero so the diver sees
  // what they declined; optional sources only appear once they carry Valor.
  always: boolean
}

export function valorSegments(sources: ValorSources): ValorSegment[] {
  const split = sources.misfortuneRisk !== undefined || sources.strainRisk !== undefined
  const team: ValorSegment[] = split
    ? [
        { id: 'misfortune', name: 'Directive', value: sources.misfortuneRisk ?? 0, color: 'var(--gold)', always: true },
        { id: 'strain', name: 'Strain', value: sources.strainRisk ?? 0, color: 'var(--orange)', always: true },
        { id: 'mo', name: 'Major Order', value: sources.majorOrderRisk ?? 0, color: 'var(--teal)', always: false },
        { id: 'mode', name: sources.modeLabel ?? 'Mode', value: sources.modeRisk ?? 0, color: 'var(--khaki)', always: false },
      ]
    : [{ id: 'team', name: 'Team', value: sources.teamRisk, color: 'var(--khaki)', always: true }]
  return [...team, { id: 'pact', name: 'Pacts', value: sources.pactRisk, color: 'var(--red)', always: true }]
}
