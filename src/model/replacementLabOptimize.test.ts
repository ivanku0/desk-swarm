import { describe, expect, it } from 'vitest'
import { TOKEN_INCREASER_CATALOG } from '../data/tokenIncreaserCatalog'
import { runChain, singleAtomEvent, sumTokens } from './replacementChain'
import { buildChainFromSlots } from './replacementLabSlots'
import { optimizeReplacementSlots, permutations, slotsEqual } from './replacementLabOptimize'

const byId = new Map(TOKEN_INCREASER_CATALOG.map((c) => [c.scryfallId, c]))

describe('permutations', () => {
  it('returns one ordering for a singleton', () => {
    expect(permutations(['a'])).toEqual([['a']])
  })

  it('returns n! orderings for n distinct ids', () => {
    expect(permutations(['a', 'b', 'c']).length).toBe(6)
  })
})

describe('optimizeReplacementSlots', () => {
  it('returns the same slots when at most one chain card', () => {
    const slots = ['b9c11061-bb34-4904-b9f1-ea106b517bbe', null, null, null, null]
    const recipe = singleAtomEvent('Clue', 1n)
    const out = optimizeReplacementSlots(slots, recipe, byId)
    expect(slotsEqual(out, slots)).toBe(true)
  })

  it('reorders Manufactor, Doubling Season, and Chatterfang to maximize total tokens', () => {
    const M = '76480f4d-ad6d-4ed6-82c6-fa12abc22557'
    const D = 'f2c4f80e-84a0-463b-82c3-5c6503809351'
    const C = '1785cf85-1ac0-4246-9b89-1a8221a8e1b2'
    const recipe = singleAtomEvent('Clue', 1n)
    const suboptimal: (string | null)[] = [D, C, M, null, null]
    const optimized = optimizeReplacementSlots(suboptimal, recipe, byId)
    const { chain } = buildChainFromSlots(optimized, byId)
    expect(sumTokens(runChain(recipe, chain).final)).toBe(12n)
  })
})
