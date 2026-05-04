import { getCardBundle } from '../data/cardData'
import type { PresetId } from '../presets/types'

export type MenuSlideId = 'scute' | 'horde' | 'krenko' | 'replacement-lab'

export interface MenuSlide {
  id: MenuSlideId
  cardName: string
  typeLine: string
  ptLine: string
  /** Full oracle-style rules text on the pantone card */
  oracleText: string
  /** Italic flavor quote + attribution at bottom of card (null = none) */
  flavorText: string | null
  /** Optional flavor quote rotation for menu easter egg behavior. */
  flavorQuotes?: readonly string[]
  /** When set, CTA starts this preset after confirm */
  presetId: PresetId | null
  /** Opens Replacement Lab (no preset track) */
  opensLab?: boolean
  /** Shown on the CTA (disabled when presetId is null) */
  ctaLabel: string
  /** BEM suffix for tile theming */
  tileVariant: 'scute' | 'horde' | 'krenko' | 'lab' | 'soon'
  /** Optional top-band creature sprite (pixel art). */
  swatchSpriteSrc?: string
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
    swatchSpriteSrc: '/art/scute/token-ref.png',
  },
  {
    id: 'horde',
    cardName: getCardBundle('horde').cardName,
    typeLine: getCardBundle('horde').typeLine,
    ptLine: getCardBundle('horde').powerToughness,
    oracleText: getCardBundle('horde').oracleText,
    flavorText: getCardBundle('horde').flavorText,
    presetId: 'horde',
    ctaLabel: 'go horde',
    tileVariant: 'horde',
    swatchSpriteSrc: '/art/horde/token-ref.png',
  },
  {
    id: 'krenko',
    cardName: getCardBundle('krenko').cardName,
    typeLine: getCardBundle('krenko').typeLine,
    ptLine: getCardBundle('krenko').powerToughness,
    oracleText: getCardBundle('krenko').oracleText,
    flavorText: getCardBundle('krenko').flavorText,
    presetId: 'krenko',
    ctaLabel: "get gobblin'",
    tileVariant: 'krenko',
    swatchSpriteSrc: '/art/krenko/leader-ref.png',
  },
  {
    id: 'replacement-lab',
    cardName: 'Replacement Lab',
    typeLine: 'Lab — Simulator',
    ptLine: '∞ / ∞',
    oracleText:
      'How does Doubling Season interact with Chatterfang? Use this tool to explore and optimize how different replacement effects create tokens.',
    flavorText:
      '“There will come a time when the only prey left will be each other.”\n—Ulrich of Krallenhorde Pack',
    flavorQuotes: [
      '“There will come a time when the only prey left will be each other.”\n—Ulrich of Krallenhorde Pack',
      'Double the slobber, double the love.',
      '“The gods here may walk among the people, but they are not with them.”\n—Gideon Jura',
    ],
    presetId: null,
    opensLab: true,
    ctaLabel: 'open lab',
    tileVariant: 'lab',
    swatchSpriteSrc: '/art/replacement-lab/chatterfang-avatar.png',
  },
] as const
