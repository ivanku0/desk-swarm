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
  /** Optional extra flavor lines (e.g. menu easter egg when more than one). */
  flavorQuotes?: readonly string[]
  scryfallUrl: string
  gathererUrl: string
  /** Wizards Gatherer rulings text via Scryfall rulings API */
  rulings: readonly string[]
}

const SCUTE_FLAVOR_QUOTES = [
  '"Survival rule 782: There are *always* more scute bugs."\n—Zurdi, goblin shortcutter',
  '"The humble scute is sculpted from the very earth itself."',
  '"Survival rule 781: There are always more scute bugs."\n—Zurdi, goblin shortcutter',
] as const

const SCUTE: CardBundle = {
  presetId: 'scute',
  cardName: 'Scute Swarm',
  manaDisplay: '2G',
  typeLine: 'Creature — Insect',
  powerToughness: '1 / 1',
  oracleText:
    'Landfall — Whenever a land you control enters, create a 1/1 green Insect creature token. If you control six or more lands, create a token that\'s a copy of this creature instead.',
  flavorText: SCUTE_FLAVOR_QUOTES[0]!,
  flavorQuotes: SCUTE_FLAVOR_QUOTES,
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

const HORDE_FLAVOR_QUOTES = [
  '"*That* is why you triple-check all decimals when commissioning a new batch of homunculi!"\n—Trigori, Azorius senator',
  '"In terms of intelligence, homunculi are somewhere between humans and skaabs—clever enough to follow more complex orders, but dim enough to not question them."\n—Stitcher Geralf',
  '"Keep watch only for the giants and you\'ll be eaten by the ants."',
  '"They hide in dreams and whispers and faraway thoughts."',
] as const

const HORDE: CardBundle = {
  presetId: 'horde',
  cardName: 'Homunculus Horde',
  manaDisplay: '3U',
  typeLine: 'Creature — Homunculus',
  powerToughness: '2 / 2',
  oracleText:
    "Whenever you draw your second card each turn, create a token that's a copy of this creature.",
  flavorText: HORDE_FLAVOR_QUOTES[0]!,
  flavorQuotes: HORDE_FLAVOR_QUOTES,
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

const KRENKO_FLAVOR_QUOTES = [
  '"He displays a perverse charisma fueled by avarice. Highly dangerous. Recommend civil sanctions."\n—Agmand Sarv, Azorius hussar',
  '"Threats? Extortion? Good sir, you have me all wrong. I am a legitimate businessman; my colleagues and I are simply here to conduct legitimate business."',
  `"After the people flee, but before the enemy arrives—that's grabbin' time."`,
] as const

const KRENKO: CardBundle = {
  presetId: 'krenko',
  cardName: 'Krenko, Mob Boss',
  manaDisplay: '2RR',
  typeLine: 'Legendary Creature — Goblin Warrior',
  powerToughness: '3 / 3',
  oracleText:
    'Tap: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',
  flavorText: KRENKO_FLAVOR_QUOTES[0]!,
  flavorQuotes: KRENKO_FLAVOR_QUOTES,
  scryfallUrl: 'https://scryfall.com/card/m13/138/krenko-mob-boss',
  gathererUrl:
    'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=253536&printed=false',
  rulings: [
    "The number of Goblins you control is counted when Krenko's ability resolves, after you get a Goblin token from that ability.",
    'If you control no other Goblins when the ability resolves, you will still put one Goblin token onto the battlefield.',
  ],
}

const MAP: Record<PresetId, CardBundle> = {
  scute: SCUTE,
  horde: HORDE,
  krenko: KRENKO,
}

export function getCardBundle(id: PresetId): CardBundle {
  return MAP[id]
}
