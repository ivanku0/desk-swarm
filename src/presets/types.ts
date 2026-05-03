export type PresetId = 'scute' | 'horde'

export interface PresetDefinition {
  id: PresetId
  cardName: string
  /** Bold pixel title in track header (major meter label) */
  meterTitle: string
  growLabel: string
  /** CSS class on root for Horde teal accent */
  themeClass: string
}
