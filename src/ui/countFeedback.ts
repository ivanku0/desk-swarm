import type { PresetId } from '../presets/types'

export type DeltaFlashAnchor = 'undo' | 'grow' | 'minus1' | 'plus1' | 'reset' | 'wipe'

const HYPE_LINES: Record<PresetId, readonly [string, string, string]> = {
  scute: ['scute scute', 'SCUTE', 'scute'],
  horde: ["homunculin'", 'hording time', 'for the Horde'],
}

export function deltaLabel(prev: bigint, next: bigint): string {
  if (next > prev) return `+${(next - prev).toString()}`
  if (next < prev) return `−${(prev - next).toString()}`
  return ''
}

export function randomHypeLine(presetId: PresetId): string {
  const lines = HYPE_LINES[presetId]
  const i = Math.floor(Math.random() * lines.length)
  return lines[i]!
}
