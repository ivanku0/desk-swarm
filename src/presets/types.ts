/**
 * Each id needs: `PRESETS` row in `registry.ts`, card bundle in `cardData.ts`,
 * and **`src/viz/swarmGlyphs/<id>.ts`** (`SWARM_GLYPHS`). Add the preset to
 * **`scripts/ref-to-glyphs.mjs`** (`PRESET_CONFIG`) so `npm run glyphs:build -- <id>` works.
 */
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
