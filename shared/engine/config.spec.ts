import { describe, expect, it } from 'vitest'
import { MAX_DIFFICULTY, MIN_DIFFICULTY, SAMPLE_SCANNER_PICKUP_MULTIPLIER, bandPosition, baseTierFor, bonusIntervalFor, maxStarsFor, missionsPerOperation, sampleAvailability, sampleReportCeiling, upgradeOdds, VALOR_METER_MAX } from './config'

describe('baseTierFor (reward scale-back bands)', () => {
  it.each([
    [3, 'C'],
    [5, 'C'],
    [6, 'B'],
    [7, 'B'],
    [8, 'A'],
    [10, 'A'],
  ])('difficulty %i → base %s', (difficulty, tier) => {
    expect(baseTierFor(difficulty)).toBe(tier)
  })

  it('positions climb from band floor to band top', () => {
    expect([3, 4, 5].map(bandPosition)).toEqual([0, 0.5, 1])
    expect([6, 7].map(bandPosition)).toEqual([0, 1])
    expect([8, 9, 10].map(bandPosition)).toEqual([0, 0.5, 1])
  })

  it('upgrade odds scale with Valor and band position, capped per rung', () => {
    expect(upgradeOdds(0, 0, 1)).toBe(0)
    expect(upgradeOdds(11, 0, 1)).toBeCloseTo(0.7125, 5)
    expect(upgradeOdds(5.5, 1, 1)).toBeCloseTo(0.7125, 5)
    expect(upgradeOdds(4, 0, 1)).toBeGreaterThan(upgradeOdds(4, 0, 2))
    expect(upgradeOdds(VALOR_METER_MAX, 1, 1)).toBe(0.95)
    expect(upgradeOdds(100, 1, 1)).toBe(0.95)
    expect(upgradeOdds(100, 1, 2)).toBe(0.3)
  })

  it('keeps every ordinary rung climbing all the way to the meter top', () => {
    for (const bandPos of [0, 0.5, 1]) {
      for (const step of [1, 2]) {
        for (let valor = 0; valor < VALOR_METER_MAX; valor++) {
          expect(upgradeOdds(valor + 1, bandPos, step)).toBeGreaterThan(upgradeOdds(valor, bandPos, step))
        }
      }
    }
  })
})

describe('missionsPerOperation (wiki.gg/Difficulty)', () => {
  it.each([
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 3],
    [7, 3],
    [8, 3],
    [9, 3],
    [10, 3],
  ])('difficulty %i → %i missions', (difficulty, missions) => {
    expect(missionsPerOperation(difficulty)).toBe(missions)
  })
})

describe('maxStarsFor (wiki.gg/Missions, Mission Result)', () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 3],
    [5, 4],
    [6, 4],
    [7, 5],
    [8, 5],
    [9, 5],
    [10, 5],
  ])('difficulty %i → max %i stars', (difficulty, stars) => {
    expect(maxStarsFor(difficulty)).toBe(stars)
  })

  it('covers the crusade ladder', () => {
    for (let difficulty = MIN_DIFFICULTY; difficulty <= MAX_DIFFICULTY; difficulty++) {
      expect(maxStarsFor(difficulty)).toBeGreaterThanOrEqual(1)
      expect(maxStarsFor(difficulty)).toBeLessThanOrEqual(5)
    }
  })
})

describe('sampleReportCeiling (Sample Scanner)', () => {
  it('allows twice the map spawn count at every rarity', () => {
    for (let difficulty = MIN_DIFFICULTY; difficulty <= MAX_DIFFICULTY; difficulty++) {
      const available = sampleAvailability(difficulty)
      expect(sampleReportCeiling(difficulty)).toEqual({
        common: available.common * SAMPLE_SCANNER_PICKUP_MULTIPLIER,
        rare: available.rare * SAMPLE_SCANNER_PICKUP_MULTIPLIER,
        super: available.super * SAMPLE_SCANNER_PICKUP_MULTIPLIER,
      })
    }
  })

  it('lets a Medium haul exceed the map spawn cap', () => {
    expect(sampleAvailability(3).common).toBe(18)
    expect(sampleReportCeiling(3).common).toBe(36)
  })
})

describe('bonusIntervalFor (honors cadence by squad size)', () => {
  it.each([
    [1, 3],
    [2, 2],
    [3, 2],
    [4, 1],
  ])('squad of %i → every %i missions', (squadSize, interval) => {
    expect(bonusIntervalFor(squadSize)).toBe(interval)
  })

  it('clamps out-of-range sizes', () => {
    expect(bonusIntervalFor(0)).toBe(3)
    expect(bonusIntervalFor(9)).toBe(1)
  })
})
