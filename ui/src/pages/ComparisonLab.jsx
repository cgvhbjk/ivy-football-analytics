import useStore from '../store/useStore.js'
import { SCHOOLS, SCHOOL_META } from '../data/mockData.js'
import DualRangeSlider from '../components/shared/DualRangeSlider.jsx'
import ControlsPanel from '../components/lab/ControlsPanel.jsx'
import ComparisonPanel from '../components/lab/ComparisonPanel.jsx'
import ImportancePanel from '../components/lab/ImportancePanel.jsx'

function SelectToggle({ label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: value === opt.value ? '#6366f1' : '#1c1c2a',
            color: value === opt.value ? '#fff' : '#8888a8',
            border: `1px solid ${value === opt.value ? '#6366f1' : '#2a2a3e'}`,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function ComparisonLab() {
  const {
    teamA, setTeamA,
    teamB, setTeamB,
    yearRange, setYearRange,
    gameType, setGameType,
    homeAway, setHomeAway,
  } = useStore()

  const selectStyle = {
    background: '#1c1c2a',
    border: '1px solid #2a2a3e',
    color: '#e8e8f0',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]" style={{ color: '#e8e8f0' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-4 flex-wrap px-6 py-3 border-b"
        style={{ background: '#14141e', borderColor: '#2a2a3e', flexShrink: 0 }}
      >
        <div className="text-base font-bold" style={{ color: '#e8e8f0' }}>
          Ivy Comparison Lab
        </div>

        <div className="flex items-center gap-2">
          <select value={teamA} onChange={e => setTeamA(e.target.value)} style={selectStyle}>
            {SCHOOLS.map(s => (
              <option key={s} value={s}>{SCHOOL_META[s]?.fullName}</option>
            ))}
          </select>
          <span style={{ color: '#5a5a7a', fontWeight: 700 }}>vs</span>
          <select value={teamB} onChange={e => setTeamB(e.target.value)} style={selectStyle}>
            {SCHOOLS.map(s => (
              <option key={s} value={s}>{SCHOOL_META[s]?.fullName}</option>
            ))}
          </select>
        </div>

        <div style={{ width: 180, flexShrink: 0 }}>
          <DualRangeSlider
            min={2014}
            max={2024}
            value={yearRange}
            onChange={setYearRange}
          />
        </div>

        <SelectToggle
          value={gameType}
          onChange={setGameType}
          options={[
            { value: 'all', label: 'All Games' },
            { value: 'ivy', label: 'Ivy Only' },
          ]}
        />

        <SelectToggle
          value={homeAway}
          onChange={setHomeAway}
          options={[
            { value: 'home', label: 'Home' },
            { value: 'away', label: 'Away' },
            { value: 'both', label: 'Both' },
          ]}
        />
      </div>

      {/* 3-column layout */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr 280px',
          gap: 12,
          padding: '12px 16px',
        }}
      >
        {/* Left: Controls */}
        <div className="overflow-y-auto min-h-0 pr-1">
          <ControlsPanel />
        </div>

        {/* Center: Comparison */}
        <div className="overflow-y-auto min-h-0 pr-1">
          <ComparisonPanel />
        </div>

        {/* Right: Importance */}
        <div className="overflow-y-auto min-h-0 pr-1">
          <ImportancePanel />
        </div>
      </div>
    </div>
  )
}
