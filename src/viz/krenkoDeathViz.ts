import type { PresetId } from '../presets/types'

/**
 * Single place for Krenko “boss leaves the board” canvas rules: timing + how much
 * of the swarm participates in the death vignette (full wipe vs boss-only dismissal).
 */

export const KRENKO_BOSS_DEATH_DURATION_MS = 1580 as const

/** Why the field entered `dying` on the Krenko track. */
export type KrenkoDyingKind = 'boardWipe' | 'bossDismissal'

/**
 * Bigint count passed into `buildParticles` during the wipe canvas.
 * - Boss-only dismissal: no horde splats (boss overlay only).
 * - Solo Krenko board wipe: the only body is the boss; splatting a minion token on top of the
 *   death overlay reads as “two characters” — suppress particles the same way.
 */
export function krenkoDyingSwarmCountForParticles(
  presetId: PresetId,
  dyingKind: KrenkoDyingKind | null | undefined,
  wipeOrLiveCount: bigint,
  leaderPresent: boolean,
): bigint {
  if (presetId !== 'krenko') return wipeOrLiveCount
  if (dyingKind === 'bossDismissal') return 0n
  if (dyingKind === 'boardWipe' && wipeOrLiveCount === 1n && leaderPresent) return 0n
  return wipeOrLiveCount
}
