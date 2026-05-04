import { describe, expect, it } from 'vitest'
import {
  formatEventSummary,
  runChain,
  singleAtomEvent,
  sumTokens,
  type ChainStep,
  type TokenEvent,
} from './replacementChain'

const M = (label = 'Academy Manufactor'): ChainStep => ({
  effectKey: 'clueFoodTreasureSplit',
  displayLabel: label,
})
const D = (label = 'Doubling Season'): ChainStep => ({
  effectKey: 'multiplier',
  displayLabel: label,
})
const C = (label = 'Chatterfang, Squirrel General'): ChainStep => ({
  effectKey: 'plusEqualBatchRider',
  displayLabel: label,
})

function expectBigintRecord(actual: TokenEvent, expected: Record<string, bigint>) {
  for (const [k, v] of Object.entries(expected)) {
    expect(actual[k as keyof TokenEvent] ?? 0n).toBe(v)
  }
}

describe('runChain', () => {
  it('empty chain returns initial and zero steps', () => {
    const e0: TokenEvent = { Clue: 1n }
    const r = runChain(e0, [])
    expect(r.steps).toHaveLength(0)
    expectBigintRecord(r.final, { Clue: 1n })
  })

  it('single multiplier doubles clue', () => {
    const r = runChain({ Clue: 1n }, [D()])
    expect(r.steps).toHaveLength(1)
    expect(r.steps[0]!.didNotApply).toBe(false)
    expectBigintRecord(r.final, { Clue: 2n })
  })

  it('predicate-false row when Manufactor on squirrel-only batch', () => {
    const r = runChain({ Squirrel: 3n }, [M()])
    expect(r.steps).toHaveLength(1)
    expect(r.steps[0]!.didNotApply).toBe(true)
    expect(r.steps[0]!.deltaTotal).toBe(0n)
    expectBigintRecord(r.final, { Squirrel: 3n })
  })

  it('duplicate multiplier in chain applies twice', () => {
    const r = runChain({ Clue: 1n }, [D(), D()])
    expectBigintRecord(r.final, { Clue: 4n })
  })

  /** Path A: M→D→C on 1 Clue */
  it('Path A: M→D→C', () => {
    const r = runChain({ Clue: 1n }, [M(), D(), C()])
    expectBigintRecord(r.final, { Clue: 2n, Food: 2n, Treasure: 2n, Squirrel: 6n })
    expect(sumTokens(r.final)).toBe(12n)
    expect(r.steps[1]!.beforeSummary).toContain('Clue×1')
    expect(r.steps[2]!.beforeSummary).toContain('Clue×2')
  })

  /** Path B: D→C→M on 1 Clue */
  it('Path B: D→C→M', () => {
    const r = runChain({ Clue: 1n }, [D(), C(), M()])
    expectBigintRecord(r.final, { Clue: 2n, Food: 2n, Treasure: 2n, Squirrel: 2n })
    expect(sumTokens(r.final)).toBe(8n)
  })

  /** Path C: M→C→D — intermediate differs from Path A after step 2 */
  it('Path C: M→C→D matches final multiset and distinct intermediate', () => {
    const r = runChain({ Clue: 1n }, [M(), C(), D()])
    expectBigintRecord(r.final, { Clue: 2n, Food: 2n, Treasure: 2n, Squirrel: 6n })

    const afterTwo = runChain({ Clue: 1n }, [M(), C()])
    expect(formatEventSummary(afterTwo.final)).toMatch(/Squirrel×3/)
    expect(formatEventSummary(afterTwo.final)).toMatch(/Clue×1/)

    const pathAStep2 = runChain({ Clue: 1n }, [M(), D()])
    expect(formatEventSummary(pathAStep2.final)).toBe('Clue×2 Food×2 Treasure×2')
  })

  it('Manufactor: clue count c yields c of each C/F/T', () => {
    const r = runChain({ Clue: 3n }, [M()])
    expectBigintRecord(r.final, { Clue: 3n, Food: 3n, Treasure: 3n })
  })
})

describe('singleAtomEvent', () => {
  it('builds multiset', () => {
    expect(singleAtomEvent('Treasure', 2n)).toEqual({ Treasure: 2n })
  })
})
