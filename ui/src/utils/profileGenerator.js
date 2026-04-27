const METRICS = ['height', 'weight', 'forty_time', 'bench_reps', 'vertical_jump', 'broad_jump', 'shuttle', 'three_cone']

// Average the top-N similar NFL players into a single "target profile".
// Returns null when the input list is empty.
export function generateTargetProfile(similarPlayers) {
  if (!similarPlayers.length) return null

  const profile = { position: similarPlayers[0].position }
  METRICS.forEach(m => {
    const vals = similarPlayers.map(p => p[m]).filter(v => v != null)
    profile[m] = vals.length
      ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2))
      : null
  })
  profile.based_on = similarPlayers.map(p => p.player)
  return profile
}
