import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PresetId } from '../presets/types'
import { getCardBundle } from '../data/cardData'
import { ActivityDrawer } from './ActivityDrawer'
import type { ActivityEntry } from './ActivityLog'
import { MENU_SLIDES } from './menuCharacters'

const CAROUSEL_SWIPE_PX = 56

export function MainMenu({
  onPick,
  onOpenLab,
  activity,
}: {
  onPick: (id: PresetId) => void
  onOpenLab?: () => void
  activity: ActivityEntry[]
}) {
  const [index, setIndex] = useState(0)
  const touchX0 = useRef<number | null>(null)

  const slide = MENU_SLIDES[index]!
  const cardBundle = slide.presetId ? getCardBundle(slide.presetId) : null
  const flavorCycle = useMemo(() => {
    if (slide.flavorQuotes && slide.flavorQuotes.length > 1) {
      return [...slide.flavorQuotes]
    }
    if (cardBundle?.flavorQuotes && cardBundle.flavorQuotes.length > 1) {
      return [...cardBundle.flavorQuotes]
    }
    if (slide.flavorText) return [slide.flavorText]
    return []
  }, [cardBundle?.flavorQuotes, slide.flavorText])

  const [flavorCycleIdx, setFlavorCycleIdx] = useState(0)
  const [flavorBump, setFlavorBump] = useState(false)

  useEffect(() => {
    if (flavorCycle.length > 1) {
      setFlavorCycleIdx(Math.floor(Math.random() * flavorCycle.length))
    } else {
      setFlavorCycleIdx(0)
    }
  }, [slide.id, flavorCycle.length])

  const displayFlavor = flavorCycle.length > 0 ? flavorCycle[flavorCycleIdx % flavorCycle.length] : null
  const flavorEggActive = flavorCycle.length > 1

  const advanceMenuFlavor = useCallback(() => {
    if (!flavorEggActive) return
    setFlavorCycleIdx((i) => (i + 1) % flavorCycle.length)
    setFlavorBump(true)
    window.setTimeout(() => setFlavorBump(false), 480)
  }, [flavorCycle.length, flavorEggActive])

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
    if (s?.opensLab) {
      onOpenLab?.()
      return
    }
    if (s?.presetId) onPick(s.presetId)
  }, [index, onPick, onOpenLab])

  return (
    <div className="screen menu-screen">
      <div className="menu-hero">
        <header className="menu-header">
          <h1 className="menu-logotype">
            <span className="menu-logotype__line">desk</span>
            <span className="menu-logotype__line">swarm</span>
          </h1>
          <p className="menu-tagline">math is for blockers. track tokens quickly.</p>
        </header>
      </div>

      <section className="char-select" aria-label="Character select">
        <div className="char-select__cluster">
        <div className="char-select__card-stage">
          <div
            className="char-select__carousel"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <article className={`char-tile char-tile--${slide.tileVariant}`}>
              <div className="char-tile__swatch" aria-hidden>
                {slide.swatchSpriteSrc ? (
                  <img className="char-tile__swatchSprite" src={slide.swatchSpriteSrc} alt="" />
                ) : null}
              </div>
              <div className="char-tile__body">
                <div className="char-tile__main">
                  <h2 className="char-tile__name">{slide.cardName}</h2>
                  <div className="char-tile__textBlock">
                    <p
                      className={`char-tile__oracle${flavorEggActive ? ' char-tile__oracle--egg' : ''}`}
                      onClick={flavorEggActive ? advanceMenuFlavor : undefined}
                    >
                      {slide.oracleText}
                    </p>
                    {displayFlavor ? (
                      <p
                        className={`char-tile__flavor${flavorBump ? ' char-tile__flavor--bump' : ''}${flavorEggActive ? ' char-tile__flavor--egg' : ''}`}
                        onClick={flavorEggActive ? advanceMenuFlavor : undefined}
                        onKeyDown={
                          flavorEggActive
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  advanceMenuFlavor()
                                }
                              }
                            : undefined
                        }
                        role={flavorEggActive ? 'button' : undefined}
                        tabIndex={flavorEggActive ? 0 : undefined}
                        aria-label={flavorEggActive ? 'Next flavor quote' : undefined}
                      >
                        {displayFlavor}
                      </p>
                    ) : null}
                  </div>
                </div>
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
          className={`char-select__cta${slide.presetId || slide.opensLab ? '' : ' char-select__cta--soon'}`}
          disabled={!slide.presetId && !slide.opensLab}
          aria-disabled={!slide.presetId && !slide.opensLab}
          onClick={confirmStart}
        >
          {slide.ctaLabel}
        </button>
        </div>
      </section>

      <ActivityDrawer entries={activity} />
    </div>
  )
}
