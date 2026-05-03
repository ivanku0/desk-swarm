import { getCardBundle } from '../data/cardData'
import type { PresetId } from '../presets/types'

export type MenuSlideId = 'scute' | 'horde' | 'coming-soon'

export interface MenuSlide {
  id: MenuSlideId
  cardName: string
  typeLine: string
  ptLine: string
  /** Full oracle-style rules text on the pantone card */
  oracleText: string
  /** Italic flavor quote + attribution at bottom of card (null = none) */
  flavorText: string | null
  /** When set, CTA starts this preset after confirm */
  presetId: PresetId | null
  /** Shown on the CTA (disabled when presetId is null) */
  ctaLabel: string
  /** BEM suffix for tile theming */
  tileVariant: 'scute' | 'horde' | 'soon'
}

export const MENU_SLIDES: readonly MenuSlide[] = [
  {
    id: 'scute',
    cardName: getCardBundle('scute').cardName,
    typeLine: getCardBundle('scute').typeLine,
    ptLine: getCardBundle('scute').powerToughness,
    oracleText: getCardBundle('scute').oracleText,
    flavorText: getCardBundle('scute').flavorText,
    presetId: 'scute',
    ctaLabel: "let's scute",
    tileVariant: 'scute',
  },
  {
    id: 'horde',
    cardName: getCardBundle('horde').cardName,
    typeLine: getCardBundle('horde').typeLine,
    ptLine: getCardBundle('horde').powerToughness,
    oracleText: getCardBundle('horde').oracleText,
    flavorText: getCardBundle('horde').flavorText,
    presetId: 'horde',
    ctaLabel: 'Go horde',
    tileVariant: 'horde',
  },
  {
    id: 'coming-soon',
    cardName: '???',
    typeLine: 'Creature — ???',
    ptLine: '? / ?',
    oracleText:
      'Something is still tunneling under the packaging. This slot is reserved for a future swarm commander toy—same desk, new bug.',
    flavorText: null,
    presetId: null,
    ctaLabel: 'coming soon',
    tileVariant: 'soon',
  },
] as const
