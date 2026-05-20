import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { PresetId } from '../presets/types'
import type { BeetleAtlasManifest } from './beetleAtlas.types'
import { mulberry32, swarmGlyphVariants, type Bitmap8 } from './glyphs'
import { cell01 } from './cellHash'
import {
  SWARM_COLS,
  SWARM_ROWS,
  fillSwarmActiveFlags,
  getSwarmCellOrder,
  layoutSeedForPreset,
  swarmGlyphCountForCanvas,
} from './swarmLayout'
import { BEETLE_ATLAS_MANIFEST_URL } from './beetleAtlas.types'
import { fetchBeetleAtlasManifest, loadBeetleAtlasBundle } from './beetleAtlasLoader'
import { drawBeetleAtlasDebugWireframe, drawBeetleFromAtlas } from './beetleAtlasDraw'
import {
  drawSwarmTokenSpriteCentered,
  loadAllSwarmTokenFrames,
  type SwarmTokenFrames,
} from './swarmTokenSprite'
import { KRENKO_ASSET_FALLBACK_URLS, KRENKO_ASSET_URLS } from './krenkoAssets'
import {
  KRENKO_BOSS_DEATH_DURATION_MS,
  krenkoDyingSwarmCountForParticles,
  type KrenkoDyingKind,
} from './krenkoDeathViz'

/** Extra scale for dense swarms — keeps cell-sized glyphs from overlapping when n is large. */
function swarmGlyphSizeMul(n: number): number {
  if (n <= 1) return 1
  return Math.min(1.72, 1 + 3.1 / Math.sqrt(n))
}

/**
 * World-space draw size for one token (sprite or 8×8 grid scaled to `glyphSize`).
 * Shrinks **continuously** with `n`: viewport-driven when sparse, asymptotes to the
 * dense **cell cap** (`cellSlot * swarmGlyphSizeMul`) so there is no jump at n=9.
 */
function swarmGlyphDrawSize(w: number, h: number, cw: number, ch: number, n: number): number {
  const vmin = Math.min(w, h)
  const cellSlot = Math.min(cw, ch) * 0.68
  const cellBound = cellSlot * swarmGlyphSizeMul(n)
  const headroom = (vmin * 0.54) / Math.pow(Math.max(n, 1), 0.34)
  return Math.min(vmin * 0.48, Math.max(cellBound, headroom))
}

/** Aggressive radial spread so token separation is unmistakable at medium counts. */
const SWARM_POSITION_SPREAD = 2.75
const SWARM_SPREAD_X_BIAS = 1.7
const SWARM_SPREAD_Y_BIAS = 1.0

function swarmedCellCenterPx(gx: number, gy: number, cw: number, ch: number): { ax: number; ay: number } {
  const boardCx = (SWARM_COLS / 2) * cw
  const boardCy = (SWARM_ROWS / 2) * ch
  const cellCx = (gx + 0.5) * cw
  const cellCy = (gy + 0.5) * ch
  const ax = boardCx + (cellCx - boardCx) * SWARM_POSITION_SPREAD * SWARM_SPREAD_X_BIAS
  const ay = boardCy + (cellCy - boardCy) * SWARM_POSITION_SPREAD * SWARM_SPREAD_Y_BIAS
  return { ax, ay }
}

/**
 * Radial push away from the **cluster centroid** (in px) so cardinal-adjacent
 * tokens do not stack into one blob when draw size is large.
 */
function clusterSeparationPx(
  flags: Uint8Array,
  cw: number,
  ch: number,
): Map<number, { sx: number; sy: number }> {
  const out = new Map<number, { sx: number; sy: number }>()
  const cells: { idx: number; ax: number; ay: number }[] = []
  for (let gy = 0; gy < SWARM_ROWS; gy++) {
    for (let gx = 0; gx < SWARM_COLS; gx++) {
      const idx = gy * SWARM_COLS + gx
      if (!flags[idx]) continue
      const { ax, ay } = swarmedCellCenterPx(gx, gy, cw, ch)
      cells.push({ idx, ax, ay })
    }
  }
  const na = cells.length
  if (na <= 1) return out
  let mx = 0
  let my = 0
  for (const c of cells) {
    mx += c.ax
    my += c.ay
  }
  mx /= na
  my /= na
  const slot = Math.min(cw, ch)
  const sepMag = slot * (1.8 / Math.pow(na, 0.15))
  const sepXBias = 1.65
  const sepYBias = 1.0
  for (const c of cells) {
    const dx = (c.ax - mx) * sepXBias
    const dy = (c.ay - my) * sepYBias
    const d = Math.hypot(dx, dy)
    if (d < 0.5) {
      out.set(c.idx, { sx: 0, sy: 0 })
      continue
    }
    out.set(c.idx, { sx: (dx / d) * sepMag, sy: (dy / d) * sepMag })
  }
  return out
}

function swarmMotionAtten(n: number): number {
  return Math.min(1, n / 28)
}

/** 4–5 random translation vectors per time segment; whole colony “drifts” together. */
function swarmColonyDrift(
  timeMs: number,
  layoutSeed: number,
  cw: number,
  ch: number,
  reducedMotion: boolean,
): { dx: number; dy: number } {
  if (reducedMotion) return { dx: 0, dy: 0 }
  const switchMs = 920 + ((layoutSeed >>> 0) % 520)
  const seg = Math.floor(timeMs / switchMs)
  const rng = mulberry32((layoutSeed ^ seg * 0x9e3779b9) >>> 0)
  const nVec = 4 + (layoutSeed & 1)
  const vecs: { dx: number; dy: number }[] = []
  for (let i = 0; i < nVec; i++) {
    vecs.push({
      dx: (rng() - 0.5) * cw * 0.52,
      dy: (rng() - 0.5) * ch * 0.52,
    })
  }
  const pick = Math.floor(rng() * nVec)
  return vecs[pick]!
}

/** Shared two-step idle timing for all glyphs (variant + scale pulse). */
const GLYPH_TWIN_MS = 560

function centerLensPan(canvas: HTMLCanvasElement): { x: number; y: number } {
  const ww = canvas.clientWidth
  const hh = canvas.clientHeight
  if (ww < 8 || hh < 8) return { x: 0, y: 0 }
  const cw = ww / SWARM_COLS
  const ch = hh / SWARM_ROWS
  const cx = Math.floor(SWARM_COLS / 2)
  const cy = Math.floor(SWARM_ROWS / 2)
  return { x: (cx + 0.5) * cw - ww / 2, y: (cy + 0.5) * ch - hh / 2 }
}

