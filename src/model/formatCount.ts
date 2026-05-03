const SUFFIX = ['', 'k', 'm', 'b', 't', 'qa', 'qi', 'sx', 'sp', 'oc', 'no', 'de']

/** LCD meter character slots (digits + optional dot / suffix). */
export const METER_SLOT_COUNT = 5

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

/** Uppercase trailing suffix letters (k→K) for the pixel meter. */
function meterCompactDisplay(compact: string): string {
  return compact.replace(/[a-z]+$/, (w) => w.toUpperCase())
}

/**
 * Up to five fixed columns: values 0…99999 as leading-zero digits; larger values use
 * the same compact tiers as `formatCount` (K/M/…), capped at `METER_SLOT_COUNT` chars.
 */
export function formatCountMeter(n: bigint): string {
  if (n < 0n) return '0'.repeat(METER_SLOT_COUNT)
  if (n <= 99999n) return n.toString().padStart(METER_SLOT_COUNT, '0')
  let s = meterCompactDisplay(formatCount(n))
  if (s.length > METER_SLOT_COUNT) s = s.slice(0, METER_SLOT_COUNT)
  return s
}
