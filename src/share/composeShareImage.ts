import type { PresetId } from '../presets/types'
import { getPreset } from '../presets/registry'
import { formatCount } from '../model/formatCount'

/** 9:16 share card */
export async function composeShareImage(
  fieldDataUrl: string | undefined,
  count: bigint,
  presetId: PresetId,
): Promise<Blob | null> {
  const W = 720
  const H = 1280
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const panel = '#dfeedd'
  const ink = '#1a2e1a'
  const accent =
    presetId === 'horde' ? '#2a6b66' : presetId === 'krenko' ? '#6e3a3e' : '#3d7a4a'
  ctx.fillStyle = panel
  ctx.fillRect(0, 0, W, H)
  const pad = 36
  const fieldH = Math.floor(H * 0.48)
  if (fieldDataUrl) {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej()
      img.src = fieldDataUrl
    }).catch(() => undefined)
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, pad, pad, W - pad * 2, fieldH)
    }
  }
  const preset = getPreset(presetId)
  ctx.fillStyle = ink
  ctx.font = 'bold 22px ui-monospace, monospace'
  ctx.fillText(preset.meterTitle, pad, fieldH + pad + 36)
  ctx.font = 'bold 96px ui-monospace, monospace'
  ctx.fillStyle = accent
  ctx.fillText(formatCount(count), pad, fieldH + pad + 150)
  ctx.fillStyle = ink
  ctx.font = 'bold 26px system-ui, sans-serif'
  ctx.fillText('desk swarm', pad, H - pad - 148)
  ctx.font = '22px system-ui, sans-serif'
  ctx.fillText('math is for blockers. track tokens quickly.', pad, H - pad - 118)
  ctx.font = '20px system-ui, sans-serif'
  ctx.fillStyle = '#4a5c46'
  ctx.fillText('Independent fan project — not affiliated with Wizards of the Coast.', pad, H - pad - 72)
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 0.92),
  )
}