export type FieldMode = 'normal' | 'dying' | 'emptyJoke'

export interface PixelFieldHandle {
  toDataURL: () => string | undefined
}

/** Three greens / three teals — cycles with swarm birth order. */
const BUG_INK_SHADES = ['#16341c', '#1f4a28', '#2d5f36'] as const
const HORDE_INK_SHADES = ['#1f5552', '#2a6b66', '#3a8a82'] as const
const KRENKO_INK_SHADES = ['#2c181a', '#3d2527', '#4a2f32'] as const
const KRENKO_PANEL = '#ebe6e2'

function inkShadesForPreset(presetId: PresetId) {
  if (presetId === 'horde') return HORDE_INK_SHADES
  if (presetId === 'krenko') return KRENKO_INK_SHADES
  return BUG_INK_SHADES
}

function panelColorForPreset(presetId: PresetId) {
  return presetId === 'krenko' ? KRENKO_PANEL : '#dfeedd'
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vrot: number
  variant: number
  life: number
  ink: string
  /** Horizontal mirror (−1 / 1) for wipe splats. */
  flipX: number
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  bmp: Bitmap8,
  px: number,
  py: number,
  size: number,
  ink: string,
) {
  const ps = size / 8
  ctx.fillStyle = ink
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (bmp[y]![x]) ctx.fillRect(px + x * ps, py + y * ps, ps, ps)
    }
  }
}

function drawImageCentered(ctx: CanvasRenderingContext2D, img: HTMLImageElement, halfBox: number) {
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  if (nw < 1 || nh < 1) return
  const box = halfBox * 2
  const s = box / Math.max(nw, nh)
  const dw = nw * s
  const dh = nh * s
  ctx.drawImage(
    img,
    0,
    0,
    nw,
    nh,
    Math.round(-dw / 2),
    Math.round(-dh / 2),
    Math.round(dw),
    Math.round(dh),
  )
}

function pickKrenkoMinionSprite(
  generationIndex: number,
  minionA: HTMLImageElement | null,
  minionB: HTMLImageElement | null,
): HTMLImageElement | null {
  const aReady = Boolean(minionA && minionA.naturalWidth > 0)
  const bReady = Boolean(minionB && minionB.naturalWidth > 0)
  if (aReady && bReady) {
    const chooseB = cell01(generationIndex + 11, 7, 0x6a09e667) > 0.5
    return chooseB ? minionB : minionA
  }
  if (aReady) return minionA
  if (bReady) return minionB
  return null
}

function krenkoMinionFlipX(generationIndex: number): -1 | 1 {
  return cell01(generationIndex + 23, 5, 0xbb67ae85) > 0.5 ? -1 : 1
}

/** Same A/B choice as orbit minions, but expressed as swarm token frame index (0 / 1). */
function pickKrenkoMinionFrameVariant(generationIndex: number, frames: SwarmTokenFrames): number {
  const aReady = Boolean(frames.a && frames.a.naturalWidth > 0)
  const bReady = Boolean(frames.b && frames.b.naturalWidth > 0)
  if (aReady && bReady) {
    return cell01(generationIndex + 11, 7, 0x6a09e667) > 0.5 ? 1 : 0
  }
  return 0
}

/** Krenko track: boss sprite at origin with orbiting minions (per-goblin sprite + facing). */
function drawKrenkoCenterMob(
  ctx: CanvasRenderingContext2D,
  totalCount: bigint,
  timeMs: number,
  reducedMotion: boolean,
  bossHalf: number,
  bossSprite: HTMLImageElement,
  minionA: HTMLImageElement | null,
  minionB: HTMLImageElement | null,
  minionInkFallback: string,
) {
  const minionCount = totalCount >= 3n ? 2 : totalCount === 2n ? 1 : 0
  const variants = swarmGlyphVariants('krenko')
  const t = timeMs * 0.001
  drawImageCentered(ctx, bossSprite, bossHalf)
  if (minionCount <= 0) return
  const minionHalf = bossHalf * 0.5
  const orbitR = bossHalf * 1.42
  for (let i = 0; i < minionCount; i++) {
    const omega = reducedMotion ? 0 : i === 0 ? 1.12 : -0.98
    const ang = reducedMotion ? i * Math.PI * 0.74 + 0.22 : t * omega + i * Math.PI * 0.86
    const ox = Math.cos(ang) * orbitR
    const oy = Math.sin(ang) * orbitR
    const minionSprite = pickKrenkoMinionSprite(i, minionA, minionB)
    const flipX = krenkoMinionFlipX(i)
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(flipX, 1)
    if (minionSprite) {
      drawImageCentered(ctx, minionSprite, minionHalf)
    } else {
      const vi = 0
      const sz = minionHalf * 2
      ctx.translate(-minionHalf, -minionHalf)
      drawGlyph(ctx, variants[vi]!, 0, 0, sz, minionInkFallback)
    }
    ctx.restore()
  }
}

/**
 * 0…1 as orbiting goblin count grows. Ramps with log₂ so doubling 8→16→32 reads as denser rings
 * (tighter than the old log₁₀ curve in the Commander-relevant band).
 */
function krenkoOrbitCrowdK(nMinions: number): number {
  if (nMinions <= 1) return 0
  return Math.min(1, Math.log2(nMinions + 0.25) / 4.4)
}

