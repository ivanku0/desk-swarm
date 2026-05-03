import { useEffect, useState } from 'react'
import { formatCountMeter } from '../model/formatCount'

/** Gas-pump / calculator LCD: one rectangular cell per displayed character. */
export function DigitMeter({
  value,
  pulseKey = 0,
  reducedMotion = false,
}: {
  value: bigint
  pulseKey?: number
  reducedMotion?: boolean
}) {
  const [bump, setBump] = useState(false)
  useEffect(() => {
    if (pulseKey === 0 || reducedMotion) return
    setBump(true)
    const t = window.setTimeout(() => setBump(false), 640)
    return () => clearTimeout(t)
  }, [pulseKey, reducedMotion])

  const str = formatCountMeter(value)
  const chars = Array.from(str)
  return (
    <div className={`digit-meter${bump ? ' digit-meter--bump' : ''}`} role="img" aria-label={str}>
      {chars.map((ch, i) => {
        const isDigit = ch >= '0' && ch <= '9'
        const isDot = ch === '.'
        const cls = [
          'digit-cell',
          isDot ? 'digit-cell--dot' : '',
          !isDigit && !isDot ? 'digit-cell--suffix' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <span key={`${i}-${ch}`} className={cls}>
            {ch}
          </span>
        )
      })}
    </div>
  )
}
