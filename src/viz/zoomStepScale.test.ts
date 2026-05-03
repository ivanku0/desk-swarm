import { describe, expect, it } from 'vitest'
import { zoomScaleFromCount, zoomScaleFromStep } from './zoomStepScale'
import { zoomStepFromCountLegacy } from '../model/countScale'

describe('zoomScaleFromCount', () => {
  it('at 256 matches legacy global zoom at 256 (scute and horde)', () => {
    const legacy = zoomScaleFromStep(zoomStepFromCountLegacy(256n))
    expect(zoomScaleFromCount(256n, 'scute')).toBeCloseTo(legacy, 6)
    expect(zoomScaleFromCount(256n, 'horde')).toBeCloseTo(legacy, 6)
  })

  it('at 1 is tighter than the old max discrete step', () => {
    expect(zoomScaleFromCount(1n, 'scute')).toBeGreaterThan(zoomScaleFromStep(5))
    expect(zoomScaleFromCount(1n, 'horde')).toBeGreaterThan(zoomScaleFromStep(5))
  })

  it('zoom eases out from 1 toward 256', () => {
    const a = zoomScaleFromCount(1n, 'horde')
    const b = zoomScaleFromCount(128n, 'horde')
    const c = zoomScaleFromCount(256n, 'horde')
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
  })

  it('holds zoom longer at low counts (small early steps vs linear log₂)', () => {
    const z1 = zoomScaleFromCount(1n, 'scute')
    const z2 = zoomScaleFromCount(2n, 'scute')
    const z4 = zoomScaleFromCount(4n, 'scute')
    expect(z1 - z2).toBeLessThan(0.022)
    expect(z2 - z4).toBeLessThan(0.045)
  })

  it('above 256 uses legacy curve', () => {
    expect(zoomScaleFromCount(257n, 'scute')).toBe(zoomScaleFromStep(zoomStepFromCountLegacy(257n)))
    expect(zoomScaleFromCount(257n, 'horde')).toBe(
      zoomScaleFromStep(zoomStepFromCountLegacy(257n)),
    )
  })
})
