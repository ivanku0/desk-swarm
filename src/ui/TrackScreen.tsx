import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PresetId } from '../presets/types'
import { getPreset } from '../presets/registry'
import {
  growCountForPreset,
  applyMicro,
  DEFAULT_COUNT,
  SCUTE_LINEAR_MAX,
  krenkItCount,
  toggleKrenkoPresence,
  dismissKrenkoBossKeepHorde,
  parseManualCountInput,
} from '../model/tracking'
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
  const [count, setCount] = useState<bigint>(() => (presetId === 'krenko' ? 0n : DEFAULT_COUNT))
  const [krenkoPresent, setKrenkoPresent] = useState(false)
  type UndoEntry = { count: bigint; krenkoPresent: boolean }
  const undoRef = useRef<UndoEntry[]>([])
  const [manualOpen, setManualOpen] = useState(false)
  const [manualDraft, setManualDraft] = useState('')
  const [pulseKey, setPulseKey] = useState(0)
  const [fieldMode, setFieldMode] = useState<FieldMode>('normal')
  const [wipeSnapshot, setWipeSnapshot] = useState<bigint | null>(null)
  const [backOpen, setBackOpen] = useState(false)
  const [wipeHold, setWipeHold] = useState(0)
  const [wipeChoiceOpen, setWipeChoiceOpen] = useState(false)
  const fieldRef = useRef<PixelFieldHandle>(null)
  const wipeFromRef = useRef(0n)
  const [drainKey, setDrainKey] = useState(0)
  const [heroDrain, setHeroDrain] = useState<bigint | null>(null)
  type DeltaFlash = { text: string; anchor: DeltaFlashAnchor; id: number }
  type HypeFlash = { text: string; id: number }
  const [deltaFlash, setDeltaFlash] = useState<DeltaFlash | null>(null)
  const [hypeFlash, setHypeFlash] = useState<HypeFlash | null>(null)
  const [growBurst, setGrowBurst] = useState(false)

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

  const krenkoPresentRef = useRef(false)
  const pushUndo = useCallback(() => {
    undoRef.current = [
      ...undoRef.current,
      {
        count: countRef.current,
        krenkoPresent: presetId === 'krenko' ? krenkoPresentRef.current : false,
      },
    ].slice(-UNDO_CAP)
  }, [presetId])

  const doGrow = () => {
    const before = count
    if (presetId === 'krenko') {
      if (!krenkoPresent) {
        const { total, present } = toggleKrenkoPresence(before, false)
        if (total === before && present === krenkoPresent) return
        setHeroDrain(null)
        pushUndo()
        setCount(total)
        setKrenkoPresent(present)
        setPulseKey((k) => k + 1)
        showDelta(before, total, 'grow')
        showHypeIfIncrease(before, total)
        appendActivity({ presetId, text: `Cast Krenko → ${formatCount(total)}` })
        return
      }
      const next = krenkItCount(before, true)
      if (next === before) return
      setHeroDrain(null)
      pushUndo()
      setCount(next)
      setPulseKey((k) => k + 1)
      showDelta(before, next, 'grow')
      showHypeIfIncrease(before, next)
      appendActivity({ presetId, text: `${preset.growLabel} → ${formatCount(next)}` })
      return
    }
    const next = growCountForPreset(count, presetId)
    if (next === before) return
    const scuteExpGate = presetId === 'scute' && before === SCUTE_LINEAR_MAX
    if (scuteExpGate && !reducedMotion) setGrowBurst(true)
    setHeroDrain(null)
    pushUndo()
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
    pushUndo()
    if (presetId === 'krenko' && next === 0n) setKrenkoPresent(false)
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
    setCount(prev.count)
    if (presetId === 'krenko') setKrenkoPresent(prev.krenkoPresent)
    setPulseKey((k) => k + 1)
    showDelta(before, prev.count, 'undo')
    showHypeIfIncrease(before, prev.count)
    appendActivity({ presetId, text: `undo → ${formatCount(prev.count)}` })
  }

  const confirmManualCount = () => {
    const parsed = parseManualCountInput(manualDraft)
    if (parsed === null) return
    const before = count
    if (parsed === before) {
      setManualOpen(false)
      return
    }
    setHeroDrain(null)
    pushUndo()
    setCount(parsed)
    if (presetId === 'krenko' && parsed === 0n) setKrenkoPresent(false)
    setPulseKey((k) => k + 1)
    showDelta(before, parsed, 'reset')
    showHypeIfIncrease(before, parsed)
    appendActivity({ presetId, text: `set count → ${formatCount(parsed)}` })
    setManualOpen(false)
    setManualDraft('')
  }

  const fieldModeRef = useRef<FieldMode>('normal')
  const countRef = useRef<bigint>(0n)

  const startWipeSequence = useCallback(
    (from: bigint) => {
      pushUndo()
      wipeFromRef.current = from
      setWipeSnapshot(from)
      setFieldMode('dying')
    },
    [pushUndo],
  )

  const killBossOnlyFromSkull = useCallback(() => {
    if (presetId !== 'krenko') return
    if (!krenkoPresentRef.current || countRef.current <= 0n) return
    const before = countRef.current
    const { total, present } = dismissKrenkoBossKeepHorde(before, krenkoPresentRef.current)
    if (before === total && present === krenkoPresentRef.current) return
    setHeroDrain(null)
    pushUndo()
    setCount(total)
    setKrenkoPresent(present)
    setPulseKey((k) => k + 1)
    showDelta(before, total, 'wipe', 'boss out')
    appendActivity({
      presetId,
      text: `Krenko leaves — ${formatCount(total)} goblins remain`,
    })
  }, [appendActivity, presetId, pushUndo, showDelta])

  useLayoutEffect(() => {
    fieldModeRef.current = fieldMode
    countRef.current = count
    krenkoPresentRef.current = krenkoPresent
  }, [fieldMode, count, krenkoPresent])

  const { start: startWipeHold, clear: clearWipeHold } = useLongPress(
    () => {
      if (fieldModeRef.current !== 'normal') return
      const c = countRef.current
      if (c === 0n) {
        showDelta(0n, 0n, 'wipe', 'already ded')
        setFieldMode('emptyJoke')
        return
      }
      if (presetId === 'krenko' && krenkoPresentRef.current) {
        setWipeChoiceOpen(true)
        return
      }
      startWipeSequence(c)
    },
    650,
    (t) => setWipeHold(t),
  )

  const onDyingComplete = useCallback(() => {
    const from = wipeFromRef.current
    setCount(0n)
    if (presetId === 'krenko') setKrenkoPresent(false)
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
    const t0 = performance.now()
    let tick = 0
    const DRAIN_MS = 2600
    const TICK_MS = 42
    const id = window.setInterval(() => {
      setHeroDrain((d) => {
        if (d === null || d === 0n) return null
        const elapsed = Math.max(0, performance.now() - t0)
        const leftMs = Math.max(0, DRAIN_MS - elapsed)
        const ticksLeft = Math.max(1, Math.ceil(leftMs / TICK_MS))
        // Step sized by remaining time so we never stall in a fixed tail.
        let step = d / BigInt(ticksLeft)
        if (step < 1n) step = 1n
        // Deterministic jitter avoids robotic cadence while still converging to zero.
        const jitterCycle = [1n, 1n, 2n, 1n, 3n, 1n]
        const jitter = jitterCycle[tick % jitterCycle.length]!
        tick += 1
        step = step * jitter
        const next = d <= step ? 0n : d - step
        return next
      })
    }, TICK_MS)
    const end = window.setTimeout(() => {
      clearInterval(id)
      setHeroDrain(null)
    }, DRAIN_MS + 80)
    return () => {
      clearInterval(id)
      clearTimeout(end)
    }
  }, [drainKey])

  const heroNumber = heroDrain ?? count

  const scuteExpReady = presetId === 'scute' && count === SCUTE_LINEAR_MAX
  const krenkReady = presetId === 'krenko' && krenkoPresent && count > 0n
  const growCharged = scuteExpReady || krenkReady
  const krenkGrowDisabled = presetId === 'krenko' && krenkoPresent && count <= 0n

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

      <button
        type="button"
        className="hero-panel hero-panel--meter"
        aria-label={`${preset.meterTitle} — tap to set total`}
        onClick={() => {
          setManualDraft(count.toString())
          setManualOpen(true)
        }}
      >
        <DigitMeter value={heroNumber} pulseKey={pulseKey} reducedMotion={reducedMotion} />
      </button>

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
            leaderPresent={presetId === 'krenko' && krenkoPresent}
            onDyingComplete={onDyingComplete}
            onEmptyJokeComplete={onEmptyJokeComplete}
          />
        </div>
        <div className="field-corner field-corner--tl flash-slot">
          {deltaFlash?.anchor === 'wipe' ? (
            <span
              key={deltaFlash.id}
              className={`delta-flash delta-flash--field-corner${
                deltaFlash.text === 'already ded' ? ' delta-flash--screen-center' : ''
              }`}
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
          <span
            className={`grow-btn-slot${scuteExpReady ? ' grow-btn-slot--scute-warn' : ''}`}
          >
            <button
              type="button"
              className={`grow-btn${growCharged ? ' grow-btn--charged' : ''}${growBurst ? ' grow-btn--burst' : ''}`}
              disabled={krenkGrowDisabled}
              aria-label={presetId === 'krenko' && !krenkoPresent ? 'Cast Krenko onto the board' : undefined}
              onClick={doGrow}
              onAnimationEnd={(e) => {
                if (e.animationName === 'grow-btn-burst') setGrowBurst(false)
              }}
            >
              <span className="grow-btn__title">
                {presetId === 'krenko' ? (krenkoPresent ? preset.growLabel : 'CAST KRENKO') : preset.growLabel}
              </span>
              {scuteExpReady || krenkReady ? (
                <span className="grow-btn__subtitle" aria-hidden>
                  next: ×2
                </span>
              ) : null}
            </button>
          </span>
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

      {manualOpen ? (
        <div className="modal-backdrop" role="dialog" aria-labelledby="modal-manual-title">
          <div className="modal modal--confirm">
            <p id="modal-manual-title" className="modal-confirm-title">
              set total (digits)
            </p>
            <input
              className="modal-input"
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              aria-label="New goblin count"
              value={manualDraft}
              onChange={(e) => setManualDraft(e.target.value)}
            />
            <div className="modal-actions modal-actions--icons">
              <button
                type="button"
                className="modal-icon-btn"
                onClick={() => {
                  setManualOpen(false)
                  setManualDraft('')
                }}
                aria-label="Cancel"
              >
                <IconModalDismiss className="track-glyph" />
              </button>
              <button
                type="button"
                className="modal-icon-btn modal-icon-btn--confirm"
                onClick={confirmManualCount}
                aria-label="Apply count"
              >
                <IconModalConfirm className="track-glyph" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {wipeChoiceOpen ? (
        <div className="modal-backdrop" role="dialog" aria-labelledby="modal-wipe-choice-title">
          <div className="modal modal--confirm">
            <p id="modal-wipe-choice-title" className="modal-confirm-title">
              skull action
            </p>
            <div className="modal-actions modal-actions--stack">
              <button
                type="button"
                className="modal-action-btn"
                onClick={() => {
                  setWipeChoiceOpen(false)
                  startWipeSequence(countRef.current)
                }}
              >
                wipe all
              </button>
              <button
                type="button"
                className="modal-action-btn"
                onClick={() => {
                  setWipeChoiceOpen(false)
                  killBossOnlyFromSkull()
                }}
              >
                kill krenko only
              </button>
              <button
                type="button"
                className="modal-action-btn modal-action-btn--ghost"
                onClick={() => setWipeChoiceOpen(false)}
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
