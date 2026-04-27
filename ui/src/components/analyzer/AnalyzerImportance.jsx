import { useMemo, useState } from 'react'
import useStore from '../../store/useStore.js'
import { teamSeasons, SCHOOL_META, SCHOOL_COLORS } from '../../data/mockData.js'

const METRICS = [
  { key: 'win_pct', label: 'Win %', lowerBetter: false, weight: 1.2 },
  { key: 'avg_margin', label: 'Avg Margin', lowerBetter: false, weight: 1.1 },
  { key: 'points_per_game', label: 'Points/Game', lowerBetter: false, weight: 1.0 },
  { key: 'points_allowed_per_game', label: 'Pts Allowed/Game', lowerBetter: true, weight: 1.0 },
  { key: 'ivy_win_pct', label: 'Ivy Win %', lowerBetter: false, weight: 0.9 },
  { key: 'turnovers_per_game', label: 'Turnovers/Game', lowerBetter: true, weight: 0.8 },
  { key: 'OL_avg_weight', label: 'OL Weight', lowerBetter: false, weight: 0.5 },
  { key: 'pass_tendency', label: 'Pass Tendency', lowerBetter: false, weight: 0.6 },
  { key: 'explosiveness', label: 'Explosiveness', lowerBetter: false, weight: 0.7 },
]

const QUESTION_META = {
  who_is_better: {
    title: 'Who Is Better?',
    subtitle: 'Factors driving performance difference',
  },
  what_changed: {
    title: 'What Changed Over Time?',
    subtitle: 'Metric deltas between selected teams across years',
  },
  what_drives: {
    title: 'What Drives Winning?',
    subtitle: 'Highest-impact metrics correlated with wins',
  },
}

function impactLabel(pct) {
  if (pct >= 0.65) return 'HIGH'
  if (pct >= 0.3) return 'MED'
  return 'LOW'
}

function impactColor(label) {
  return label === 'HIGH' ? '#10b981' : label === 'MED' ? '#f59e0b' : '#5a5a7a'
}

