import { SCHOOL_META, SCHOOL_COLORS } from '../../data/mockData.js'

const METRIC_LABELS = {
  win_pct: 'Win %',
  ivy_win_pct: 'Ivy Win %',
  points_per_game: 'Points/Game',
  points_allowed_per_game: 'Pts Allowed/Game',
  avg_margin: 'Avg Margin',
  turnovers_per_game: 'TO/Game',
  OL_avg_weight: 'OL Avg Weight',
  DL_avg_weight: 'DL Avg Weight',
  LB_avg_weight: 'LB Avg Weight',
  DB_avg_weight: 'DB Avg Weight',
  SKILL_avg_weight: 'Skill Avg Weight',
  pass_tendency: 'Pass Tendency',
  tempo: 'Tempo',
  spread_factor: 'Spread Factor',
  explosiveness: 'Explosiveness',
}

function formatVal(key, val) {
  if (val === null || val === undefined) return '—'
  if (key === 'win_pct' || key === 'ivy_win_pct') return `${(val * 100).toFixed(1)}%`
  if (key === 'pass_tendency' || key === 'tempo' || key === 'spread_factor' || key === 'explosiveness') {
    return `${(val * 100).toFixed(1)}%`
  }
  if (key.includes('weight')) return `${val} lbs`
  if (key === 'avg_margin') return val > 0 ? `+${val}` : `${val}`
  return typeof val === 'number' ? val.toFixed(1) : val
}

export default function StatCard({ school, season, metrics = [], compareValue = null }) {
  const meta = SCHOOL_META[school]
  const color = SCHOOL_COLORS[school]

  if (!meta || !season) return null

  const getCompare = (key) => {
    if (!compareValue) return 'neutral'
    const a = season[key]
    const b = compareValue[key]
    if (a === null || b === null || a === undefined || b === undefined) return 'neutral'
    if (key === 'points_allowed_per_game' || key === 'turnovers_per_game') {
      return a < b ? 'better' : a > b ? 'worse' : 'neutral'
    }
    return a > b ? 'better' : a < b ? 'worse' : 'neutral'
  }

  const record = season ? `${season.wins}-${season.losses}` : '—'

  return (
    <div
      className="rounded-xl overflow-hidden flex-1"
      style={{ background: '#14141e', border: `1px solid #2a2a3e`, borderTop: `3px solid ${color}` }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: '#2a2a3e' }}>
        <div
          className="text-lg font-bold capitalize"
          style={{ color }}
        >
          {meta.fullName}
        </div>
        <div className="text-sm mt-0.5" style={{ color: '#8888a8' }}>
          {season.year} Season · {record}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {metrics.map(key => {
          const cmp = getCompare(key)
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#8888a8' }}>
                {METRIC_LABELS[key] || key}
              </span>
              <span
                className="text-sm font-semibold"
                style={{
                  color: cmp === 'better' ? '#10b981' : cmp === 'worse' ? '#8888a8' : '#e8e8f0',
                }}
              >
                {formatVal(key, season[key])}
                {cmp === 'better' && (
                  <span className="ml-1 text-xs" style={{ color: '#10b981' }}>▲</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
