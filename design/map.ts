// Design page → app state map for the conformance harness.
//
// Each entry names the extracted design page (design/spec/<page>.json), the app
// route to render it at, the deterministic engine fixture to seed (design/states.ts),
// and any UI steps needed to reach a local view that the reducer cannot seed
// (the mission report form, the honors toggle, drawers and overlays).

export type DesignStep
  = | 'open-armory'
    | 'open-briefing'
    | 'open-report-success'
    | 'open-report-failure'
    | 'open-honors'

export interface DesignTarget {
  page: string
  route: '/' | '/kit' | 'dive'
  state?: string
  steps?: DesignStep[]
  // Phone designs render at 390×844; desktop at the design's own canvas.
  viewport?: { width: number, height: number }
}

export const PHONE = { width: 390, height: 844 }

export const DESIGN_TARGETS: DesignTarget[] = [
  { page: '00-bridge', route: '/' },
  { page: '01-lobby', route: 'dive', state: 'lobby' },
  { page: '02-armory', route: 'dive', state: 'diving', steps: ['open-armory'] },
  { page: '03-briefing', route: 'dive', state: 'spin', steps: ['open-briefing'] },
  { page: '04-phone-briefing', route: 'dive', state: 'spin', steps: ['open-briefing'], viewport: PHONE },
  { page: '05-wheel', route: 'dive', state: 'spin' },
  { page: '06-pacts', route: 'dive', state: 'pacts' },
  { page: '07-dive', route: 'dive', state: 'diving' },
  { page: '08-mission-report', route: 'dive', state: 'diving', steps: ['open-report-success'] },
  { page: '09-reward-draft', route: 'dive', state: 'rewards' },
  { page: '10-squad-honors', route: 'dive', state: 'rewards', steps: ['open-honors'] },
  { page: '11-mission-failed', route: 'dive', state: 'forfeit' },
  { page: '12-achieved', route: 'dive', state: 'complete' },
  { page: '13-phone-bridge', route: '/', viewport: PHONE },
  { page: '14-phone-wheel', route: 'dive', state: 'spin', viewport: PHONE },
  { page: '15-phone-pacts', route: 'dive', state: 'pacts', viewport: PHONE },
  { page: '16-phone-report', route: 'dive', state: 'diving', steps: ['open-report-success'], viewport: PHONE },
  { page: '17-phone-reward', route: 'dive', state: 'rewards', viewport: PHONE },
  { page: '18-foundations', route: '/kit' },
]
