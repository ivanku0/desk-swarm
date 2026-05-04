import type { TokenIncreaserCard } from '../data/tokenIncreaserCatalog'
import { runChain, sumTokens, type TokenEvent } from './replacementChain'
import { buildChainFromSlots } from './replacementLabSlots'

/** All permutations of `arr` (order matters; duplicates preserved as distinct positions). */
export function permutations<T>(arr: readonly T[]): T[][] {
  if (arr.length <= 1) return [arr.slice() as T[]]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i++) {
    const head = arr[i]!
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) {
      out.push([head, ...p])
    }
  }
  return out
}

export function slotsEqual(
  a: readonly (string | null)[],
  b: readonly (string | null)[],
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function occupiedSlotIndices(slots: readonly (string | null)[]): number[] {
  const idx: number[] = []
  for (let i = 0; i < slots.length; i++) {
    if (slots[i]) idx.push(i)
  }
  return idx
}

function finalTokenTotal(
  slots: readonly (string | null)[],
  recipe: TokenEvent,
  byId: ReadonlyMap<string, TokenIncreaserCard>,
): bigint {
  const { chain } = buildChainFromSlots(slots, byId)
  return sumTokens(runChain(recipe, chain).final)
}

/**
 * Reassign the same selected cards across the same occupied slot positions to maximize
 * total tokens after `runChain` (exhaustive search; at most 5! = 120 trials).
 */
export function optimizeReplacementSlots(
  slots: readonly (string | null)[],
  recipe: TokenEvent,
  byId: ReadonlyMap<string, TokenIncreaserCard>,
): (string | null)[] {
  const indices = occupiedSlotIndices(slots)
  if (indices.length <= 1) return [...slots]

  const idsInOrder = indices.map((i) => slots[i]!)
  const perms = permutations(idsInOrder)

  let bestSlots = [...slots]
  let bestScore = finalTokenTotal(bestSlots, recipe, byId)

  for (const perm of perms) {
    const candidate = [...slots]
    for (let k = 0; k < indices.length; k++) {
      candidate[indices[k]!] = perm[k]!
    }
    const score = finalTokenTotal(candidate, recipe, byId)
    if (score > bestScore) {
      bestScore = score
      bestSlots = candidate
    }
  }

  return bestSlots
}
