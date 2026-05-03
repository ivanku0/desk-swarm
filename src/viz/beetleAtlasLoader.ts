import type { BeetleAtlasManifest, BeetleAtlasPart } from './beetleAtlas.types'
import { isBeetlePartId } from './beetleAtlas.types'

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return v
}

/**
 * Parse `atlas.json` body. Unknown part IDs are skipped; empty `parts` → null.
 */
export function parseBeetleAtlasManifest(data: unknown): BeetleAtlasManifest | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (o.version !== 1) return null
  const grid = num(o.grid)
  if (grid !== 16 && grid !== 24 && grid !== 32) return null
  if (typeof o.texture !== 'string' || o.texture.length === 0) return null
  const partsRaw = o.parts
  if (!Array.isArray(partsRaw)) return null

  const parts: BeetleAtlasPart[] = []
  for (const raw of partsRaw) {
    if (!raw || typeof raw !== 'object') continue
    const p = raw as Record<string, unknown>
    if (typeof p.id !== 'string' || !isBeetlePartId(p.id)) continue
    const x = num(p.x)
    const y = num(p.y)
    const w = num(p.w)
    const h = num(p.h)
    const pivotU = num(p.pivotU)
    const pivotV = num(p.pivotV)
    if (
      x === null ||
      y === null ||
      w === null ||
      h === null ||
      pivotU === null ||
      pivotV === null
    )
      continue
    if (w <= 0 || h <= 0) continue
    if (pivotU < 0 || pivotU > 1 || pivotV < 0 || pivotV > 1) continue
    parts.push({ id: p.id, x, y, w, h, pivotU, pivotV })
  }
  if (parts.length === 0) return null
  return { version: 1, grid, texture: o.texture, parts }
}

export interface BeetleAtlasBundle {
  manifest: BeetleAtlasManifest
  image: HTMLImageElement
}

export async function fetchBeetleAtlasManifest(url: string): Promise<BeetleAtlasManifest> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`atlas manifest ${res.status}`)
  const json: unknown = await res.json()
  const manifest = parseBeetleAtlasManifest(json)
  if (!manifest) throw new Error('atlas manifest parse failed')
  return manifest
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`image failed: ${src}`))
    img.src = src
  })
}

export async function loadBeetleAtlasBundle(manifestUrl: string): Promise<BeetleAtlasBundle> {
  const manifest = await fetchBeetleAtlasManifest(manifestUrl)
  const image = await loadImage(manifest.texture)
  return { manifest, image }
}
