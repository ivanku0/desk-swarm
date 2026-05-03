import type { PresetId } from '../presets/types'
import { getPreset } from '../presets/registry'

export interface ActivityEntry {
  id: string
  at: number
  presetId: PresetId | null
  text: string
}

export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="activity-log" aria-label="Session activity">
      <h2 className="activity-log__title">activity</h2>
      <ul className="activity-log__list">
        {entries.length === 0 ? (
          <li className="activity-log__empty">nothing logged yet.</li>
        ) : (
          [...entries]
            .reverse()
            .slice(0, 80)
            .map((e) => (
              <li key={e.id} className="activity-log__item">
                {e.presetId ? (
                  <span className={`activity-log__tag activity-log__tag--${e.presetId}`}>
                    {getPreset(e.presetId).cardName.toLowerCase()}
                  </span>
                ) : (
                  <span className="activity-log__tag">—</span>
                )}
                <span className="activity-log__text">{e.text}</span>
              </li>
            ))
        )}
      </ul>
    </section>
  )
}
