import { describe, expect, it } from 'vitest'
import { cell01 } from './cellHash'

describe('cell01', () => {
  it('is in [0,1)', () => {
    for (let gx = 0; gx < 20; gx++) {
      for (let gy = 0; gy < 20; gy++) {
        const v = cell01(gx, gy, 42)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    }
  })

  it('varies across grid', () => {
    const a = new Set<number>()
    for (let i = 0; i < 200; i++) {
      a.add(Math.floor(cell01(i, i * 3, 99) * 1000))
    }
    expect(a.size).toBeGreaterThan(30)
  })
})
