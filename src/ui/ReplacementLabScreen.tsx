import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, ExternalLink } from 'lucide-react'
import {
  TOKEN_INCREASER_CATALOG,
  archetypeDisplayName,
  filterCatalogForChainPicker,
  type ArchetypeId,
  type TokenIncreaserCard,
} from '../data/tokenIncreaserCatalog'
import { DigitMeter } from './DigitMeter'
import { IconBackToMenu, IconInfo, IconUndo } from './trackIcons'
import { optimizeReplacementSlots, slotsEqual } from '../model/replacementLabOptimize'
import { buildChainFromSlots } from '../model/replacementLabSlots'
import {
  TOKEN_ATOMS,
  formatEventSummary,
  runChain,
  singleAtomEvent,
  sumTokens,
  type TokenAtom,
  type TokenEvent,
} from '../model/replacementChain'
import { ReplacementLabInfoSheet } from './ReplacementLabInfoSheet'

const SLOT_COUNT = 5
const RECIPE_ATOMS: readonly TokenAtom[] = TOKEN_ATOMS

/** Chatterfang pixel mascot — lives in `public/art/replacement-lab/`. */
const REPLACEMENT_LAB_CHATTERFANG_URL = `${import.meta.env.BASE_URL}art/replacement-lab/chatterfang-avatar.png`

function scryfallCardUrl(id: string): string {
  return `https://scryfall.com/card/${id}`
}

function parseRecipeCount(raw: string): bigint {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return 0n
  return BigInt(Math.min(999, n))
}

