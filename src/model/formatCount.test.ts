import { describe, expect, it } from 'vitest'
import { formatCount, formatCountMeter } from './formatCount'

describe('formatCountMeter', () => {
  it('pads with leading zeros up to meter width', () => {
    expect(formatCountMeter(124n)).toBe('000000000124')
  })

  it('pads single digit', () => {
    expect(formatCountMeter(1n)).toBe('000000000001')
  })

  it('falls back to compact form when wider than meter slots', () => {
    const wide = BigInt('1' + '0'.repeat(20))
    expect(formatCountMeter(wide)).toBe(formatCount(wide))
  })
})