export default function AnalyzerImportance() {
  const {
    analyzerTeamA: teamA,
    analyzerTeamB: teamB,
    analyzerYear: year,
    analyzerQuestion: question,
    whatIfTurnovers,
    setWhatIfTurnovers,
  } = useStore()

  const [treeOpen, setTreeOpen] = useState(false)

  const colorA = SCHOOL_COLORS[teamA]
  const colorB = SCHOOL_COLORS[teamB]
  const metaA = SCHOOL_META[teamA]
  const metaB = SCHOOL_META[teamB]

  const seasonA = useMemo(() => teamSeasons.find(s => s.school === teamA && s.year === year), [teamA, year])
  const seasonB = useMemo(() => teamSeasons.find(s => s.school === teamB && s.year === year), [teamB, year])

  const items = useMemo(() => {
    if (!seasonA || !seasonB) return []
    return METRICS.map(m => {
      const valA = seasonA[m.key]
      const valB = seasonB[m.key]
      if (valA === null || valA === undefined || valB === null || valB === undefined) return null
      const rawDiff = valA - valB
      const diff = m.lowerBetter ? -rawDiff : rawDiff
      return { ...m, valA, valB, rawDiff, diff, absDiff: Math.abs(diff) }
    }).filter(Boolean).sort((a, b) => b.absDiff * b.weight - a.absDiff * a.weight)
  }, [seasonA, seasonB])

  const maxVal = items.length ? Math.max(...items.map(i => i.absDiff)) : 1

  // What-if calculation
  const baselineTO = seasonA?.turnovers_per_game ?? 1.5
  const baselineMargin = seasonB?.avg_margin ?? 0
  const whatIfGap = useMemo(() => {
    const toImpact = (whatIfTurnovers - baselineTO) * -2.1
    const newGap = (seasonA?.avg_margin ?? 0) + toImpact - (seasonB?.avg_margin ?? 0)
    return newGap
  }, [whatIfTurnovers, baselineTO, seasonA, seasonB])

  const meta = QUESTION_META[question] || QUESTION_META.who_is_better

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 h-full overflow-y-auto"
      style={{ background: '#1c1c2a', border: '1px solid #2a2a3e' }}
    >
      <div>
        <div className="text-sm font-bold uppercase tracking-widest" style={{ color: '#8888a8' }}>
          {meta.title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#5a5a7a' }}>{meta.subtitle}</div>
      </div>

      {/* Importance bars */}
      <div className="space-y-3">
        {items.map(item => {
          const barPct = (item.absDiff / maxVal) * 100
          const label = impactLabel(barPct / 100)
          const lColor = impactColor(label)
          const aLeads = item.diff > 0
          const barColor = aLeads ? colorA : colorB

          const formatVal = (key, val) => {
            if (val === null || val === undefined) return '—'
            if (key === 'win_pct' || key === 'ivy_win_pct' || key === 'pass_tendency') return `${(val * 100).toFixed(1)}%`
            if (key.includes('weight')) return `${val} lbs`
            return typeof val === 'number' ? val.toFixed(1) : val
          }

          return (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: '#e8e8f0' }}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#8888a8' }}>
                    {metaA?.abbr} {formatVal(item.key, item.valA)} vs {metaB?.abbr} {formatVal(item.key, item.valB)}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-bold"
                    style={{ background: `${lColor}22`, color: lColor, fontSize: 9 }}
                  >
                    {label}
                  </span>
                </div>
              </div>
              <div
                className="h-2.5 rounded-full overflow-hidden relative"
                style={{ background: '#2a2a3e' }}
              >
                <div
                  className="absolute top-0 h-full rounded-full transition-all"
                  style={{
                    left: aLeads ? 0 : 'auto',
                    right: aLeads ? 'auto' : 0,
                    width: `${barPct}%`,
                    background: barColor,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-0.5" style={{ color: '#5a5a7a' }}>
                <span style={{ color: aLeads ? colorA : '#5a5a7a' }}>
                  {aLeads ? `← ${metaA?.abbr} leads` : ''}
                </span>
                <span style={{ color: !aLeads ? colorB : '#5a5a7a' }}>
                  {!aLeads ? `${metaB?.abbr} leads →` : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Expandable tree */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid #2a2a3e' }}
      >
        <button
          onClick={() => setTreeOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-colors"
          style={{ background: '#14141e', color: '#8888a8' }}
        >
          <span>Performance Breakdown Tree</span>
          <span style={{ color: '#6366f1' }}>{treeOpen ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        {treeOpen && (
          <div className="px-4 py-4" style={{ background: '#0d0d14' }}>
            <div className="flex flex-col items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-lg font-bold" style={{ background: '#6366f122', color: '#818cf8', border: '1px solid #6366f144' }}>
                Avg Margin
              </div>
              <div style={{ color: '#2a2a3e', fontSize: 18 }}>↑</div>
              <div className="flex gap-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="px-2 py-1 rounded font-medium" style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}>
                    Points Scored
                  </div>
                  <div style={{ color: '#2a2a3e', fontSize: 14 }}>↑</div>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 rounded text-center" style={{ background: '#1c1c2a', color: '#8888a8', border: '1px solid #2a2a3e', fontSize: 9 }}>Offense</div>
                    <div className="px-2 py-1 rounded text-center" style={{ background: '#1c1c2a', color: '#8888a8', border: '1px solid #2a2a3e', fontSize: 9 }}>Tempo</div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="px-2 py-1 rounded font-medium" style={{ background: '#E0555522', color: '#E05555', border: '1px solid #E0555544' }}>
                    Pts Allowed
                  </div>
                  <div style={{ color: '#2a2a3e', fontSize: 14 }}>↑</div>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 rounded text-center" style={{ background: '#1c1c2a', color: '#8888a8', border: '1px solid #2a2a3e', fontSize: 9 }}>Defense</div>
                    <div className="px-2 py-1 rounded text-center" style={{ background: '#1c1c2a', color: '#8888a8', border: '1px solid #2a2a3e', fontSize: 9 }}>Turnovers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* What-If Simulation */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
      >
        <div className="text-xs font-bold mb-1 uppercase tracking-widest" style={{ color: '#8888a8' }}>
          What-If Simulation
        </div>
        <div className="text-xs mb-3" style={{ color: '#5a5a7a' }}>
          Turnovers per game for {metaA?.fullName}
        </div>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={whatIfTurnovers}
            onChange={e => setWhatIfTurnovers(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#6366f1' }}
          />
          <span
            className="text-sm font-bold w-10 text-center"
            style={{ color: '#6366f1' }}
          >
            {whatIfTurnovers.toFixed(1)}
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#8888a8' }}>
          If <span style={{ color: colorA }}>{metaA?.fullName}</span> had{' '}
          <strong style={{ color: '#e8e8f0' }}>{whatIfTurnovers.toFixed(1)}</strong> turnovers/game,
          the margin gap would{' '}
          <span style={{ color: whatIfGap > (seasonA?.avg_margin ?? 0) - (seasonB?.avg_margin ?? 0) ? '#10b981' : '#E05555', fontWeight: 600 }}>
            {whatIfGap > 0 ? 'favor ' + metaA?.abbr : 'favor ' + metaB?.abbr}
          </span>
          {' '}by <strong style={{ color: '#e8e8f0' }}>{Math.abs(whatIfGap).toFixed(1)}</strong> pts.
        </p>
      </div>
    </div>
  )
}
