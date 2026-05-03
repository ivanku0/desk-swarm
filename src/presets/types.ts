/**
 * Each id needs: `PRESETS` row in `registry.ts`, card bundle in `cardData.ts`,
 * **`public/art/<id>/token-ref.png`** (swarm sprite; optional **`token-ref-2.png`** for twin),
 * **`src/viz/swarmGlyphs/<id>.ts`** (bitmask fallback), URLs in **`src/viz/swarmTokenSprite.ts`**,
 * and **`scripts/ref-to-glyphs.mjs`** (`PRESET_CONFIG`) if you use the 8×8 generator.
 */
export type PresetId = 'scute' | 'horde' | 'krenko'

export interface PresetDefinition {
  id: PresetId
  cardName: string
  /** Bold pixel title in track header (major meter label) */
  meterTitle: string
  growLabel: string
  /** CSS class on root for Horde teal accent */
  themeClass: string
}
