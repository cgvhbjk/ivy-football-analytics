import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="flex items-center justify-between px-6 py-3 border-b"
      style={{ background: '#14141e', borderColor: '#2a2a3e' }}
    >
      <div className="flex items-center gap-2 text-lg font-bold" style={{ color: '#e8e8f0' }}>
        <span>🏈</span>
        <span>Ivy Football</span>
      </div>

      <div className="flex items-center gap-1">
        {[
          { to: '/',           label: 'Comparison Lab' },
          { to: '/analyzer',   label: 'Matchup Analyzer' },
          { to: '/insights',   label: 'Insights Lab' },
          { to: '/player-lab', label: 'Player Dev Lab' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              background: pathname === to ? '#6366f1' : 'transparent',
              color: pathname === to ? '#ffffff' : '#8888a8',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="text-xs" style={{ color: '#5a5a7a' }}>
        Built with CFBD data
      </div>
    </nav>
  )
}
