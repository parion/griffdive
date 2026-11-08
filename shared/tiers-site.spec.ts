import { describe, expect, it } from 'vitest'
import { isTiersHost, mainSiteOrigin } from './tiers-site'

describe('the standalone Tier Maker host', () => {
  it('recognizes a tiers. subdomain only', () => {
    expect(isTiersHost('tiers.griffdive.com')).toBe(true)
    expect(isTiersHost('Tiers.localhost')).toBe(true)
    expect(isTiersHost('griffdive.com')).toBe(false)
    expect(isTiersHost('mytiers.griffdive.com')).toBe(false)
    expect(isTiersHost(undefined)).toBe(false)
  })

  it('points back at the main site, port kept', () => {
    expect(mainSiteOrigin('https://tiers.griffdive.com')).toBe('https://griffdive.com')
    expect(mainSiteOrigin('http://tiers.localhost:3173')).toBe('http://localhost:3173')
    expect(mainSiteOrigin('https://griffdive.com')).toBe('https://griffdive.com')
  })
})
