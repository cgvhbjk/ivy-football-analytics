export const METRIC_META = {
  height:        { label: 'Height',         unit: 'in',   lowerIsBetter: false },
  weight:        { label: 'Weight',         unit: 'lbs',  lowerIsBetter: false },
  forty_time:    { label: '40-Yard Dash',   unit: 's',    lowerIsBetter: true  },
  bench_reps:    { label: 'Bench (225)',    unit: 'reps', lowerIsBetter: false },
  vertical_jump: { label: 'Vertical Jump',  unit: 'in',   lowerIsBetter: false },
  broad_jump:    { label: 'Broad Jump',     unit: 'in',   lowerIsBetter: false },
  shuttle:       { label: '20-yd Shuttle',  unit: 's',    lowerIsBetter: true  },
  three_cone:    { label: '3-Cone Drill',   unit: 's',    lowerIsBetter: true  },
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

// Compare an Ivy player against an NFL target profile.
// Returns one gap record per metric; metrics with missing data are excluded.
export function computeGapAnalysis(ivyPlayer, targetProfile) {
  if (!targetProfile) return []
  const current = ivyMetrics(ivyPlayer)

  return Object.entries(METRIC_META).reduce((acc, [key, meta]) => {
    const cur = current[key]
    const tgt = targetProfile[key]
    if (cur == null || tgt == null) return acc

    const diff    = parseFloat((cur - tgt).toFixed(2))
    const pctGap  = tgt !== 0 ? parseFloat(((diff / Math.abs(tgt)) * 100).toFixed(1)) : 0
    // A deficit exists when you are on the wrong side of the target.
    const isDeficit = meta.lowerIsBetter ? diff > 0 : diff < 0
    const absPct    = Math.abs(pctGap)
    const priority  = absPct >= 10 ? 'high' : absPct >= 5 ? 'medium' : 'low'

    acc.push({ key, label: meta.label, unit: meta.unit, lowerIsBetter: meta.lowerIsBetter,
               current: cur, target: tgt, diff, pctGap, isDeficit, priority })
    return acc
  }, [])
}
