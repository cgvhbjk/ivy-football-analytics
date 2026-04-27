// insightEngine.js — statistical utilities for the Insights Lab
// All functions are pure; no React imports here.

// Pearson correlation coefficient. Returns 0 when n < 4.
export function pearsonCorrelation(xs, ys) {
  const n = xs.length
  if (n < 4) return 0
  const meanX = xs.reduce((s, v) => s + v, 0) / n
  const meanY = ys.reduce((s, v) => s + v, 0) / n
  let num = 0, sdX = 0, sdY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    num += dx * dy
    sdX += dx * dx
    sdY += dy * dy
  }
  const denom = Math.sqrt(sdX * sdY)
  return denom === 0 ? 0 : num / denom
}

// Build scatter-plot points and compute correlation for an (x, y) pair.
export function computeRelationship(teamSeasons, xKey, yKey, filters = {}) {
  const { schemeFilter = 'all', yearRange = [2014, 2024] } = filters
  const rows = teamSeasons.filter(s => {
    if (s.year < yearRange[0] || s.year > yearRange[1]) return false
    if (!s[xKey] || !s[yKey]) return false
    if (schemeFilter !== 'all' && s.off_scheme !== schemeFilter) return false
    return true
  })
  const xs = rows.map(s => s[xKey])
  const ys = rows.map(s => s[yKey])
  return {
    points: rows.map(s => ({ x: s[xKey], y: s[yKey], school: s.school, year: s.year })),
    correlation: parseFloat(pearsonCorrelation(xs, ys).toFixed(3)),
    n: rows.length,
  }
}

// Validate whether an insight has enough signal to be saved.
// Returns { valid, strength, confidence, reason }
export function scoreInsight(correlation, n) {
  const absR = Math.abs(correlation)
  if (n < 8) return { valid: false, strength: absR, confidence: 'LOW', reason: 'Fewer than 8 data points' }
  if (absR < 0.15) return { valid: false, strength: absR, confidence: 'LOW', reason: 'Effect too small (|r| < 0.15)' }
  const confidence = absR >= 0.50 ? 'HIGH' : absR >= 0.30 ? 'MEDIUM' : 'LOW'
  return { valid: true, strength: absR, confidence, reason: null }
}

// Break correlation into three time windows for stability analysis.
export function timeWindowComparison(teamSeasons, xKey, yKey) {
  const windows = [
    { label: 'Early (2014–17)',  years: [2014, 2015, 2016, 2017] },
    { label: 'Mid (2018–21)',    years: [2018, 2019, 2021] },
    { label: 'Recent (2022–24)', years: [2022, 2023, 2024] },
  ]
  return windows.map(w => {
    const rows = teamSeasons.filter(s =>
      w.years.includes(s.year) && s[xKey] && s[yKey]
    )
    if (rows.length < 4) return { ...w, r: null, n: rows.length }
    const r = pearsonCorrelation(rows.map(s => s[xKey]), rows.map(s => s[yKey]))
    return { ...w, r: parseFloat(r.toFixed(3)), n: rows.length }
  })
}

// Find the x split that maximises the absolute difference in mean y between the two groups.
export function detectThreshold(teamSeasons, xKey, yKey, yearRange = [2014, 2024]) {
  const rows = teamSeasons
    .filter(s =>
      s.year >= yearRange[0] && s.year <= yearRange[1] &&
      s[xKey] && s[yKey]
    )
    .map(s => ({ x: s[xKey], y: s[yKey] }))
    .sort((a, b) => a.x - b.x)

  if (rows.length < 8) return null

  const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length
  let best = null, bestEffect = 0

  for (let i = 2; i < rows.length - 2; i++) {
    const threshold = (rows[i].x + rows[i + 1].x) / 2
    const below = rows.slice(0, i + 1).map(r => r.y)
    const above = rows.slice(i + 1).map(r => r.y)
    const mBelow = avg(below)
    const mAbove = avg(above)
    const effect = Math.abs(mAbove - mBelow)
    if (effect > bestEffect) {
      bestEffect = effect
      best = {
        threshold: parseFloat(threshold.toFixed(1)),
        belowMean: parseFloat(mBelow.toFixed(3)),
        aboveMean: parseFloat(mAbove.toFixed(3)),
        effect: parseFloat(effect.toFixed(3)),
        belowN: i + 1,
        aboveN: rows.length - i - 1,
      }
    }
  }
  return best
}

