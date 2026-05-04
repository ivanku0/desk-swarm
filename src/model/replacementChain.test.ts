import { describe, expect, it } from 'vitest'
import {
  formatEventSummary,
  runChain,
  singleAtomEvent,
  sumTokens,
  type ChainStep,
  type PlusFixedRiderFilter,
  type TokenAtom,
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
const Ojer = (label = 'Ojer Taq'): ChainStep => ({
  effectKey: 'multiplier',
  displayLabel: label,
  multiplierK: 3,
  multiplierCreatureOnly: true,
})
const PF = (riderAtom: TokenAtom, filter: PlusFixedRiderFilter, label = 'plus-fixed'): ChainStep => ({
  effectKey: 'plusFixedRider',
  displayLabel: label,
  plusFixedRider: { riderAtom, filter },
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
    expect(r.steps[1]!.beforeSummary).toContain('Clue × 1')
    expect(r.steps[2]!.beforeSummary).toContain('Clue × 2')
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
    expect(formatEventSummary(afterTwo.final)).toMatch(/Squirrel × 3/)
    expect(formatEventSummary(afterTwo.final)).toMatch(/Clue × 1/)

    const pathAStep2 = runChain({ Clue: 1n }, [M(), D()])
    expect(formatEventSummary(pathAStep2.final)).toBe('Clue × 2 · Food × 2 · Treasure × 2')
  })

  it('Manufactor: clue count c yields c of each C/F/T', () => {
    const r = runChain({ Clue: 3n }, [M()])
    expectBigintRecord(r.final, { Clue: 3n, Food: 3n, Treasure: 3n })
  })

  it('plusFixedRider anyBatch: +1 Food on non-empty batch', () => {
    const r = runChain({ Clue: 2n }, [PF('Food', 'anyBatch', 'Peregrin')])
    expect(r.steps[0]!.didNotApply).toBe(false)
    expectBigintRecord(r.final, { Clue: 2n, Food: 1n })
  })

  it('plusFixedRider treasureBatch: does not apply without Treasure', () => {
    const r = runChain({ Clue: 1n }, [PF('Treasure', 'treasureBatch', 'Jolene')])
    expect(r.steps[0]!.didNotApply).toBe(true)
    expectBigintRecord(r.final, { Clue: 1n })
  })

  it('plusFixedRider treasureBatch: +1 Treasure when batch has Treasure', () => {
    const r = runChain({ Treasure: 2n }, [PF('Treasure', 'treasureBatch', 'Xorn')])
    expectBigintRecord(r.final, { Treasure: 3n })
  })

  it('plusFixedRider creatureBatch: +1 Soldier when batch has a creature token', () => {
    const r = runChain({ Squirrel: 2n }, [PF('Soldier', 'creatureBatch', 'Queen Allenal')])
    expectBigintRecord(r.final, { Squirrel: 2n, Soldier: 1n })
  })

  it('plusFixedRider artifactBatch: +1 Thopter for Clue batch; not for Squirrel-only', () => {
    const r1 = runChain({ Clue: 1n }, [PF('Thopter', 'artifactBatch', 'Stridehangar')])
    expectBigintRecord(r1.final, { Clue: 1n, Thopter: 1n })
    const r2 = runChain({ Squirrel: 1n }, [PF('Thopter', 'artifactBatch')])
    expect(r2.steps[0]!.didNotApply).toBe(true)
  })

  it('Ojer ×3 creature-only: triples Squirrel, leaves Clue', () => {
    const r = runChain({ Squirrel: 1n, Clue: 1n }, [Ojer()])
    expectBigintRecord(r.final, { Squirrel: 3n, Clue: 1n })
  })

  it('Ojer does not apply when batch has no creature tokens', () => {
    const r = runChain({ Clue: 2n }, [Ojer()])
    expect(r.steps[0]!.didNotApply).toBe(true)
    expectBigintRecord(r.final, { Clue: 2n })
  })
})

describe('singleAtomEvent', () => {
  it('builds multiset', () => {
    expect(singleAtomEvent('Treasure', 2n)).toEqual({ Treasure: 2n })
  })
})