function SortableSlotRow({
  index,
  children,
}: {
  index: number
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(index),
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="replacement-lab__slotRow">
      <button
        type="button"
        className="replacement-lab__dragHandle"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder slot ${index + 1}`}
      >
        <span className="replacement-lab__dragGrip" aria-hidden>
          ::
        </span>
      </button>
      {children}
    </div>
  )
}

export function ReplacementLabScreen({
  onLeave,
  reducedMotion,
}: {
  onLeave: () => void
  reducedMotion: boolean
}) {
  const [recipeAtom, setRecipeAtom] = useState<TokenAtom>('Clue')
  const [recipeCountStr, setRecipeCountStr] = useState('1')
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    Array.from({ length: SLOT_COUNT }, () => null),
  )
  /** Snapshot of slots before last Optimize (for toolbar undo). */
  const [slotsBeforeOptimize, setSlotsBeforeOptimize] = useState<(string | null)[] | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)

  const clearOptimizeUndo = useCallback(() => {
    setSlotsBeforeOptimize(null)
  }, [])

  useEffect(() => {
    clearOptimizeUndo()
  }, [recipeAtom, recipeCountStr, clearOptimizeUndo])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const catalogById = useMemo(
    () => new Map(TOKEN_INCREASER_CATALOG.map((c) => [c.scryfallId, c])),
    [],
  )

  const recipe = useMemo((): TokenEvent => {
    const n = parseRecipeCount(recipeCountStr)
    return singleAtomEvent(recipeAtom, n)
  }, [recipeAtom, recipeCountStr])

  const filteredCatalog = useMemo(() => filterCatalogForChainPicker(recipe), [recipe])

  const groupedOptions = useMemo(() => {
    const m = new Map<string, TokenIncreaserCard[]>()
    for (const c of filteredCatalog) {
      const k = c.archetypeId
      const arr = m.get(k) ?? []
      arr.push(c)
      m.set(k, arr)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filteredCatalog])

  const { chain } = useMemo(() => buildChainFromSlots(slots, catalogById), [slots, catalogById])

  const chainResult = useMemo(() => runChain(recipe, chain), [recipe, chain])

  const bumpMeter = useCallback(() => {
    setPulseKey((k) => k + 1)
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = Number(active.id)
      const newIndex = Number(over.id)
      if (
        Number.isNaN(oldIndex) ||
        Number.isNaN(newIndex) ||
        oldIndex < 0 ||
        oldIndex >= SLOT_COUNT ||
        newIndex < 0 ||
        newIndex >= SLOT_COUNT
      ) {
        return
      }
      setSlots((s) => arrayMove([...s], oldIndex, newIndex))
      clearOptimizeUndo()
      bumpMeter()
    },
    [bumpMeter, clearOptimizeUndo],
  )

  const setSlotCard = useCallback(
    (slotIndex: number, scryfallId: string | null) => {
      setSlots((prev) => {
        const next = [...prev]
        next[slotIndex] = scryfallId
        return next
      })
      clearOptimizeUndo()
      bumpMeter()
    },
    [bumpMeter, clearOptimizeUndo],
  )

  const doOptimize = useCallback(() => {
    const snapshot = [...slots]
    const next = optimizeReplacementSlots(snapshot, recipe, catalogById)
    if (slotsEqual(snapshot, next)) return
    setSlotsBeforeOptimize(snapshot)
    setSlots(next)
    bumpMeter()
  }, [slots, recipe, catalogById, bumpMeter])

  const doUndoOptimize = useCallback(() => {
    if (!slotsBeforeOptimize) return
    setSlots([...slotsBeforeOptimize])
    setSlotsBeforeOptimize(null)
    bumpMeter()
  }, [slotsBeforeOptimize, bumpMeter])

  const filledSlotCount = slots.filter((id) => id != null && id !== '').length
  const optimalSlots = useMemo(
    () =>
      filledSlotCount >= 2
        ? optimizeReplacementSlots(slots, recipe, catalogById)
        : [...slots],
    [slots, recipe, catalogById, filledSlotCount],
  )
  const isAlreadyOptimized = filledSlotCount >= 2 && slotsEqual(slots, optimalSlots)
  const optimizeDisabled = filledSlotCount < 2 || slotsBeforeOptimize !== null || isAlreadyOptimized

  const totalFinal = sumTokens(chainResult.final)

  return (
    <div className="screen replacement-lab">
      <header className="replacement-lab__header">
        <button type="button" className="replacement-lab__back icon-btn" onClick={onLeave} aria-label="Back to menu">
          <IconBackToMenu />
        </button>
        <div className="replacement-lab__headerText">
          <h1 className="replacement-lab__title">replacement lab</h1>
          <p className="replacement-lab__subtitle">Make replacement effects easier to track.</p>
        </div>
        <button
          type="button"
          className="replacement-lab__info icon-btn"
          onClick={() => setInfoOpen(true)}
          aria-label="Open replacement lab info"
        >
          <IconInfo />
        </button>
      </header>

      <section
        className="replacement-lab__panel replacement-lab__panel--recipe"
        aria-labelledby="recipe-heading"
      >
        <div className="replacement-lab__recipeLayout">
          <div className="replacement-lab__recipeMain">
            <h2 id="recipe-heading" className="replacement-lab__h2">
              1 — Starting tokens
            </h2>
            <p className="replacement-lab__hint replacement-lab__recipeHint">
              Choose a token and how many you would create—that single batch kicks off the chain. One token
              type at a time.
            </p>
            <div className="replacement-lab__recipeRow">
              <label className="replacement-lab__label">
                Token
                <select
                  className="replacement-lab__select"
                  value={recipeAtom}
                  onChange={(e) => {
                    setRecipeAtom(e.target.value as TokenAtom)
                    bumpMeter()
                  }}
                  aria-label="Token type for the starting batch"
                >
                  {RECIPE_ATOMS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="replacement-lab__label">
                Count
                <input
                  className="replacement-lab__input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={recipeCountStr}
                  onChange={(e) => {
                    setRecipeCountStr(e.target.value.replace(/\D/g, '').slice(0, 3))
                    bumpMeter()
                  }}
                  aria-label="How many of that token for the starting batch"
                />
              </label>
            </div>
          </div>
          <figure className="replacement-lab__recipeAvatar">
            <img
              src={REPLACEMENT_LAB_CHATTERFANG_URL}
              width={200}
              height={200}
              className="replacement-lab__chatterfangImg"
              alt="Chatterfang, Squirrel General"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section className="replacement-lab__panel" aria-labelledby="chain-heading">
        <h2 id="chain-heading" className="replacement-lab__h2">
          2 — Replacement chain (max {SLOT_COUNT})
        </h2>
        <p className="replacement-lab__hint">
          Drag rows to reorder. Open the selected card on Scryfall from the link icon.
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={[0, 1, 2, 3, 4].map(String)} strategy={verticalListSortingStrategy}>
            <ol className="replacement-lab__slotList">
              {slots.map((slotId, i) => (
                <li key={i} className="replacement-lab__slotItem">
                  <SortableSlotRow index={i}>
                    <span className="replacement-lab__slotIdx">{i + 1}</span>
                    <select
                      className="replacement-lab__select replacement-lab__select--grow"
                      value={slotId ?? ''}
                      onChange={(e) => setSlotCard(i, e.target.value || null)}
                      aria-label={`Replacement for slot ${i + 1}`}
                    >
                      <option value="">— empty —</option>
                      {groupedOptions.map(([arch, cards]) => (
                        <optgroup key={arch} label={archetypeDisplayName(arch as ArchetypeId)}>
                          {cards.map((c) => (
                            <option key={c.scryfallId} value={c.scryfallId}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="replacement-lab__slotActions">
                      {slotId ? (
                        <a
                          href={scryfallCardUrl(slotId)}
                          className="replacement-lab__iconBtn"
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open selected card on Scryfall for slot ${i + 1}`}
                          title="Open on Scryfall"
                        >
                          <ExternalLink size={16} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="replacement-lab__iconBtn"
                          disabled
                          aria-label={`No card selected in slot ${i + 1}`}
                          title="Select a card first"
                        >
                          <ExternalLink size={16} />
                        </button>
                      )}
                    </div>
                  </SortableSlotRow>
                </li>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </section>

      <section className="replacement-lab__panel" aria-labelledby="log-heading">
        <h2 id="log-heading" className="replacement-lab__h2">
          3 — Token generation log
        </h2>
        <ol className="replacement-lab__log">
          <li className="replacement-lab__logRow replacement-lab__logRow--seed">
            <div className="replacement-lab__logHead">
              <strong className="replacement-lab__logTitle">1. Create tokens</strong>
            </div>
            <div className="replacement-lab__logBeforeAfter">
              <div className="replacement-lab__logPair">
                <span className="replacement-lab__logPairLabel">Tokens created</span>
                <span className="replacement-lab__logPairValue">{formatEventSummary(recipe)}</span>
              </div>
            </div>
          </li>
          {chainResult.steps.map((row, idx) => {
            const stepNum = idx + 2
            return (
              <li key={idx} className="replacement-lab__logRow">
                <div className="replacement-lab__logHead">
                  <strong className="replacement-lab__logTitle">
                    {stepNum}. {row.effectLabel}
                  </strong>
                  {row.didNotApply ? (
                    <span className="replacement-lab__badge">did not apply</span>
                  ) : null}
                </div>
                <div className="replacement-lab__logBeforeAfter">
                  <div className="replacement-lab__logPair">
                    <span className="replacement-lab__logPairLabel">Tokens created</span>
                    <span className="replacement-lab__logPairValue">{row.afterSummary}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="replacement-lab__panel replacement-lab__panel--meter" aria-live="polite">
        <div className="replacement-lab__meterHeader">
          <h2 className="replacement-lab__h2 replacement-lab__meterTitle">4 — Total tokens generated</h2>
          <div className="replacement-lab__meterToolbar">
            <button
              type="button"
              className={`replacement-lab__toolbarBtn${
                slotsBeforeOptimize !== null ? ' replacement-lab__toolbarBtn--optimized' : ''
              }`}
              onClick={doOptimize}
              disabled={optimizeDisabled}
              title={
                filledSlotCount < 2
                  ? 'Pick at least two replacements to reorder'
                  : isAlreadyOptimized
                    ? 'This chain is already at the maximum token total'
                  : slotsBeforeOptimize
                    ? 'Undo the last optimize to run it again'
                    : 'Reorder the same cards for the highest total'
              }
            >
              {isAlreadyOptimized || slotsBeforeOptimize !== null ? (
                <>
                  <Check size={16} strokeWidth={2.8} aria-hidden />
                  Optimized
                </>
              ) : (
                'Optimize'
              )}
            </button>
            <button
              type="button"
              className="replacement-lab__toolbarBtn replacement-lab__toolbarBtn--secondary"
              onClick={doUndoOptimize}
              disabled={slotsBeforeOptimize === null}
              title="Restore the chain order from before Optimize"
              aria-label="Undo optimize"
            >
              <IconUndo />
            </button>
          </div>
        </div>
        <div className="replacement-lab__meterWrap">
          <DigitMeter value={totalFinal} pulseKey={pulseKey} reducedMotion={reducedMotion} />
        </div>
      </section>
      {infoOpen ? <ReplacementLabInfoSheet onClose={() => setInfoOpen(false)} /> : null}
    </div>
  )
}
