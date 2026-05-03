import type { PresetId } from '../presets/types'
import { cell01 } from './cellHash'
import { mulberry32 } from './glyphs'

export const SWARM_COLS = 56
export const SWARM_ROWS = 36
export const SWARM_MAX_CELLS = SWARM_COLS * SWARM_ROWS

export function layoutSeedForPreset(presetId: PresetId): number {
  if (presetId === 'horde') return 0x7a11e419
  if (presetId === 'krenko') return 0x4b3e20a7
  return 0x5c075c01
}

const CARDINAL_OFFSETS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/**
 * Swarm colony (all presets): each new cell is one cardinal step from some earlier
 * cell, with random parent + shuffled directions so growth reads like proliferation /
 * clumping (GoL-ish grouping). Use a per-preset seed so layouts differ.
 */
export function buildCardinalProliferationOrder(
  cols: number,
  rows: number,
  seed: number,
): number[] {
  const cx = Math.floor(cols / 2)
  const cy = Math.floor(rows / 2)
  const center = cy * cols + cx
  const occupied = new Set<number>([center])
  const order: number[] = [center]
  const rng = mulberry32(seed >>> 0)
  const maxCells = cols * rows

  const shuffleCardinals = (): [number, number][] => {
    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const t = dirs[i]!
      dirs[i] = dirs[j]!
      dirs[j] = t
    }
    return dirs
  }

  /** Bias toward recently added cells so the frontier thickens outward. */
  const pickParentIndex = (): number => {
    const len = order.length
    const window = Math.min(48, len)
    const r = rng()
    const skew = r * r
    return len - 1 - Math.floor(skew * window)
  }

  const tryRandomExtend = (): boolean => {
    const maxAttempts = 220
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pi = pickParentIndex()
      const parent = order[pi]!
      const pgx = parent % cols
      const pgy = Math.floor(parent / cols)
      for (const [dx, dy] of shuffleCardinals()) {
        const ngx = pgx + dx
        const ngy = pgy + dy
        if (ngx < 0 || ngx >= cols || ngy < 0 || ngy >= rows) continue
        const nidx = ngy * cols + ngx
        if (occupied.has(nidx)) continue
        occupied.add(nidx)
        order.push(nidx)
        return true
      }
    }
    return false
  }

  const tryDeterministicExtend = (): boolean => {
    const occ = [...occupied].sort((a, b) => a - b)
    for (const parent of occ) {
      const pgx = parent % cols
      const pgy = Math.floor(parent / cols)
      for (const [dx, dy] of CARDINAL_OFFSETS) {
        const ngx = pgx + dx
        const ngy = pgy + dy
        if (ngx < 0 || ngx >= cols || ngy < 0 || ngy >= rows) continue
        const nidx = ngy * cols + ngx
        if (occupied.has(nidx)) continue
        occupied.add(nidx)
        order.push(nidx)
        return true
      }
    }
    return false
  }

  while (order.length < maxCells) {
    if (!tryRandomExtend() && !tryDeterministicExtend()) break
  }
  return order
}

/**
 * Mitosis from center: Manhattan distance still strictly increases outward so the
 * first N glyphs stay a growing colony, but wedges + hashed jitter make large
 * swarms feel organic instead of a perfect ring.
 */
export function buildMitosisCellOrder(cols: number, rows: number): number[] {
  const cx = Math.floor(cols / 2)
  const cy = Math.floor(rows / 2)
  const tieSeed = 0x5c075d02
  type Item = { idx: number; d: number; sector: number; fuzz: number }
  const items: Item[] = []
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const idx = gy * cols + gx
      const d = Math.abs(gx - cx) + Math.abs(gy - cy)
      const ang = Math.atan2(gy - cy, gx - cx)
      const sector = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 14) % 14
      const fuzz =
        cell01(gx, gy, tieSeed) * 0.34 +
        cell01(gx, gy, tieSeed ^ 0x9e3779b9) * 0.33 +
        cell01(gx, gy, tieSeed ^ 0x6a09e667) * 0.33
      items.push({ idx, d, sector, fuzz })
    }
  }
  items.sort(
    (a, b) =>
      a.d - b.d || a.sector - b.sector || a.fuzz - b.fuzz || a.idx - b.idx,
  )
  return items.map((x) => x.idx)
}

const orderCache = new Map<PresetId, readonly number[]>()

/** Cardinal proliferation from center; per-preset seed gives distinct colonies. */
export function getSwarmCellOrder(presetId: PresetId): readonly number[] {
  let o = orderCache.get(presetId)
  if (!o) {
    o = buildCardinalProliferationOrder(
      SWARM_COLS,
      SWARM_ROWS,
      layoutSeedForPreset(presetId),
    )
    orderCache.set(presetId, o)
  }
  return o
}

/** How many glyphs to draw: equals `count` until the canvas grid is full. */
export function swarmGlyphCountForCanvas(count: bigint): number {
  if (count <= 0n) return 0
  if (count >= BigInt(SWARM_MAX_CELLS)) return SWARM_MAX_CELLS
  return Number(count)
}

export function fillSwarmActiveFlags(
  flags: Uint8Array,
  order: readonly number[],
  n: number,
): void {
  flags.fill(0)
  const cap = Math.min(n, order.length, flags.length)
  for (let i = 0; i < cap; i++) flags[order[i]!] = 1
}
