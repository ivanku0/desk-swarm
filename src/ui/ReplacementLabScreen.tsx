import { useCallback, useMemo, useState } from 'react'
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
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  TOKEN_INCREASER_CATALOG,
  archetypeDisplayName,
  filterCatalogForChainPicker,
  type ArchetypeId,
  type TokenIncreaserCard,
} from '../data/tokenIncreaserCatalog'
import { DigitMeter } from './DigitMeter'
import { IconBackToMenu } from './trackIcons'
import {
  archetypeIdToEffectKey,
  formatEventSummary,
  runChain,
  singleAtomEvent,
  sumTokens,
  type ChainStep,
  type TokenAtom,
  type TokenEvent,
} from '../model/replacementChain'

const SLOT_COUNT = 5
const RECIPE_ATOMS: readonly TokenAtom[] = ['Clue', 'Food', 'Treasure', 'Squirrel', 'Soldier']

function parseRecipeCount(raw: string): bigint {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return 0n
  return BigInt(Math.min(999, n))
}

function buildChainFromSlots(
  slots: readonly (string | null)[],
  byId: ReadonlyMap<string, TokenIncreaserCard>,
): ChainStep[] {
  const out: ChainStep[] = []
  for (const id of slots) {
    if (!id) continue
    const card = byId.get(id)
    if (!card?.implementsRunChain) continue
    const effectKey = archetypeIdToEffectKey(card.archetypeId)
    if (!effectKey) continue
    out.push({ effectKey, displayLabel: card.name })
  }
  return out
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
  const [pulseKey, setPulseKey] = useState(0)

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

  const chain = useMemo(() => buildChainFromSlots(slots, catalogById), [slots, catalogById])

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
      bumpMeter()
    },
    [bumpMeter],
  )

  const setSlotCard = useCallback(
    (slotIndex: number, scryfallId: string | null) => {
      setSlots((prev) => {
        const next = [...prev]
        next[slotIndex] = scryfallId
        return next
      })
      bumpMeter()
    },
    [bumpMeter],
  )

  const moveSlot = useCallback(
    (i: number, dir: -1 | 1) => {
      const j = i + dir
      if (j < 0 || j >= SLOT_COUNT) return
      setSlots((s) => arrayMove([...s], i, j))
      bumpMeter()
    },
    [bumpMeter],
  )

  const totalFinal = sumTokens(chainResult.final)
  const totalInitial = sumTokens(recipe)

  return (
    <div className="screen replacement-lab">
      <header className="replacement-lab__header">
        <button type="button" className="replacement-lab__back icon-btn" onClick={onLeave} aria-label="Back to menu">
          <IconBackToMenu />
        </button>
        <div className="replacement-lab__headerText">
          <h1 className="replacement-lab__title">replacement lab</h1>
          <p className="replacement-lab__subtitle">Token-only teaching chain (CR-style ordering).</p>
        </div>
      </header>

      <section className="replacement-lab__panel" aria-labelledby="recipe-heading">
        <h2 id="recipe-heading" className="replacement-lab__h2">
          1 — initial tokens (E₀)
        </h2>
        <p className="replacement-lab__hint">One kind × count (no mixed batches in MVP).</p>
        <div className="replacement-lab__recipeRow">
          <label className="replacement-lab__label">
            Kind
            <select
              className="replacement-lab__select"
              value={recipeAtom}
              onChange={(e) => {
                setRecipeAtom(e.target.value as TokenAtom)
                bumpMeter()
              }}
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
              aria-label="Token count for initial recipe"
            />
          </label>
        </div>
        <p className="replacement-lab__mono" aria-live="polite">
          {formatEventSummary(recipe)}
        </p>
      </section>

      <section className="replacement-lab__panel" aria-labelledby="chain-heading">
        <h2 id="chain-heading" className="replacement-lab__h2">
          2 — replacement chain (max {SLOT_COUNT})
        </h2>
        <p className="replacement-lab__hint">Drag rows or use arrows. Only cards that apply to your E₀ are listed.</p>

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
                      <button
                        type="button"
                        className="replacement-lab__iconBtn"
                        onClick={() => moveSlot(i, -1)}
                        disabled={i === 0}
                        aria-label={`Move slot ${i + 1} up`}
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        type="button"
                        className="replacement-lab__iconBtn"
                        onClick={() => moveSlot(i, 1)}
                        disabled={i === SLOT_COUNT - 1}
                        aria-label={`Move slot ${i + 1} down`}
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </SortableSlotRow>
                </li>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </section>

      <section className="replacement-lab__panel replacement-lab__panel--meter" aria-live="polite">
        <h2 className="replacement-lab__h2">Total tokens after chain</h2>
        <div className="replacement-lab__meterWrap">
          <DigitMeter value={totalFinal} pulseKey={pulseKey} reducedMotion={reducedMotion} />
        </div>
        <p className="replacement-lab__deltaLine">
          Δ vs E₀:{' '}
          <span className="replacement-lab__mono">
            {totalFinal >= totalInitial ? '+' : ''}
            {(totalFinal - totalInitial).toString()}
          </span>
        </p>
      </section>

      <section className="replacement-lab__panel" aria-labelledby="log-heading">
        <h2 id="log-heading" className="replacement-lab__h2">
          Step log
        </h2>
        {chainResult.steps.length === 0 ? (
          <p className="replacement-lab__hint">Add replacements above, or leave slots empty for a no-op chain.</p>
        ) : (
          <ol className="replacement-lab__log">
            {chainResult.steps.map((row, idx) => (
              <li key={idx} className="replacement-lab__logRow">
                <div className="replacement-lab__logHead">
                  <strong>{row.effectLabel}</strong>
                  {row.didNotApply ? (
                    <span className="replacement-lab__badge">did not apply</span>
                  ) : null}
                </div>
                <div className="replacement-lab__mono replacement-lab__logLine">
                  {row.beforeSummary} → {row.afterSummary}{' '}
                  <span className="replacement-lab__deltaBadge">
                    Δ {row.deltaTotal >= 0n ? '+' : ''}
                    {row.deltaTotal.toString()} total
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
