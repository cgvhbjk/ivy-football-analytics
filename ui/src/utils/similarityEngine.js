import { nflCombinePlayers } from '../data/nflCombineData.js'

const POSITION_MAP = {
  LT: 'OT', RT: 'OT',
  LG: 'OG', RG: 'OG',
  C:  'C',
  DE: 'EDGE',
  DT: 'DL', NT: 'DL',
  MLB: 'LB', OLB: 'LB', ILB: 'LB',
  CB: 'DB', SS: 'DB', FS: 'DB',
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE',
}

export function normalizePosition(pos) {
  return POSITION_MAP[pos] ?? pos
}

// Fixed normalization ranges covering the full realistic spectrum for each metric.
// Normalizing with these (instead of pool z-scores) keeps similarity meaningful
// even when the NFL comparison pool is tiny (3–5 players).
const RANGES = {
  height:        { min: 66,  max: 82  },
  weight:        { min: 160, max: 370 },
  forty_time:    { min: 4.2, max: 5.6 },
  bench_reps:    { min: 4,   max: 42  },
  vertical_jump: { min: 18,  max: 46  },
  broad_jump:    { min: 86,  max: 132 },
  shuttle:       { min: 3.9, max: 5.4 },
  three_cone:    { min: 6.4, max: 8.5 },
}

const METRICS = Object.keys(RANGES)

function norm(value, key) {
  const { min, max } = RANGES[key]
  return (value - min) / (max - min)
}

function ivyMetrics(player) {
  return {
    height:        player.height_in,
    weight:        player.weight_lbs,
    forty_time:    player.forty_time,
    bench_reps:    player.bench_reps,
    vertical_jump: player.vertical_jump,
    broad_jump:    player.broad_jump,
    shuttle:       player.shuttle,
    three_cone:    player.three_cone,
  }
}

// Find the top-N most similar NFL combine players for an Ivy player.
// Distance is Euclidean on fixed-range-normalized metrics (each dimension [0,1]).
// Similarity = max(0, (1 - distance / sqrt(n_metrics)) * 100) → natural 0–100 scale.
export function findSimilarPlayers(ivyPlayer, topN = 5) {
  const normPos = normalizePosition(ivyPlayer.position)
  const pool = nflCombinePlayers.filter(p => p.position === normPos)
  if (pool.length === 0) return []

  const ivy = ivyMetrics(ivyPlayer)

  const scored = pool.map(nfl => {
    let distSq = 0
    let count  = 0
    METRICS.forEach(m => {
      const iv = ivy[m]
      const nv = nfl[m]
      if (iv == null || nv == null) return
      const d = norm(iv, m) - norm(nv, m)
      distSq += d * d
      count++
    })
    if (count === 0) return { ...nfl, distance: Infinity, similarity: 0 }

    const distance   = Math.sqrt(distSq)
    // Max possible distance across `count` metrics each spanning [0,1] is sqrt(count).
    const similarity = Math.max(0, Math.round((1 - distance / Math.sqrt(count)) * 100))
    return { ...nfl, distance: parseFloat(distance.toFixed(3)), similarity }
  })

  return scored.sort((a, b) => a.distance - b.distance).slice(0, topN)
}
