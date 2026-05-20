import { describe, expect, it } from 'vitest'
import {
  applyMicro,
  growCount,
  growCountForPreset,
  DEFAULT_COUNT,
  krenkItCount,
  toggleKrenkoPresence,
  dismissKrenkoBossKeepHorde,
  countAfterBossDismissal,
  parseManualCountInput,
} from './tracking'

describe('tracking', () => {
  it('doubles', () => {
    expect(growCount(1n)).toBe(2n)
    expect(growCount(7n)).toBe(14n)
  })

  it('grow from zero restarts at one', () => {
    expect(growCount(0n)).toBe(1n)
  })

  it('scute doubles like horde (six-plus lands assumed for copy tokens)', () => {
    expect(growCountForPreset(0n, 'scute')).toBe(1n)
    expect(growCountForPreset(1n, 'scute')).toBe(2n)
    expect(growCountForPreset(6n, 'scute')).toBe(12n)
    expect(growCountForPreset(7n, 'scute')).toBe(14n)
  })

  it('non-scute presets keep doubling behavior', () => {
    expect(growCountForPreset(1n, 'horde')).toBe(2n)
    expect(growCountForPreset(6n, 'horde')).toBe(12n)
    expect(growCountForPreset(0n, 'horde')).toBe(1n)
  })

  it('krenko grow is handled in UI via krenkItCount, not growCountForPreset', () => {
    expect(growCountForPreset(0n, 'krenko')).toBe(0n)
    expect(growCountForPreset(5n, 'krenko')).toBe(5n)
  })

  it('micro clamps at zero', () => {
    expect(applyMicro(1n, -1)).toBe(0n)
    expect(applyMicro(0n, -1)).toBe(0n)
    expect(applyMicro(3n, 1)).toBe(4n)
  })

  it('default count', () => {
    expect(DEFAULT_COUNT).toBe(1n)
  })

  it('krenk doubles only with boss present', () => {
    expect(krenkItCount(5n, false)).toBe(5n)
    expect(krenkItCount(0n, true)).toBe(0n)
    expect(krenkItCount(3n, true)).toBe(6n)
  })

  it('toggle krenko presence adjusts total', () => {
    expect(toggleKrenkoPresence(0n, false)).toEqual({ total: 1n, present: true })
    expect(toggleKrenkoPresence(3n, false)).toEqual({ total: 4n, present: true })
    expect(toggleKrenkoPresence(1n, true)).toEqual({ total: 0n, present: false })
    expect(toggleKrenkoPresence(5n, true)).toEqual({ total: 4n, present: false })
  })

  it('countAfterBossDismissal subtracts one', () => {
    expect(countAfterBossDismissal(64n)).toBe(63n)
    expect(countAfterBossDismissal(1n)).toBe(0n)
    expect(countAfterBossDismissal(0n)).toBe(0n)
  })

  it('dismiss boss subtracts one goblin when horde remains', () => {
    expect(dismissKrenkoBossKeepHorde(12n, true)).toEqual({ total: 11n, present: false })
    expect(dismissKrenkoBossKeepHorde(12n, false)).toEqual({ total: 12n, present: false })
  })

  it('dismiss boss with only Krenko on counter clears to zero', () => {
    expect(dismissKrenkoBossKeepHorde(1n, true)).toEqual({ total: 0n, present: false })
  })

  it('manual count parse accepts only digits', () => {
    expect(parseManualCountInput('  42  ')).toBe(42n)
    expect(parseManualCountInput('1_000')).toBe(1000n)
    expect(parseManualCountInput('abc')).toBe(null)
    expect(parseManualCountInput('')).toBe(null)
  })
})
