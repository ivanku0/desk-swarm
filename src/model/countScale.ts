/** Smooth log₁₀ for bigint (stable tail for huge values). */
export function approxLog10BigInt(n: bigint): number {
  if (n <= 0n) return 0
  const s = n.toString()
  const len = s.length
  if (len <= 15) return Math.log10(Number(n))
  const head = Number(s.slice(0, 15))
  if (!Number.isFinite(head) || head <= 0) return len - 1
  return len - 15 + Math.log10(head)
}

/**
 * Logarithmic zoom steps (0 = widest … 5 = tightest). Used above the shared
 * low-count easing range (see `zoomScaleFromCount`).
 */
export function zoomStepFromCountLegacy(count: bigint): number {
  if (count <= 1n) return 5
  const log = approxLog10BigInt(count)
  const u = Math.min(1, log / 11.5)
  return Math.max(0, Math.min(5, Math.round(5 * (1 - u))))
}
