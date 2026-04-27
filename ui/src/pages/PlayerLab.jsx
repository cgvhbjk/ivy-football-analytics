import { useMemo } from 'react'
import usePlayerStore from '../store/usePlayerStore.js'
import useInsightStore from '../store/useInsightStore.js'
import { rosterPlayers, SCHOOLS, SCHOOL_META, SCHOOL_COLORS } from '../data/mockData.js'
import { findSimilarPlayers, normalizePosition } from '../utils/similarityEngine.js'
import { generateTargetProfile } from '../utils/profileGenerator.js'
import { computeGapAnalysis, METRIC_META } from '../utils/gapAnalysis.js'
import { generateTrainingPlan } from '../utils/trainingPlanner.js'

// ── constants ────────────────────────────────────────────────────────────────

const YEARS = [2024, 2023]

const POS_GROUP_COLORS = {
  OL: '#6366f1', DL: '#E05555', LB: '#f59e0b', DB: '#10b981', SKILL: '#5B9BD5',
}

const PRIORITY_COLORS = { high: '#E05555', medium: '#f59e0b', low: '#10b981' }

// ── small shared pieces ──────────────────────────────────────────────────────

function SectionCard({ title, children, style = {} }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#14141e', border: '1px solid #2a2a3e', ...style }}>
      {title && (
        <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5a5a7a' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

function selectStyle(width = '100%') {
  return {
    background: '#1c1c2a', border: '1px solid #2a2a3e', color: '#e8e8f0',
    borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', width,
  }
}

function StatPill({ label, value, unit = '', highlight = false }) {
  return (
    <div className="rounded-lg px-3 py-2 text-center" style={{ background: '#1c1c2a' }}>
      <div className="text-xs mb-0.5" style={{ color: '#5a5a7a' }}>{label}</div>
      <div className="text-sm font-bold" style={{ color: highlight ? '#6366f1' : '#e8e8f0' }}>
        {value != null ? `${value}${unit}` : '—'}
      </div>
    </div>
  )
}

// ── gap bar ──────────────────────────────────────────────────────────────────

function GapBar({ gap }) {
  const { label, unit, current, target, pctGap, isDeficit, priority, lowerIsBetter } = gap
  const absPct = Math.abs(pctGap)
  const barColor = isDeficit ? PRIORITY_COLORS[priority] : '#10b981'

  // Display fill: 0 = at target, grows outward based on gap magnitude (capped at 100%)
  const fillPct = Math.min(absPct * 3, 100)
  const dirLabel = isDeficit
    ? (lowerIsBetter ? `+${Math.abs(gap.diff)}${unit} too slow/high` : `${gap.diff}${unit} below target`)
    : (lowerIsBetter ? `${Math.abs(gap.diff)}${unit} faster than target` : `+${gap.diff}${unit} above target`)

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: '#e8e8f0' }}>{label}</span>
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: '#8888a8' }}>{current}{unit}</span>
          <span style={{ color: '#5a5a7a' }}>→</span>
          <span style={{ color: '#6366f1' }}>{target}{unit}</span>
          <span
            className="px-1.5 py-0.5 rounded font-bold text-xs uppercase"
            style={{ background: `${barColor}22`, color: barColor, fontSize: 9, letterSpacing: '0.04em' }}
          >
            {isDeficit ? priority : '✓'}
          </span>
        </div>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#2a2a3e' }}>
        <div
          className="absolute top-0 h-full rounded-full transition-all"
          style={{ width: `${fillPct}%`, background: barColor, left: 0 }}
        />
      </div>
      <div className="text-xs mt-0.5" style={{ color: '#5a5a7a' }}>{dirLabel}</div>
    </div>
  )
}

// ── similar player card ──────────────────────────────────────────────────────

