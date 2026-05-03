import { useState } from 'react'
import type { PresetId } from '../presets/types'
import { getCardBundle } from '../data/cardData'
import { getPreset } from '../presets/registry'

type InfoTab = 'oracle' | 'rules' | 'tips'

export function InfoSheet({
  presetId,
  onClose,
}: {
  presetId: PresetId
  onClose: () => void
}) {
  const card = getCardBundle(presetId)
  const p = getPreset(presetId)
  const [tab, setTab] = useState<InfoTab>('oracle')
  const ptCompact = card.powerToughness.replace(/\s/g, '')

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="info-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet sheet--info">
        <div className="info-sheet__chrome">
          <span id="info-title" className="info-sheet__srOnly">
            {card.cardName} reference
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="info-sheet__card">
          <div className="info-sheet__row info-sheet__row--title">
            <span className="info-sheet__name">{card.cardName}</span>
            <span className="info-sheet__mana" aria-label={`mana cost ${card.manaDisplay}`}>
              {card.manaDisplay}
            </span>
          </div>
          <div className="info-sheet__row info-sheet__row--type">{card.typeLine}</div>

          <div
            id="info-panel"
            className="info-sheet__panel"
            role="tabpanel"
            aria-labelledby={`info-tab-${tab}`}
          >
            {tab === 'oracle' ? (
              <>
                <p className="info-sheet__oracle">{card.oracleText}</p>
                {card.flavorText ? (
                  <p className="info-sheet__flavor">{card.flavorText}</p>
                ) : null}
              </>
            ) : null}
            {tab === 'rules' ? (
              <div className="info-sheet__rules">
                <p className="info-sheet__rulesLead">
                  <a href={card.scryfallUrl} target="_blank" rel="noreferrer">
                    Scryfall
                  </a>
                  {' · '}
                  <a href={card.gathererUrl} target="_blank" rel="noreferrer">
                    Gatherer
                  </a>
                </p>
                <h4 className="info-sheet__rulesHeading">Gatherer rulings (via Scryfall)</h4>
                <ol className="info-sheet__rulings">
                  {card.rulings.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            {tab === 'tips' ? (
              <ul className="info-sheet__tips">
                <li>
                  <strong>{p.growLabel}</strong> doubles your counter when it is above zero; at zero
                  it creates a new one and sets the count to 1 (casual commander toy—not
                  comprehensive rules).
                </li>
                <li>
                  undo (curved arrow), −, and + adjust the count; − / + flash −1 or +1 above the
                  buttons when used.
                </li>
                <li>
                  skull (top-left on the board, long-press): wipes the board and clears the counter
                  with a death animation; at 0, a short empty-board joke plays.
                </li>
                <li>
                  reset (top-right on the board, circular arrow) opens a confirm; after confirm the
                  counter returns to 1 instantly.
                </li>
              </ul>
            ) : null}
          </div>

          <div className="info-sheet__row info-sheet__row--pt">{ptCompact}</div>

          <div className="info-sheet__tabs" role="tablist" aria-label="Card info sections">
            {(
              [
                ['oracle', 'oracle text'],
                ['rules', 'rules'],
                ['tips', 'tips'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`info-tab-${id}`}
                aria-selected={tab === id}
                aria-controls="info-panel"
                className={`info-sheet__tab${tab === id ? ' info-sheet__tab--active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
