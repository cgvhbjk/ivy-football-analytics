import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Scatter, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import useInsightStore from '../store/useInsightStore.js'
import { teamSeasons, SCHOOLS, SCHOOL_META, SCHOOL_COLORS } from '../data/mockData.js'
import {
  computeRelationship,
  detectThreshold,
  detectInteractions,
  timeWindowComparison,
  scoreInsight,
  generateInsightText,
} from '../utils/insightEngine.js'
import DualRangeSlider from '../components/shared/DualRangeSlider.jsx'

// ── label maps ────────────────────────────────────────────────────────────────

const VARIABLE_GROUPS = [
  {
    label: 'OL Physical',
    options: [
      { key: 'OL_avg_weight', label: 'OL Avg Weight' },
      { key: 'OT_avg_weight', label: 'Tackles (OT)' },
      { key: 'OG_avg_weight', label: 'Guards (OG)' },
      { key: 'C_avg_weight',  label: 'Centers (C)' },
    ],
  },
  {
    label: 'DL Physical',
    options: [
      { key: 'DL_avg_weight',       label: 'DL Avg Weight' },
      { key: 'EDGE_avg_weight',     label: 'Edge Rushers (EDGE)' },
      { key: 'INTERIOR_avg_weight', label: 'Interior DL' },
    ],
  },
  {
    label: 'Other Physical',
    options: [
      { key: 'LB_avg_weight',    label: 'LB Avg Weight' },
      { key: 'DB_avg_weight',    label: 'DB Avg Weight' },
      { key: 'SKILL_avg_weight', label: 'Skill Avg Weight' },
    ],
  },
  {
    label: 'Roster Composition',
    options: [
      { key: 'roster_depth',        label: 'Roster Depth' },
      { key: 'upperclassman_ratio', label: 'Upperclassman Ratio' },
    ],
  },
  {
    label: 'Style / Advanced (2022+)',
    options: [
      { key: 'pass_tendency',      label: 'Pass Tendency' },
      { key: 'tempo',              label: 'Tempo' },
      { key: 'spread_factor',      label: 'Spread Factor' },
      { key: 'explosiveness',      label: 'Explosiveness' },
      { key: 'turnovers_per_game', label: 'Turnovers / Game' },
      { key: 'yards_per_play',     label: 'Yards / Play' },
    ],
  },
]

const VARIABLE_LABEL = Object.fromEntries(
  VARIABLE_GROUPS.flatMap(g => g.options.map(o => [o.key, o.label]))
)

const OUTCOME_GROUPS = [
  {
    label: 'Overall',
    options: [
      { key: 'win_pct',    label: 'Win %' },
      { key: 'ivy_win_pct', label: 'Ivy Win %' },
      { key: 'avg_margin', label: 'Avg Scoring Margin' },
    ],
  },
  {
    label: 'Offense',
    options: [
      { key: 'points_per_game', label: 'Points / Game' },
      { key: 'total_ypg',      label: 'Total Yards / Game' },
      { key: 'rushing_ypg',    label: 'Rushing Yards / Game' },
      { key: 'passing_ypg',    label: 'Passing Yards / Game' },
      { key: 'first_downs_pg', label: 'First Downs / Game' },
    ],
  },
  {
    label: 'Defense',
    options: [
      { key: 'points_allowed_per_game',  label: 'Points Allowed / Game' },
      { key: 'total_ypg_allowed',        label: 'Total Yards Allowed / Game' },
      { key: 'rushing_ypg_allowed',      label: 'Rush Yards Allowed / Game' },
      { key: 'passing_ypg_allowed',      label: 'Pass Yards Allowed / Game' },
      { key: 'first_downs_allowed_pg',   label: 'First Downs Allowed / Game' },
    ],
  },
]
const OUTCOME_OPTIONS = OUTCOME_GROUPS.flatMap(g => g.options)
const OUTCOME_LABEL = Object.fromEntries(OUTCOME_OPTIONS.map(o => [o.key, o.label]))