function drawKrenkoOrbitSwarm(
  ctx: CanvasRenderingContext2D,
  totalCount: bigint,
  timeMs: number,
  reducedMotion: boolean,
  centerX: number,
  centerY: number,
  bossHalf: number,
  bossSprite: HTMLImageElement | null,
  minionA: HTMLImageElement | null,
  minionB: HTMLImageElement | null,
  minionInkFallback: string,
  /** When false, all `totalCount` tokens are drawn as orbiting minions (post–boss-dismiss horde). */
  centerBoss: boolean,
) {
  ctx.save()
  ctx.translate(centerX, centerY)
  const t = timeMs * 0.001
  if (centerBoss && bossSprite) {
    const bossDriftY = reducedMotion ? 0 : Math.sin(t * 0.56) * bossHalf * 0.07
    const bossDriftX = reducedMotion ? 0 : Math.cos(t * 0.41) * bossHalf * 0.03
    const bossTilt = reducedMotion ? 0 : Math.sin(t * 0.34) * 0.022
    ctx.translate(bossDriftX, bossDriftY)
    ctx.rotate(bossTilt)
    drawImageCentered(ctx, bossSprite, bossHalf)
  }

  const nMinions = centerBoss ? Math.max(0, Number(totalCount) - 1) : Number(totalCount)
  if (nMinions <= 0) {
    ctx.restore()
    return
  }

  const variants = swarmGlyphVariants('krenko')
  const crowdK = krenkoOrbitCrowdK(nMinions)
  /* Tighter ring stack + slightly smaller first ring as horde grows (esp. 8+). */
  const ringGap = bossHalf * (0.56 - crowdK * 0.36)
  const baseRadius = bossHalf * (1.34 - crowdK * 0.46)
  /* More rings when crowded: fewer slots per ring, step shrinks too. */
  const firstRingSlots = Math.max(5, Math.min(8, Math.round(8 - crowdK * 3.15)))
  const ringSlotStep = Math.max(5, Math.min(8, Math.round(8 - crowdK * 2.85)))
  const spinMul = 1 + crowdK * 0.95
  const renderCount =
    nMinions <= 160 ? nMinions : Math.min(540, 160 + Math.floor(Math.sqrt(nMinions - 160) * 18))
  let placed = 0
  let ring = 0

  while (placed < renderCount) {
    const slots = firstRingSlots + ring * ringSlotStep
    const inRing = Math.min(slots, renderCount - placed)
    const radius = baseRadius + ring * ringGap
    const ringSpin = reducedMotion ? 0 : (ring % 2 === 0 ? 0.4 : -0.32) * t * spinMul
    for (let j = 0; j < inRing; j++) {
      const i = placed + j
      const frac = j / inRing
      const baseAng = frac * Math.PI * 2 + ring * 0.32
      const ang = baseAng + ringSpin
      const wobbleMul = Math.max(0.018, 0.11 - crowdK * 0.085)
      const wobble = reducedMotion ? 0 : Math.sin(t * 2.2 + i * 0.67) * bossHalf * wobbleMul
      const ox = Math.cos(ang) * (radius + wobble)
      const oy = Math.sin(ang) * (radius + wobble)
      const sizeScale = Math.max(
        0.065,
        0.46 - ring * (0.072 + crowdK * 0.038) - crowdK * 0.12,
      )
      const minionHalf = bossHalf * sizeScale
      const minionSprite = pickKrenkoMinionSprite(i, minionA, minionB)
      const flipX = krenkoMinionFlipX(i)
      ctx.save()
      ctx.translate(ox, oy)
      ctx.scale(flipX, 1)
      if (minionSprite) {
        drawImageCentered(ctx, minionSprite, minionHalf)
      } else {
        const vi = 0
        const sz = minionHalf * 2
        ctx.translate(-minionHalf, -minionHalf)
        drawGlyph(ctx, variants[vi]!, 0, 0, sz, minionInkFallback)
      }
      ctx.restore()
    }
    placed += inRing
    ring += 1
  }

  ctx.restore()
}

function buildParticles(
  count: bigint,
  presetId: PresetId,
  w: number,
  h: number,
): Particle[] {
  const order = getSwarmCellOrder(presetId)
  const n = swarmGlyphCountForCanvas(count)
  const layoutSeed = layoutSeedForPreset(presetId)
  const inks = inkShadesForPreset(presetId)
  const cw = w / SWARM_COLS
  const ch = h / SWARM_ROWS
  const flags = new Uint8Array(SWARM_COLS * SWARM_ROWS)
  fillSwarmActiveFlags(flags, order, n)
  const clusterSep = n > 1 ? clusterSeparationPx(flags, cw, ch) : new Map<number, { sx: number; sy: number }>()
  const list: Particle[] = []
  for (let i = 0; i < n; i++) {
    const idx = order[i]!
    const gx = idx % SWARM_COLS
    const gy = Math.floor(idx / SWARM_COLS)
    const rng = mulberry32((gx << 16) ^ gy ^ layoutSeed)
    const { ax, ay } = swarmedCellCenterPx(gx, gy, cw, ch)
    const sep = clusterSep.get(idx) ?? { sx: 0, sy: 0 }
    const flipX = cell01(gx, gy, layoutSeed ^ 0x51ed81a1) < 0.5 ? -1 : 1
    list.push({
      x: ax + sep.sx,
      y: ay + sep.sy,
      vx: (rng() - 0.5) * 14,
      vy: (rng() - 0.5) * 14 - 4,
      rot: 0,
      vrot: (rng() - 0.5) * 0.4,
      variant: Math.floor(rng() * 2),
      life: 1,
      ink: inks[i % 3]!,
      flipX,
    })
  }
  return list
}

/** World-space pan (offset from center); clamp so field edges are not pulled past viewport */
function clampPan(px: number, py: number, w: number, h: number, scale: number) {
  if (scale <= 1 + 1e-6) return { x: 0, y: 0 }
  const halfVisW = w / (2 * scale)
  const halfVisH = h / (2 * scale)
  const minPx = halfVisW - w / 2
  const maxPx = w / 2 - halfVisW
  const minPy = halfVisH - h / 2
  const maxPy = h / 2 - halfVisH
  if (minPx > maxPx || minPy > maxPy) return { x: 0, y: 0 }
  return {
    x: Math.min(maxPx, Math.max(minPx, px)),
    y: Math.min(maxPy, Math.max(minPy, py)),
  }
}

/**
 * Mean position of swarm token centers (static layout: swarmed cell + cluster separation).
 * Used to bias pan when zoomed in. Returns null for solo token, Krenko orbit layouts, or empty.
 */
