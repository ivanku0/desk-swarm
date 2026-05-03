/**
 * Part-mapped Scute beetle atlas (see `docs/art-pipeline.md`).
 * Coordinates are top-left origin, pixels in the texture; pivots are 0–1 within each part rect.
 */

export const BEETLE_PART_IDS = [
  'shell',
  'horn',
  'head',
  'mandible_l',
  'mandible_r',
  'eye_glow',
  'leg_fl_upper',
  'leg_fl_lower',
  'leg_fr_upper',
  'leg_fr_lower',
  'leg_ml_upper',
  'leg_ml_lower',
  'leg_mr_upper',
  'leg_mr_lower',
  'leg_bl_upper',
  'leg_bl_lower',
  'leg_br_upper',
  'leg_br_lower',
] as const

export type BeetlePartId = (typeof BEETLE_PART_IDS)[number]

export interface BeetleAtlasPart {
  id: BeetlePartId
  x: number
  y: number
  w: number
  h: number
  /** 0 = left edge, 1 = right edge of part */
  pivotU: number
  /** 0 = top edge, 1 = bottom edge of part */
  pivotV: number
}

export interface BeetleAtlasManifest {
  version: 1
  /** Authoring hint: native pixel grid step */
  grid: 16 | 24 | 32
  /** Path under `public/`, e.g. `/art/scute/beetle.png` */
  texture: string
  parts: BeetleAtlasPart[]
}

export function isBeetlePartId(s: string): s is BeetlePartId {
  return (BEETLE_PART_IDS as readonly string[]).includes(s)
}
