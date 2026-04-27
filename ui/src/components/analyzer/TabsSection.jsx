import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import useStore from '../../store/useStore.js'
import { teamSeasons, gameResults, rosterPlayers, SCHOOL_META, SCHOOL_COLORS } from '../../data/mockData.js'

const CHART_STYLE = {
  grid: { strokeDasharray: '3 3', stroke: '#2a2a3e' },
  xAxis: { stroke: '#5a5a7a', tick: { fill: '#8888a8', fontSize: 11 } },
  yAxis: { stroke: '#5a5a7a', tick: { fill: '#8888a8', fontSize: 11 } },
  tooltip: { contentStyle: { backgroundColor: '#1c1c2a', border: '1px solid #2a2a3e', color: '#e8e8f0' } },
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
      style={{
        background: active ? '#6366f1' : 'transparent',
        color: active ? '#ffffff' : '#8888a8',
      }}
    >
      {children}
    </button>
  )
}

function UnavailableNotice({ message }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
      style={{ background: '#f59e0b18', border: '1px solid #f59e0b44', color: '#f59e0b' }}
    >
      <span>⚠</span>
      <span>{message}</span>
    </div>
  )
}

export default function TabsSection() {
  const {
    analyzerTeamA: teamA,
    analyzerTeamB: teamB,
    analyzerYear: year,
    analyzerTab,
    setAnalyzerTab,
  } = useStore()

  const colorA = SCHOOL_COLORS[teamA]
  const colorB = SCHOOL_COLORS[teamB]
  const metaA = SCHOOL_META[teamA]
  const metaB = SCHOOL_META[teamB]

  // Results tab data
  const recentGamesA = useMemo(() =>
    gameResults.filter(g =>
      g.school === teamA &&
      (g.year === year || g.year === year - 1) &&
      g.opponent !== '__season_summary__'
    ).slice(0, 20),
    [teamA, year]
  )
  const recentGamesB = useMemo(() =>
    gameResults.filter(g =>
      g.school === teamB &&
      (g.year === year || g.year === year - 1) &&
      g.opponent !== '__season_summary__'
    ).slice(0, 20),
    [teamB, year]
  )

  // Roster tab data
  const seasonA = useMemo(() => teamSeasons.find(s => s.school === teamA && s.year === year), [teamA, year])
  const seasonB = useMemo(() => teamSeasons.find(s => s.school === teamB && s.year === year), [teamB, year])

  const weightChartData = useMemo(() => {
    const groups = ['OL', 'DL', 'LB', 'DB', 'SKILL']
    return groups.map(g => ({
      group: g,
      [metaA?.abbr]: seasonA ? seasonA[`${g}_avg_weight`] : 0,
      [metaB?.abbr]: seasonB ? seasonB[`${g}_avg_weight`] : 0,
    }))
  }, [seasonA, seasonB, metaA, metaB])

  // Style tab data
  const radarData = useMemo(() => {
    const entries = [
      { metric: 'Pass', key: 'pass_tendency' },
      { metric: 'Tempo', key: 'tempo' },
      { metric: 'Spread', key: 'spread_factor' },
      { metric: 'Explosion', key: 'explosiveness' },
    ]
    return entries.map(e => ({
      metric: e.metric,
      [metaA?.abbr]: seasonA && seasonA[e.key] !== null ? parseFloat((seasonA[e.key] * 100).toFixed(1)) : 0,
      [metaB?.abbr]: seasonB && seasonB[e.key] !== null ? parseFloat((seasonB[e.key] * 100).toFixed(1)) : 0,
    }))
  }, [seasonA, seasonB, metaA, metaB])

  // Schedule/H2H tab
  const headToHead = useMemo(() => {
    return gameResults.filter(g =>
      g.school === teamA &&
      g.opponent === (teamB.charAt(0).toUpperCase() + teamB.slice(1)) &&
      g.conference_game === true
    ).sort((a, b) => b.year - a.year)
  }, [teamA, teamB])

  const tabs = [
    { key: 'results', label: 'Results' },
    { key: 'roster', label: 'Roster' },
    { key: 'style', label: 'Style' },
    { key: 'schedule', label: 'Schedule' },
  ]

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 py-2 border-b"
        style={{ borderColor: '#2a2a3e', background: '#1c1c2a' }}
      >
        {tabs.map(t => (
          <TabButton key={t.key} active={analyzerTab === t.key} onClick={() => setAnalyzerTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      <div className="p-4 min-h-[260px]">
        {/* Results Tab */}
        {analyzerTab === 'results' && (
          <div className="grid grid-cols-2 gap-4">
            {[{ team: teamA, games: recentGamesA, color: colorA, meta: metaA }, { team: teamB, games: recentGamesB, color: colorB, meta: metaB }].map(({ team, games, color, meta }) => (
              <div key={team}>
                <div className="text-xs font-bold mb-2" style={{ color }}>
                  {meta?.fullName} — Recent Games
                </div>
                {games.length === 0 ? (
                  <div className="text-xs" style={{ color: '#5a5a7a' }}>No detailed game log for this range.</div>
                ) : (
                  <div className="overflow-auto max-h-56">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ color: '#5a5a7a', borderBottom: '1px solid #2a2a3e' }}>
                          <th className="text-left py-1 pr-2">Date</th>
                          <th className="text-left py-1 pr-2">Opponent</th>
                          <th className="text-center py-1 pr-2">H/A</th>
                          <th className="text-center py-1 pr-2">Score</th>
                          <th className="text-center py-1 pr-2">W/L</th>
                          <th className="text-right py-1">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {games.map((g, i) => {
                          const margin = g.points - g.opp_points
                          return (
                            <tr
                              key={i}
                              style={{ borderBottom: '1px solid #1c1c2a', color: '#e8e8f0' }}
                            >
                              <td className="py-1 pr-2" style={{ color: '#5a5a7a' }}>{g.date || '—'}</td>
                              <td className="py-1 pr-2 capitalize">{g.opponent}</td>
                              <td className="py-1 pr-2 text-center uppercase" style={{ color: '#8888a8' }}>
                                {g.home_away ? g.home_away[0].toUpperCase() : '—'}
                              </td>
                              <td className="py-1 pr-2 text-center">
                                {g.points}–{g.opp_points}
                              </td>
                              <td className="py-1 pr-2 text-center font-bold"
                                style={{ color: g.result === 'W' ? '#10b981' : '#E05555' }}>
                                {g.result}
                              </td>
                              <td className="py-1 text-right font-semibold"
                                style={{ color: margin >= 0 ? '#10b981' : '#E05555' }}>
                                {margin >= 0 ? '+' : ''}{margin}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Roster Tab */}
        {analyzerTab === 'roster' && (
          year < 2014 ? (
            <UnavailableNotice message="Roster data available for 2014–2024 only" />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-xs font-semibold" style={{ color: '#8888a8' }}>
                Position Group Avg Weight (lbs) — {year}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weightChartData} barSize={14}>
                  <CartesianGrid {...CHART_STYLE.grid} />
                  <XAxis dataKey="group" {...CHART_STYLE.xAxis} />
                  <YAxis domain={[160, 340]} {...CHART_STYLE.yAxis} />
                  <Tooltip {...CHART_STYLE.tooltip} />
                  <Legend wrapperStyle={{ color: '#8888a8' }} />
                  <Bar dataKey={metaA?.abbr} fill={colorA} radius={[2, 2, 0, 0]} />
                  <Bar dataKey={metaB?.abbr} fill={colorB} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {[{ team: teamA, season: seasonA, color: colorA, meta: metaA }, { team: teamB, season: seasonB, color: colorB, meta: metaB }].map(({ team, season, color, meta }) => (
                  <div key={team} className="rounded-lg p-3" style={{ background: '#1c1c2a', border: '1px solid #2a2a3e' }}>
                    <div className="font-bold mb-2" style={{ color }}>{meta?.abbr}</div>
                    <div className="flex justify-between mb-1" style={{ color: '#8888a8' }}>
                      <span>Roster Depth</span>
                      <span style={{ color: '#e8e8f0' }}>{season?.roster_depth ?? '—'}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: '#8888a8' }}>
                      <span>Upperclassman Ratio</span>
                      <span style={{ color: '#e8e8f0' }}>
                        {season?.upperclassman_ratio != null
                          ? `${(season.upperclassman_ratio * 100).toFixed(0)}%`
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Style Tab */}
        {analyzerTab === 'style' && (
          year < 2022 ? (
            <UnavailableNotice message="Style & scheme data available for 2022–2024 only" />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#8888a8' }}>Style Radar</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#2a2a3e" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#8888a8', fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey={metaA?.abbr} stroke={colorA} fill={colorA} fillOpacity={0.25} />
                      <Radar dataKey={metaB?.abbr} stroke={colorB} fill={colorB} fillOpacity={0.25} />
                      <Legend wrapperStyle={{ color: '#8888a8', fontSize: 11 }} />
                      <Tooltip {...CHART_STYLE.tooltip} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3">
                  {[{ team: teamA, season: seasonA, color: colorA, meta: metaA }, { team: teamB, season: seasonB, color: colorB, meta: metaB }].map(({ team, season, color, meta }) => (
                    <div key={team} className="rounded-lg p-3" style={{ background: '#1c1c2a', border: '1px solid #2a2a3e' }}>
                      <div className="text-xs font-bold mb-2" style={{ color }}>{meta?.abbr}</div>
                      {season?.off_scheme && (
                        <div className="mb-1.5">
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ background: `${color}22`, color }}
                          >
                            OFF: {season.off_scheme}
                          </span>
                        </div>
                      )}
                      {season?.def_scheme && (
                        <div>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ background: '#6366f122', color: '#818cf8' }}
                          >
                            DEF: {season.def_scheme}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* Schedule / H2H Tab */}
        {analyzerTab === 'schedule' && (
          <div>
            <div className="text-xs font-semibold mb-3" style={{ color: '#8888a8' }}>
              Head-to-Head History: {metaA?.fullName} vs {metaB?.fullName}
            </div>
            {headToHead.length === 0 ? (
              <div className="text-xs" style={{ color: '#5a5a7a' }}>
                No detailed head-to-head game records found for these teams in the selected dataset.
              </div>
            ) : (
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: '#5a5a7a', borderBottom: '1px solid #2a2a3e' }}>
                      <th className="text-left py-1 pr-3">Year</th>
                      <th className="text-left py-1 pr-3">Site</th>
                      <th className="text-center py-1 pr-3">{metaA?.abbr} Score</th>
                      <th className="text-center py-1 pr-3">{metaB?.abbr} Score</th>
                      <th className="text-left py-1">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headToHead.map((g, i) => {
                      const aWon = g.result === 'W'
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #1c1c2a', color: '#e8e8f0' }}>
                          <td className="py-1 pr-3 font-semibold">{g.year}</td>
                          <td className="py-1 pr-3 capitalize" style={{ color: '#8888a8' }}>
                            {g.home_away === 'home' ? `@ ${metaA?.abbr}` : `@ ${metaB?.abbr}`}
                          </td>
                          <td className="py-1 pr-3 text-center font-bold" style={{ color: aWon ? colorA : '#8888a8' }}>
                            {g.points}
                          </td>
                          <td className="py-1 pr-3 text-center font-bold" style={{ color: !aWon ? colorB : '#8888a8' }}>
                            {g.opp_points}
                          </td>
                          <td className="py-1 font-semibold" style={{ color: aWon ? colorA : colorB }}>
                            {aWon ? metaA?.abbr : metaB?.abbr}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
