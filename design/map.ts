// Design page → app state map for the conformance harness.
//
// Each entry names a captured design scene (design/scenes/<key>.json, produced
// by `pnpm design:capture`), the app route to render it at, the deterministic
// engine fixture to seed (design/states.ts), and any UI steps needed to reach a
// local view that the reducer cannot seed (the mission report form, the honors
// toggle, drawers and overlays).

export type DesignStep
  = | 'open-armory'
    | 'open-briefing'
    | 'open-report-success'
    | 'open-report-failure'
    | 'open-honors'

export interface DesignTarget {
  // `<Page>__<scene>` — matches design/scenes/<key>.json and its authored viewport.
  key: string
  label: string
  route: '/' | '/kit' | 'dive'
  state?: string
  steps?: DesignStep[]
}

export const DESIGN_TARGETS: DesignTarget[] = [
  { key: 'Main__default', label: 'Bridge — home', route: '/' },
  { key: 'Lobby__prelaunch', label: 'Lobby — hellpod bays', route: 'dive', state: 'lobby' },
  { key: 'Armory__default', label: 'Armory — kit inventory', route: 'dive', state: 'diving', steps: ['open-armory'] },
  { key: 'Welcome__default', label: 'Briefing — Griffdiver welcome', route: 'dive', state: 'spin', steps: ['open-briefing'] },
  { key: 'PhoneWelcome__default', label: 'Phone · Briefing', route: 'dive', state: 'spin', steps: ['open-briefing'] },
  { key: 'Wheel__spin', label: 'Wheel — spin', route: 'dive', state: 'spin' },
  { key: 'Wheel__decide', label: 'Wheel — decide', route: 'dive', state: 'decision' },
  { key: 'Pacts__fresh', label: 'Pacts — swear personal risk', route: 'dive', state: 'pacts' },
  { key: 'Dive__deployed', label: 'Dive — in the field', route: 'dive', state: 'diving' },
  { key: 'Report__default', label: 'Report — debrief', route: 'dive', state: 'diving', steps: ['open-report-success'] },
  { key: 'Rewards__choose', label: 'Rewards — ceiling roll + supply drop', route: 'dive', state: 'rewards' },
  { key: 'Honors__spin', label: 'Squad Honors', route: 'dive', state: 'rewards', steps: ['open-honors'] },
  { key: 'Forfeit__choose', label: 'Mission failed — forfeit', route: 'dive', state: 'forfeit' },
  { key: 'Achieved__default', label: 'Griffdive achieved', route: 'dive', state: 'complete' },
  { key: 'PhoneBridge__default', label: 'Phone · Bridge', route: '/' },
  { key: 'PhoneWheel__decide', label: 'Phone · Wheel — decide', route: 'dive', state: 'decision' },
  { key: 'PhonePacts__fresh', label: 'Phone · Pacts', route: 'dive', state: 'pacts' },
  { key: 'PhoneReport__default', label: 'Phone · Report', route: 'dive', state: 'diving', steps: ['open-report-success'] },
  { key: 'PhoneRewards__choose', label: 'Phone · Rewards', route: 'dive', state: 'rewards' },
  { key: 'Foundations__default', label: 'Foundations — the kit', route: '/kit' },
]
