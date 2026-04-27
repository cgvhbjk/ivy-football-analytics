import { useMemo } from 'react'
import useStore from '../../store/useStore.js'
import InsightAlert from '../shared/InsightAlert.jsx'
import { teamSeasons, SCHOOL_META, SCHOOL_COLORS } from '../../data/mockData.js'

function TeamCard({ school, season }) {
  const meta = SCHOOL_META[school]
  const color = SCHOOL_COLORS[school]
  if (!season) return (
    <div
      className="flex-1 rounded-xl p-5 flex flex-col items-center justify-center"
      style={{ background: '#14141e', border: '1px solid #2a2a3e', minHeight: 180 }}
    >
      <span style={{ color: '#5a5a7a' }} className="text-sm">No data</span>
    </div>
  )
  return (
    <div
      className="flex-1 rounded-xl p-5 flex flex-col items-center gap-3"
      style={{ background: '#14141e', border: `1px solid #2a2a3e`, borderTop: `3px solid ${color}` }}
    >
      <div
        className="rounded-full flex items-center justify-center font-bold text-xl"
        style={{ width: 56, height: 56, background: color, color: '#fff' }}
      >
        {meta?.abbr}
      </div>
      <div className="text-center">
        <div className="font-bold text-base" style={{ color }}>{meta?.fullName}</div>
        <div className="text-sm mt-0.5" style={{ color: '#8888a8' }}>
          {season.wins}–{season.losses} ({(season.win_pct * 100).toFixed(1)}%)
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg p-2 text-center" style={{ background: '#1c1c2a' }}>
          <div style={{ color: '#5a5a7a' }}>PPG</div>
          <div className="font-bold mt-0.5" style={{ color: '#e8e8f0' }}>{season.points_per_game}</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: '#1c1c2a' }}>
          <div style={{ color: '#5a5a7a' }}>PAG</div>
          <div className="font-bold mt-0.5" style={{ color: '#e8e8f0' }}>{season.points_allowed_per_game}</div>
        </div>
        <div className="rounded-lg p-2 text-center col-span-2" style={{ background: '#1c1c2a' }}>
          <div style={{ color: '#5a5a7a' }}>Avg Margin</div>
          <div
            className="font-bold mt-0.5"
            style={{ color: season.avg_margin >= 0 ? '#10b981' : '#E05555' }}
          >
            {season.avg_margin >= 0 ? '+' : ''}{season.avg_margin}
          </div>
        </div>
      </div>
    </div>
  )
}

function HorizontalBar({ label, valA, valB, colorA, colorB, abbrA, abbrB, lowerIsBetter }) {
  const maxVal = Math.max(valA, valB, 1)
  const aWins = lowerIsBetter ? valA < valB : valA > valB
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: '#5a5a7a' }}>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs w-6 text-right font-semibold" style={{ color: colorA }}>{valA}</span>
        <div className="flex-1 h-3 rounded-full overflow-hidden relative" style={{ background: '#2a2a3e' }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ width: `${(valA / maxVal) * 100}%`, background: colorA, opacity: aWins ? 1 : 0.5 }}
          />
        </div>
        <div className="flex-1 h-3 rounded-full overflow-hidden relative" style={{ background: '#2a2a3e' }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ width: `${(valB / maxVal) * 100}%`, background: colorB, opacity: !aWins ? 1 : 0.5 }}
          />
        </div>
        <span className="text-xs w-6 font-semibold" style={{ color: colorB }}>{valB}</span>
      </div>
      <div className="flex justify-between text-xs mt-0.5 px-8" style={{ color: '#5a5a7a' }}>
        <span>{abbrA}</span>
        <span>{abbrB}</span>
      </div>
    </div>
  )
}

