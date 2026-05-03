import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PresetId } from '../presets/types'
import { getPreset } from '../presets/registry'
import { growCount, applyMicro, DEFAULT_COUNT } from '../model/tracking'
import { formatCount } from '../model/formatCount'
import { zoomScaleFromCount } from '../viz/zoomStepScale'
import { PixelField, type FieldMode, type PixelFieldHandle } from '../viz/PixelField'
import { DigitMeter } from './DigitMeter'
import { useLongPress } from '../hooks/useLongPress'
import type { ActivityEntry } from './ActivityLog'
import { deltaLabel, randomHypeLine, type DeltaFlashAnchor } from './countFeedback'
import {
  IconBackToMenu,
  IconInfo,
  IconMinus,
  IconModalConfirm,
  IconModalDismiss,
  IconPlus,
  IconReset,
  IconSkull,
  IconUndo,
} from './trackIcons'

const MICRO_FLASH_PLUS = '+1'
const MICRO_FLASH_MINUS = '\u2212' + '1' /* −1 */

const UNDO_CAP = 120

export function TrackScreen({
  presetId,
  onLeave,
  appendActivity,
  reducedMotion,
  onOpenInfo,
}: {
  presetId: PresetId
  onLeave: () => void
  appendActivity: (e: Omit<ActivityEntry, 'id' | 'at'>) => void
  reducedMotion: boolean
  onOpenInfo: () => void
}) {
  const preset = getPreset(presetId)
  const [count, setCount] = useState(DEFAULT_COUNT)
  const undoRef = useRef<bigint[]>([])
  const [pulseKey, setPulseKey] = useState(0)
  const [fieldMode, setFieldMode] = useState<FieldMode>('normal')
  const [wipeSnapshot, setWipeSnapshot] = useState<bigint | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [backOpen, setBackOpen] = useState(false)
  const [wipeHold, setWipeHold] = useState(0)
  const fieldRef = useRef<PixelFieldHandle>(null)
  const wipeFromRef = useRef(0n)
  const [drainKey, setDrainKey] = useState(0)
  const [heroDrain, setHeroDrain] = useState<bigint | null>(null)
  type DeltaFlash = { text: string; anchor: DeltaFlashAnchor; id: number }
  type HypeFlash = { text: string; id: number }
  const [deltaFlash, setDeltaFlash] = useState<DeltaFlash | null>(null)
  const [hypeFlash, setHypeFlash] = useState<HypeFlash | null>(null)

  const clearDeltaFlash = useCallback((id: number) => {
    setDeltaFlash((cur) => (cur?.id === id ? null : cur))
  }, [])
  const clearHypeFlash = useCallback((id: number) => {
    setHypeFlash((cur) => (cur?.id === id ? null : cur))
  }, [])

  const showDelta = useCallback(
    (prev: bigint, next: bigint, anchor: DeltaFlashAnchor, textOverride?: string) => {
      const text = textOverride ?? deltaLabel(prev, next)
      if (text) setDeltaFlash({ text, anchor, id: Date.now() })
    },
    [],
  )

  const showHypeIfIncrease = useCallback(
    (prev: bigint, next: bigint) => {
      if (reducedMotion || next <= prev) return
      setHypeFlash({ text: randomHypeLine(presetId), id: Date.now() })
    },
    [presetId, reducedMotion],
  )

  const fieldCount = fieldMode === 'dying' && wipeSnapshot !== null ? wipeSnapshot : count
  const zoomScale = zoomScaleFromCount(fieldCount, presetId)

  const pushUndo = useCallback((current: bigint) => {
    undoRef.current = [...undoRef.current, current].slice(-UNDO_CAP)
  }, [])

  const doGrow = () => {
    const before = count
    const next = growCount(count)
    if (next === before) return
    setHeroDrain(null)
    pushUndo(count)
    setCount(next)
    setPulseKey((k) => k + 1)
    showDelta(before, next, 'grow')
    showHypeIfIncrease(before, next)
    appendActivity({ presetId, text: `${preset.growLabel} → ${formatCount(next)}` })
  }

  const doMicro = (d: -1 | 1) => {
    const before = count
    const next = applyMicro(count, d)
    if (next === before) return
    setHeroDrain(null)
    pushUndo(count)
    setCount(next)
    setPulseKey((k) => k + 1)
    showDelta(before, next, d > 0 ? 'plus1' : 'minus1', d > 0 ? MICRO_FLASH_PLUS : MICRO_FLASH_MINUS)
    showHypeIfIncrease(before, next)
    appendActivity({
      presetId,
      text: `${d > 0 ? '+1' : '−1'} → ${formatCount(next)}`,
    })
  }

  const doUndo = () => {
    const s = undoRef.current
    if (s.length === 0) return
    const before = count
    const prev = s[s.length - 1]!
    undoRef.current = s.slice(0, -1)
    setHeroDrain(null)
    setCount(prev)
    setPulseKey((k) => k + 1)
    showDelta(before, prev, 'undo')
    showHypeIfIncrease(before, prev)
    appendActivity({ presetId, text: `undo → ${formatCount(prev)}` })
  }

  const fieldModeRef = useRef(fieldMode)
  const countRef = useRef(count)
  useLayoutEffect(() => {
    fieldModeRef.current = fieldMode
    countRef.current = count
  }, [fieldMode, count])

  const { start: startWipeHold, clear: clearWipeHold } = useLongPress(
    () => {
      if (fieldModeRef.current !== 'normal') return
      const c = countRef.current
      if (c === 0n) {
        setFieldMode('emptyJoke')
        return
      }
      pushUndo(c)
      wipeFromRef.current = c
      setWipeSnapshot(c)
      setFieldMode('dying')
    },
    650,
    (t) => setWipeHold(t),
  )

  const onDyingComplete = useCallback(() => {
    const from = wipeFromRef.current
    setCount(0n)
    setWipeSnapshot(null)
    setFieldMode('normal')
    setDrainKey((k) => k + 1)
    setPulseKey((k) => k + 1)
    showDelta(from, 0n, 'wipe')
    appendActivity({
      presetId,
      text: `board wiped (was ${formatCount(from)})`,
    })
  }, [appendActivity, presetId, showDelta])

  const onEmptyJokeComplete = useCallback(() => {
    setFieldMode('normal')
    setWipeHold(0)
    clearWipeHold()
  }, [clearWipeHold])

  useEffect(() => {
    if (drainKey === 0) return
    const from = wipeFromRef.current
    if (from === 0n) {
      setHeroDrain(null)
      return
    }
    setHeroDrain(from)
    const id = window.setInterval(() => {
      setHeroDrain((d) => {
        if (d === null || d === 0n) return null
        const step = d > 800n ? d / 12n + 1n : 1n
        const next = d <= step ? 0n : d - step
        return next
      })
    }, 42)
    const end = window.setTimeout(() => {
      clearInterval(id)
      setHeroDrain(null)
    }, 3200)
    return () => {
      clearInterval(id)
      clearTimeout(end)
    }
  }, [drainKey])

  const heroNumber = heroDrain ?? count

  const confirmReset = () => {
    const before = count
    setHeroDrain(null)
    pushUndo(count)
    setCount(DEFAULT_COUNT)
    setPulseKey((k) => k + 1)
    showDelta(before, DEFAULT_COUNT, 'reset')
    setResetOpen(false)
    appendActivity({ presetId, text: 'reset → 1' })
  }

  return (
    <div className={`screen track-screen ${preset.themeClass}${reducedMotion ? ' track-screen--reduce-motion' : ''}`}>
      <header className="track-top">
        <button
          type="button"
          className="text-btn text-btn--icon track-top__left"
          onClick={() => setBackOpen(true)}
          aria-label="Back to menu"
        >
          <IconBackToMenu className="track-glyph" />
        </button>
        <h1 className="track-meter-title">{preset.meterTitle}</h1>
        <button
          type="button"
          className="text-btn text-btn--icon track-top__right"
          onClick={onOpenInfo}
          aria-label="Open card info"
        >
          <IconInfo className="track-glyph" />
        </button>
      </header>

      <div className="hero-panel hero-panel--meter" aria-label={preset.meterTitle}>
        <DigitMeter value={heroNumber} pulseKey={pulseKey} reducedMotion={reducedMotion} />
      </div>

      <div className="field-wrap">
        <div className="field-board">
          {hypeFlash ? (
            <div
              key={hypeFlash.id}
              className="hype-flash"
              aria-hidden
              onAnimationEnd={() => clearHypeFlash(hypeFlash.id)}
            >
              {hypeFlash.text}
            </div>
          ) : null}
          <PixelField
            ref={fieldRef}
            presetId={presetId}
            count={fieldCount}
            pulseKey={pulseKey}
            fieldMode={fieldMode}
            reducedMotion={reducedMotion}
            zoomScale={zoomScale}
            onDyingComplete={onDyingComplete}
            onEmptyJokeComplete={onEmptyJokeComplete}
          />
        </div>
        <div className="field-corner field-corner--tl flash-slot">
          {deltaFlash?.anchor === 'wipe' ? (
            <span
              key={deltaFlash.id}
              className="delta-flash delta-flash--field-corner"
              aria-hidden
              onAnimationEnd={() => clearDeltaFlash(deltaFlash.id)}
            >
              {deltaFlash.text}
            </span>
          ) : null}
          <button
            type="button"
            className="field-fab field-fab--wipe wipe-btn"
            title="Hold to wipe board"
            aria-label="Wipe board (hold)"
            disabled={fieldMode !== 'normal'}
            onPointerDown={() => {
              if (fieldMode !== 'normal') return
              startWipeHold()
            }}
            onPointerUp={clearWipeHold}
            onPointerLeave={clearWipeHold}
            onPointerCancel={clearWipeHold}
          >
            <span
              className="wipe-btn__progress"
              aria-hidden
              style={{
                width: `${Math.round(wipeHold * 100)}%`,
                background: presetId === 'horde' ? 'var(--accent-alt)' : 'var(--accent-positive)',
              }}
            />
            <span className="wipe-btn__glyph">
              <IconSkull className="track-glyph" />
            </span>
          </button>
        </div>
        <div className="field-corner field-corner--tr flash-slot">
          {deltaFlash?.anchor === 'reset' ? (
            <span
              key={deltaFlash.id}
              className="delta-flash delta-flash--field-corner"
              aria-hidden
              onAnimationEnd={() => clearDeltaFlash(deltaFlash.id)}
            >
              {deltaFlash.text}
            </span>
          ) : null}
          <button
            type="button"
            className="field-fab field-fab--reset"
            title="Reset to 1"
            aria-label="Reset counter to 1"
            onClick={() => setResetOpen(true)}
          >
            <IconReset className="track-glyph" />
          </button>
        </div>
      </div>

      <div className="grow-cluster">
        <div className="flash-slot flash-slot--undo">
          {deltaFlash?.anchor === 'undo' ? (
            <span
              key={deltaFlash.id}
              className="delta-flash"
              aria-hidden
              onAnimationEnd={() => clearDeltaFlash(deltaFlash.id)}
            >
              {deltaFlash.text}
            </span>
          ) : null}
          <button type="button" className="micro-btn micro-btn--icon" onClick={doUndo} aria-label="Undo">
            <IconUndo className="track-glyph" />
          </button>
        </div>
        <div className="flash-slot flash-slot--grow">
          {deltaFlash?.anchor === 'grow' ? (
            <span
              key={deltaFlash.id}
              className="delta-flash"
              aria-hidden
              onAnimationEnd={() => clearDeltaFlash(deltaFlash.id)}
            >
              {deltaFlash.text}
            </span>
          ) : null}
          <button type="button" className="grow-btn" onClick={doGrow}>
            {preset.growLabel}
          </button>
        </div>
        <div className="micro-pair" role="group" aria-label="Add or remove one from the count">
          <div className="micro-pair__btns">
            <div className="flash-slot flash-slot--micro">
              {deltaFlash?.anchor === 'minus1' ? (
                <span
                  key={deltaFlash.id}
                  className="delta-flash"
                  aria-hidden
                  onAnimationEnd={() => clearDeltaFlash(deltaFlash.id)}
                >
                  {deltaFlash.text}
                </span>
              ) : null}
              <button
                type="button"
                className="micro-pair__btn micro-pair__btn--icon"
                onClick={() => doMicro(-1)}
                aria-label="Remove one (−1)"
              >
                <IconMinus className="track-glyph" />
              </button>
            </div>
            <div className="flash-slot flash-slot--micro">
              {deltaFlash?.anchor === 'plus1' ? (
                <span
                  key={deltaFlash.id}
                  className="delta-flash"
                  aria-hidden
                  onAnimationEnd={() => clearDeltaFlash(deltaFlash.id)}
                >
                  {deltaFlash.text}
                </span>
              ) : null}
              <button
                type="button"
                className="micro-pair__btn micro-pair__btn--icon"
                onClick={() => doMicro(1)}
                aria-label="Add one (+1)"
              >
                <IconPlus className="track-glyph" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {resetOpen ? (
        <div className="modal-backdrop" role="dialog" aria-labelledby="modal-reset-title">
          <div className="modal modal--confirm">
            <p id="modal-reset-title" className="modal-confirm-title">
              are you sure?
            </p>
            <div className="modal-actions modal-actions--icons">
              <button
                type="button"
                className="modal-icon-btn"
                onClick={() => setResetOpen(false)}
                aria-label="Cancel reset"
              >
                <IconModalDismiss className="track-glyph" />
              </button>
              <button
                type="button"
                className="modal-icon-btn modal-icon-btn--confirm"
                onClick={confirmReset}
                aria-label="Reset counter to 1"
              >
                <IconModalConfirm className="track-glyph" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {backOpen ? (
        <div className="modal-backdrop" role="dialog" aria-labelledby="modal-back-title">
          <div className="modal modal--confirm">
            <p id="modal-back-title" className="modal-confirm-title">
              are you sure?
            </p>
            <div className="modal-actions modal-actions--icons">
              <button
                type="button"
                className="modal-icon-btn"
                onClick={() => setBackOpen(false)}
                aria-label="Stay on this run"
              >
                <IconModalDismiss className="track-glyph" />
              </button>
              <button type="button" className="modal-icon-btn modal-icon-btn--confirm" onClick={onLeave} aria-label="Return to menu">
                <IconModalConfirm className="track-glyph" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
