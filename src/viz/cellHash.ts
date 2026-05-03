/** Deterministic [0,1) from grid coords — avoids row-major PRNG streaks */
export function cell01(gx: number, gy: number, seed: number): number {
  let h = Math.imul(gx, 374761393) ^ Math.imul(gy, 668265263) ^ Math.imul(seed | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
