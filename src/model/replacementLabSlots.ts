import type { TokenIncreaserCard } from '../data/tokenIncreaserCatalog'
import { archetypeIdToEffectKey, type ChainStep } from './replacementChain'

/** Build ordered chain steps from slot row state (top → bottom). */
export function buildChainFromSlots(
  slots: readonly (string | null)[],
  byId: ReadonlyMap<string, TokenIncreaserCard>,
): { chain: ChainStep[]; chainSlotIndices: number[] } {
  const chain: ChainStep[] = []
  const chainSlotIndices: number[] = []
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const id = slots[slotIndex]
    if (!id) continue
    const card = byId.get(id)
    if (!card?.implementsRunChain) continue
    const effectKey = archetypeIdToEffectKey(card.archetypeId)
    if (!effectKey) continue
    if (effectKey === 'plusFixedRider' && !card.plusFixedRider) continue
    const step: ChainStep = { effectKey, displayLabel: card.name }
    if (effectKey === 'multiplier') {
      step.multiplierK = card.params?.k === 3 ? 3 : 2
      step.multiplierCreatureOnly = card.params?.creatureTokensOnly === true
    }
    if (effectKey === 'plusFixedRider' && card.plusFixedRider) {
      step.plusFixedRider = { ...card.plusFixedRider }
    }
    chain.push(step)
    chainSlotIndices.push(slotIndex)
  }
  return { chain, chainSlotIndices }
}
