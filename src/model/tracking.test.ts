import { describe, expect, it } from 'vitest'
import { applyMicro, growCount, DEFAULT_COUNT } from './tracking'

describe('tracking', () => {
  it('doubles', () => {
    expect(growCount(1n)).toBe(2n)
    expect(growCount(7n)).toBe(14n)
  })

  it('grow from zero restarts at one', () => {
    expect(growCount(0n)).toBe(1n)
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
