/**
 * Token-only replacement chain lab (teaching MVP).
 * Chatterfang-style rider uses sum of all atom counts in the event immediately before that step.
 */

export const TOKEN_ATOMS = ['Clue', 'Food', 'Treasure', 'Squirrel', 'Soldier'] as const
export type TokenAtom = (typeof TOKEN_ATOMS)[number]

/** Multiset: only listed atoms; omitted = 0 */
export type TokenEvent = Partial<Record<TokenAtom, bigint>>

export type RunChainEffectKey = 'multiplier' | 'clueFoodTreasureSplit' | 'plusEqualBatchRider'

export interface ChainStep {
  /** Engine dispatch key */
  effectKey: RunChainEffectKey
  /** Label for step log (e.g. card name from catalog) */
  displayLabel: string
}

export interface ChainStepLogRow {
  beforeSummary: string
  effectLabel: string
  afterSummary: string
  /** True when applies() was false — event unchanged */
  didNotApply: boolean
  /** Total token delta for this step (sum of after − before) */
  deltaTotal: bigint
}

export interface RunChainResult {
  steps: ChainStepLogRow[]
  final: TokenEvent
}

export function emptyEvent(): TokenEvent {
  return {}
}

export function singleAtomEvent(atom: TokenAtom, count: bigint): TokenEvent {
  if (count <= 0n) return {}
  return { [atom]: count } as TokenEvent
}

export function sumTokens(e: TokenEvent): bigint {
  let s = 0n
  for (const k of TOKEN_ATOMS) {
    const v = e[k]
    if (v !== undefined && v > 0n) s += v
  }
  return s
}

export function cloneEvent(e: TokenEvent): TokenEvent {
  const out: TokenEvent = {}
  for (const k of TOKEN_ATOMS) {
    const v = e[k]
    if (v !== undefined && v > 0n) out[k] = v
  }
  return out
}

export function formatEventSummary(e: TokenEvent): string {
  const parts: string[] = []
  for (const k of TOKEN_ATOMS) {
    const v = e[k]
    if (v !== undefined && v > 0n) parts.push(`${k}×${v}`)
  }
  return parts.length ? parts.join(' ') : '∅'
}

function applyMultiplier(e: TokenEvent): TokenEvent {
  const out = cloneEvent(e)
  for (const k of TOKEN_ATOMS) {
    const v = out[k]
    if (v !== undefined && v > 0n) out[k] = v * 2n
  }
  return out
}

function appliesManufactor(e: TokenEvent): boolean {
  const c = e.Clue ?? 0n
  const f = e.Food ?? 0n
  const t = e.Treasure ?? 0n
  return c > 0n || f > 0n || t > 0n
}

/** Manufactor: each Clue/Food/Treasure contribution becomes equal counts of all three (sum C+F+T into triple). */
function applyManufactor(e: TokenEvent): TokenEvent {
  const out = cloneEvent(e)
  const c = out.Clue ?? 0n
  const f = out.Food ?? 0n
  const t = out.Treasure ?? 0n
  const s = c + f + t
  delete out.Clue
  delete out.Food
  delete out.Treasure
  if (s > 0n) {
    out.Clue = s
    out.Food = s
    out.Treasure = s
  }
  return out
}

function appliesChatterfang(e: TokenEvent): boolean {
  return sumTokens(e) > 0n
}

function applyChatterfang(e: TokenEvent): TokenEvent {
  const out = cloneEvent(e)
  const n = sumTokens(out)
  if (n <= 0n) return out
  out.Squirrel = (out.Squirrel ?? 0n) + n
  return out
}

function appliesMultiplier(e: TokenEvent): boolean {
  return sumTokens(e) > 0n
}

function applyStep(current: TokenEvent, step: ChainStep): { next: TokenEvent; didNotApply: boolean } {
  switch (step.effectKey) {
    case 'multiplier': {
      if (!appliesMultiplier(current)) return { next: cloneEvent(current), didNotApply: true }
      return { next: applyMultiplier(current), didNotApply: false }
    }
    case 'clueFoodTreasureSplit': {
      if (!appliesManufactor(current)) return { next: cloneEvent(current), didNotApply: true }
      return { next: applyManufactor(current), didNotApply: false }
    }
    case 'plusEqualBatchRider': {
      if (!appliesChatterfang(current)) return { next: cloneEvent(current), didNotApply: true }
      return { next: applyChatterfang(current), didNotApply: false }
    }
    default:
      return { next: cloneEvent(current), didNotApply: true }
  }
}

export function runChain(initial: TokenEvent, chain: ChainStep[]): RunChainResult {
  const steps: ChainStepLogRow[] = []
  let cur = cloneEvent(initial)

  for (const slot of chain) {
    const beforeSummary = formatEventSummary(cur)
    const { next, didNotApply } = applyStep(cur, slot)
    const afterSummary = formatEventSummary(next)
    const beforeSum = sumTokens(cur)
    const afterSum = sumTokens(next)
    steps.push({
      beforeSummary,
      effectLabel: slot.displayLabel,
      afterSummary,
      didNotApply,
      deltaTotal: afterSum - beforeSum,
    })
    cur = next
  }

  return { steps, final: cur }
}

/** Map catalog archetypeId to engine key; null = not implemented in runChain */
export function archetypeIdToEffectKey(
  archetypeId: string,
): RunChainEffectKey | null {
  if (archetypeId === 'multiplier') return 'multiplier'
  if (archetypeId === 'clueFoodTreasureSplit') return 'clueFoodTreasureSplit'
  if (archetypeId === 'plusEqualBatchRider') return 'plusEqualBatchRider'
  return null
}
