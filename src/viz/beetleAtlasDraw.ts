import type { BeetleAtlasManifest, BeetleAtlasPart, BeetlePartId } from './beetleAtlas.types'
import { BEETLE_PART_DRAW_ORDER } from './beetleAtlas.types'

function partMap(manifest: BeetleAtlasManifest): Map<BeetlePartId, BeetleAtlasPart> {
  const m = new Map<BeetlePartId, BeetleAtlasPart>()
  for (const p of manifest.parts) m.set(p.id, p)
  return m
}

/** Anchor = shell pivot in atlas pixels; fallback to bbox center of all parts. */
export function beetleAtlasAnchor(manifest: BeetleAtlasManifest): { ax: number; ay: number } {
  const shell = manifest.parts.find((p) => p.id === 'shell')
  if (shell) {
    return {
      ax: shell.x + shell.pivotU * shell.w,
      ay: shell.y + shell.pivotV * shell.h,
    }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of manifest.parts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + p.w)
    maxY = Math.max(maxY, p.y + p.h)
  }
  if (!Number.isFinite(minX)) return { ax: 0, ay: 0 }
  return { ax: (minX + maxX) / 2, ay: (minY + maxY) / 2 }
}

/** Max distance from anchor to any part corner — for uniform scale-to-fit. */
export function beetleAtlasRadius(manifest: BeetleAtlasManifest, ax: number, ay: number): number {
  let r = 1
  for (const p of manifest.parts) {
    const corners: [number, number][] = [
      [p.x, p.y],
      [p.x + p.w, p.y],
      [p.x, p.y + p.h],
      [p.x + p.w, p.y + p.h],
    ]
    for (const [cx, cy] of corners) {
      r = Math.max(r, Math.hypot(cx - ax, cy - ay))
    }
  }
  return r
}

function sortedParts(manifest: BeetleAtlasManifest): BeetleAtlasPart[] {
  const m = partMap(manifest)
  const ordered: BeetleAtlasPart[] = []
  for (const id of BEETLE_PART_DRAW_ORDER) {
    const p = m.get(id)
    if (p) ordered.push(p)
  }
  for (const p of manifest.parts) {
    if (!ordered.includes(p)) ordered.push(p)
  }
  return ordered
}

export interface DrawBeetleAtlasOptions {
  manifest: BeetleAtlasManifest
  image: HTMLImageElement
  /** Center in canvas coords (already inside caller transforms). */
  cx: number
  cy: number
  /** Target radius in canvas pixels (half of rough “diameter”). */
  targetRadiusPx: number
  timeMs: number
  reducedMotion: boolean
  /** Draw rect outline + pivot crosshairs (JSON verification). */
  debugPivots: boolean
}

/**
 * Composite beetle from atlas slices. Assumes part rects share one logical
 * atlas layout (see `docs/art-pipeline.md`).
 */
export function drawBeetleFromAtlas(
  ctx: CanvasRenderingContext2D,
  { manifest, image, cx, cy, targetRadiusPx, timeMs, reducedMotion, debugPivots }: DrawBeetleAtlasOptions,
): void {
  const { ax, ay } = beetleAtlasAnchor(manifest)
  const rAtlas = beetleAtlasRadius(manifest, ax, ay)
  const scale = targetRadiusPx / rAtlas

  const idlePhase = reducedMotion ? 0 : Math.floor(timeMs / 320) % 4
  const hornWobble = reducedMotion ? 0 : Math.sin(timeMs * 0.004 + idlePhase) * 0.11

  const parts = sortedParts(manifest)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-ax, -ay)

  for (const p of parts) {
    const px = p.x + p.pivotU * p.w
    const py = p.y + p.pivotV * p.h
    const isHorn = p.id === 'horn'

    ctx.save()
    if (isHorn && hornWobble !== 0) {
      ctx.translate(px, py)
      ctx.rotate(hornWobble)
      ctx.translate(-px, -py)
    }

    ctx.drawImage(image, p.x, p.y, p.w, p.h, p.x, p.y, p.w, p.h)

    if (debugPivots) {
      ctx.strokeStyle = 'rgba(220, 40, 40, 0.85)'
      ctx.lineWidth = 1 / scale
      ctx.strokeRect(p.x, p.y, p.w, p.h)
      const pvx = p.x + p.pivotU * p.w
      const pvy = p.y + p.pivotV * p.h
      const d = 4 / scale
      ctx.beginPath()
      ctx.moveTo(pvx - d, pvy)
      ctx.lineTo(pvx + d, pvy)
      ctx.moveTo(pvx, pvy - d)
      ctx.lineTo(pvx, pvy + d)
      ctx.stroke()
    }

    ctx.restore()
  }

  ctx.restore()
}

/** Debug overlay using manifest geometry only (no texture). */
export function drawBeetleAtlasDebugWireframe(
  ctx: CanvasRenderingContext2D,
  manifest: BeetleAtlasManifest,
  cx: number,
  cy: number,
  targetRadiusPx: number,
): void {
  const { ax, ay } = beetleAtlasAnchor(manifest)
  const rAtlas = beetleAtlasRadius(manifest, ax, ay)
  const scale = targetRadiusPx / rAtlas
  const parts = sortedParts(manifest)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-ax, -ay)
  ctx.strokeStyle = 'rgba(30, 90, 40, 0.9)'
  ctx.lineWidth = 1 / scale
  for (const p of parts) {
    ctx.strokeRect(p.x, p.y, p.w, p.h)
    const pvx = p.x + p.pivotU * p.w
    const pvy = p.y + p.pivotV * p.h
    const d = 4 / scale
    ctx.beginPath()
    ctx.moveTo(pvx - d, pvy)
    ctx.lineTo(pvx + d, pvy)
    ctx.moveTo(pvx, pvy - d)
    ctx.lineTo(pvx, pvy + d)
    ctx.stroke()
  }
  ctx.restore()
}
