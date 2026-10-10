import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { brandIconSvg } from './brandMark'

describe('brand mark', () => {
  it('public/icon.svg is generated from BRAND_MARK (run `pnpm pwa:assets` after editing it)', () => {
    const onDisk = readFileSync(new URL('../../public/icon.svg', import.meta.url), 'utf8')
    expect(onDisk).toBe(brandIconSvg())
  })
})