// Correlation per offensive scheme (interaction check).
export function detectInteractions(teamSeasons, xKey, yKey) {
  const schemes = [...new Set(teamSeasons.map(s => s.off_scheme).filter(Boolean))]
  return schemes
    .map(scheme => {
      const rows = teamSeasons.filter(s =>
        s.off_scheme === scheme && s[xKey] && s[yKey]
      )
      if (rows.length < 3) return { scheme, r: null, n: rows.length }
      const r = pearsonCorrelation(rows.map(s => s[xKey]), rows.map(s => s[yKey]))
      return { scheme, r: parseFloat(r.toFixed(3)), n: rows.length }
    })
    .sort((a, b) => Math.abs(b.r ?? 0) - Math.abs(a.r ?? 0))
}

// Plain-English explanation for a computed relationship.
export function generateInsightText(xLabel, yLabel, correlation, n, threshold) {
  const dir = correlation > 0 ? 'positively' : 'negatively'
  const strength =
    Math.abs(correlation) >= 0.5 ? 'strongly' :
    Math.abs(correlation) >= 0.3 ? 'moderately' : 'weakly'
  let text = `${xLabel} is ${strength} ${dir} correlated with ${yLabel} (r = ${correlation.toFixed(2)}, n = ${n} team-seasons).`
  if (threshold) {
    text += ` Teams with ${xLabel} above ${threshold.threshold} average ${threshold.aboveMean.toFixed(2)} ${yLabel} vs ${threshold.belowMean.toFixed(2)} below (Δ ${threshold.effect.toFixed(3)}).`
  }
  return text
}

// Outcomes where a LOWER value is better (used to orient alert logic).
const LOWER_IS_BETTER = new Set([
  'points_allowed_per_game',
  'total_ypg_allowed',
  'rushing_ypg_allowed',
  'passing_ypg_allowed',
  'first_downs_allowed_pg',
])

// Compare a team's current season values against stored insight thresholds and
// return a list of actionable recommendations, strongest first.
export function generateRecommendations(teamSeason, insights) {
  if (!teamSeason || !insights?.length) return []
  const recs = []

  for (const insight of insights) {
    const { threshold, variable, targetMetric, title, confidence, strengthScore, correlation } = insight
    if (!threshold || !variable) continue
    const val = teamSeason[variable]
    if (val == null) continue

    const diff = val - threshold.threshold
    // Determine which side of the threshold is beneficial for the team.
    // "aboveIsBetter" for the predictor is true when higher predictor → better outcome.
    const outcomeIsHigherBetter = !LOWER_IS_BETTER.has(targetMetric)
    const aboveIsBetter = outcomeIsHigherBetter
      ? threshold.aboveMean > threshold.belowMean
      : threshold.aboveMean < threshold.belowMean

    const isBad = aboveIsBetter ? diff < -5 : diff > 5
    if (!isBad) continue

    const direction = aboveIsBetter ? 'below' : 'above'
    const gap = Math.abs(diff).toFixed(0)
    recs.push({
      type: 'warning',
      insightId: insight.id,
      label: title,
      text: `${variable.replace(/_/g, ' ')} is ${gap} units ${direction} the historical performance threshold (${threshold.threshold}). Historically this correlates with weaker ${targetMetric.replace(/_/g, ' ')}.`,
      confidence,
      strengthScore: strengthScore ?? 0,
    })
  }

  return recs.sort((a, b) => b.strengthScore - a.strengthScore).slice(0, 3)
}
