/**
 * Token increaser catalog: `otag:token-increaser` (Scryfall) + archetype metadata.
 * `implementsRunChain` gates the Replacement Lab chain picker (v1: multiplier ×2, Manufactor, Chatterfang).
 */

import { sumTokens, type TokenAtom } from '../model/replacementChain'

export type ArchetypeId =
  | 'multiplier'
  | 'clueFoodTreasureSplit'
  | 'plusEqualBatchRider'
  | 'plusFixedRider'
  | 'differentEvent'

export type RelevantInitialAtoms = 'any' | 'none' | readonly TokenAtom[]

export interface TokenIncreaserCard {
  scryfallId: string
  name: string
  archetypeId: ArchetypeId
  implementsRunChain: boolean
  params?: { k?: 2 | 3; creatureTokensOnly?: boolean }
  relevantInitialAtoms: RelevantInitialAtoms
  /** One-line teaching blurb for combobox / tooltips */
  templateLine: string
}

const mult = (name: string, id: string, extra?: Partial<TokenIncreaserCard>): TokenIncreaserCard => ({
  scryfallId: id,
  name,
  archetypeId: 'multiplier',
  implementsRunChain: true,
  relevantInitialAtoms: 'any',
  templateLine:
    'If one or more tokens would be created under your control, twice that many of those tokens are created instead.',
  ...extra,
})

