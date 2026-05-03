import type { PresetId } from '../presets/types'

/** Primary swarm token art (pixel art) per preset, under `public/art/<id>/`. */
export const SWARM_TOKEN_PRIMARY: Record<PresetId, string> = {
  scute: '/art/scute/token-ref.png',
  horde: '/art/horde/token-ref.png',
}

/** Optional second frame for twin-phase swap (`token-ref-2.png`). */
export function swarmTokenSecondaryUrl(presetId: PresetId): string {
  return presetId === 'scute' ? '/art/scute/token-ref-2.png' : '/art/horde/token-ref-2.png'
}

export interface SwarmTokenFrames {
  /** Frame A (always attempted). */
  a: HTMLImageElement | null
  /** Frame B; if null, frame A is used for both twin phases. */
  b: HTMLImageElement | null
}

function loadSprite(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Load primary + optional secondary PNG for one preset. */
export async function loadSwarmTokenFrames(presetId: PresetId): Promise<SwarmTokenFrames> {
  const [a, b] = await Promise.all([
    loadSprite(SWARM_TOKEN_PRIMARY[presetId]),
    loadSprite(swarmTokenSecondaryUrl(presetId)),
  ])
  return { a, b }
}

export async function loadAllSwarmTokenFrames(): Promise<Record<PresetId, SwarmTokenFrames>> {
  const scute = await loadSwarmTokenFrames('scute')
  const horde = await loadSwarmTokenFrames('horde')
  return { scute, horde }
}

function pickFrame(frames: SwarmTokenFrames, variantIndex: number): HTMLImageElement | null {
  const primary = frames.a
  if (!primary || primary.naturalWidth < 1) return null
  if (frames.b && frames.b.naturalWidth > 0 && variantIndex % 2 === 1) return frames.b
  return primary
}

/** After `translate(cx, cy)` + optional `scale`; sprite centered with half-extent `halfBox`. */
export function drawSwarmTokenSpriteCentered(
  ctx: CanvasRenderingContext2D,
  frames: SwarmTokenFrames,
  variantIndex: number,
  halfBox: number,
) {
  const img = pickFrame(frames, variantIndex)
  if (!img) return
  const nw = img.naturalWidth
  const nh = img.naturalHeight
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
