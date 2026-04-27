import { create } from 'zustand'
import { teamSeasons } from '../data/mockData.js'
import { computeRelationship, detectThreshold, scoreInsight } from '../utils/insightEngine.js'

// Build a handful of seed insights at module load time so the databank
// is never empty. Only valid insights (pass scoreInsight) are kept.
function buildSeedInsights() {
  const candidates = [
    { id: 'seed-ol-win',   xKey: 'OL_avg_weight',       yKey: 'win_pct',                 title: 'OL Weight → Win %',            tags: ['OL', 'roster', 'winning'] },
    { id: 'seed-ol-margin',xKey: 'OL_avg_weight',       yKey: 'avg_margin',              title: 'OL Weight → Scoring Margin',   tags: ['OL', 'roster', 'offense'] },
    { id: 'seed-dl-pag',   xKey: 'DL_avg_weight',       yKey: 'points_allowed_per_game', title: 'DL Weight → Points Allowed',   tags: ['DL', 'roster', 'defense'] },
    { id: 'seed-ot-win',   xKey: 'OT_avg_weight',       yKey: 'win_pct',                 title: 'OT Subgroup → Win %',          tags: ['OT', 'OL', 'subgroup'] },
    { id: 'seed-edge-pag', xKey: 'EDGE_avg_weight',     yKey: 'points_allowed_per_game', title: 'EDGE Rushers → Points Allowed',tags: ['EDGE', 'DL', 'subgroup'] },
    { id: 'seed-int-pag',  xKey: 'INTERIOR_avg_weight', yKey: 'points_allowed_per_game', title: 'Interior DL → Points Allowed', tags: ['INTERIOR', 'DL', 'subgroup'] },
  ]

  return candidates.reduce((acc, c) => {
    const rel   = computeRelationship(teamSeasons, c.xKey, c.yKey, { yearRange: [2014, 2024] })
    const score = scoreInsight(rel.correlation, rel.n)
    if (!score.valid) return acc
    const threshold = detectThreshold(teamSeasons, c.xKey, c.yKey)
    acc.push({
      id:           c.id,
      title:        c.title,
      description:  `Auto-computed from ${rel.n} team-seasons (2014–2024).`,
      variable:     c.xKey,
      targetMetric: c.yKey,
      correlation:  rel.correlation,
      strengthScore: parseFloat(score.strength.toFixed(3)),
      confidence:   score.confidence,
      sampleSize:   rel.n,
      timeWindow:   '2014–2024',
      threshold,
      tags:         c.tags,
      savedAt:      new Date().toISOString(),
    })
    return acc
  }, [])
}

const SEED_INSIGHTS = buildSeedInsights()

const useInsightStore = create((set) => ({
  insights: SEED_INSIGHTS,

  saveInsight: (insight) =>
    set((state) => ({
      insights: [...state.insights.filter((i) => i.id !== insight.id), insight],
    })),

  removeInsight: (id) =>
    set((state) => ({ insights: state.insights.filter((i) => i.id !== id) })),

  resetInsights: () => set({ insights: SEED_INSIGHTS }),

  // Insights Lab UI state
  insightOutcome:      'win_pct',
  insightVariable:     'OL_avg_weight',
  insightSchemeFilter: 'all',
  insightYearRange:    [2014, 2024],

  setInsightOutcome:      (v) => set({ insightOutcome: v }),
  setInsightVariable:     (v) => set({ insightVariable: v }),
  setInsightSchemeFilter: (v) => set({ insightSchemeFilter: v }),
  setInsightYearRange:    (v) => set({ insightYearRange: v }),
}))

export default useInsightStore