export const TOKEN_INCREASER_CATALOG: readonly TokenIncreaserCard[] = [
  mult('Adrix and Nev, Twincasters', 'b9c11061-bb34-4904-b9f1-ea106b517bbe'),
  mult('Anointed Procession', '9a52c265-6920-4929-ba0a-70da08df01f1'),
  mult('Doubling Season', 'f2c4f80e-84a0-463b-82c3-5c6503809351'),
  mult('Elspeth, Storm Slayer', '73a065e3-b530-4e62-ab3c-4f6f908184ec'),
  mult('Exalted Sunborn', '7e1fe101-f634-41e5-9aa4-e8d7474535dc'),
  mult('Mondrak, Glory Dominus', '8296a455-21d5-498e-9029-2bdf0da855a8'),
  mult('Parallel Lives', '01033dae-fec1-41f2-b7f2-cc6a43331790'),
  mult('Primal Vigor', 'dafea0d1-6986-46b3-affc-1337ef564947'),
  {
    scryfallId: '1ca79dd4-67fc-496c-96fc-489b039c4932',
    name: 'Ojer Taq, Deepest Foundation // Temple of Civilization',
    archetypeId: 'multiplier',
    implementsRunChain: false,
    params: { k: 3, creatureTokensOnly: true },
    relevantInitialAtoms: ['Squirrel', 'Soldier'],
    templateLine:
      'If one or more creature tokens would be created under your control, three times that many of those tokens are created instead.',
  },
  {
    scryfallId: '76480f4d-ad6d-4ed6-82c6-fa12abc22557',
    name: 'Academy Manufactor',
    archetypeId: 'clueFoodTreasureSplit',
    implementsRunChain: true,
    relevantInitialAtoms: ['Clue', 'Food', 'Treasure'],
    templateLine:
      'If you would create a Clue, Food, or Treasure token, instead create one of each.',
  },
  {
    scryfallId: '1785cf85-1ac0-4246-9b89-1a8221a8e1b2',
    name: 'Chatterfang, Squirrel General',
    archetypeId: 'plusEqualBatchRider',
    implementsRunChain: true,
    relevantInitialAtoms: 'any',
    templateLine:
      'If one or more tokens would be created under your control, those tokens plus that many 1/1 green Squirrel creature tokens are created instead.',
  },
  {
    scryfallId: '774716f4-d211-497a-be91-69cd700edbf2',
    name: 'Donatello, the Brains',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: 'any',
    templateLine:
      'If one or more tokens would be created under your control, those tokens plus a Mutagen token are created instead.',
  },
  {
    scryfallId: 'f5baee8d-88e7-4468-94a9-66ca8e2caf15',
    name: 'Peregrin Took',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: 'any',
    templateLine:
      'If one or more tokens would be created under your control, those tokens plus an additional Food token are created instead.',
  },
  {
    scryfallId: '4f352b5e-9731-4a8e-b872-db5d3bf32211',
    name: 'Quina, Qu Gourmet',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: 'any',
    templateLine:
      'If one or more tokens would be created under your control, those tokens plus a 1/1 green Frog creature token are created instead.',
  },
  {
    scryfallId: '4c398d11-a2fc-43e2-96e9-7f3383e1a43c',
    name: 'Stridehangar Automaton',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: 'any',
    templateLine:
      'If one or more artifact tokens would be created under your control, those tokens plus an additional 1/1 Thopter token are created instead.',
  },
  {
    scryfallId: '32927bf2-63c1-4402-99dc-3a0f2f8e0f9c',
    name: 'Case of the Pilfered Proof',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: 'any',
    templateLine:
      'Solved — If one or more tokens would be created under your control, those tokens plus a Clue token are created instead.',
  },
  {
    scryfallId: 'b44b4e8b-7675-4c6a-a16a-92f8b6a0259f',
    name: 'Queen Allenal of Ruadach',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: ['Squirrel', 'Soldier'],
    templateLine:
      'If one or more creature tokens would be created under your control, those tokens plus a 1/1 white Soldier creature token are created instead.',
  },
  {
    scryfallId: '61c217d9-21d5-45ef-938a-138192a901f4',
    name: 'Jolene, the Plunder Queen',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: ['Treasure'],
    templateLine:
      'If you would create one or more Treasure tokens, instead create those tokens plus an additional Treasure token.',
  },
  {
    scryfallId: 'f73fdf76-e3a6-49d0-bfb0-4b7cdbd4271e',
    name: 'Xorn',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: ['Treasure'],
    templateLine:
      'If you would create one or more Treasure tokens, instead create those tokens plus an additional Treasure token.',
  },
  {
    scryfallId: 'b74ad496-05bc-4c5a-9027-b14df9c387ab',
    name: 'Worldwalker Helm',
    archetypeId: 'plusFixedRider',
    implementsRunChain: false,
    relevantInitialAtoms: ['Treasure'],
    templateLine:
      'If you would create one or more artifact tokens, instead create those tokens plus an additional Map token.',
  },
  {
    scryfallId: '52faa78e-252e-465b-91b5-6f64d828da81',
    name: 'Kaya, Geist Hunter',
    archetypeId: 'differentEvent',
    implementsRunChain: false,
    relevantInitialAtoms: 'none',
    templateLine:
      'Planeswalker −2: until end of turn, if tokens would be created under your control, twice that many (different layer than static replacements).',
  },
  {
    scryfallId: '23736c5f-bd1c-4505-8639-5fb92cd74b21',
    name: 'Akim, the Soaring Wind',
    archetypeId: 'differentEvent',
    implementsRunChain: false,
    relevantInitialAtoms: 'none',
    templateLine: 'Triggered: whenever you create tokens for the first time each turn — not the same event as this chain.',
  },
  {
    scryfallId: 'e9da18b4-1efc-44b7-8001-a2cfd44c69bf',
    name: 'Baron Bertram Graywater',
    archetypeId: 'differentEvent',
    implementsRunChain: false,
    relevantInitialAtoms: 'none',
    templateLine: 'Triggered on tokens entering — not a “would create” replacement on this event.',
  },
  {
    scryfallId: '73cce010-a8e7-477b-9179-bbad38aa6438',
    name: 'Parallel Evolution',
    archetypeId: 'differentEvent',
    implementsRunChain: false,
    relevantInitialAtoms: 'none',
    templateLine: 'Spell: copy each creature token on the battlefield — different object than one creation event.',
  },
  {
    scryfallId: 'aaecd005-b849-4e75-a8e0-24231bf2a0c9',
    name: 'Second Harvest',
    archetypeId: 'differentEvent',
    implementsRunChain: false,
    relevantInitialAtoms: 'none',
    templateLine: 'Spell: copy each token you control — different object.',
  },
  {
    scryfallId: 'b91dadcb-31e9-43b0-b425-c9311af3e9d7',
    name: 'Rhys the Redeemed',
    archetypeId: 'differentEvent',
    implementsRunChain: false,
    relevantInitialAtoms: 'none',
    templateLine: 'Activated ability copies tokens — different object.',
  },
  {
    scryfallId: '9a72b230-dbb0-4d38-ba7a-fb0bd03b6c47',
    name: 'Renewed Solidarity',
    archetypeId: 'differentEvent',
    implementsRunChain: false,
    relevantInitialAtoms: 'none',
    templateLine: 'End step copy effect — different timing.',
  },
  {
    scryfallId: '89cf6f57-230f-497e-a14e-ad1e8737fd42',
    name: 'Ocelot Pride',
    archetypeId: 'differentEvent',
    implementsRunChain: false,
    relevantInitialAtoms: 'none',
    templateLine: 'End step / ascend token copy — different timing.',
  },
] as const

export function filterCatalogForChainPicker(
  e0: Partial<Record<TokenAtom, bigint>>,
): TokenIncreaserCard[] {
  return TOKEN_INCREASER_CATALOG.filter((c) => rowVisibleForE0(e0, c))
}

function rowVisibleForE0(
  e0: Partial<Record<TokenAtom, bigint>>,
  c: TokenIncreaserCard,
): boolean {
  if (!c.implementsRunChain) return false
  if (c.relevantInitialAtoms === 'none') return false
  if (sumTokens(e0) <= 0n) return false
  if (c.relevantInitialAtoms === 'any') return true
  for (const a of c.relevantInitialAtoms) {
    const v = e0[a]
    if (v !== undefined && v > 0n) return true
  }
  return false
}

const ARCHETYPE_LABELS: Record<ArchetypeId, string> = {
  multiplier: 'Multiplier (×2)',
  clueFoodTreasureSplit: 'Clue / Food / Treasure split',
  plusEqualBatchRider: 'Plus batch-sized rider',
  plusFixedRider: 'Plus fixed rider',
  differentEvent: 'Different event',
}

export function archetypeDisplayName(id: ArchetypeId): string {
  return ARCHETYPE_LABELS[id]
}