const OFF_SCHEMES = [
  'all',
  'Pro-Style / Power Run',
  'Spread Pass',
  'Air Raid / Spread RPO',
  'Spread Run / Option',
  'West Coast / Pro Pass',
]

// ── small reusable pieces ─────────────────────────────────────────────────────

function SectionCard({ title, children, className = '' }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
    >
      {title && (
        <div
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: '#5a5a7a' }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

function ConfidenceBadge({ confidence }) {
  const color =
    confidence === 'HIGH'   ? '#10b981' :
    confidence === 'MEDIUM' ? '#f59e0b' : '#5a5a7a'
  return (
    <span
      className="px-1.5 py-0.5 rounded text-xs font-bold uppercase"
      style={{ background: `${color}22`, color, fontSize: 9, letterSpacing: '0.05em' }}
    >
      {confidence}
    </span>
  )
}

function RBar({ r, maxAbs = 1 }) {
  if (r === null) return <span style={{ color: '#5a5a7a', fontSize: 11 }}>N/A</span>
  const pct  = (Math.abs(r) / maxAbs) * 100
  const color = r > 0 ? '#6366f1' : '#E05555'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full" style={{ background: '#2a2a3e' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ color: '#8888a8', fontSize: 11, width: 42, textAlign: 'right' }}>
        r={r.toFixed(2)}
      </span>
    </div>
  )
}

function selectStyle() {
  return {
    background: '#1c1c2a',
    border: '1px solid #2a2a3e',
    color: '#e8e8f0',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }
}

function inferTags(xKey, yKey) {
  const t = []
  if (xKey.includes('OL') || xKey.includes('OT') || xKey.includes('OG') || xKey.includes('C_')) t.push('OL')
  if (xKey.includes('DL') || xKey.includes('EDGE') || xKey.includes('INTERIOR')) t.push('DL')
  if (xKey.includes('weight')) t.push('roster')
  if (xKey.includes('pass') || xKey.includes('tempo') || xKey.includes('spread')) t.push('style')
  if (yKey.includes('win')) t.push('winning')
  if (yKey.includes('margin')) t.push('margin')
  if (yKey.includes('allowed') || yKey.includes('pag')) t.push('defense')
  return [...new Set(t)]
}

// ── custom scatter tooltip ────────────────────────────────────────────────────

function ScatterTooltip({ active, payload, xLabel, yLabel }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ background: '#1c1c2a', border: '1px solid #2a2a3e', color: '#e8e8f0' }}
    >
      <div className="font-bold mb-1" style={{ color: SCHOOL_COLORS[d.school] }}>
        {SCHOOL_META[d.school]?.fullName} {d.year}
      </div>
      <div style={{ color: '#8888a8' }}>{xLabel}: <span style={{ color: '#e8e8f0' }}>{d.x?.toFixed(1)}</span></div>
      <div style={{ color: '#8888a8' }}>{yLabel}: <span style={{ color: '#e8e8f0' }}>{d.y?.toFixed(3)}</span></div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function InsightsLab() {
  const {
    insights,
    saveInsight, removeInsight, resetInsights,
    insightOutcome, setInsightOutcome,
    insightVariable, setInsightVariable,
    insightSchemeFilter, setInsightSchemeFilter,
    insightYearRange, setInsightYearRange,
  } = useInsightStore()

  const [saveStatus, setSaveStatus] = useState(null) // null | 'saved' | 'invalid'
  const [saveReason, setSaveReason] = useState('')
  const [expandedInsight, setExpandedInsight] = useState(null)

  const xKey = insightVariable
  const yKey = insightOutcome
  const xLabel = VARIABLE_LABEL[xKey] ?? xKey
  const yLabel = OUTCOME_LABEL[yKey] ?? yKey

  // ── computed data ──────────────────────────────────────────────────────────

  const relationship = useMemo(() =>
    computeRelationship(teamSeasons, xKey, yKey, {
      schemeFilter: insightSchemeFilter,
      yearRange: insightYearRange,
    }),
    [xKey, yKey, insightSchemeFilter, insightYearRange]
  )

  const validation = useMemo(
    () => scoreInsight(relationship.correlation, relationship.n),
    [relationship]
  )

  const threshold = useMemo(
    () => detectThreshold(teamSeasons, xKey, yKey, insightYearRange),
    [xKey, yKey, insightYearRange]
  )

  const timeWindows = useMemo(
    () => timeWindowComparison(teamSeasons, xKey, yKey),
    [xKey, yKey]
  )

  const interactions = useMemo(
    () => detectInteractions(teamSeasons, xKey, yKey),
    [xKey, yKey]
  )

  const summaryText = useMemo(
    () => generateInsightText(xLabel, yLabel, relationship.correlation, relationship.n, threshold),
    [xLabel, yLabel, relationship, threshold]
  )

  // Group scatter points by school for Recharts multi-series
  const pointsBySchool = useMemo(() => {
    const map = {}
    relationship.points.forEach(p => {
      if (!map[p.school]) map[p.school] = []
      map[p.school].push(p)
    })
    return map
  }, [relationship.points])

  const regressionLine = useMemo(() => {
    const pts = relationship.points
    if (pts.length < 2) return []
    const n = pts.length
    const meanX = pts.reduce((s, p) => s + p.x, 0) / n
    const meanY = pts.reduce((s, p) => s + p.y, 0) / n
    let num = 0, den = 0
    for (const p of pts) {
      num += (p.x - meanX) * (p.y - meanY)
      den += (p.x - meanX) ** 2
    }
    const slope = den === 0 ? 0 : num / den
    const intercept = meanY - slope * meanX
    const xs = pts.map(p => p.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept },
    ]
  }, [relationship.points])

  // ── save handler ───────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!validation.valid) {
      setSaveStatus('invalid')
      setSaveReason(validation.reason)
      return
    }
    const newId = `${xKey}_${yKey}_${Date.now()}`
    saveInsight({
      id:           newId,
      title:        `${xLabel} → ${yLabel}`,
      description:  `Computed from ${relationship.n} team-seasons (${insightYearRange[0]}–${insightYearRange[1]}).`,
      variable:     xKey,
      targetMetric: yKey,
      correlation:  relationship.correlation,
      strengthScore: validation.strength,
      confidence:   validation.confidence,
      sampleSize:   relationship.n,
      timeWindow:   `${insightYearRange[0]}–${insightYearRange[1]}`,
      threshold,
      tags:         inferTags(xKey, yKey),
      savedAt:      new Date().toISOString(),
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 2200)
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 52px)', color: '#e8e8f0' }}>

      {/* Top bar */}
      <div
        className="flex items-center gap-4 flex-wrap px-6 py-3 border-b flex-shrink-0"
        style={{ background: '#14141e', borderColor: '#2a2a3e' }}
      >
        <span className="text-base font-bold" style={{ color: '#e8e8f0' }}>Insights Lab</span>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs" style={{ color: '#5a5a7a' }}>Outcome</label>
          <select value={yKey} onChange={e => setInsightOutcome(e.target.value)} style={{ ...selectStyle(), width: 210 }}>
            {OUTCOME_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs" style={{ color: '#5a5a7a' }}>Variable</label>
          <select value={xKey} onChange={e => setInsightVariable(e.target.value)} style={{ ...selectStyle(), width: 190 }}>
            {VARIABLE_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: '#5a5a7a' }}>Scheme</label>
          <select value={insightSchemeFilter} onChange={e => setInsightSchemeFilter(e.target.value)} style={{ ...selectStyle(), width: 180 }}>
            {OFF_SCHEMES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Schemes' : s}</option>)}
          </select>
        </div>

        <div style={{ width: 180, flexShrink: 0 }}>
          <DualRangeSlider min={2014} max={2024} value={insightYearRange} onChange={setInsightYearRange} />
        </div>
      </div>

      {/* 3-column body */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr 300px',
          gap: 12,
          padding: '12px 16px',
        }}
      >
        {/* ── LEFT: controls + save ────────────────────────────────────── */}
        <div className="overflow-y-auto min-h-0 flex flex-col gap-3">
          <SectionCard title="Current Analysis">
            <div className="space-y-2 text-xs">
              <div style={{ color: '#8888a8' }}>
                <span style={{ color: '#5a5a7a' }}>Predictor: </span>
                <span style={{ color: '#e8e8f0' }}>{xLabel}</span>
              </div>
              <div style={{ color: '#8888a8' }}>
                <span style={{ color: '#5a5a7a' }}>Outcome: </span>
                <span style={{ color: '#e8e8f0' }}>{yLabel}</span>
              </div>
              <div style={{ color: '#8888a8' }}>
                <span style={{ color: '#5a5a7a' }}>Scheme: </span>
                <span style={{ color: '#e8e8f0' }}>
                  {insightSchemeFilter === 'all' ? 'All' : insightSchemeFilter}
                </span>
              </div>
              <div style={{ color: '#8888a8' }}>
                <span style={{ color: '#5a5a7a' }}>Years: </span>
                <span style={{ color: '#e8e8f0' }}>{insightYearRange[0]}–{insightYearRange[1]}</span>
              </div>
              <div style={{ color: '#8888a8' }}>
                <span style={{ color: '#5a5a7a' }}>n: </span>
                <span style={{ color: '#e8e8f0' }}>{relationship.n} team-seasons</span>
              </div>
            </div>
          </SectionCard>

          {/* Validation status */}
          <SectionCard title="Signal Strength">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: '#8888a8' }}>r = {relationship.correlation.toFixed(3)}</span>
              <ConfidenceBadge confidence={validation.confidence} />
            </div>
            <div className="h-2 rounded-full" style={{ background: '#2a2a3e' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.abs(relationship.correlation) * 100}%`,
                  background: validation.valid ? '#10b981' : '#5a5a7a',
                }}
              />
            </div>
            {!validation.valid && (
              <p className="text-xs mt-2" style={{ color: '#E05555' }}>{validation.reason}</p>
            )}
          </SectionCard>

          {/* Save button */}
          <SectionCard title="Save to Databank">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saved'}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: saveStatus === 'saved' ? '#10b98133' :
                            !validation.valid     ? '#2a2a3e'    : '#6366f1',
                color: saveStatus === 'saved' ? '#10b981' :
                       !validation.valid      ? '#5a5a7a'  : '#fff',
                cursor: !validation.valid ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {saveStatus === 'saved' ? '✓ Saved to databank' : 'Save Insight'}
            </button>
            {saveStatus === 'invalid' && (
              <p className="text-xs mt-2" style={{ color: '#E05555' }}>{saveReason}</p>
            )}
            {!validation.valid && saveStatus !== 'invalid' && (
              <p className="text-xs mt-2 text-center" style={{ color: '#5a5a7a' }}>
                Insight must have |r| ≥ 0.15 and n ≥ 8
              </p>
            )}
          </SectionCard>

          {/* Data notice */}
          {(xKey.includes('OT') || xKey.includes('OG') || xKey.includes('C_') ||
            xKey.includes('EDGE') || xKey.includes('INTERIOR')) && (
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{ background: '#f59e0b0e', border: '1px solid #f59e0b30', color: '#c8a84b' }}
            >
              ⚡ Subgroup weights computed from player biodata — available for 2023–2024 only. Earlier years show null.
            </div>
          )}
        </div>

        {/* ── CENTER: charts ────────────────────────────────────────────── */}
        <div className="overflow-y-auto min-h-0 flex flex-col gap-3">

          {/* Scatter chart */}
          <SectionCard title={`${xLabel} vs ${yLabel}`}>
            <div className="flex items-center gap-3 mb-2 text-xs" style={{ color: '#8888a8' }}>
              <span>r = <strong style={{ color: relationship.correlation > 0 ? '#6366f1' : '#E05555' }}>{relationship.correlation.toFixed(3)}</strong></span>
              <span>n = {relationship.n}</span>
              <ConfidenceBadge confidence={validation.confidence} />
            </div>

            {relationship.points.length < 4 ? (
              <div className="flex items-center justify-center h-52 text-sm" style={{ color: '#5a5a7a' }}>
                Not enough data for the selected filters
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    type="number" dataKey="x" name={xLabel}
                    domain={['auto', 'auto']}
                    stroke="#5a5a7a" tick={{ fill: '#8888a8', fontSize: 10 }}
                    label={{ value: xLabel, position: 'insideBottom', offset: -18, fill: '#5a5a7a', fontSize: 10 }}
                  />
                  <YAxis
                    type="number" dataKey="y" name={yLabel}
                    domain={['auto', 'auto']}
                    stroke="#5a5a7a" tick={{ fill: '#8888a8', fontSize: 10 }}
                    width={40}
                  />
                  <Tooltip
                    content={<ScatterTooltip xLabel={xLabel} yLabel={yLabel} />}
                    cursor={{ strokeDasharray: '3 3', stroke: '#2a2a3e' }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#8888a8', fontSize: 10, paddingTop: 8 }}
                    formatter={(value) => SCHOOL_META[value]?.abbr ?? value}
                  />
                  {SCHOOLS.map(school =>
                    pointsBySchool[school]?.length ? (
                      <Scatter
                        key={school}
                        name={school}
                        data={pointsBySchool[school]}
                        fill={SCHOOL_COLORS[school]}
                        opacity={0.85}
                      />
                    ) : null
                  )}
                  <Line
                    data={regressionLine}
                    dataKey="y"
                    dot={false}
                    activeDot={false}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    strokeOpacity={0.4}
                    legendType="none"
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* 3 sub-panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

            {/* Time-window stability */}
            <SectionCard title="Time-Window Stability">
              <div className="flex flex-col gap-3">
                {timeWindows.map(w => (
                  <div key={w.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#8888a8' }}>{w.label}</span>
                      <span style={{ color: '#5a5a7a' }}>n={w.n}</span>
                    </div>
                    <RBar r={w.r} />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Scheme interactions */}
            <SectionCard title="Scheme Interactions">
              {interactions.filter(i => i.r !== null).length === 0 ? (
                <p className="text-xs" style={{ color: '#5a5a7a' }}>
                  Requires scheme data (2022+ only)
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {interactions.filter(i => i.r !== null).slice(0, 4).map(int => (
                    <div key={int.scheme}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: '#8888a8', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {int.scheme}
                        </span>
                        <span style={{ color: '#5a5a7a' }}>n={int.n}</span>
                      </div>
                      <RBar r={int.r} />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Threshold discovery */}
            <SectionCard title="Threshold Discovery">
              {!threshold ? (
                <p className="text-xs" style={{ color: '#5a5a7a' }}>Needs ≥ 8 data points</p>
              ) : (
                <div className="flex flex-col gap-2 text-xs">
                  <div>
                    <span style={{ color: '#5a5a7a' }}>Split point: </span>
                    <span style={{ color: '#e8e8f0', fontWeight: 700 }}>{threshold.threshold}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded-lg p-2 text-center" style={{ background: '#1c1c2a' }}>
                      <div style={{ color: '#5a5a7a' }}>Below</div>
                      <div style={{ color: '#E05555', fontWeight: 700 }}>{threshold.belowMean.toFixed(3)}</div>
                      <div style={{ color: '#5a5a7a', fontSize: 9 }}>n={threshold.belowN}</div>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: '#1c1c2a' }}>
                      <div style={{ color: '#5a5a7a' }}>Above</div>
                      <div style={{ color: '#10b981', fontWeight: 700 }}>{threshold.aboveMean.toFixed(3)}</div>
                      <div style={{ color: '#5a5a7a', fontSize: 9 }}>n={threshold.aboveN}</div>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#5a5a7a' }}>Effect: </span>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>Δ {threshold.effect.toFixed(3)}</span>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Plain-English summary */}
          <SectionCard title="Plain-English Summary">
            <p className="text-sm leading-relaxed" style={{ color: '#8888a8' }}>{summaryText}</p>
          </SectionCard>
        </div>

        {/* ── RIGHT: saved insights ─────────────────────────────────────── */}
        <div className="overflow-y-auto min-h-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#5a5a7a' }}>
              Databank
              <span
                className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold"
                style={{ background: '#6366f122', color: '#818cf8' }}
              >
                {insights.length}
              </span>
            </div>
            <button
              onClick={resetInsights}
              className="text-xs px-2 py-1 rounded"
              style={{ background: '#2a2a3e', color: '#5a5a7a', border: 'none', cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>

          {insights.length === 0 && (
            <div className="text-xs text-center py-8" style={{ color: '#5a5a7a' }}>
              No insights saved yet. Compute a relationship and click Save.
            </div>
          )}

          {insights.map(ins => (
            <div
              key={ins.id}
              className="rounded-xl p-4"
              style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-sm font-semibold leading-snug" style={{ color: '#e8e8f0' }}>
                  {ins.title}
                </div>
                <button
                  onClick={() => removeInsight(ins.id)}
                  style={{ color: '#5a5a7a', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <ConfidenceBadge confidence={ins.confidence} />
                <span className="text-xs" style={{ color: '#5a5a7a' }}>
                  r={ins.correlation.toFixed(2)} · n={ins.sampleSize}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                <div className="rounded px-2 py-1.5" style={{ background: '#1c1c2a' }}>
                  <div style={{ color: '#5a5a7a' }}>Variable</div>
                  <div style={{ color: '#8888a8' }}>{VARIABLE_LABEL[ins.variable] ?? ins.variable}</div>
                </div>
                <div className="rounded px-2 py-1.5" style={{ background: '#1c1c2a' }}>
                  <div style={{ color: '#5a5a7a' }}>Outcome</div>
                  <div style={{ color: '#8888a8' }}>{OUTCOME_LABEL[ins.targetMetric] ?? ins.targetMetric}</div>
                </div>
              </div>

              {/* Threshold */}
              {ins.threshold && (
                <div
                  className="rounded px-2 py-1.5 text-xs mb-2"
                  style={{ background: '#1c1c2a' }}
                >
                  <span style={{ color: '#5a5a7a' }}>Threshold: </span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>{ins.threshold.threshold}</span>
                  <span style={{ color: '#5a5a7a' }}> · Δ {ins.threshold.effect.toFixed(3)}</span>
                </div>
              )}

              {/* Expandable description */}
              <button
                onClick={() => setExpandedInsight(expandedInsight === ins.id ? null : ins.id)}
                className="text-xs w-full text-left"
                style={{ color: '#5a5a7a', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {expandedInsight === ins.id ? '▲ Hide' : '▼ Details'}
              </button>
              {expandedInsight === ins.id && (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: '#5a5a7a' }}>
                  {ins.description}
                  {ins.threshold && (
                    <> Teams above {ins.threshold.threshold} avg {ins.threshold.aboveMean.toFixed(3)} vs {ins.threshold.belowMean.toFixed(3)} below.</>
                  )}
                </p>
              )}

              {/* Tags */}
              {ins.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {ins.tags.map(t => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{ background: '#2a2a3e', color: '#5a5a7a' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
