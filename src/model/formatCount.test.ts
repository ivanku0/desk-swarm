import { describe, expect, it } from 'vitest'
import { formatCountMeter } from './formatCount'

describe('formatCountMeter', () => {
  it('pads with leading zeros up to meter width', () => {
    expect(formatCountMeter(124n)).toBe('00124')
  })

  it('pads single digit', () => {
    expect(formatCountMeter(1n)).toBe('00001')
  })

  it('uses full five digits through 99999', () => {
    expect(formatCountMeter(99999n)).toBe('99999')
  })

  it('switches to compact suffix display above 99999', () => {
    expect(formatCountMeter(100000n)).toBe('100K')
    expect(formatCountMeter(1_234_567n)).toBe('1M')
  })

  it('never exceeds meter slot count', () => {
    const wide = BigInt('1' + '0'.repeat(20))
    expect(formatCountMeter(wide).length).toBeLessThanOrEqual(5)
  })
})
