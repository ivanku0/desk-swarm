import type { PresetId } from '../presets/types'
import { SWARM_GLYPHS as SCUTE_SWARM_GLYPHS } from './swarmGlyphs/scute'
import { SWARM_GLYPHS as HORDE_SWARM_GLYPHS } from './swarmGlyphs/horde'
import { SWARM_GLYPHS as KRENKO_SWARM_GLYPHS } from './swarmGlyphs/krenko'

/** 8×8 pixel patterns, 1 = ink */
export type Bitmap8 = readonly (readonly number[])[]

const SWARM_GLYPHS_BY_PRESET = {
  scute: SCUTE_SWARM_GLYPHS,
  horde: HORDE_SWARM_GLYPHS,
  krenko: KRENKO_SWARM_GLYPHS,
} satisfies Record<PresetId, readonly Bitmap8[]>

/** Two variant frames per preset (twin-phase swap on the field). */
export function swarmGlyphVariants(presetId: PresetId): readonly Bitmap8[] {
  return SWARM_GLYPHS_BY_PRESET[presetId]
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
