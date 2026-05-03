import { useCallback, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PresetId } from '../presets/types'
import { ActivityDrawer } from './ActivityDrawer'
import type { ActivityEntry } from './ActivityLog'
import { getCardBundle } from '../data/cardData'
import { MENU_SLIDES } from './menuCharacters'

const CAROUSEL_SWIPE_PX = 56

export function MainMenu({
  onPick,
  activity,
}: {
  onPick: (id: PresetId) => void
  activity: ActivityEntry[]
}) {
  const [index, setIndex] = useState(0)
  const touchX0 = useRef<number | null>(null)

  const slide = MENU_SLIDES[index]!
  const cardBundle = slide.presetId ? getCardBundle(slide.presetId) : null

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + MENU_SLIDES.length) % MENU_SLIDES.length)
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchX0.current = e.touches[0]?.clientX ?? null
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const x0 = touchX0.current
      touchX0.current = null
      if (x0 == null) return
      const x1 = e.changedTouches[0]?.clientX
      if (x1 == null) return
      const dx = x1 - x0
      if (dx > CAROUSEL_SWIPE_PX) go(-1)
      else if (dx < -CAROUSEL_SWIPE_PX) go(1)
    },
    [go],
  )

  const confirmStart = useCallback(() => {
    const s = MENU_SLIDES[index]
    if (s?.presetId) onPick(s.presetId)
  }, [index, onPick])

  return (
    <div className="screen menu-screen">
      <div className="menu-hero">
        <header className="menu-header">
          <h1 className="menu-logotype">
            <span className="menu-logotype__line">swarm</span>
            <span className="menu-logotype__line">desk</span>
          </h1>
          <p className="menu-tagline">math is for blockers. track tokens quickly.</p>
        </header>
      </div>

      <section className="char-select" aria-label="Character select">
        <div className="char-select__card-stage">
          <div
            className="char-select__carousel"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <article className={`char-tile char-tile--${slide.tileVariant}`}>
              <div className="char-tile__swatch" aria-hidden />
              <div className="char-tile__body">
                <div className="char-tile__main">
                  <div className="char-tile__titleRow">
                    <h2 className="char-tile__name">{slide.cardName}</h2>
                    {cardBundle?.manaDisplay ? (
                      <span className="char-tile__manaText" aria-label={`mana cost ${cardBundle.manaDisplay}`}>
                        {cardBundle.manaDisplay}
                      </span>
                    ) : null}
                  </div>
                  <p className="char-tile__type">{slide.typeLine}</p>
                  <p className="char-tile__pt">{slide.ptLine}</p>
                  <p className="char-tile__oracle">{slide.oracleText}</p>
                </div>
                {slide.flavorText ? (
                  <p className="char-tile__flavor">{slide.flavorText}</p>
                ) : null}
              </div>
            </article>
          </div>
        </div>

        <div className="char-select__pager" aria-label="Character carousel">
          <button
            type="button"
            className="char-select__nav char-select__nav--prev"
            aria-label="Previous"
            onClick={() => go(-1)}
          >
            <ChevronLeft size={22} strokeWidth={2.5} aria-hidden />
          </button>
          <div className="char-select__dots" role="tablist" aria-label="Select character">
            {MENU_SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`char-select__dot${i === index ? ' char-select__dot--active' : ''}`}
                aria-label={s.cardName}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="char-select__nav char-select__nav--next"
            aria-label="Next"
            onClick={() => go(1)}
          >
            <ChevronRight size={22} strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          className={`char-select__cta${slide.presetId ? '' : ' char-select__cta--soon'}`}
          disabled={!slide.presetId}
          aria-disabled={!slide.presetId}
          onClick={confirmStart}
        >
          {slide.ctaLabel}
        </button>
      </section>

      <ActivityDrawer entries={activity} />
    </div>
  )
}
