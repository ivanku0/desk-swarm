import type { PresetId } from '../presets/types'

/**
 * Canonical card copy for the menu + info UI (oracle, rulings, and links from
 * Scryfall as of integration; re-verify periodically).
 */
export interface CardBundle {
  presetId: PresetId
  cardName: string
  /** Plain text mana, e.g. 2G, 3U */
  manaDisplay: string
  typeLine: string
  powerToughness: string
  oracleText: string
  flavorText: string | null
  scryfallUrl: string
  gathererUrl: string
  /** Wizards Gatherer rulings text via Scryfall rulings API */
  rulings: readonly string[]
}

const SCUTE: CardBundle = {
  presetId: 'scute',
  cardName: 'Scute Swarm',
  manaDisplay: '2G',
  typeLine: 'Creature — Insect',
  powerToughness: '1 / 1',
  oracleText:
    'Landfall — Whenever a land you control enters, create a 1/1 green Insect creature token. If you control six or more lands, create a token that\'s a copy of this creature instead.',
  flavorText:
    '"Survival rule 782: There are *always* more scute bugs."\n—Zurdi, goblin shortcutter',
  scryfallUrl: 'https://scryfall.com/card/dsc/197/scute-swarm',
  gathererUrl:
    'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=676070&printed=false',
  rulings: [
    'A landfall ability triggers whenever a land you control enters for any reason. It triggers whenever you play a land, as well as whenever a spell or ability puts a land onto the battlefield under your control.',
    "A landfall ability doesn't trigger if a permanent already on the battlefield becomes a land.",
    'Whenever a land you control enters, each landfall ability of the permanents you control will trigger. You can put them on the stack in any order. The last ability you put on the stack will be the first one to resolve (As a result, you can have those abilities resolve in the order of your choosing.).',
    "The token copy will have Scute Swarm's ability. It will also be able to create copies of itself.",
    "The token copy won't copy counters or damage marked on Scute Swarm, nor will it copy other effects that have changed Scute Swarm's power, toughness, types, color, and so on. Normally, this means the token will simply be a Scute Swarm, but if any copy effects have affected the original Scute Swarm, the token will take those into account.",
    "If Scute Swarm leaves the battlefield before its triggered ability resolves, the token will still enter the battlefield as a copy of Scute Swarm, using Scute Swarm's copiable values from when it was last on the battlefield.",
  ],
}

const HORDE: CardBundle = {
  presetId: 'horde',
  cardName: 'Homunculus Horde',
  manaDisplay: '3U',
  typeLine: 'Creature — Homunculus',
  powerToughness: '2 / 2',
  oracleText:
    "Whenever you draw your second card each turn, create a token that's a copy of this creature.",
  flavorText:
    '"*That* is why you triple-check all decimals when commissioning a new batch of homunculi!"\n—Trigori, Azorius senator',
  scryfallUrl: 'https://scryfall.com/card/fdn/41/homunculus-horde',
  gathererUrl:
    'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=679118&printed=false',
  rulings: [
    "Homunculus Horde doesn't need to have been under your control when the first card is drawn for its ability to trigger. As long as you control it when you draw your second card in a turn, that ability will trigger.",
    "The token copy will have Homunculus Horde's ability and will be able to create copies of itself.",
    "The token doesn't copy whether Homunculus Horde is tapped or untapped, whether it has any counters on it or Auras attached to it, or any non-copy effects that have changed its power, toughness, types, color, and so on.",
    "If Homunculus Horde leaves the battlefield before its triggered ability resolves, the token will still enter as a copy of Homunculus Horde, using Homunculus Horde's copiable values from when it was last on the battlefield.",
    'In the unusual case where Homunculus Horde becomes a copy of something else while its triggered ability is on the stack but before it resolves, the token will enter as a copy of whatever Homunculus Horde is copying. (Sometimes a horde of homunculi isn\'t helpful.)',
  ],
}

const MAP: Record<PresetId, CardBundle> = {
  scute: SCUTE,
  horde: HORDE,
}

export function getCardBundle(id: PresetId): CardBundle {
  return MAP[id]
}
