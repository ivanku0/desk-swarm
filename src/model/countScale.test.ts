import { describe, expect, it } from 'vitest'
import { zoomStepFromCountLegacy } from './countScale'

describe('countScale', () => {
  it('legacy zoom steps: tight for tiny counts, wide for huge counts', () => {
    expect(zoomStepFromCountLegacy(0n)).toBe(5)
    expect(zoomStepFromCountLegacy(1n)).toBe(5)
    expect(zoomStepFromCountLegacy(500_000n)).toBeLessThan(zoomStepFromCountLegacy(5n))
    const huge = BigInt('9'.repeat(40))
    expect(zoomStepFromCountLegacy(huge)).toBe(0)
  })
})
