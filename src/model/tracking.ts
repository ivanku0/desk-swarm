export const DEFAULT_COUNT = 1n

/** Double the count, or from empty board (0) create the first creature at 1. */
export function growCount(c: bigint): bigint {
  if (c === 0n) return DEFAULT_COUNT
  return c * 2n
}

export function applyMicro(c: bigint, delta: -1 | 1): bigint {
  const next = c + BigInt(delta)
  return next < 0n ? 0n : next
}
