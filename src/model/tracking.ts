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
  if (presetId === 'krenko') return c
  if (c === 0n) return DEFAULT_COUNT
  if (presetId === 'scute' && c <= SCUTE_LINEAR_MAX) return c + 1n
  return growCount(c)
}

export function applyMicro(c: bigint, delta: -1 | 1): bigint {
  const next = c + BigInt(delta)
  return next < 0n ? 0n : next
}

/** Krenko track: double total goblins while the boss is on the board. */
export function krenkItCount(total: bigint, krenkoPresent: boolean): bigint {
  if (!krenkoPresent || total <= 0n) return total
  return total + total
}

/**
 * Toggle Krenko presence on the board (toy rules).
 * Add: empty board → 1 goblin with boss; else +1 goblin and boss present.
 * Remove: −1 goblin (min 0) and boss leaves.
 */
export function toggleKrenkoPresence(
  total: bigint,
  present: boolean,
): { total: bigint; present: boolean } {
  if (present) {
    const next = total > 0n ? total - 1n : 0n
    return { total: next, present: false }
  }
  if (total <= 0n) return { total: 1n, present: true }
  return { total: total + 1n, present: true }
}

/** Boss leaves; goblin total unchanged (toy track — not a comprehensive rules engine). */
export function dismissKrenkoBossKeepHorde(
  total: bigint,
  present: boolean,
): { total: bigint; present: boolean } {
  if (!present) return { total, present: false }
  return { total, present: false }
}

/** Parse a manual count from the meter modal (digits only, non-negative). */
export function parseManualCountInput(raw: string): bigint | null {
  const s = raw.trim().replace(/[,_\s]/g, '')
  if (!/^\d+$/.test(s)) return null
  try {
    return BigInt(s)
  } catch {
    return null
  }
}
