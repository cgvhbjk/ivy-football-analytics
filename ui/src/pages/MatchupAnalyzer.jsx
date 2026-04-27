import useStore from '../store/useStore.js'
import { SCHOOLS, SCHOOL_META, YEARS } from '../data/mockData.js'
import MatchupSummary from '../components/analyzer/MatchupSummary.jsx'
import AnalyzerImportance from '../components/analyzer/AnalyzerImportance.jsx'
import TabsSection from '../components/analyzer/TabsSection.jsx'

const QUESTIONS = [
  { value: 'who_is_better', label: 'Who is better?' },
  { value: 'what_changed', label: 'What changed over time?' },
  { value: 'what_drives', label: 'What drives winning?' },
]

export default function MatchupAnalyzer() {
  const {
    analyzerTeamA, setAnalyzerTeamA,
    analyzerTeamB, setAnalyzerTeamB,
    analyzerYear, setAnalyzerYear,
    analyzerQuestion, setAnalyzerQuestion,
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
    <div
      className="flex flex-col"
      style={{ minHeight: 'calc(100vh - 52px)', color: '#e8e8f0' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-4 flex-wrap px-6 py-3 border-b"
        style={{ background: '#14141e', borderColor: '#2a2a3e', flexShrink: 0 }}
      >
        <div className="text-base font-bold" style={{ color: '#e8e8f0' }}>
          Ivy Matchup Analyzer
        </div>

        <div className="flex items-center gap-2">
          <select value={analyzerTeamA} onChange={e => setAnalyzerTeamA(e.target.value)} style={selectStyle}>
            {SCHOOLS.map(s => (
              <option key={s} value={s}>{SCHOOL_META[s]?.fullName}</option>
            ))}
          </select>
          <span style={{ color: '#5a5a7a', fontWeight: 700 }}>vs</span>
          <select value={analyzerTeamB} onChange={e => setAnalyzerTeamB(e.target.value)} style={selectStyle}>
            {SCHOOLS.map(s => (
              <option key={s} value={s}>{SCHOOL_META[s]?.fullName}</option>
            ))}
          </select>
        </div>

        <select value={analyzerYear} onChange={e => setAnalyzerYear(parseInt(e.target.value, 10))} style={selectStyle}>
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select value={analyzerQuestion} onChange={e => setAnalyzerQuestion(e.target.value)} style={selectStyle}>
          {QUESTIONS.map(q => (
            <option key={q.value} value={q.value}>{q.label}</option>
          ))}
        </select>
      </div>

      {/* Main content */}
      <div
        className="flex-1 p-4"
        style={{
          display: 'grid',
          gridTemplateRows: 'auto auto',
          gap: 12,
        }}
      >
        {/* Top: 2-col split */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <MatchupSummary />
          <AnalyzerImportance />
        </div>

        {/* Bottom: full-width tabs */}
        <TabsSection />
      </div>
    </div>
  )
}
