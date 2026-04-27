import useStore from '../../store/useStore.js'

const METRIC_OPTIONS = [
  { key: 'win_pct', label: 'Win %', group: 'core' },
  { key: 'avg_margin', label: 'Avg Margin', group: 'core' },
  { key: 'points_per_game', label: 'Points/Game', group: 'core' },
  { key: 'points_allowed_per_game', label: 'Points Allowed', group: 'core' },
  { key: 'ivy_win_pct', label: 'Ivy Win %', group: 'core' },
  { key: 'OL_avg_weight', label: 'OL Avg Weight', group: 'roster' },
  { key: 'DL_avg_weight', label: 'DL Avg Weight', group: 'roster' },
  { key: 'LB_avg_weight', label: 'LB Avg Weight', group: 'roster' },
  { key: 'DB_avg_weight', label: 'DB Avg Weight', group: 'roster' },
  { key: 'SKILL_avg_weight', label: 'Skill Avg Weight', group: 'roster' },
  { key: 'turnovers_per_game', label: 'Turnovers/Game', group: 'advanced' },
  { key: 'pass_tendency', label: 'Pass Tendency', group: 'advanced' },
  { key: 'tempo', label: 'Tempo', group: 'advanced' },
  { key: 'spread_factor', label: 'Spread Factor', group: 'advanced' },
  { key: 'explosiveness', label: 'Explosiveness', group: 'advanced' },
]

const POSITIONS = ['OL', 'DL', 'LB', 'DB', 'SKILL']
const YEAR_CLASSES = ['FR', 'SO', 'JR', 'SR']

export default function ControlsPanel() {
  const {
    activeMetrics, setActiveMetrics,
    positionFilter, setPositionFilter,
    classYearFilter, setClassYearFilter,
    yearRange,
  } = useStore()

  const advancedDisabled = yearRange[0] < 2022

  function toggleMetric(key) {
    if (activeMetrics.includes(key)) {
      setActiveMetrics(activeMetrics.filter(m => m !== key))
    } else {
      setActiveMetrics([...activeMetrics, key])
    }
  }

  function togglePosition(pos) {
    if (positionFilter.includes(pos)) {
      if (positionFilter.length === 1) return
      setPositionFilter(positionFilter.filter(p => p !== pos))
    } else {
      setPositionFilter([...positionFilter, pos])
    }
  }

  function toggleClass(cls) {
    if (classYearFilter.includes(cls)) {
      if (classYearFilter.length === 1) return
      setClassYearFilter(classYearFilter.filter(c => c !== cls))
    } else {
      setClassYearFilter([...classYearFilter, cls])
    }
  }

  const coreMetrics = METRIC_OPTIONS.filter(m => m.group === 'core')
  const rosterMetrics = METRIC_OPTIONS.filter(m => m.group === 'roster')
  const advancedMetrics = METRIC_OPTIONS.filter(m => m.group === 'advanced')

  return (
    <div
      className="flex flex-col gap-4 overflow-y-auto h-full pb-4"
      style={{ color: '#e8e8f0' }}
    >
      {/* Metrics Section */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
      >
        <div className="text-sm font-bold mb-3 uppercase tracking-widest" style={{ color: '#8888a8' }}>
          Metrics
        </div>

        <div className="text-xs font-semibold mb-2" style={{ color: '#5a5a7a' }}>Core Stats</div>
        <div className="space-y-1.5 mb-4">
          {coreMetrics.map(m => (
            <label key={m.key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={activeMetrics.includes(m.key)}
                onChange={() => toggleMetric(m.key)}
                className="accent-indigo-500"
                style={{ accentColor: '#6366f1' }}
              />
              <span className="text-xs group-hover:text-white transition-colors" style={{ color: '#e8e8f0' }}>
                {m.label}
              </span>
            </label>
          ))}
        </div>

        <div className="text-xs font-semibold mb-2" style={{ color: '#5a5a7a' }}>Roster Metrics</div>
        <div className="space-y-1.5 mb-4">
          {rosterMetrics.map(m => (
            <label key={m.key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={activeMetrics.includes(m.key)}
                onChange={() => toggleMetric(m.key)}
                style={{ accentColor: '#6366f1' }}
              />
              <span className="text-xs group-hover:text-white transition-colors" style={{ color: '#e8e8f0' }}>
                {m.label}
              </span>
            </label>
          ))}
        </div>

        <div className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: '#5a5a7a' }}>
          Advanced Stats
          {advancedDisabled && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f59e0b22', color: '#f59e0b', fontSize: 9 }}>
              2022+ only
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {advancedMetrics.map(m => (
            <label
              key={m.key}
              className={`flex items-center gap-2 ${advancedDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                checked={activeMetrics.includes(m.key)}
                onChange={() => !advancedDisabled && toggleMetric(m.key)}
                disabled={advancedDisabled}
                style={{ accentColor: '#6366f1' }}
              />
              <span className="text-xs" style={{ color: '#e8e8f0' }}>{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filters Section */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
      >
        <div className="text-sm font-bold mb-3 uppercase tracking-widest" style={{ color: '#8888a8' }}>
          Filters
        </div>

        <div className="text-xs mb-2" style={{ color: '#5a5a7a' }}>Position Group</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => togglePosition(pos)}
              className="px-2 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: positionFilter.includes(pos) ? '#6366f1' : '#1c1c2a',
                color: positionFilter.includes(pos) ? '#ffffff' : '#8888a8',
                border: `1px solid ${positionFilter.includes(pos) ? '#6366f1' : '#2a2a3e'}`,
              }}
            >
              {pos}
            </button>
          ))}
        </div>

        <div className="text-xs mb-2" style={{ color: '#5a5a7a' }}>Class Year</div>
        <div className="flex gap-1.5">
          {YEAR_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => toggleClass(cls)}
              className="px-2 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: classYearFilter.includes(cls) ? '#10b981' : '#1c1c2a',
                color: classYearFilter.includes(cls) ? '#ffffff' : '#8888a8',
                border: `1px solid ${classYearFilter.includes(cls) ? '#10b981' : '#2a2a3e'}`,
              }}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Data Availability */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: '#14141e', border: '1px solid #2a2a3e' }}
      >
        <div className="text-sm font-bold mb-2 uppercase tracking-widest" style={{ color: '#8888a8' }}>
          Data Availability
        </div>
        <div
          className="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
          style={{ background: '#f59e0b18', border: '1px solid #f59e0b44', color: '#f59e0b' }}
        >
          <span>⚠</span>
          <span>Advanced stats available 2022–2024 only</span>
        </div>
        <div
          className="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
          style={{ background: '#6366f118', border: '1px solid #6366f144', color: '#818cf8' }}
        >
          <span>ℹ</span>
          <span>Roster data available 2014–2024 only</span>
        </div>
        <div
          className="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
          style={{ background: '#f59e0b18', border: '1px solid #f59e0b44', color: '#f59e0b' }}
        >
          <span>⚠</span>
          <span>Box scores incomplete pre-2022</span>
        </div>
      </div>
    </div>
  )
}
