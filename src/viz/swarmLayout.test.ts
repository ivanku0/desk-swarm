import { describe, expect, it } from 'vitest'
import {
  buildCardinalProliferationOrder,
  buildMitosisCellOrder,
  getSwarmCellOrder,
  SWARM_COLS,
  SWARM_ROWS,
  SWARM_MAX_CELLS,
} from './swarmLayout'

function centerIdx(): number {
  const cx = Math.floor(SWARM_COLS / 2)
  const cy = Math.floor(SWARM_ROWS / 2)
  return cy * SWARM_COLS + cx
}

/** Every prefix is one connected component under cardinal adjacency. */
function prefixIsCardinallyConnected(order: readonly number[], n: number, cols: number): boolean {
  if (n <= 1) return true
  const set = new Set(order.slice(0, n))
  const start = order[0]!
  const q: number[] = [start]
  const seen = new Set<number>([start])
  while (q.length) {
    const idx = q.pop()!
    const gx = idx % cols
    const gy = Math.floor(idx / cols)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = gx + dx
      const ny = gy + dy
      if (nx < 0 || nx >= cols || ny < 0 || ny >= SWARM_ROWS) continue
      const nidx = ny * cols + nx
      if (!set.has(nidx) || seen.has(nidx)) continue
      seen.add(nidx)
      q.push(nidx)
    }
  }
  return seen.size === set.size
}

describe('swarmLayout', () => {
  it('mitosis orders every cell exactly once', () => {
    const order = buildMitosisCellOrder(SWARM_COLS, SWARM_ROWS)
    expect(order.length).toBe(SWARM_MAX_CELLS)
    const seen = new Set(order)
    expect(seen.size).toBe(SWARM_MAX_CELLS)
  })

  it('mitosis order starts at field center', () => {
    const order = buildMitosisCellOrder(SWARM_COLS, SWARM_ROWS)
    expect(order[0]).toBe(centerIdx())
  })

  it('getSwarmCellOrder(horde) grows monotonically as a set', () => {
    const order = getSwarmCellOrder('horde')
    const a = new Set(order.slice(0, 12))
    const b = new Set(order.slice(0, 13))
    expect(a.size).toBe(12)
    for (const idx of a) expect(b.has(idx)).toBe(true)
  })

  it('scute, horde, and krenko colony seeds stay the field center', () => {
    const c = centerIdx()
    expect(getSwarmCellOrder('scute')[0]).toBe(c)
    expect(getSwarmCellOrder('horde')[0]).toBe(c)
    expect(getSwarmCellOrder('krenko')[0]).toBe(c)
  })

  it('cardinal proliferation fills the grid with no duplicates', () => {
    const order = buildCardinalProliferationOrder(SWARM_COLS, SWARM_ROWS, 0x5c075c01)
    expect(order.length).toBe(SWARM_MAX_CELLS)
    expect(new Set(order).size).toBe(SWARM_MAX_CELLS)
  })

  it('proliferation keeps every prefix cardinally connected', () => {
    const order = buildCardinalProliferationOrder(SWARM_COLS, SWARM_ROWS, 0xdeadbeef)
    const checkpoints = [2, 8, 40, 200, 800, SWARM_MAX_CELLS]
    for (const n of checkpoints) {
      expect(prefixIsCardinallyConnected(order, n, SWARM_COLS)).toBe(true)
    }
  })

  it('each cell after the first is cardinal-adjacent to some earlier cell', () => {
    const order = buildCardinalProliferationOrder(SWARM_COLS, SWARM_ROWS, 0x12345678)
    const seen = new Set<number>([order[0]!])
    for (let i = 1; i < order.length; i++) {
      const idx = order[i]!
      const gx = idx % SWARM_COLS
      const gy = Math.floor(idx / SWARM_COLS)
      const touches = [
        [gx + 1, gy],
        [gx - 1, gy],
        [gx, gy + 1],
        [gx, gy - 1],
      ] as const
      const ok = touches.some(([nx, ny]) => {
        if (nx < 0 || nx >= SWARM_COLS || ny < 0 || ny >= SWARM_ROWS) return false
        return seen.has(ny * SWARM_COLS + nx)
      })
      expect(ok).toBe(true)
      seen.add(idx)
    }
  })

  it('scute and horde cached orders differ (distinct seeds, same rules)', () => {
    const a = getSwarmCellOrder('scute')
    const b = getSwarmCellOrder('horde')
    expect(a[0]).toBe(b[0])
    let diff = 0
    for (let i = 1; i < 400; i++) {
      if (a[i] !== b[i]) diff++
    }
    expect(diff).toBeGreaterThan(50)
  })
})
