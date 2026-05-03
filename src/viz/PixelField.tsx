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

/** Extra scale for small swarms — capped low so neighbors do not stack on each other. */
function swarmGlyphSizeMul(n: number): number {
  if (n <= 1) return 1
  return Math.min(1.72, 1 + 3.1 / Math.sqrt(n))
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
  const switchMs = 620 + ((layoutSeed >>> 0) % 380)
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
const GLYPH_TWIN_MS = 400

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

function buildParticles(
  count: bigint,
  presetId: PresetId,
  w: number,
  h: number,
): Particle[] {
  const order = getSwarmCellOrder(presetId)
  const n = swarmGlyphCountForCanvas(count)
  const layoutSeed = layoutSeedForPreset(presetId)
  const inks = presetId === 'horde' ? HORDE_INK_SHADES : BUG_INK_SHADES
  const cw = w / SWARM_COLS
  const ch = h / SWARM_ROWS
  const list: Particle[] = []
  for (let i = 0; i < n; i++) {
    const idx = order[i]!
    const gx = idx % SWARM_COLS
    const gy = Math.floor(idx / SWARM_COLS)
    const rng = mulberry32((gx << 16) ^ gy ^ layoutSeed)
    list.push({
      x: gx * cw + cw / 2,
      y: gy * ch + ch / 2,
      vx: (rng() - 0.5) * 14,
      vy: (rng() - 0.5) * 14 - 4,
      rot: 0,
      vrot: (rng() - 0.5) * 0.4,
      variant: Math.floor(rng() * 2),
      life: 1,
      ink: inks[i % 3]!,
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
) {
  const inks = presetId === 'horde' ? HORDE_INK_SHADES : BUG_INK_SHADES
  const variants = swarmGlyphVariants(presetId)
  const useTokenSprite = swarmSpriteReady(swarmFrames)
  const panel = '#dfeedd'

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

  const cw = w / SWARM_COLS
  const ch = h / SWARM_ROWS
  const baseGlyph = Math.min(cw, ch) * 0.68
  const sizeMul = swarmGlyphSizeMul(n)
  const motionK = swarmMotionAtten(n)

  const camX = w / 2 + panX
  const camY = h / 2 + panY

  const drift =
    n > 1 ? swarmColonyDrift(timeMs, layoutSeed, cw, ch, reducedMotion) : { dx: 0, dy: 0 }
  const swarmLocalMotionMul = n > 1 ? 0.42 : 1

  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(zoomScale, zoomScale)
  ctx.translate(-camX, -camY)

  const t = timeMs * 0.001
  const twinPhase = reducedMotion ? 0 : Math.floor(timeMs / GLYPH_TWIN_MS) % 2
  const twinPop = reducedMotion ? 1 : 1 + (twinPhase === 0 ? 0.06 : -0.032)

  if (n === 1) {
    const cx = Math.floor(SWARM_COLS / 2)
    const cy = Math.floor(SWARM_ROWS / 2)
    const cellCenterX = (cx + 0.5) * cw
    const cellCenterY = (cy + 0.5) * ch
    const viBase =
      Math.floor(cell01(cx, cy, layoutSeed ^ 0x9e3779b1) * variants.length) % variants.length
    const vi = (viBase + twinPhase) % variants.length
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
    } else if (useTokenSprite) {
      drawSwarmTokenSpriteCentered(ctx, swarmFrames, vi, lens / 2)
    } else {
      drawGlyph(ctx, variants[vi]!, -lens / 2, -lens / 2, lens, lensInk)
    }
    ctx.restore()
  } else {
    for (let gy = 0; gy < SWARM_ROWS; gy++) {
      for (let gx = 0; gx < SWARM_COLS; gx++) {
        const idx = gy * SWARM_COLS + gx
        if (!flags[idx]) continue
        const viBase =
          Math.floor(cell01(gx, gy, layoutSeed ^ 0x9e3779b1) * variants.length) % variants.length
        const vi = (viBase + twinPhase) % variants.length
        const glyphInk = inks[(shadeRing[idx] ?? 0) % 3]!
        const baseX = gx * cw + cw * 0.11
        const baseY = gy * ch + ch * 0.11
        const bobX = reducedMotion
          ? 0
          : Math.sin(t * 2.1 + gx * 0.71 + gy * 0.33) *
            cw *
            0.2 *
            motionK *
            swarmLocalMotionMul
        const bobY = reducedMotion
          ? 0
          : Math.cos(t * 1.85 + gx * 0.44 + gy * 0.91) *
            ch *
            0.2 *
            motionK *
            swarmLocalMotionMul
        const crawlX = reducedMotion
          ? 0
          : Math.sin(t * 0.55 + gx * 0.19 + gy * 0.27) *
            cw *
            0.12 *
            motionK *
            swarmLocalMotionMul
        const crawlY = reducedMotion
          ? 0
          : Math.cos(t * 0.48 + gx * 0.23 + gy * 0.31) *
            ch *
            0.12 *
            motionK *
            swarmLocalMotionMul
        const jitter = reducedMotion
          ? 0
          : Math.sin(t * 3.3 + gx * gy * 0.02) * 0.04 * motionK * swarmLocalMotionMul
        const glyphSize = baseGlyph * sizeMul
        ctx.save()
        ctx.translate(
          baseX + drift.dx + bobX + crawlX + glyphSize / 2,
          baseY + drift.dy + bobY + crawlY + glyphSize / 2,
        )
        ctx.rotate(jitter)
        ctx.scale(twinPop, twinPop)
        if (useTokenSprite) {
          drawSwarmTokenSpriteCentered(ctx, swarmFrames, vi, glyphSize / 2)
        } else {
          ctx.translate(-glyphSize / 2, -glyphSize / 2)
          drawGlyph(ctx, variants[vi]!, 0, 0, glyphSize, glyphInk)
        }
        ctx.restore()
      }
    }
  }

  ctx.restore()

  const PULSE_MS = 520
  if (
    pulseKey > 0 &&
    pulseStartedAt != null &&
    !reducedMotion &&
    timeMs >= pulseStartedAt
  ) {
    const elapsed = timeMs - pulseStartedAt
    if (elapsed <= PULSE_MS) {
      const u = elapsed / PULSE_MS
      ctx.strokeStyle =
        presetId === 'horde' ? 'rgba(42,107,102,0.38)' : 'rgba(31,74,40,0.38)'
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
    onDyingComplete?: () => void
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
    onDyingComplete,
    onEmptyJokeComplete,
  },
  ref,
) {
  const [scuteAtlas, setScuteAtlas] = useState<ScuteAtlasPaint>({ kind: 'none' })
  const [scuteAtlasManifest, setScuteAtlasManifest] = useState<BeetleAtlasManifest | null>(null)
  const [swarmTokens, setSwarmTokens] = useState<Record<PresetId, SwarmTokenFrames> | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAllSwarmTokenFrames().then((r) => {
      if (!cancelled) setSwarmTokens(r)
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

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const jokeRafRef = useRef(0)
  const panRef = useRef({ x: 0, y: 0 })
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
    if (count === 1n) {
      panRef.current = centerLensPan(el)
    } else {
      panRef.current = { x: 0, y: 0 }
    }
  }, [zoomScale, fieldMode, count])

  useEffect(() => {
    if (fieldMode !== 'normal' || count !== 1n) return
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      panRef.current = centerLensPan(el)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fieldMode, count])

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
  ])

  /** Dying animation */
  useEffect(() => {
    if (fieldMode !== 'dying') return
    const canvas = canvasRef.current
    if (!canvas) return
    if (reducedMotion) {
      particlesRef.current = []
      onDyingComplete?.()
      return
    }
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    particlesRef.current = buildParticles(count, presetId, w, h)
    const start = performance.now()
    const dur = 620
    const variants = swarmGlyphVariants(presetId)
    const tokenFrames = swarmTokens?.[presetId] ?? { a: null, b: null }
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
      const panel = '#dfeedd'
      ctx.fillStyle = panel
      ctx.fillRect(0, 0, ww, hh)
      for (const pt of particlesRef.current) {
        pt.x += pt.vx * 0.35
        pt.y += pt.vy * 0.35
        pt.rot += pt.vrot
        pt.life = Math.max(0, 1 - t * 1.15)
        const bmp = variants[pt.variant % variants.length]!
        const splat = Math.min(cw, ch) * 0.7
        ctx.save()
        ctx.translate(pt.x, pt.y)
        ctx.rotate(pt.rot)
        ctx.globalAlpha = Math.max(0, pt.life)
        if (useTok) {
          drawSwarmTokenSpriteCentered(ctx, tokenFrames, pt.variant, splat / 2)
        } else {
          drawGlyph(ctx, bmp, -cw * 0.35, -ch * 0.35, splat, pt.ink)
        }
        ctx.restore()
      }
      if (t < 1) {
        deathRaf = requestAnimationFrame(tick)
      } else {
        particlesRef.current = []
        onDyingComplete?.()
      }
    }
    deathRaf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(deathRaf)
  }, [fieldMode, reducedMotion, count, presetId, onDyingComplete, swarmTokens])

  /** Empty joke blink */
  useEffect(() => {
    if (fieldMode !== 'emptyJoke') return
    if (reducedMotion) {
      onEmptyJokeComplete?.()
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const bugInk = '#1f4a28'
    const hordeInk = '#2a6b66'
    const glyphInk = presetId === 'horde' ? hordeInk : bugInk
    const start = performance.now()
    const loop = () => {
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext('2d')
      if (!ctx) return
      const w = c.clientWidth
      const h = c.clientHeight
      if (w < 8 || h < 8) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.floor(w * dpr)
      c.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const panel = '#dfeedd'
      ctx.fillStyle = panel
      ctx.fillRect(0, 0, w, h)
      const blink = Math.sin((performance.now() - start) / 180) > 0
      if (blink) {
        ctx.fillStyle = glyphInk
        ctx.font = `${Math.min(w, h) * 0.12}px ui-monospace, monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('· · ·', w / 2, h / 2)
      }
      if (performance.now() - start < 720) {
        jokeRafRef.current = requestAnimationFrame(loop)
      } else {
        onEmptyJokeComplete?.()
      }
    }
    jokeRafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(jokeRafRef.current)
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
