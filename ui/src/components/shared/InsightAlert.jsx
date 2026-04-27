import { useMemo } from 'react'
import useInsightStore from '../../store/useInsightStore.js'
import { generateRecommendations } from '../../utils/insightEngine.js'
import { teamSeasons, SCHOOL_META } from '../../data/mockData.js'

// Renders 0–3 contextual warning cards for a single team/year.
// Pass school + year; hides itself completely when there are no alerts.
export default function InsightAlert({ school, year }) {
  const { insights } = useInsightStore()

  const season = useMemo(
    () => teamSeasons.find(s => s.school === school && s.year === year),
    [school, year]
  )

  const recs = useMemo(
    () => generateRecommendations(season, insights),
    [season, insights]
  )

  if (!recs.length) return null

  const meta = SCHOOL_META[school]

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {recs.map((rec, i) => (
        <div
          key={`${rec.insightId}-${i}`}
          className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: '#f59e0b0e', border: '1px solid #f59e0b30' }}
        >
          <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>⚡</span>
          <div className="flex-1 leading-snug" style={{ color: '#c8a84b' }}>
            <span className="font-semibold" style={{ color: '#f5c540' }}>
              {meta?.abbr} — {rec.label}:{' '}
            </span>
            {rec.text}
          </div>
          <span
            className="flex-shrink-0 px-1.5 py-0.5 rounded font-bold uppercase"
            style={{
              background: '#f59e0b22',
              color: '#f59e0b',
              fontSize: 9,
              letterSpacing: '0.05em',
            }}
          >
            {rec.confidence}
          </span>
        </div>
      ))}
    </div>
  )
}
