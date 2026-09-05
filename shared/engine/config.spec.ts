import { describe, expect, it } from 'vitest'
import { MAX_DIFFICULTY, MIN_DIFFICULTY, bandPosition, baseTierFor, maxStarsFor, missionsPerOperation, upgradeOdds } from './config'

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

  it('upgrade odds scale with luck and band position, capped', () => {
    expect(upgradeOdds(0, 0, 1)).toBe(0)
    expect(upgradeOdds(2, 0, 1)).toBeCloseTo(2 / 3, 5)
    expect(upgradeOdds(1, 1, 1)).toBeCloseTo(2 / 3, 5)
    expect(upgradeOdds(2, 1, 1)).toBe(0.8)
    expect(upgradeOdds(4, 0, 1)).toBeGreaterThan(upgradeOdds(4, 0, 2))
    expect(upgradeOdds(100, 1, 1)).toBe(upgradeOdds(4, 1, 1))
    expect(upgradeOdds(100, 1, 1)).toBeLessThan(0.8000001)
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
