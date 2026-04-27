import { useMemo } from 'react'
import useStore from '../../store/useStore.js'
import { teamSeasons, SCHOOL_META, SCHOOL_COLORS } from '../../data/mockData.js'

const METRIC_CONFIG = [
  { key: 'win_pct', label: 'Win %', direction: 'higher' },
  { key: 'avg_margin', label: 'Avg Margin', direction: 'higher' },
  { key: 'points_per_game', label: 'Points/Game', direction: 'higher' },
  { key: 'points_allowed_per_game', label: 'Pts Allowed/Game', direction: 'lower' },
  { key: 'ivy_win_pct', label: 'Ivy Win %', direction: 'higher' },
  { key: 'turnovers_per_game', label: 'Turnovers/Game', direction: 'lower' },
  { key: 'OL_avg_weight', label: 'OL Weight', direction: 'higher' },
  { key: 'DL_avg_weight', label: 'DL Weight', direction: 'higher' },
  { key: 'pass_tendency', label: 'Pass Tendency', direction: 'neutral' },
  { key: 'tempo', label: 'Tempo', direction: 'neutral' },
  { key: 'explosiveness', label: 'Explosiveness', direction: 'higher' },
]

function impactLabel(pct) {
  if (pct >= 0.6) return 'HIGH'
  if (pct >= 0.3) return 'MED'
  return 'LOW'
}

function impactColor(label) {
  if (label === 'HIGH') return '#10b981'
  if (label === 'MED') return '#f59e0b'
  return '#5a5a7a'
}

function formatDiff(key, val) {
  if (key === 'win_pct' || key === 'ivy_win_pct') return `${(val * 100).toFixed(1)}%`
  if (key.includes('weight')) return `${Math.abs(val).toFixed(0)} lbs`
  if (key === 'avg_margin') return Math.abs(val).toFixed(1)
  return Math.abs(val).toFixed(2)
}

export default function ImportancePanel() {
  const { teamA, teamB, yearRange, activeMetrics } = useStore()
  const [loYear, hiYear] = yearRange

  const metaA = SCHOOL_META[teamA]
  const metaB = SCHOOL_META[teamB]
  const colorA = SCHOOL_COLORS[teamA]
  const colorB = SCHOOL_COLORS[teamB]

  const items = useMemo(() => {
    const seasonsA = teamSeasons.filter(s => s.school === teamA && s.year >= loYear && s.year <= hiYear)
    const seasonsB = teamSeasons.filter(s => s.school === teamB && s.year >= loYear && s.year <= hiYear)

    const avg = (arr, key) => {
      const vals = arr.map(s => s[key]).filter(v => v !== null && v !== undefined)
      if (!vals.length) return null
      return vals.reduce((a, b) => a + b, 0) / vals.length
    }

    return METRIC_CONFIG
      .filter(m => activeMetrics.includes(m.key))
      .map(m => {
        const avgA = avg(seasonsA, m.key)
        const avgB = avg(seasonsB, m.key)
        if (avgA === null || avgB === null) return null
        const diff = avgA - avgB
        return { ...m, avgA, avgB, diff, absDiff: Math.abs(diff) }
      })
      .filter(Boolean)
      .sort((a, b) => b.absDiff - a.absDiff)
  }, [teamA, teamB, loYear, hiYear, activeMetrics])

  const maxDiff = items.length ? Math.max(...items.map(i => i.absDiff)) : 1

  const topMetric = items[0]
  const colorALeads = topMetric && topMetric.diff > 0
  const leaderName = colorALeads ? metaA?.fullName : metaB?.fullName
  const trailerName = colorALeads ? metaB?.fullName : metaA?.fullName

  return (
    <div
      className="flex flex-col gap-4 overflow-y-auto h-full pb-4"
      style={{ color: '#e8e8f0' }}
    >
      <div
        className="rounded-xl p-4"
        style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
      >
        <div className="text-sm font-bold mb-1 uppercase tracking-widest" style={{ color: '#8888a8' }}>
          What Matters Most
        </div>
        <div className="text-xs mb-4" style={{ color: '#5a5a7a' }}>
          Ranked by absolute difference between teams
        </div>

        {items.length === 0 && (
          <div className="text-xs text-center py-6" style={{ color: '#5a5a7a' }}>
            Select metrics to see importance ranking
          </div>
        )}

        <div className="space-y-3">
          {items.map((item, idx) => {
            const barPct = (item.absDiff / maxDiff) * 100
            const label = impactLabel(item.absDiff / maxDiff)
            const labelColor = impactColor(label)
            const aWins = item.diff > 0
            const barColor = aWins ? colorA : colorB
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-bold w-4 text-center"
                      style={{ color: '#5a5a7a' }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium" style={{ color: '#e8e8f0' }}>
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#8888a8' }}>
                      Δ {formatDiff(item.key, item.diff)}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-bold"
                      style={{ background: `${labelColor}22`, color: labelColor, fontSize: 9 }}
                    >
                      {label}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#2a2a3e' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barPct}%`, background: barColor }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-0.5" style={{ color: '#5a5a7a' }}>
                  <span>{metaA?.abbr}: {item.avgA !== null ? item.avgA.toFixed(2) : '—'}</span>
                  <span>{metaB?.abbr}: {item.avgB !== null ? item.avgB.toFixed(2) : '—'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tree visualization */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
      >
        <div className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: '#8888a8' }}>
          Performance Tree
        </div>
        <div className="flex flex-col items-center gap-1 text-xs">
          <div
            className="px-3 py-1.5 rounded-lg font-bold"
            style={{ background: '#6366f122', color: '#818cf8', border: '1px solid #6366f144' }}
          >
            Winning
          </div>
          <div style={{ color: '#2a2a3e', fontSize: 20, lineHeight: 1 }}>↑</div>
          <div
            className="px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}
          >
            Avg Margin
          </div>
          <div className="flex items-start gap-8 mt-1">
            <div className="flex flex-col items-center gap-1">
              <div style={{ color: '#2a2a3e', fontSize: 16 }}>↑</div>
              <div
                className="px-2 py-1 rounded font-medium text-center"
                style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}
              >
                Points Scored
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div style={{ color: '#2a2a3e', fontSize: 16 }}>↑</div>
              <div
                className="px-2 py-1 rounded font-medium text-center"
                style={{ background: '#E0555522', color: '#E05555', border: '1px solid #E0555544' }}
              >
                Pts Allowed
                <span className="block" style={{ fontSize: 9, opacity: 0.7 }}>(lower = better)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-generated insight */}
      {topMetric && (
        <div
          className="rounded-xl p-4"
          style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
        >
          <div className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#8888a8' }}>
            Auto Insight
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#8888a8' }}>
            Based on the selected years ({loYear}–{hiYear}),{' '}
            <span style={{ color: leaderName === metaA?.fullName ? colorA : colorB }}>
              {leaderName}
            </span>{' '}
            outperforms{' '}
            <span style={{ color: leaderName === metaA?.fullName ? colorB : colorA }}>
              {trailerName}
            </span>{' '}
            primarily due to <strong style={{ color: '#e8e8f0' }}>{topMetric.label}</strong>.
            The largest gap is{' '}
            <strong style={{ color: '#10b981' }}>{formatDiff(topMetric.key, topMetric.diff)}</strong>{' '}
            in {topMetric.label}.
            {items.length > 1 && (
              <> The second-largest factor is <strong style={{ color: '#e8e8f0' }}>{items[1].label}</strong>.</>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
