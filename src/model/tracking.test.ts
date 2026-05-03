import { describe, expect, it } from 'vitest'
import { applyMicro, growCount, growCountForPreset, DEFAULT_COUNT } from './tracking'

describe('tracking', () => {
  it('doubles', () => {
    expect(growCount(1n)).toBe(2n)
    expect(growCount(7n)).toBe(14n)
  })

  it('grow from zero restarts at one', () => {
    expect(growCount(0n)).toBe(1n)
  })

  it('scute grows linearly through 6, then doubles', () => {
    expect(growCountForPreset(0n, 'scute')).toBe(1n)
    expect(growCountForPreset(5n, 'scute')).toBe(6n)
    expect(growCountForPreset(6n, 'scute')).toBe(7n)
    expect(growCountForPreset(7n, 'scute')).toBe(14n)
  })

  it('non-scute presets keep doubling behavior', () => {
    expect(growCountForPreset(1n, 'horde')).toBe(2n)
    expect(growCountForPreset(6n, 'horde')).toBe(12n)
    expect(growCountForPreset(0n, 'horde')).toBe(1n)
  })

  it('micro clamps at zero', () => {
    expect(applyMicro(1n, -1)).toBe(0n)
    expect(applyMicro(0n, -1)).toBe(0n)
    expect(applyMicro(3n, 1)).toBe(4n)
  })

  it('default count', () => {
    expect(DEFAULT_COUNT).toBe(1n)
  })
})
