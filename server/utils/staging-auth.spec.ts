import { describe, expect, it } from 'vitest'
import { basicAuthMatches } from './staging-auth'

function basic(credentials: string): string {
  return `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`
}

describe('staging basic auth', () => {
  it('accepts the configured credentials', () => {
    expect(basicAuthMatches(basic('diver:liberty'), 'diver:liberty')).toBe(true)
  })

  it('refuses wrong, missing or non-Basic credentials', () => {
    expect(basicAuthMatches(basic('diver:tyranny'), 'diver:liberty')).toBe(false)
    expect(basicAuthMatches(undefined, 'diver:liberty')).toBe(false)
    expect(basicAuthMatches('Bearer diver:liberty', 'diver:liberty')).toBe(false)
  })

  it('never matches when no credentials are configured', () => {
    expect(basicAuthMatches(basic(''), '')).toBe(false)
  })
})
