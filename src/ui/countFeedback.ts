import type { PresetId } from '../presets/types'

export type DeltaFlashAnchor =
  | 'undo'
  | 'grow'
  | 'minus1'
  | 'plus1'
  | 'reset'
  | 'wipe'
  /** Krenko boss dismissed: flash over the canvas center (where the boss face was). */
  | 'bossOut'

const HYPE_LINES: Record<PresetId, readonly [string, string, string]> = {
  scute: ['scute scute', 'SCUTE', 'scute'],
  horde: ["homunculin'", 'hording time', 'for the Horde'],
  krenko: ['krenk krenk', 'MOB BOSS', 'goblin gang'],
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