function swarmCentroidBasePx(
  presetId: PresetId,
  count: bigint,
  w: number,
  h: number,
  leaderPresent: boolean,
  krenkoOrbitHordeWithoutBoss: boolean,
  bossSprite: HTMLImageElement | null,
): { cx: number; cy: number } | null {
  const bossReady = Boolean(bossSprite && bossSprite.naturalWidth > 0)
  const order = getSwarmCellOrder(presetId)
  const n = swarmGlyphCountForCanvas(count)
  const useKrenkoOrbitCanvas =
    presetId === 'krenko' &&
    n > 0 &&
    ((leaderPresent && bossReady) || (krenkoOrbitHordeWithoutBoss && !leaderPresent))
  if (useKrenkoOrbitCanvas || n <= 1) return null

  const flags = new Uint8Array(SWARM_COLS * SWARM_ROWS)
  fillSwarmActiveFlags(flags, order, n)
  const cw = w / SWARM_COLS
  const ch = h / SWARM_ROWS
  const clusterSep = n > 1 ? clusterSeparationPx(flags, cw, ch) : new Map<number, { sx: number; sy: number }>()
  const krenkoBossCellIdx =
    presetId === 'krenko' && leaderPresent && bossReady && n > 0 ? order[0]! : -1

  let sx = 0
  let sy = 0
  let c = 0
  for (let gy = 0; gy < SWARM_ROWS; gy++) {
    for (let gx = 0; gx < SWARM_COLS; gx++) {
      const idx = gy * SWARM_COLS + gx
      if (!flags[idx]) continue
      if (idx === krenkoBossCellIdx) continue
      const { ax, ay } = swarmedCellCenterPx(gx, gy, cw, ch)
      const sep = clusterSep.get(idx) ?? { sx: 0, sy: 0 }
      sx += ax + sep.sx
      sy += ay + sep.sy
      c += 1
    }
  }
  if (c === 0) return null
  return { cx: sx / c, cy: sy / c }
}

type ScuteAtlasPaint =
  | { kind: 'none' }
  | { kind: 'ready'; image: HTMLImageElement }
  | { kind: 'manifestOnly' }

function readBeetleDebugQuery(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('beetleDebug')
}

function swarmSpriteReady(frames: SwarmTokenFrames): boolean {
  return Boolean(frames.a && frames.a.naturalWidth > 0)
}

function loadImageWithFallback(primaryUrl: string, fallbackUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const primary = new Image()
    primary.decoding = 'async'
    primary.onload = () => resolve(primary)
    primary.onerror = () => {
      const fallback = new Image()
      fallback.decoding = 'async'
      fallback.onload = () => resolve(fallback)
      fallback.onerror = () => resolve(null)
      fallback.src = fallbackUrl
    }
    primary.src = primaryUrl
  })
}

/** Load optional art (no fallback file); resolves null on 404. */
function loadImageOptional(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      void img
        .decode()
        .catch(() => undefined)
        .finally(() => resolve(img))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function imageReady(img: HTMLImageElement | null): img is HTMLImageElement {
  return Boolean(img && img.complete && img.naturalWidth > 0)
}

/** Board wipe: Krenko at orbit-scale, falls with splats (ease-in Y), spin + death-face when loaded. */
function drawKrenkoWipeBossOverlay(
  ctx: CanvasRenderingContext2D,
  ww: number,
  hh: number,
  zoomScale: number,
  t: number,
  bossSprite: HTMLImageElement,
  deathSprite: HTMLImageElement | null,
) {
  if (!imageReady(bossSprite)) return
  const face = imageReady(deathSprite) ? deathSprite : bossSprite
  const zs = Math.max(zoomScale, 0.02)
  const bossHalf = (Math.min(ww, hh) / zs) * 0.62 * 0.5
  const u = Math.min(1, Math.max(0, t))
  const fall = u * u * (hh * 0.34) + u * 16
  const driftX = Math.sin(u * Math.PI * 4.5) * (12 - u * 9)
  const spin = u * Math.PI * 2.4 + u * u * Math.PI * 1.1
  const alpha = Math.min(1, 0.26 + (1 - u) ** 0.72 * 0.84)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(ww / 2 + driftX, hh / 2 + fall)
  ctx.rotate(spin)
  drawImageCentered(ctx, face, bossHalf)
  ctx.restore()
}

/** During boss-dismissal death: orbiting minions stay visible under the falling boss overlay. */
function paintKrenkoBossDismissalHordeUnderlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  zoomScale: number,
  panX: number,
  panY: number,
  timeMs: number,
  reducedMotion: boolean,
  /** Goblin-only count (board total minus the dying boss slot). */
  minionHordeCount: bigint,
  minionA: HTMLImageElement | null,
  minionB: HTMLImageElement | null,
) {
  if (minionHordeCount <= 0n) return
  const inks = inkShadesForPreset('krenko')
  const cw = w / SWARM_COLS
  const ch = h / SWARM_ROWS
  const camX = w / 2 + panX
  const camY = h / 2 + panY
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(zoomScale, zoomScale)
  ctx.translate(-camX, -camY)
  const cx = Math.floor(SWARM_COLS / 2)
  const cy = Math.floor(SWARM_ROWS / 2)
  const cellCenterX = (cx + 0.5) * cw
  const cellCenterY = (cy + 0.5) * ch
  const lens = (Math.min(w, h) / zoomScale) * 0.62
  drawKrenkoOrbitSwarm(
    ctx,
    minionHordeCount,
    timeMs,
    reducedMotion,
    cellCenterX,
    cellCenterY,
    lens / 2,
    null,
    minionA,
    minionB,
    inks[0]!,
    false,
  )
  ctx.restore()
}

