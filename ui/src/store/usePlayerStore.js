import { create } from 'zustand'

const usePlayerStore = create((set) => ({
  selectedSchool: 'harvard',
  selectedYear:   2024,
  selectedPlayer: null,   // full player object from rosterPlayers

  setSelectedSchool:  (v) => set({ selectedSchool: v, selectedPlayer: null }),
  setSelectedYear:    (v) => set({ selectedYear: v,   selectedPlayer: null }),
  setSelectedPlayer:  (v) => set({ selectedPlayer: v }),
}))

export default usePlayerStore