export default function MatchupSummary() {
  const { analyzerTeamA: teamA, analyzerTeamB: teamB, analyzerYear: year } = useStore()

  const seasonA = useMemo(() =>
    teamSeasons.find(s => s.school === teamA && s.year === year),
    [teamA, year]
  )
  const seasonB = useMemo(() =>
    teamSeasons.find(s => s.school === teamB && s.year === year),
    [teamB, year]
  )

  const colorA = SCHOOL_COLORS[teamA]
  const colorB = SCHOOL_COLORS[teamB]
  const metaA = SCHOOL_META[teamA]
  const metaB = SCHOOL_META[teamB]

  const marginDiff = useMemo(() => {
    if (!seasonA || !seasonB) return null
    return parseFloat((seasonA.avg_margin - seasonB.avg_margin).toFixed(1))
  }, [seasonA, seasonB])

  const biggestAdvantage = useMemo(() => {
    if (!seasonA || !seasonB) return null
    const metrics = [
      { label: 'scoring margin', valA: seasonA.avg_margin, valB: seasonB.avg_margin },
      { label: 'PPG', valA: seasonA.points_per_game, valB: seasonB.points_per_game },
      { label: 'win rate', valA: seasonA.win_pct, valB: seasonB.win_pct },
    ]
    return metrics.sort((a, b) => Math.abs(b.valA - b.valB) - Math.abs(a.valA - a.valB))[0]
  }, [seasonA, seasonB])

  const summaryText = useMemo(() => {
    if (!seasonA || !seasonB) return ''
    const aName = metaA?.fullName
    const bName = metaB?.fullName
    const aWin = seasonA.win_pct > seasonB.win_pct
    const better = aWin ? aName : bName
    const worse = aWin ? bName : aName
    const diff = Math.abs(seasonA.avg_margin - seasonB.avg_margin).toFixed(1)
    return `In ${year}, ${better} was the stronger team, outperforming ${worse} by ${diff} points in average scoring margin. ${aWin ? aName : bName} posted a ${(Math.max(seasonA.win_pct, seasonB.win_pct) * 100).toFixed(0)}% win rate versus ${(Math.min(seasonA.win_pct, seasonB.win_pct) * 100).toFixed(0)}% for ${aWin ? bName : aName}. ${seasonA.avg_margin > 0 ? aName : bName} showed the edge in point differential.`
  }, [seasonA, seasonB, year, metaA, metaB])

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 h-full"
      style={{ background: '#1c1c2a', border: '1px solid #2a2a3e' }}
    >
      <div className="text-sm font-bold uppercase tracking-widest" style={{ color: '#8888a8' }}>
        Matchup Summary — {year}
      </div>

      {/* Team cards */}
      <div className="flex gap-3">
        <TeamCard school={teamA} season={seasonA} />

        {/* VS badge + biggest advantage */}
        <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
          <div
            className="text-sm font-black rounded-full w-10 h-10 flex items-center justify-center"
            style={{ background: '#2a2a3e', color: '#5a5a7a' }}
          >
            vs
          </div>
          {biggestAdvantage && (
            <div
              className="rounded-lg px-2 py-1 text-xs font-semibold text-center"
              style={{
                background: marginDiff > 0 ? `${colorA}22` : `${colorB}22`,
                color: marginDiff > 0 ? colorA : colorB,
                border: `1px solid ${marginDiff > 0 ? colorA : colorB}44`,
                maxWidth: 80,
              }}
            >
              {marginDiff > 0 ? '+' : ''}{biggestAdvantage.valA > biggestAdvantage.valB
                ? (biggestAdvantage.valA - biggestAdvantage.valB).toFixed(1)
                : (biggestAdvantage.valB - biggestAdvantage.valA).toFixed(1)}{' '}
              {biggestAdvantage.label} adv
            </div>
          )}
        </div>

        <TeamCard school={teamB} season={seasonB} />
      </div>

      {/* Narrative */}
      {summaryText && (
        <p className="text-xs leading-relaxed" style={{ color: '#8888a8' }}>
          {summaryText}
        </p>
      )}

      {/* Contextual insight alerts for both teams */}
      {seasonA && <InsightAlert school={teamA} year={year} />}
      {seasonB && <InsightAlert school={teamB} year={year} />}

      {/* Comparison bars */}
      {seasonA && seasonB && (
        <div>
          <div className="text-xs font-semibold mb-3" style={{ color: '#5a5a7a' }}>Key Stat Comparison</div>
          <HorizontalBar
            label="Points/Game"
            valA={seasonA.points_per_game}
            valB={seasonB.points_per_game}
            colorA={colorA} colorB={colorB}
            abbrA={metaA?.abbr} abbrB={metaB?.abbr}
            lowerIsBetter={false}
          />
          <HorizontalBar
            label="Pts Allowed/Game"
            valA={seasonA.points_allowed_per_game}
            valB={seasonB.points_allowed_per_game}
            colorA={colorA} colorB={colorB}
            abbrA={metaA?.abbr} abbrB={metaB?.abbr}
            lowerIsBetter={true}
          />
          <HorizontalBar
            label="Win %"
            valA={parseFloat((seasonA.win_pct * 100).toFixed(1))}
            valB={parseFloat((seasonB.win_pct * 100).toFixed(1))}
            colorA={colorA} colorB={colorB}
            abbrA={metaA?.abbr} abbrB={metaB?.abbr}
            lowerIsBetter={false}
          />
        </div>
      )}
    </div>
  )
}