function drawNormalContent(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  presetId: PresetId,
  count: bigint,
  pulseKey: number,
  pulseStartedAt: number | null,
  timeMs: number,
  zoomScale: number,
  panX: number,
  panY: number,
  reducedMotion: boolean,
  scuteAtlas: ScuteAtlasPaint,
  scuteAtlasManifest: BeetleAtlasManifest | null,
  swarmFrames: SwarmTokenFrames,
  leaderPresent: boolean,
  /** True once Krenko has been cast this run; boss off-board → keep ring layout instead of calm grid. */
  krenkoOrbitHordeWithoutBoss: boolean,
  bossSprite: HTMLImageElement | null,
  minionA: HTMLImageElement | null,
  minionB: HTMLImageElement | null,
) {
  const inks = inkShadesForPreset(presetId)
  const variants = swarmGlyphVariants(presetId)
  const useTokenSprite = swarmSpriteReady(swarmFrames)
  const panel = panelColorForPreset(presetId)
  const bossReady = Boolean(bossSprite && bossSprite.naturalWidth > 0)

  ctx.fillStyle = panel
  ctx.fillRect(0, 0, w, h)

  const layoutSeed = layoutSeedForPreset(presetId)
  const order = getSwarmCellOrder(presetId)
  const n = swarmGlyphCountForCanvas(count)
  const flags = new Uint8Array(SWARM_COLS * SWARM_ROWS)
  fillSwarmActiveFlags(flags, order, n)
  const shadeRing = new Uint8Array(SWARM_COLS * SWARM_ROWS)
  shadeRing.fill(255)
  for (let i = 0; i < n; i++) shadeRing[order[i]!] = i % 3

  const krenkoBossCellIdx =
    presetId === 'krenko' && leaderPresent && bossReady && n > 0 ? order[0]! : -1

  const calmKrenkoNoBoss =
    presetId === 'krenko' && !leaderPresent && !krenkoOrbitHordeWithoutBoss
  const birthRankByIdx =
    calmKrenkoNoBoss && n > 0
      ? (() => {
          const ranks = new Int32Array(SWARM_COLS * SWARM_ROWS)
          ranks.fill(-1)
          for (let i = 0; i < n; i++) ranks[order[i]!] = i
          return ranks
        })()
      : null

  const cw = w / SWARM_COLS
  const ch = h / SWARM_ROWS
  const motionK = swarmMotionAtten(n)

  const camX = w / 2 + panX
  const camY = h / 2 + panY

  const drift =
    n > 1
      ? swarmColonyDrift(timeMs, layoutSeed, cw, ch, reducedMotion)
      : { dx: 0, dy: 0 }
  const driftMul = calmKrenkoNoBoss && n > 1 ? 0.55 : 1
  const driftDx = drift.dx * driftMul
  const driftDy = drift.dy * driftMul
  const swarmLocalMotionMul = n > 1 ? 0.42 : 1
  const clusterSep = n > 1 ? clusterSeparationPx(flags, cw, ch) : new Map<number, { sx: number; sy: number }>()

  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(zoomScale, zoomScale)
  ctx.translate(-camX, -camY)

  const t = timeMs * 0.001
  const twinPhase = reducedMotion ? 0 : Math.floor(timeMs / GLYPH_TWIN_MS) % 2
  const visualPhase = calmKrenkoNoBoss ? 0 : twinPhase
  const twinPop = reducedMotion || calmKrenkoNoBoss ? 1 : 1 + (twinPhase === 0 ? 0.06 : -0.032)
  const useKrenkoOrbitCanvas =
    presetId === 'krenko' &&
    n > 0 &&
    ((leaderPresent && bossReady) || (krenkoOrbitHordeWithoutBoss && !leaderPresent))

  if (useKrenkoOrbitCanvas) {
    const cx = Math.floor(SWARM_COLS / 2)
    const cy = Math.floor(SWARM_ROWS / 2)
    const cellCenterX = (cx + 0.5) * cw
    const cellCenterY = (cy + 0.5) * ch
    const lens = (Math.min(w, h) / zoomScale) * 0.62
    const lensInk = inks[0]!
    const centerBoss = leaderPresent
    drawKrenkoOrbitSwarm(
      ctx,
      count,
      timeMs,
      reducedMotion,
      cellCenterX,
      cellCenterY,
      lens / 2,
      bossSprite,
      minionA,
      minionB,
      lensInk,
      centerBoss,
    )
  } else if (n === 1) {
    const cx = Math.floor(SWARM_COLS / 2)
    const cy = Math.floor(SWARM_ROWS / 2)
    const cellCenterX = (cx + 0.5) * cw
    const cellCenterY = (cy + 0.5) * ch
    const viBase =
      Math.floor(cell01(cx, cy, layoutSeed ^ 0x9e3779b1) * variants.length) % variants.length
    const vi = (viBase + visualPhase) % variants.length
    const lens = (Math.min(w, h) / zoomScale) * 0.62
    const lensInk = inks[0]!
    const beetleDebug = readBeetleDebugQuery()
    const heroRadius = lens * 0.46
    const useAtlasHero =
      presetId === 'scute' &&
      scuteAtlasManifest &&
      (scuteAtlas.kind === 'ready' || (scuteAtlas.kind === 'manifestOnly' && beetleDebug))

    ctx.save()
    ctx.translate(cellCenterX, cellCenterY)
    ctx.scale(twinPop, twinPop)
    if (useAtlasHero && scuteAtlas.kind === 'ready' && scuteAtlasManifest) {
      drawBeetleFromAtlas(ctx, {
        manifest: scuteAtlasManifest,
        image: scuteAtlas.image,
        cx: 0,
        cy: 0,
        targetRadiusPx: heroRadius,
        timeMs,
        reducedMotion,
        debugPivots: beetleDebug,
      })
    } else if (
      presetId === 'scute' &&
      scuteAtlas.kind === 'manifestOnly' &&
      beetleDebug &&
      scuteAtlasManifest
    ) {
      drawBeetleAtlasDebugWireframe(ctx, scuteAtlasManifest, 0, 0, heroRadius)
    } else if (presetId === 'krenko' && leaderPresent && bossReady && bossSprite) {
      drawKrenkoCenterMob(
        ctx,
        count,
        timeMs,
        reducedMotion,
        lens / 2,
        bossSprite,
        minionA,
        minionB,
        lensInk,
      )
    } else if (leaderPresent && bossReady && bossSprite) {
      drawImageCentered(ctx, bossSprite, lens / 2)
    } else if (useTokenSprite) {
      const tokenVariant = calmKrenkoNoBoss ? pickKrenkoMinionFrameVariant(0, swarmFrames) : vi
      const flipX = calmKrenkoNoBoss ? krenkoMinionFlipX(0) : 1
      ctx.scale(flipX, 1)
      drawSwarmTokenSpriteCentered(ctx, swarmFrames, tokenVariant, lens / 2)
    } else if (presetId !== 'scute') {
      const flipX = calmKrenkoNoBoss ? krenkoMinionFlipX(0) : 1
      ctx.scale(flipX, 1)
      drawGlyph(ctx, variants[vi]!, -lens / 2, -lens / 2, lens, lensInk)
    }
    ctx.restore()
  } else {
    for (let gy = 0; gy < SWARM_ROWS; gy++) {
      for (let gx = 0; gx < SWARM_COLS; gx++) {
        const idx = gy * SWARM_COLS + gx
        if (!flags[idx]) continue
        if (idx === krenkoBossCellIdx) continue
        const viBase =
          Math.floor(cell01(gx, gy, layoutSeed ^ 0x9e3779b1) * variants.length) % variants.length
        const vi = (viBase + visualPhase) % variants.length
        const glyphInk = inks[(shadeRing[idx] ?? 0) % 3]!
        const { ax, ay } = swarmedCellCenterPx(gx, gy, cw, ch)
        const birthRank = birthRankByIdx ? birthRankByIdx[idx]! : -1
        const flipX = calmKrenkoNoBoss
          ? krenkoMinionFlipX(birthRank)
          : cell01(gx, gy, layoutSeed ^ 0x51ed81a1) < 0.5
            ? -1
            : 1
        const calmMotionMul = calmKrenkoNoBoss ? 0.42 : 1
        const bobX = reducedMotion
          ? 0
          : Math.sin(t * 1.45 + gx * 0.71 + gy * 0.33) *
            cw *
            0.2 *
            motionK *
            swarmLocalMotionMul *
            calmMotionMul
        const bobY = reducedMotion
          ? 0
          : Math.cos(t * 1.28 + gx * 0.44 + gy * 0.91) *
            ch *
            0.2 *
            motionK *
            swarmLocalMotionMul *
            calmMotionMul
        const crawlX = reducedMotion
          ? 0
          : Math.sin(t * 0.38 + gx * 0.19 + gy * 0.27) *
            cw *
            0.12 *
            motionK *
            swarmLocalMotionMul *
            calmMotionMul
        const crawlY = reducedMotion
          ? 0
          : Math.cos(t * 0.33 + gx * 0.23 + gy * 0.31) *
            ch *
            0.12 *
            motionK *
            swarmLocalMotionMul *
            calmMotionMul
        const jitter = reducedMotion
          ? 0
          : Math.sin(t * 2.2 + gx * gy * 0.02) * 0.04 * motionK * swarmLocalMotionMul * calmMotionMul
        const glyphSize = swarmGlyphDrawSize(w, h, cw, ch, n)
        const sep = clusterSep.get(idx) ?? { sx: 0, sy: 0 }
        ctx.save()
        ctx.translate(
          ax + sep.sx + driftDx + bobX + crawlX,
          ay + sep.sy + driftDy + bobY + crawlY,
        )
        ctx.scale(flipX, 1)
        ctx.rotate(jitter)
        ctx.scale(twinPop, twinPop)
        if (useTokenSprite) {
          const tokenVariant = calmKrenkoNoBoss
            ? pickKrenkoMinionFrameVariant(birthRank, swarmFrames)
            : vi
          drawSwarmTokenSpriteCentered(ctx, swarmFrames, tokenVariant, glyphSize / 2)
        } else if (presetId !== 'scute') {
          ctx.translate(-glyphSize / 2, -glyphSize / 2)
          drawGlyph(ctx, variants[vi]!, 0, 0, glyphSize, glyphInk)
        }
        ctx.restore()
      }
    }
  }

  ctx.restore()

  const PULSE_MS = 680
  if (
    pulseKey > 0 &&
    pulseStartedAt != null &&
    !reducedMotion &&
    timeMs >= pulseStartedAt
  ) {
    const elapsed = timeMs - pulseStartedAt
    if (elapsed <= PULSE_MS) {
      const u = elapsed / PULSE_MS
      const strokeColor =
        presetId === 'horde'
          ? 'rgba(42,107,102,0.38)'
          : presetId === 'krenko'
            ? 'rgba(95,48,52,0.38)'
            : 'rgba(31,74,40,0.38)'
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, u * (Math.hypot(w, h) / 2), 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

export const PixelField = forwardRef<
  PixelFieldHandle,
  {
    presetId: PresetId
    count: bigint
    pulseKey: number
    fieldMode: FieldMode
    reducedMotion: boolean
    zoomScale: number
    /** Krenko track: boss is on the board (centered leader art + orbiting minion tokens). */
    leaderPresent?: boolean
    /**
     * Krenko track: boss was cast at least once this run and is now off-board — keep orbiting ring
     * layout for goblins instead of the calm staggered grid (used for “never cast” manual hordes).
     */
    krenkoOrbitHordeWithoutBoss?: boolean
    /** When `fieldMode === 'dying'`, why (drives particle bulk + timing for Krenko boss vignettes). */
    krenkoDyingKind?: KrenkoDyingKind | null
    onDyingComplete?: (kind: KrenkoDyingKind | null) => void
    onEmptyJokeComplete?: () => void
  }
>(function PixelField(
  {
    presetId,
    count,
    pulseKey,
    fieldMode,
    reducedMotion,
    zoomScale,
    leaderPresent = false,
    krenkoOrbitHordeWithoutBoss = false,
    krenkoDyingKind = null,
    onDyingComplete,
    onEmptyJokeComplete,
  },
  ref,
) {
  const [scuteAtlas, setScuteAtlas] = useState<ScuteAtlasPaint>({ kind: 'none' })
  const [scuteAtlasManifest, setScuteAtlasManifest] = useState<BeetleAtlasManifest | null>(null)
  const [swarmTokens, setSwarmTokens] = useState<Record<PresetId, SwarmTokenFrames> | null>(null)
  const [krenkoBossSprite, setKrenkoBossSprite] = useState<HTMLImageElement | null>(null)
  const [krenkoBossDeathSprite, setKrenkoBossDeathSprite] = useState<HTMLImageElement | null>(null)
  const [krenkoMinionA, setKrenkoMinionA] = useState<HTMLImageElement | null>(null)
  const [krenkoMinionB, setKrenkoMinionB] = useState<HTMLImageElement | null>(null)
  const krenkoBossSpriteRef = useRef<HTMLImageElement | null>(null)
  const krenkoBossDeathSpriteRef = useRef<HTMLImageElement | null>(null)
  const krenkoMinionARef = useRef<HTMLImageElement | null>(null)
  const krenkoMinionBRef = useRef<HTMLImageElement | null>(null)
  const swarmTokensRef = useRef<Record<PresetId, SwarmTokenFrames> | null>(null)
  const onDyingCompleteRef = useRef(onDyingComplete)
  onDyingCompleteRef.current = onDyingComplete

  useEffect(() => {
    let cancelled = false
    loadAllSwarmTokenFrames().then((r) => {
      if (!cancelled) {
        swarmTokensRef.current = r
        setSwarmTokens(r)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (presetId !== 'scute') {
      setScuteAtlas({ kind: 'none' })
      setScuteAtlasManifest(null)
      return
    }
    let cancelled = false
    loadBeetleAtlasBundle(BEETLE_ATLAS_MANIFEST_URL)
      .then((bundle) => {
        if (cancelled) return
        setScuteAtlasManifest(bundle.manifest)
        setScuteAtlas({ kind: 'ready', image: bundle.image })
      })
      .catch(() => {
        fetchBeetleAtlasManifest(BEETLE_ATLAS_MANIFEST_URL)
          .then((manifest) => {
            if (cancelled) return
            setScuteAtlasManifest(manifest)
            setScuteAtlas({ kind: 'manifestOnly' })
          })
          .catch(() => {
            if (cancelled) return
            setScuteAtlasManifest(null)
            setScuteAtlas({ kind: 'none' })
          })
      })
    return () => {
      cancelled = true
    }
  }, [presetId])

  useEffect(() => {
    if (presetId !== 'krenko') {
      setKrenkoBossSprite(null)
      setKrenkoBossDeathSprite(null)
      setKrenkoMinionA(null)
      setKrenkoMinionB(null)
      return
    }
    let cancelled = false
    Promise.all([
      loadImageWithFallback(KRENKO_ASSET_URLS.boss, KRENKO_ASSET_FALLBACK_URLS.boss),
      loadImageWithFallback(KRENKO_ASSET_URLS.minionA, KRENKO_ASSET_FALLBACK_URLS.minionA),
      loadImageWithFallback(KRENKO_ASSET_URLS.minionB, KRENKO_ASSET_FALLBACK_URLS.minionB),
      loadImageOptional(KRENKO_ASSET_URLS.bossDeath),
    ]).then(([boss, minionAImage, minionBImage, deathFace]) => {
      if (cancelled) return
      setKrenkoBossSprite(boss)
      setKrenkoMinionA(minionAImage)
      setKrenkoMinionB(minionBImage)
      setKrenkoBossDeathSprite(deathFace)
    })
    return () => {
      cancelled = true
    }
  }, [presetId])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const panRef = useRef({ x: 0, y: 0 })
  useLayoutEffect(() => {
    krenkoBossSpriteRef.current = krenkoBossSprite
    krenkoBossDeathSpriteRef.current = krenkoBossDeathSprite
    krenkoMinionARef.current = krenkoMinionA
    krenkoMinionBRef.current = krenkoMinionB
  }, [krenkoBossSprite, krenkoBossDeathSprite, krenkoMinionA, krenkoMinionB])
  const zoomScaleRef = useRef(zoomScale)
  const dragRef = useRef<{ id: number | null; lx: number; ly: number }>({
    id: null,
    lx: 0,
    ly: 0,
  })
  const pulseStartedAtRef = useRef<number | null>(null)
  const prevPulseKeyRef = useRef(pulseKey)

  useLayoutEffect(() => {
    zoomScaleRef.current = zoomScale
  }, [zoomScale])

  useLayoutEffect(() => {
    if (pulseKey !== prevPulseKeyRef.current) {
      prevPulseKeyRef.current = pulseKey
      if (pulseKey > 0) pulseStartedAtRef.current = performance.now()
    }
  }, [pulseKey])

  useLayoutEffect(() => {
    if (fieldMode !== 'normal') {
      panRef.current = { x: 0, y: 0 }
      return
    }
    const el = canvasRef.current
    if (!el) return

    const applyPanFromLayout = () => {
      if (fieldMode !== 'normal') {
        panRef.current = { x: 0, y: 0 }
        return
      }
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (cw < 8 || ch < 8) return

      if (count === 1n) {
        panRef.current = centerLensPan(el)
        return
      }

      if (count > 1n && zoomScale > 1 + 1e-6) {
        const centroid = swarmCentroidBasePx(
          presetId,
          count,
          cw,
          ch,
          leaderPresent,
          krenkoOrbitHordeWithoutBoss,
          presetId === 'krenko' ? krenkoBossSprite : null,
        )
        if (centroid) {
          panRef.current = clampPan(
            centroid.cx - cw / 2,
            centroid.cy - ch / 2,
            cw,
            ch,
            zoomScale,
          )
        } else {
          panRef.current = { x: 0, y: 0 }
        }
        return
      }

      panRef.current = { x: 0, y: 0 }
    }

    applyPanFromLayout()
    const ro = new ResizeObserver(() => applyPanFromLayout())
    ro.observe(el)
    return () => ro.disconnect()
  }, [
    zoomScale,
    fieldMode,
    count,
    presetId,
    leaderPresent,
    krenkoOrbitHordeWithoutBoss,
    krenkoBossSprite,
  ])

  useImperativeHandle(ref, () => ({
    toDataURL: () => canvasRef.current?.toDataURL('image/png'),
  }))

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (fieldMode !== 'normal' || e.button !== 0) return
      if (dragRef.current.id !== null) return
      const el = canvasRef.current
      if (!el) return
      el.setPointerCapture(e.pointerId)
      dragRef.current = { id: e.pointerId, lx: e.clientX, ly: e.clientY }
    },
    [fieldMode],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (dragRef.current.id !== e.pointerId) return
      const el = canvasRef.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      if (w < 8 || h < 8) return
      const dx = e.clientX - dragRef.current.lx
      const dy = e.clientY - dragRef.current.ly
      dragRef.current.lx = e.clientX
      dragRef.current.ly = e.clientY
      const zs = zoomScaleRef.current
      const next = clampPan(
        panRef.current.x - dx / zs,
        panRef.current.y - dy / zs,
        w,
        h,
        zs,
      )
      panRef.current = next
    },
    [],
  )

  const clearDrag = useCallback(() => {
    dragRef.current = { id: null, lx: 0, ly: 0 }
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (dragRef.current.id !== e.pointerId) return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      clearDrag()
    },
    [clearDrag],
  )

  /** Normal field: fixed DPR buffer + continuous motion (or static if reduced motion) */
  useEffect(() => {
    if (fieldMode !== 'normal') return
    const canvas = canvasRef.current
    if (!canvas) return

    const setupContext = () => {
      const el = canvasRef.current
      if (!el) return null
      const w = el.clientWidth
      const h = el.clientHeight
      if (w < 8 || h < 8) return null
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      el.width = Math.floor(w * dpr)
      el.height = Math.floor(h * dpr)
      const ctx = el.getContext('2d')
      if (!ctx) return null
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      return { ctx, w, h }
    }

    const paint = (timeMs: number) => {
      const got = setupContext()
      if (!got) return
      const { ctx, w, h } = got
      const zs = zoomScale
      const { x: px, y: py } = panRef.current
      drawNormalContent(
        ctx,
        w,
        h,
        presetId,
        count,
        pulseKey,
        pulseStartedAtRef.current,
        timeMs,
        zs,
        px,
        py,
        reducedMotion,
        scuteAtlas,
        scuteAtlasManifest,
        swarmTokens?.[presetId] ?? { a: null, b: null },
        leaderPresent,
        krenkoOrbitHordeWithoutBoss,
        presetId === 'krenko' ? krenkoBossSprite : null,
        presetId === 'krenko' ? krenkoMinionA : null,
        presetId === 'krenko' ? krenkoMinionB : null,
      )
    }

    if (reducedMotion) {
      paint(0)
      const ro = new ResizeObserver(() => paint(0))
      ro.observe(canvas)
      return () => ro.disconnect()
    }

    let raf = 0
    const loop = (t: number) => {
      paint(t)
      raf = requestAnimationFrame(loop)
    }
    const ro = new ResizeObserver(() => {
      /* next frame picks new size */
    })
    ro.observe(canvas)
    raf = requestAnimationFrame(loop)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [
    presetId,
    count,
    pulseKey,
    fieldMode,
    reducedMotion,
    zoomScale,
    scuteAtlas,
    scuteAtlasManifest,
    swarmTokens,
    leaderPresent,
    krenkoOrbitHordeWithoutBoss,
    krenkoBossSprite,
    krenkoMinionA,
    krenkoMinionB,
  ])

  /** Dying animation */
  useEffect(() => {
    if (fieldMode !== 'dying') return
    const canvas = canvasRef.current
    if (!canvas) return
    const dyingKind = krenkoDyingKind
    if (reducedMotion) {
      particlesRef.current = []
      onDyingCompleteRef.current?.(dyingKind)
      return
    }
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const particleBulk = krenkoDyingSwarmCountForParticles(presetId, dyingKind, count, leaderPresent)
    particlesRef.current = buildParticles(particleBulk, presetId, w, h)
    const start = performance.now()
    const dur = KRENKO_BOSS_DEATH_DURATION_MS
    const variants = swarmGlyphVariants(presetId)
    const tokenFrames = swarmTokensRef.current?.[presetId] ?? swarmTokens?.[presetId] ?? { a: null, b: null }
    const useTok = swarmSpriteReady(tokenFrames)

    let deathRaf = 0
    const tick = () => {
      const canvasEl = canvasRef.current
      if (!canvasEl) return
      const ctx = canvasEl.getContext('2d')
      if (!ctx) return
      const ww = canvasEl.clientWidth
      const hh = canvasEl.clientHeight
      if (ww < 8 || hh < 8) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvasEl.width = Math.floor(ww * dpr)
      canvasEl.height = Math.floor(hh * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      const t = (performance.now() - start) / dur
      const cw = ww / SWARM_COLS
      const ch = hh / SWARM_ROWS
      const panel = panelColorForPreset(presetId)
      ctx.fillStyle = panel
      ctx.fillRect(0, 0, ww, hh)
      if (
        presetId === 'krenko' &&
        dyingKind === 'bossDismissal' &&
        leaderPresent &&
        count > 1n
      ) {
        const { x: px, y: py } = panRef.current
        paintKrenkoBossDismissalHordeUnderlay(
          ctx,
          ww,
          hh,
          zoomScale,
          px,
          py,
          performance.now(),
          reducedMotion,
          count - 1n,
          krenkoMinionARef.current,
          krenkoMinionBRef.current,
        )
      }
      const nPart = Math.max(1, particlesRef.current.length)
      const splat = swarmGlyphDrawSize(ww, hh, cw, ch, nPart)
      for (const pt of particlesRef.current) {
        pt.x += pt.vx * 0.35
        pt.y += pt.vy * 0.35
        pt.rot += pt.vrot
        pt.life = Math.max(0, 1 - t * 1.15)
        const bmp = variants[pt.variant % variants.length]!
        ctx.save()
        ctx.translate(pt.x, pt.y)
        ctx.rotate(pt.rot)
        ctx.globalAlpha = Math.max(0, pt.life)
        ctx.scale(pt.flipX, 1)
        if (useTok) {
          drawSwarmTokenSpriteCentered(ctx, tokenFrames, pt.variant, splat / 2)
        } else {
          drawGlyph(ctx, bmp, -splat * 0.35, -splat * 0.35, splat, pt.ink)
        }
        ctx.restore()
      }
      const bossSp = krenkoBossSpriteRef.current
      const deathSp = krenkoBossDeathSpriteRef.current
      if (presetId === 'krenko' && leaderPresent && imageReady(bossSp)) {
        drawKrenkoWipeBossOverlay(ctx, ww, hh, zoomScale, t, bossSp, deathSp)
      }
      if (t < 1) {
        deathRaf = requestAnimationFrame(tick)
      } else {
        particlesRef.current = []
        onDyingCompleteRef.current?.(dyingKind)
      }
    }
    deathRaf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(deathRaf)
  }, [fieldMode, reducedMotion, count, presetId, leaderPresent, krenkoDyingKind, zoomScale])

  /** Empty joke blink */
  useEffect(() => {
    if (fieldMode !== 'emptyJoke') return
    if (reducedMotion) {
      onEmptyJokeComplete?.()
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w >= 8 && h >= 8) {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const panel = panelColorForPreset(presetId)
      ctx.fillStyle = panel
      ctx.fillRect(0, 0, w, h)
    }
    const t = window.setTimeout(() => onEmptyJokeComplete?.(), 700)
    return () => clearTimeout(t)
  }, [fieldMode, reducedMotion, presetId, onEmptyJokeComplete])

  const pannable = fieldMode === 'normal' && zoomScale > 1.02

  return (
    <canvas
      ref={canvasRef}
      className={`pixel-field${pannable ? ' pixel-field--pannable' : ''}`}
      aria-hidden
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={clearDrag}
    />
  )
})
