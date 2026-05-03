const SUFFIX = ['', 'k', 'm', 'b', 't', 'qa', 'qi', 'sx', 'sp', 'oc', 'no', 'de']

/** Fixed-width gas-pump columns (leading zeros). */
export const METER_SLOT_COUNT = 12

/** Display BigInt with suffixes for very large values */
export function formatCount(n: bigint): string {
  if (n < 0n) return '0'
  if (n < 10000n) return n.toString()
  let x = n
  let tier = 0
  while (x >= 1000n && tier < SUFFIX.length - 1) {
    x /= 1000n
    tier++
  }
  if (tier === 0) return n.toString()
  const num = Number(x)
  const rounded = num >= 100 ? Math.round(num) : Math.round(num * 10) / 10
  return `${rounded}${SUFFIX[tier]}`
}

/** Fixed-width gas-pump style (leading zeros); wider values use compact `formatCount`. */
export function formatCountMeter(n: bigint): string {
  if (n < 0n) return '0'.repeat(METER_SLOT_COUNT)
  const s = n.toString()
  if (s.length > METER_SLOT_COUNT) return formatCount(n)
  return s.padStart(METER_SLOT_COUNT, '0')
}
