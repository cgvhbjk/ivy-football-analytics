import { create } from 'zustand'

const useStore = create((set) => ({
  // Page 1 — Comparison Lab
  teamA: 'harvard',
  teamB: 'yale',
  yearRange: [2014, 2024],
  gameType: 'all',
  homeAway: 'both',
  activeMetrics: ['win_pct', 'avg_margin', 'points_per_game', 'points_allowed_per_game'],
  positionFilter: ['OL', 'DL', 'LB', 'DB', 'SKILL'],
  classYearFilter: ['FR', 'SO', 'JR', 'SR'],
  labView: 'snapshot',

  setTeamA: (v) => set({ teamA: v }),
  setTeamB: (v) => set({ teamB: v }),
  setYearRange: (v) => set({ yearRange: v }),
  setGameType: (v) => set({ gameType: v }),
  setHomeAway: (v) => set({ homeAway: v }),
  setActiveMetrics: (v) => set({ activeMetrics: v }),
  setPositionFilter: (v) => set({ positionFilter: v }),
  setClassYearFilter: (v) => set({ classYearFilter: v }),
  setLabView: (v) => set({ labView: v }),

  // Page 2 — Matchup Analyzer
  analyzerTeamA: 'harvard',
  analyzerTeamB: 'yale',
  analyzerYear: 2023,
  analyzerQuestion: 'who_is_better',
  analyzerTab: 'results',
  whatIfTurnovers: 1.5,

  setAnalyzerTeamA: (v) => set({ analyzerTeamA: v }),
  setAnalyzerTeamB: (v) => set({ analyzerTeamB: v }),
  setAnalyzerYear: (v) => set({ analyzerYear: v }),
  setAnalyzerQuestion: (v) => set({ analyzerQuestion: v }),
  setAnalyzerTab: (v) => set({ analyzerTab: v }),
  setWhatIfTurnovers: (v) => set({ whatIfTurnovers: v }),
}))

export default useStore
