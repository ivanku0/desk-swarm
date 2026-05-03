import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronUp } from 'lucide-react'
import { getPreset } from '../presets/registry'
import type { ActivityEntry } from './ActivityLog'

function formatActivityTime(at: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(at))
  } catch {
    return ''
  }
}

const SWIPE_PX = 48

export function ActivityDrawer({ entries }: { entries: ActivityEntry[] }) {
  const [open, setOpen] = useState(false)
  const touchY0 = useRef<number | null>(null)
  const swipeHandled = useRef(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchY0.current = e.touches[0]?.clientY ?? null
    swipeHandled.current = false
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const y0 = touchY0.current
    touchY0.current = null
    if (y0 == null) return
    const y1 = e.changedTouches[0]?.clientY
    if (y1 == null) return
    const dy = y1 - y0
    if (dy < -SWIPE_PX) {
      setOpen(true)
      swipeHandled.current = true
    } else if (dy > SWIPE_PX) {
      setOpen(false)
      swipeHandled.current = true
    }
  }, [])

  const onTabClick = useCallback(() => {
    if (swipeHandled.current) {
      swipeHandled.current = false
      return
    }
    setOpen((o) => !o)
  }, [])

  const overlay = open
    ? createPortal(
        <button
          type="button"
          className="activity-drawer__backdrop"
          aria-label="Close recent stats"
          onClick={() => setOpen(false)}
        />,
        document.body,
      )
    : null

  const sheet = createPortal(
    <div className={`activity-drawer__sheet${open ? ' activity-drawer__sheet--open' : ''}`}>
      <button
        type="button"
        className="activity-drawer__tab"
        aria-expanded={open}
        aria-controls="activity-drawer-panel"
        id="activity-drawer-tab"
        onClick={onTabClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <span className="activity-drawer__tab-label">recent stats</span>
        <ChevronUp
          className={`activity-drawer__chev${open ? ' activity-drawer__chev--open' : ''}`}
          size={16}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      <div
        id="activity-drawer-panel"
        className="activity-drawer__scroll"
        role="region"
        aria-labelledby="activity-drawer-tab"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <ul className="activity-drawer__list">
          {entries.length === 0 ? (
            <li className="activity-drawer__empty">nothing logged yet.</li>
          ) : (
            [...entries]
              .reverse()
              .slice(0, 80)
              .map((e) => (
                <li key={e.id} className="activity-drawer__item">
                  <div className="activity-drawer__row">
                    <time className="activity-drawer__time" dateTime={new Date(e.at).toISOString()}>
                      {formatActivityTime(e.at)}
                    </time>
                    {e.presetId ? (
                      <span className={`activity-drawer__tag activity-drawer__tag--${e.presetId}`}>
                        {getPreset(e.presetId).cardName.toLowerCase()}
                      </span>
                    ) : (
                      <span className="activity-drawer__tag">—</span>
                    )}
                  </div>
                  <span className="activity-drawer__text">{e.text}</span>
                </li>
              ))
          )}
        </ul>
      </div>
    </div>,
    document.body,
  )

  return (
    <>
      {overlay}
      {sheet}
    </>
  )
}
