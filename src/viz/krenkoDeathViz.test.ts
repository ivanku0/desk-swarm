import { describe, expect, it } from 'vitest'
import { krenkoDyingSwarmCountForParticles } from './krenkoDeathViz'

describe('krenkoDyingSwarmCountForParticles', () => {
  it('keeps full count for non-krenko', () => {
    expect(krenkoDyingSwarmCountForParticles('scute', 'bossDismissal', 12n, false)).toBe(12n)
  })

  it('keeps count for krenko full wipe', () => {
    expect(krenkoDyingSwarmCountForParticles('krenko', 'boardWipe', 12n, true)).toBe(12n)
    expect(krenkoDyingSwarmCountForParticles('krenko', null, 5n, false)).toBe(5n)
  })

  it('drops to zero for krenko boss dismissal', () => {
    expect(krenkoDyingSwarmCountForParticles('krenko', 'bossDismissal', 12n, true)).toBe(0n)
  })

  it('solo boss wipe: no minion splats (boss overlay only)', () => {
    expect(krenkoDyingSwarmCountForParticles('krenko', 'boardWipe', 1n, true)).toBe(0n)
    expect(krenkoDyingSwarmCountForParticles('krenko', 'boardWipe', 1n, false)).toBe(1n)
  })
})
