import type { PresetDefinition, PresetId } from './types'

export const PRESETS: readonly PresetDefinition[] = [
  {
    id: 'scute',
    cardName: 'Scute Swarm',
    meterTitle: 'SCUTE COUNT',
    growLabel: 'SCUTE UP!',
    themeClass: '',
  },
  {
    id: 'horde',
    cardName: 'Homunculus Horde',
    meterTitle: 'HORDE COUNT',
    growLabel: 'HORDE UP!',
    themeClass: 'preset-horde',
  },
  {
    id: 'krenko',
    cardName: 'Krenko, Mob Boss',
    meterTitle: 'GOBLIN COUNT',
    growLabel: 'KRENK IT',
    themeClass: 'preset-krenko',
  },
] as const

export function getPreset(id: PresetId): PresetDefinition {
  const p = PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(`Unknown preset ${id}`)
  return p
}
