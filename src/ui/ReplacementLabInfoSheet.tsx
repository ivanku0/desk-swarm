export function ReplacementLabInfoSheet({
  onClose,
}: {
  onClose: () => void
}) {
  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="lab-info-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet sheet--info">
        <div className="info-sheet__header replacement-lab-info__header">
          <h2 id="lab-info-title" className="replacement-lab-info__title">
            Replacement Lab Info
          </h2>
          <button
            type="button"
            className="icon-btn info-sheet__closeBtn replacement-lab-info__closeBtn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="info-sheet__card">
          <div className="info-sheet__panel">
            <h4 className="info-sheet__tipsHeading">How this lab models replacements</h4>
            <ul className="info-sheet__tips">
              <li>
                This starts from one <strong>create token</strong> event and applies your selected replacement
                effects top-to-bottom.
              </li>
              <li>
                <strong>Order matters</strong>: changing the chain order can change the final token mix and total.
              </li>
              <li>
                The model focuses on token-creation replacements for one event; it does not try to be a full judge
                engine.
              </li>
            </ul>

            <h4 className="info-sheet__rulesHeading replacement-lab-info__refsHeading">Reference links</h4>
            <p className="info-sheet__rulesLead">
              <a href="https://scryfall.com/search?q=otag%3Atoken-increaser" target="_blank" rel="noreferrer">
                Scryfall token-increaser search
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
