import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar,
} from 'recharts'
import useStore from '../../store/useStore.js'
import StatCard from '../shared/StatCard.jsx'
import InsightAlert from '../shared/InsightAlert.jsx'
import { teamSeasons, SCHOOL_COLORS, SCHOOL_META } from '../../data/mockData.js'

const CHART_STYLE = {
  grid: { strokeDasharray: '3 3', stroke: '#2a2a3e' },
  xAxis: { stroke: '#5a5a7a', tick: { fill: '#8888a8', fontSize: 11 } },
  yAxis: { stroke: '#5a5a7a', tick: { fill: '#8888a8', fontSize: 11 } },
  tooltip: { contentStyle: { backgroundColor: '#1c1c2a', border: '1px solid #2a2a3e', color: '#e8e8f0' } },
  legend: { wrapperStyle: { color: '#8888a8' } },
}

function UnavailableOverlay({ message }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-xl z-10"
      style={{ background: '#0d0d14cc', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="px-4 py-3 rounded-lg text-sm text-center"
        style={{ background: '#f59e0b18', border: '1px solid #f59e0b44', color: '#f59e0b' }}
      >
        ⚠ {message}
      </div>
    </div>
  )
}

export default function ComparisonPanel() {
  const { teamA, teamB, yearRange, activeMetrics, labView, setLabView } = useStore()
  const [loYear, hiYear] = yearRange

  const colorA = SCHOOL_COLORS[teamA]
  const colorB = SCHOOL_COLORS[teamB]

  const filteredA = useMemo(() =>
    teamSeasons.filter(s => s.school === teamA && s.year >= loYear && s.year <= hiYear),
    [teamA, loYear, hiYear]
  )
  const filteredB = useMemo(() =>
    teamSeasons.filter(s => s.school === teamB && s.year >= loYear && s.year <= hiYear),
    [teamB, loYear, hiYear]
  )

  const latestA = filteredA[filteredA.length - 1] || null
  const latestB = filteredB[filteredB.length - 1] || null

  const advancedUnavailable = loYear < 2022

  // Trend data: aligned years for both teams
  const trendData = useMemo(() => {
    const years = [...new Set([...filteredA.map(s => s.year), ...filteredB.map(s => s.year)])].sort()
    return years.map(y => {
      const a = filteredA.find(s => s.year === y)
      const b = filteredB.find(s => s.year === y)
      return {
        year: y,
        [`${teamA}_win`]: a ? parseFloat((a.win_pct * 100).toFixed(1)) : null,
        [`${teamB}_win`]: b ? parseFloat((b.win_pct * 100).toFixed(1)) : null,
        [`${teamA}_ppg`]: a ? a.points_per_game : null,
        [`${teamB}_ppg`]: b ? b.points_per_game : null,
        [`${teamA}_pag`]: a ? a.points_allowed_per_game : null,
        [`${teamB}_pag`]: b ? b.points_allowed_per_game : null,
      }
    })
  }, [filteredA, filteredB, teamA, teamB])

  // Style radar data
  const radarData = useMemo(() => {
    const metricsR = ['pass_tendency', 'tempo', 'spread_factor', 'explosiveness']
    const labels = { pass_tendency: 'Pass', tempo: 'Tempo', spread_factor: 'Spread', explosiveness: 'Explosion' }
    const recent2024A = teamSeasons.find(s => s.school === teamA && s.year === 2024)
    const recent2024B = teamSeasons.find(s => s.school === teamB && s.year === 2024)
    return metricsR.map(m => ({
      metric: labels[m],
      [teamA]: recent2024A ? parseFloat(((recent2024A[m] || 0) * 100).toFixed(1)) : 0,
      [teamB]: recent2024B ? parseFloat(((recent2024B[m] || 0) * 100).toFixed(1)) : 0,
    }))
  }, [teamA, teamB])

  // Weight bar data
  const weightData = useMemo(() => {
    const groups = ['OL', 'DL', 'LB', 'DB', 'SKILL']
    const recentA = teamSeasons.find(s => s.school === teamA && s.year === Math.min(hiYear, 2024))
    const recentB = teamSeasons.find(s => s.school === teamB && s.year === Math.min(hiYear, 2024))
    return groups.map(g => ({
      group: g,
      [teamA]: recentA ? recentA[`${g}_avg_weight`] : 0,
      [teamB]: recentB ? recentB[`${g}_avg_weight`] : 0,
    }))
  }, [teamA, teamB, hiYear])

  const tabs = ['snapshot', 'trends', 'style']
  const tabLabels = { snapshot: 'Snapshot', trends: 'Trends', style: 'Style & Identity' }

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Tab bar */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
      >
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setLabView(t)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: labView === t ? '#6366f1' : 'transparent',
              color: labView === t ? '#ffffff' : '#8888a8',
            }}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Snapshot */}
      {labView === 'snapshot' && (
        <div className="flex gap-3">
          {latestA && latestB ? (
            <>
              <div className="flex-1 min-w-0">
                <StatCard school={teamA} season={latestA} metrics={activeMetrics} compareValue={latestB} />
                <InsightAlert school={teamA} year={latestA.year} />
              </div>
              <div className="flex-1 min-w-0">
                <StatCard school={teamB} season={latestB} metrics={activeMetrics} compareValue={latestA} />
                <InsightAlert school={teamB} year={latestB.year} />
              </div>
            </>
          ) : (
            <div className="flex-1 text-center py-12" style={{ color: '#5a5a7a' }}>
              No data for selected range.
            </div>
          )}
        </div>
      )}

      {/* Trends */}
      {labView === 'trends' && (
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
          >
            <div className="text-sm font-semibold mb-3" style={{ color: '#8888a8' }}>Win % Over Time</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid {...CHART_STYLE.grid} />
                <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
                <YAxis domain={['auto', 'auto']} unit="%" {...CHART_STYLE.yAxis} />
                <Tooltip {...CHART_STYLE.tooltip} formatter={(v) => `${v}%`} />
                <Legend {...CHART_STYLE.legend} />
                <Line
                  type="monotone"
                  dataKey={`${teamA}_win`}
                  name={SCHOOL_META[teamA]?.abbr}
                  stroke={colorA}
                  strokeWidth={2}
                  dot={{ fill: colorA, r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey={`${teamB}_win`}
                  name={SCHOOL_META[teamB]?.abbr}
                  stroke={colorB}
                  strokeWidth={2}
                  dot={{ fill: colorB, r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
          >
            <div className="text-sm font-semibold mb-3" style={{ color: '#8888a8' }}>Points Scored / Allowed</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid {...CHART_STYLE.grid} />
                <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
                <YAxis domain={['auto', 'auto']} {...CHART_STYLE.yAxis} />
                <Tooltip {...CHART_STYLE.tooltip} />
                <Legend {...CHART_STYLE.legend} />
                <Line
                  type="monotone"
                  dataKey={`${teamA}_ppg`}
                  name={`${SCHOOL_META[teamA]?.abbr} Scored`}
                  stroke={colorA}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey={`${teamA}_pag`}
                  name={`${SCHOOL_META[teamA]?.abbr} Allowed`}
                  stroke={colorA}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey={`${teamB}_ppg`}
                  name={`${SCHOOL_META[teamB]?.abbr} Scored`}
                  stroke={colorB}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey={`${teamB}_pag`}
                  name={`${SCHOOL_META[teamB]?.abbr} Allowed`}
                  stroke={colorB}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Style & Identity */}
      {labView === 'style' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Left: pass/rush + scheme */}
          <div className="flex flex-col gap-4">
            {[teamA, teamB].map(school => {
              const recent = teamSeasons.find(s => s.school === school && s.year === 2024)
              const color = SCHOOL_COLORS[school]
              const meta = SCHOOL_META[school]
              const passRate = recent?.pass_tendency ?? null
              return (
                <div
                  key={school}
                  className="rounded-xl p-4 relative overflow-hidden"
                  style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
                >
                  {advancedUnavailable && (
                    <UnavailableOverlay message="Style data requires 2022–2024 range" />
                  )}
                  <div className="text-xs font-bold mb-2" style={{ color }}>
                    {meta?.fullName}
                  </div>
                  <div className="text-xs mb-1" style={{ color: '#5a5a7a' }}>Pass vs Rush tendency</div>
                  {passRate !== null && (
                    <div className="relative h-3 rounded-full overflow-hidden mb-2" style={{ background: '#2a2a3e' }}>
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{ width: `${passRate * 100}%`, background: color }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-xs mb-3" style={{ color: '#8888a8' }}>
                    <span>Rush {passRate !== null ? `${((1 - passRate) * 100).toFixed(0)}%` : '—'}</span>
                    <span>Pass {passRate !== null ? `${(passRate * 100).toFixed(0)}%` : '—'}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {recent?.off_scheme && (
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ background: `${color}22`, color }}
                      >
                        OFF: {recent.off_scheme}
                      </span>
                    )}
                    {recent?.def_scheme && (
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ background: '#6366f122', color: '#818cf8' }}
                      >
                        DEF: {recent.def_scheme}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: radar + weight bar */}
          <div className="flex flex-col gap-4">
            <div
              className="rounded-xl p-4 relative overflow-hidden"
              style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
            >
              {advancedUnavailable && (
                <UnavailableOverlay message="Style data requires 2022–2024 range" />
              )}
              <div className="text-xs font-semibold mb-2" style={{ color: '#8888a8' }}>Style Profile Radar</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2a2a3e" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#8888a8', fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey={teamA} stroke={colorA} fill={colorA} fillOpacity={0.2} name={SCHOOL_META[teamA]?.abbr} />
                  <Radar dataKey={teamB} stroke={colorB} fill={colorB} fillOpacity={0.2} name={SCHOOL_META[teamB]?.abbr} />
                  <Legend wrapperStyle={{ color: '#8888a8', fontSize: 11 }} />
                  <Tooltip {...CHART_STYLE.tooltip} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-xl p-4"
              style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
            >
              <div className="text-xs font-semibold mb-2" style={{ color: '#8888a8' }}>Roster Avg Weight (lbs)</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weightData} barSize={10}>
                  <CartesianGrid {...CHART_STYLE.grid} />
                  <XAxis dataKey="group" {...CHART_STYLE.xAxis} />
                  <YAxis domain={['auto', 'auto']} {...CHART_STYLE.yAxis} />
                  <Tooltip {...CHART_STYLE.tooltip} />
                  <Legend {...CHART_STYLE.legend} />
                  <Bar dataKey={teamA} fill={colorA} name={SCHOOL_META[teamA]?.abbr} radius={[2, 2, 0, 0]} />
                  <Bar dataKey={teamB} fill={colorB} name={SCHOOL_META[teamB]?.abbr} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
