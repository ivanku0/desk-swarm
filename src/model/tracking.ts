import type { PresetId } from '../presets/types'

export const DEFAULT_COUNT = 1n
export const SCUTE_LINEAR_MAX = 6n

/** Double the count, or from empty board (0) create the first creature at 1. */
export function growCount(c: bigint): bigint {
  if (c === 0n) return DEFAULT_COUNT
  return c * 2n
}

/**
 * Preset-aware grow rule.
 * Scute grows linearly through 6, then switches to doubling.
 */
export function growCountForPreset(c: bigint, presetId: PresetId): bigint {
  if (c === 0n) return DEFAULT_COUNT
  if (presetId === 'scute' && c <= SCUTE_LINEAR_MAX) return c + 1n
  return growCount(c)
}

export function applyMicro(c: bigint, delta: -1 | 1): bigint {
  const next = c + BigInt(delta)
  return next < 0n ? 0n : next
}
