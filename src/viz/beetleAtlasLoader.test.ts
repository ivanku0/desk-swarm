import { describe, expect, it } from 'vitest'
import { parseBeetleAtlasManifest } from './beetleAtlasLoader'

const exampleManifest = {
  version: 1,
  grid: 24,
  texture: '/art/scute/beetle.png',
  parts: [
    { id: 'shell', x: 0, y: 0, w: 24, h: 18, pivotU: 0.5, pivotV: 0.85 },
    { id: 'horn', x: 8, y: 18, w: 8, h: 12, pivotU: 0.5, pivotV: 1 },
  ],
}

describe('parseBeetleAtlasManifest', () => {
  it('parses example-shaped manifest', () => {
    const m = parseBeetleAtlasManifest(exampleManifest)
    expect(m).not.toBeNull()
    expect(m!.version).toBe(1)
    expect(m!.grid).toBe(24)
    expect(m!.texture).toBe('/art/scute/beetle.png')
    expect(m!.parts.length).toBe(2)
    expect(m!.parts.map((p) => p.id)).toContain('shell')
  })

  it('rejects bad version', () => {
    expect(parseBeetleAtlasManifest({ ...exampleManifest, version: 2 })).toBeNull()
  })

  it('rejects unknown part id', () => {
    const parts = [
      ...exampleManifest.parts,
      { id: 'nope', x: 0, y: 0, w: 1, h: 1, pivotU: 0.5, pivotV: 0.5 },
    ]
    const m = parseBeetleAtlasManifest({ ...exampleManifest, parts })
    expect(m!.parts.some((p) => p.id === ('nope' as never))).toBe(false)
  })
})
