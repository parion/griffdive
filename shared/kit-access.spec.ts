import { describe, expect, it } from 'vitest'
import { kitAllowedOnHost, kitAllowedOnServer } from './kit-access'

describe('kit sheet access', () => {
  it('opens on a dev server', () => {
    expect(kitAllowedOnServer(true, undefined)).toBe(true)
    expect(kitAllowedOnHost(true, undefined)).toBe(true)
  })

  it('opens on the Fly staging app and its host', () => {
    expect(kitAllowedOnServer(false, 'griffdive-staging')).toBe(true)
    expect(kitAllowedOnHost(false, 'griffdive-staging.fly.dev')).toBe(true)
  })

  it('is unreachable in production', () => {
    expect(kitAllowedOnServer(false, 'griffdive')).toBe(false)
    expect(kitAllowedOnServer(false, undefined)).toBe(false)
    expect(kitAllowedOnHost(false, 'griffdive.fly.dev')).toBe(false)
    expect(kitAllowedOnHost(false, 'localhost:3000')).toBe(false)
  })

  it('does not treat a review app as staging', () => {
    expect(kitAllowedOnServer(false, 'pr-42-parion-griffdive')).toBe(false)
    expect(kitAllowedOnHost(false, 'pr-42-parion-griffdive.fly.dev')).toBe(false)
  })
})