function SimilarPlayerCard({ player, rank }) {
  const simColor = player.similarity >= 75 ? '#10b981' : player.similarity >= 50 ? '#f59e0b' : '#E05555'
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: '#1c1c2a', border: '1px solid #2a2a3e' }}>
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <span className="text-xs font-bold" style={{ color: '#e8e8f0' }}>#{rank} {player.player}</span>
          <span className="ml-2 text-xs" style={{ color: '#5a5a7a' }}>{player.school} '{String(player.year).slice(2)}</span>
        </div>
        <span
          className="px-1.5 py-0.5 rounded text-xs font-bold"
          style={{ background: `${simColor}22`, color: simColor }}
        >
          {player.similarity}%
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 text-xs">
        {[
          { k: 'height',     v: player.height,     u: '"' },
          { k: 'weight',     v: player.weight,     u: 'lb' },
          { k: 'forty_time', v: player.forty_time, u: 's' },
          { k: 'bench_reps', v: player.bench_reps, u: '' },
        ].map(({ k, v, u }) => (
          <div key={k} className="text-center rounded py-1" style={{ background: '#14141e' }}>
            <div style={{ color: '#5a5a7a', fontSize: 9 }}>{METRIC_META[k]?.label.split(' ')[0]}</div>
            <div style={{ color: '#8888a8' }}>{v != null ? `${v}${u}` : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── training plan panel ──────────────────────────────────────────────────────

function TrainingPlanPanel({ plan }) {
  return (
    <div className="flex flex-col gap-3">
      {plan.focusAreas.map(area => (
        <div
          key={area.id}
          className="rounded-lg px-3 py-2.5"
          style={{ background: '#1c1c2a', borderLeft: `3px solid ${PRIORITY_COLORS[area.priority] ?? '#5a5a7a'}` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold" style={{ color: '#e8e8f0' }}>{area.area}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-bold uppercase"
              style={{ background: `${PRIORITY_COLORS[area.priority]}22`, color: PRIORITY_COLORS[area.priority], fontSize: 9 }}
            >
              {area.priority}
            </span>
          </div>
          <p className="text-xs mb-1.5 leading-relaxed" style={{ color: '#8888a8' }}>{area.desc}</p>
          <div className="flex gap-3 text-xs" style={{ color: '#5a5a7a' }}>
            <span>{area.hours}</span>
            <span>·</span>
            <span>{area.weeks}</span>
          </div>
        </div>
      ))}

      <div className="mt-1">
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#5a5a7a' }}>
          Weekly Structure
        </div>
        {plan.weeklyStructure.map(({ day, focus, details }) => (
          <div key={day} className="flex gap-2 mb-1.5">
            <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: '#6366f1' }}>{day}</span>
            <div>
              <div className="text-xs font-medium" style={{ color: '#e8e8f0' }}>{focus}</div>
              <div className="text-xs" style={{ color: '#5a5a7a' }}>{details}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── main page ────────────────────────────────────────────────────────────────

export default function PlayerLab() {
  const { selectedSchool, selectedYear, selectedPlayer,
          setSelectedSchool, setSelectedYear, setSelectedPlayer } = usePlayerStore()
  const { saveInsight } = useInsightStore()

  const schoolColor = SCHOOL_COLORS[selectedSchool] ?? '#6366f1'

  // All players for the selected school + year
  const schoolRoster = useMemo(
    () => rosterPlayers.filter(p => p.school === selectedSchool && p.year === selectedYear),
    [selectedSchool, selectedYear]
  )

  // Derived data — only computed when a player is selected
  const normPos      = selectedPlayer ? normalizePosition(selectedPlayer.position) : null
  const similarNFL   = useMemo(() => selectedPlayer ? findSimilarPlayers(selectedPlayer, 5) : [], [selectedPlayer])
  const targetProfile = useMemo(() => generateTargetProfile(similarNFL), [similarNFL])
  const gaps          = useMemo(() => computeGapAnalysis(selectedPlayer, targetProfile), [selectedPlayer, targetProfile])
  const plan          = useMemo(() => generateTrainingPlan(gaps), [gaps])

  const highGaps    = gaps.filter(g => g.isDeficit && g.priority === 'high')
  const medGaps     = gaps.filter(g => g.isDeficit && g.priority === 'medium')

  // Save a roster-level insight to the Insight Bank
  function handleSaveInsight() {
    if (!selectedPlayer || !targetProfile) return
    const weightGap = gaps.find(g => g.key === 'weight')
    if (!weightGap) return
    saveInsight({
      id:           `player-${selectedPlayer.name.replace(' ', '-')}-${Date.now()}`,
      title:        `${selectedPlayer.name} (${selectedPlayer.position}) vs NFL Target`,
      description:  `${selectedPlayer.name} is ${Math.abs(weightGap.diff).toFixed(0)} lbs ${weightGap.isDeficit ? 'below' : 'above'} the NFL ${normPos} prototype weight of ${targetProfile.weight} lbs.`,
      variable:     'weight',
      targetMetric: 'win_pct',
      correlation:  0,
      strengthScore: 0,
      confidence:   'LOW',
      sampleSize:   similarNFL.length,
      timeWindow:   String(selectedYear),
      threshold:    null,
      tags:         ['player-dev', 'NFL-target', selectedPlayer.position_group?.toLowerCase()],
      savedAt:      new Date().toISOString(),
    })
  }

  // Group roster by position group for the selector list
  const rosterByGroup = useMemo(() => {
    const groups = {}
    schoolRoster.forEach(p => {
      const g = p.position_group
      if (!groups[g]) groups[g] = []
      groups[g].push(p)
    })
    return groups
  }, [schoolRoster])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 52px)', color: '#e8e8f0' }}>

      {/* ── top bar ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 flex-wrap px-6 py-3 border-b flex-shrink-0"
        style={{ background: '#14141e', borderColor: '#2a2a3e' }}
      >
        <span className="text-base font-bold" style={{ color: '#e8e8f0' }}>Player Dev Lab</span>

        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: '#5a5a7a' }}>School</label>
          <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} style={selectStyle(160)}>
            {SCHOOLS.map(s => (
              <option key={s} value={s}>{SCHOOL_META[s]?.fullName}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: '#5a5a7a' }}>Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={selectStyle(90)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: '#5a5a7a' }}>Player</label>
          <select
            value={selectedPlayer?.name ?? ''}
            onChange={e => {
              const p = schoolRoster.find(r => r.name === e.target.value)
              setSelectedPlayer(p ?? null)
            }}
            style={selectStyle(210)}
          >
            <option value=''>— Select player —</option>
            {Object.entries(rosterByGroup).map(([grp, players]) => (
              <optgroup key={grp} label={grp}>
                {players.map(p => (
                  <option key={p.name} value={p.name}>{p.name} ({p.position})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {selectedPlayer && normPos && (
          <span
            className="px-2 py-1 rounded-md text-xs font-bold"
            style={{ background: `${schoolColor}22`, color: schoolColor }}
          >
            {normPos} profile
          </span>
        )}

        {selectedPlayer && (
          <button
            onClick={handleSaveInsight}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: '#6366f122', color: '#818cf8', border: '1px solid #6366f144' }}
          >
            Save to Databank
          </button>
        )}
      </div>

      {/* ── body ──────────────────────────────────────────────────────────── */}
      {!selectedPlayer ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: '#5a5a7a' }}>
          <div className="text-4xl">👤</div>
          <div className="text-sm">Select a school, year, and player to begin analysis.</div>
          <div className="text-xs" style={{ color: '#3a3a4e' }}>Player data available for 2023 and 2024 seasons.</div>
        </div>
      ) : (
        <div
          className="flex-1 overflow-hidden"
          style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 12, padding: '12px 16px' }}
        >

          {/* ── LEFT: player card + target summary ───────────────────────── */}
          <div className="overflow-y-auto min-h-0 flex flex-col gap-3">

            <SectionCard>
              {/* School + position badge */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ background: `${schoolColor}22`, color: schoolColor }}
                >
                  {SCHOOL_META[selectedSchool]?.abbr}
                </div>
                <div
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ background: `${POS_GROUP_COLORS[selectedPlayer.position_group] ?? '#6366f1'}22`,
                           color: POS_GROUP_COLORS[selectedPlayer.position_group] ?? '#6366f1' }}
                >
                  {selectedPlayer.position}
                </div>
                <div className="text-xs ml-auto" style={{ color: '#5a5a7a' }}>{selectedPlayer.year_class}</div>
              </div>

              <div className="text-lg font-bold mb-0.5" style={{ color: '#e8e8f0' }}>{selectedPlayer.name}</div>
              <div className="text-xs mb-3" style={{ color: '#5a5a7a' }}>{selectedPlayer.hometown} · {selectedYear}</div>

              <div className="grid grid-cols-2 gap-2">
                <StatPill label="Height" value={`${Math.floor(selectedPlayer.height_in / 12)}'${selectedPlayer.height_in % 12}"`} />
                <StatPill label="Weight" value={selectedPlayer.weight_lbs} unit=" lbs" />
                <StatPill label="40 Dash" value={selectedPlayer.forty_time} unit="s" />
                <StatPill label="Bench" value={selectedPlayer.bench_reps} unit=" reps" />
                <StatPill label="Vertical" value={selectedPlayer.vertical_jump} unit="″" />
                <StatPill label="Broad" value={selectedPlayer.broad_jump} unit="″" />
                <StatPill label="Shuttle" value={selectedPlayer.shuttle} unit="s" />
                <StatPill label="3-Cone" value={selectedPlayer.three_cone} unit="s" />
              </div>
            </SectionCard>

            {targetProfile && (
              <SectionCard title="NFL Target Profile">
                <div className="text-xs mb-2" style={{ color: '#8888a8' }}>
                  Averaged from {similarNFL.length} closest {normPos} comps
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatPill label="Height" value={`${Math.floor(targetProfile.height / 12)}'${Math.round(targetProfile.height % 12)}"`} highlight />
                  <StatPill label="Weight" value={targetProfile.weight} unit=" lbs" highlight />
                  <StatPill label="40 Dash" value={targetProfile.forty_time} unit="s" highlight />
                  <StatPill label="Bench" value={targetProfile.bench_reps} unit=" reps" highlight />
                  <StatPill label="Vertical" value={targetProfile.vertical_jump} unit="″" highlight />
                  <StatPill label="Broad" value={targetProfile.broad_jump} unit="″" highlight />
                  <StatPill label="Shuttle" value={targetProfile.shuttle} unit="s" highlight />
                  <StatPill label="3-Cone" value={targetProfile.three_cone} unit="s" highlight />
                </div>
                <div className="mt-3 text-xs" style={{ color: '#5a5a7a' }}>
                  Based on: {targetProfile.based_on.join(', ')}
                </div>
              </SectionCard>
            )}

            {/* Gap summary badges */}
            {gaps.length > 0 && (
              <SectionCard title="Gap Summary">
                <div className="flex flex-col gap-1.5">
                  {highGaps.length > 0 && (
                    <div className="rounded-lg px-2 py-1.5 text-xs" style={{ background: '#E0555518', border: '1px solid #E0555530', color: '#E05555' }}>
                      ⚠ {highGaps.length} high-priority gap{highGaps.length > 1 ? 's' : ''}: {highGaps.map(g => g.label).join(', ')}
                    </div>
                  )}
                  {medGaps.length > 0 && (
                    <div className="rounded-lg px-2 py-1.5 text-xs" style={{ background: '#f59e0b18', border: '1px solid #f59e0b30', color: '#f59e0b' }}>
                      · {medGaps.length} medium gap{medGaps.length > 1 ? 's' : ''}: {medGaps.map(g => g.label).join(', ')}
                    </div>
                  )}
                  {highGaps.length === 0 && medGaps.length === 0 && (
                    <div className="rounded-lg px-2 py-1.5 text-xs" style={{ background: '#10b98118', border: '1px solid #10b98130', color: '#10b981' }}>
                      ✓ Close to NFL prototype across all metrics
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
          </div>

          {/* ── CENTER: gap analysis + similar players ────────────────────── */}
          <div className="overflow-y-auto min-h-0 flex flex-col gap-3">

            <SectionCard title="Gap Analysis — Current vs NFL Target">
              {gaps.length === 0 ? (
                <div className="text-sm" style={{ color: '#5a5a7a' }}>No gap data available.</div>
              ) : (
                gaps.map(gap => <GapBar key={gap.key} gap={gap} />)
              )}
            </SectionCard>

            <SectionCard title={`Top ${similarNFL.length} Similar NFL Players (${normPos})`}>
              {similarNFL.length === 0 ? (
                <div className="text-sm" style={{ color: '#5a5a7a' }}>No NFL data for this position.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {similarNFL.map((p, i) => (
                    <SimilarPlayerCard key={p.player} player={p} rank={i + 1} />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── RIGHT: training plan ──────────────────────────────────────── */}
          <div className="overflow-y-auto min-h-0 flex flex-col gap-3">
            <SectionCard title="Development Plan">
              {plan ? (
                <TrainingPlanPanel plan={plan} />
              ) : (
                <div className="text-sm" style={{ color: '#5a5a7a' }}>Select a player to generate a plan.</div>
              )}
            </SectionCard>
          </div>

        </div>
      )}
    </div>
  )
}
