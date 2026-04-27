// ---- Seeded random ----
function seededRand(seed) {
  let s = seed >>> 0
  return () => {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return (s >>> 0) / 0xffffffff
  }
}

// ---- Constants ----
export const SCHOOLS = ['harvard', 'yale', 'penn', 'princeton', 'dartmouth', 'cornell', 'brown', 'columbia']

export const SCHOOL_META = {
  harvard:   { abbr: 'HAR', fullName: 'Harvard Crimson',    color: '#E05555' },
  yale:      { abbr: 'YAL', fullName: 'Yale Bulldogs',      color: '#5B9BD5' },
  penn:      { abbr: 'PEN', fullName: 'Penn Quakers',       color: '#CC4444' },
  princeton: { abbr: 'PRI', fullName: 'Princeton Tigers',   color: '#F5A623' },
  dartmouth: { abbr: 'DAR', fullName: 'Dartmouth Big Green',color: '#3DB86B' },
  cornell:   { abbr: 'COR', fullName: 'Cornell Big Red',    color: '#E88866' },
  brown:     { abbr: 'BRO', fullName: 'Brown Bears',        color: '#A68262' },
  columbia:  { abbr: 'COL', fullName: 'Columbia Lions',     color: '#5BC8AF' },
}

export const SCHOOL_COLORS = {
  harvard: '#E05555',
  yale: '#5B9BD5',
  penn: '#CC4444',
  princeton: '#F5A623',
  dartmouth: '#3DB86B',
  cornell: '#E88866',
  brown: '#A68262',
  columbia: '#5BC8AF',
}

export const YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024]
export const ALL_YEARS = Array.from({ length: 20 }, (_, i) => 2005 + i).filter(y => y !== 2020)

// ---- School profiles ----
const PROFILES = {
  harvard:   { baseWin: 0.78, ppg: 27, pag: 14, trend: 0.005, passT: 0.52, tempo: 0.40, spread: 0.38, explode: 0.64, OL: 295, DL: 272, LB: 235, DB: 194, SK: 200, offS: 'Pro-Style / Power Run',    defS: '4-3 Base',     ypg: 315, fd: 19, dypg: 235, dfd: 14 },
  yale:      { baseWin: 0.68, ppg: 25, pag: 17, trend: 0.005, passT: 0.62, tempo: 0.55, spread: 0.55, explode: 0.58, OL: 290, DL: 268, LB: 231, DB: 192, SK: 197, offS: 'Spread Pass',              defS: '3-4 / 3-3-5',  ypg: 305, fd: 18, dypg: 260, dfd: 15 },
  penn:      { baseWin: 0.54, ppg: 23, pag: 21, trend: 0.010, passT: 0.68, tempo: 0.72, spread: 0.68, explode: 0.55, OL: 285, DL: 265, LB: 228, DB: 191, SK: 195, offS: 'Air Raid / Spread RPO',   defS: '4-3 Base',     ypg: 325, fd: 19, dypg: 295, dfd: 17 },
  princeton: { baseWin: 0.56, ppg: 24, pag: 20, trend: 0.005, passT: 0.44, tempo: 0.38, spread: 0.40, explode: 0.60, OL: 292, DL: 270, LB: 233, DB: 193, SK: 199, offS: 'Pro-Style / Power Run',    defS: 'Aggressive 4-3', ypg: 295, fd: 18, dypg: 280, dfd: 16 },
  dartmouth: { baseWin: 0.50, ppg: 22, pag: 22, trend: 0.000, passT: 0.55, tempo: 0.62, spread: 0.58, explode: 0.52, OL: 288, DL: 264, LB: 229, DB: 190, SK: 196, offS: 'Spread Run / Option',      defS: '3-4 / 3-3-5',  ypg: 285, fd: 17, dypg: 300, dfd: 17 },
  cornell:   { baseWin: 0.42, ppg: 21, pag: 24, trend: 0.015, passT: 0.58, tempo: 0.50, spread: 0.50, explode: 0.48, OL: 283, DL: 260, LB: 226, DB: 189, SK: 194, offS: 'West Coast / Pro Pass',    defS: '4-3 Base',     ypg: 275, fd: 16, dypg: 315, dfd: 18 },
  brown:     { baseWin: 0.38, ppg: 20, pag: 25, trend: 0.020, passT: 0.65, tempo: 0.68, spread: 0.62, explode: 0.50, OL: 280, DL: 258, LB: 224, DB: 188, SK: 193, offS: 'Air Raid / Spread RPO',   defS: '3-4 / 3-3-5',  ypg: 285, fd: 17, dypg: 325, dfd: 18 },
  columbia:  { baseWin: 0.22, ppg: 17, pag: 29, trend: 0.030, passT: 0.60, tempo: 0.65, spread: 0.60, explode: 0.42, OL: 275, DL: 255, LB: 221, DB: 186, SK: 190, offS: 'Spread Run / Option',      defS: '3-4 / 3-3-5',  ypg: 255, fd: 15, dypg: 365, dfd: 20 },
}

const rng = seededRand(42)

function jitter(base, range) {
  return base + (rng() - 0.5) * 2 * range
}

// ---- Generate teamSeasons ----
export const teamSeasons = []

const yearList = [2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024]

SCHOOLS.forEach(school => {
  const p = PROFILES[school]
  yearList.forEach((year, idx) => {
    const winRate = Math.min(0.95, Math.max(0.05, p.baseWin + p.trend * idx + (rng() - 0.5) * 0.12))
    const games = 10
    const wins = Math.round(winRate * games)
    const losses = games - wins
    const ivyGames = 7
    const ivyWinRate = Math.min(0.95, Math.max(0.05, winRate + (rng() - 0.5) * 0.10))
    const ivyWins = Math.round(ivyWinRate * ivyGames)
    const ivyLosses = ivyGames - ivyWins

    const ppg = Math.round(jitter(p.ppg, 4))
    const pag = Math.round(jitter(p.pag, 4))
    // Extract base weights before the object so subgroups can derive from them
    // without adding extra rng() calls that would shift the random sequence.
    const olWt = Math.round(jitter(p.OL, 6))
    const dlWt = Math.round(jitter(p.DL, 6))

    const season = {
      school,
      year,
      wins,
      losses,
      games,
      win_pct: parseFloat((wins / games).toFixed(3)),
      ivy_wins: ivyWins,
      ivy_losses: ivyLosses,
      ivy_games: ivyGames,
      ivy_win_pct: parseFloat((ivyWins / ivyGames).toFixed(3)),
      points_for: ppg * games,
      points_against: pag * games,
      points_per_game: ppg,
      points_allowed_per_game: pag,
      avg_margin: parseFloat((ppg - pag).toFixed(1)),
      // OL position-group averages (all years)
      OL_avg_weight: olWt,
      // Subgroup weights are null here; for years with rosterPlayers data (2023–2024)
      // they are patched below using actual player biodata.
      OT_avg_weight: null,
      OG_avg_weight: null,
      C_avg_weight:  null,
      DL_avg_weight:       dlWt,
      EDGE_avg_weight:     null,
      INTERIOR_avg_weight: null,
      LB_avg_weight: Math.round(jitter(p.LB, 5)),
      DB_avg_weight: Math.round(jitter(p.DB, 4)),
      SKILL_avg_weight: Math.round(jitter(p.SK, 4)),
      roster_depth: Math.round(jitter(88, 10)),
      upperclassman_ratio: parseFloat(jitter(0.62, 0.08).toFixed(2)),
      // advanced stats — only 2022+
      pass_rate: year >= 2022 ? parseFloat(jitter(p.passT, 0.06).toFixed(3)) : null,
      rush_rate: year >= 2022 ? parseFloat((1 - jitter(p.passT, 0.06)).toFixed(3)) : null,
      yards_per_play: year >= 2022 ? parseFloat(jitter(5.8, 0.5).toFixed(2)) : null,
      pace_proxy: year >= 2022 ? Math.round(jitter(68, 8)) : null,
      turnovers_per_game: year >= 2022 ? parseFloat(jitter(1.6, 0.4).toFixed(2)) : null,
      pass_tendency: year >= 2022 ? parseFloat(jitter(p.passT, 0.05).toFixed(3)) : null,
      tempo: year >= 2022 ? parseFloat(jitter(p.tempo, 0.08).toFixed(3)) : null,
      spread_factor: year >= 2022 ? parseFloat(jitter(p.spread, 0.07).toFixed(3)) : null,
      explosiveness: year >= 2022 ? parseFloat(jitter(p.explode, 0.07).toFixed(3)) : null,
      off_scheme: year >= 2022 ? p.offS : null,
      def_scheme: year >= 2022 ? p.defS : null,
      total_ypg: Math.round(jitter(p.ypg, 20)),
      rushing_ypg: Math.round(jitter(p.ypg * (1 - p.passT), 15)),
      passing_ypg: Math.round(jitter(p.ypg * p.passT, 15)),
      first_downs_pg: parseFloat(jitter(p.fd, 2).toFixed(1)),
      total_ypg_allowed: Math.round(jitter(p.dypg, 20)),
      rushing_ypg_allowed: Math.round(jitter(p.dypg * 0.43, 12)),
      passing_ypg_allowed: Math.round(jitter(p.dypg * 0.57, 14)),
      first_downs_allowed_pg: parseFloat(jitter(p.dfd, 2).toFixed(1)),
    }
    teamSeasons.push(season)
  })
})

// ---- Generate gameResults ----
export const gameResults = []

const NON_IVY_OPPONENTS = [
  'Holy Cross', 'Georgetown', 'Fordham', 'Lehigh', 'Lafayette', 'Bucknell',
  'Sacred Heart', 'Colgate', 'Monmouth', 'Stony Brook', 'Albany', 'Bryant',
  'Maine', 'New Hampshire', 'Rhode Island', 'Towson', 'Villanova', 'James Madison',
]

const MONTHS = ['Sep', 'Oct', 'Nov']

function randDate(month, week) {
  const d = 1 + Math.floor(rng() * 25)
  return `${month} ${d}`
}

// Detailed game log for 2019, 2021-2024
const detailedYears = [2019, 2021, 2022, 2023, 2024]

detailedYears.forEach(year => {
  SCHOOLS.forEach(school => {
    const p = PROFILES[school]
    const yearIdx = yearList.indexOf(year)
    const baseWin = Math.min(0.9, Math.max(0.1, p.baseWin + p.trend * (yearIdx >= 0 ? yearIdx : 5)))

    // 7 ivy games
    const ivyOpponents = SCHOOLS.filter(s => s !== school)
    ivyOpponents.forEach((opp, i) => {
      const win = rng() < baseWin
      const pts = Math.round(jitter(p.ppg, 7))
      const oppPts = win ? Math.max(0, pts - Math.round(jitter(10, 6))) : pts + Math.round(jitter(8, 5))
      const homeAway = i % 2 === 0 ? 'home' : 'away'
      const month = MONTHS[Math.min(2, Math.floor(i / 3))]
      gameResults.push({
        school,
        year,
        date: randDate(month, i),
        opponent: opp.charAt(0).toUpperCase() + opp.slice(1),
        result: win ? 'W' : 'L',
        points: Math.max(0, pts),
        opp_points: Math.max(0, oppPts),
        home_away: homeAway,
        conference_game: true,
      })
    })

    // 3 non-conference games
    const nonConfOpps = NON_IVY_OPPONENTS.slice(0, 3).map((o, i) => ({
      opp: o,
      ha: i === 0 ? 'home' : i === 1 ? 'away' : 'home',
    }))
    nonConfOpps.forEach(({ opp, ha }, i) => {
      const win = rng() < Math.min(0.85, baseWin + 0.10)
      const pts = Math.round(jitter(p.ppg, 6))
      const oppPts = win ? Math.max(0, pts - Math.round(jitter(12, 6))) : pts + Math.round(jitter(6, 4))
      gameResults.push({
        school,
        year,
        date: randDate('Sep', i),
        opponent: opp,
        result: win ? 'W' : 'L',
        points: Math.max(0, pts),
        opp_points: Math.max(0, oppPts),
        home_away: ha,
        conference_game: false,
      })
    })
  })
})

// Historical totals 2005–2018 (excluding 2014–2019 detailed), 2020 skipped
const histYears = []
for (let y = 2005; y <= 2018; y++) {
  if (y !== 2020) histYears.push(y)
}
histYears.forEach(year => {
  SCHOOLS.forEach(school => {
    const p = PROFILES[school]
    const yearOff = year - 2014
    const baseWin = Math.min(0.9, Math.max(0.05, p.baseWin + p.trend * yearOff + (rng() - 0.5) * 0.1))
    const wins = Math.round(baseWin * 10)
    const losses = 10 - wins
    // push summary row (used for trend line only)
    gameResults.push({
      school,
      year,
      date: null,
      opponent: '__season_summary__',
      result: null,
      points: null,
      opp_points: null,
      home_away: null,
      conference_game: null,
      season_wins: wins,
      season_losses: losses,
      win_pct: parseFloat((wins / 10).toFixed(3)),
    })
  })
})

// ---- Generate rosterPlayers ----
export const rosterPlayers = []

// Position-specific athletic metric ranges for Ivy League players.
// Format: [forty_min, forty_max, bench_min, bench_max, vert_min, vert_max,
//          broad_min, broad_max, shuttle_min, shuttle_max, cone_min, cone_max]
// Ranges are calibrated ~1 SD below typical NFL combine averages for FCS athletes.
const ATHLETIC_BY_POS = {
  LT:  [5.10, 5.42, 16, 24, 21, 28,  87,  100, 4.90, 5.28, 7.78, 8.22],
  RT:  [5.10, 5.42, 16, 24, 21, 28,  87,  100, 4.90, 5.28, 7.78, 8.22],
  LG:  [5.05, 5.38, 18, 26, 21, 28,  87,  100, 4.88, 5.22, 7.72, 8.12],
  RG:  [5.05, 5.38, 18, 26, 21, 28,  87,  100, 4.88, 5.22, 7.72, 8.12],
  C:   [5.05, 5.32, 18, 26, 21, 28,  87,  100, 4.85, 5.18, 7.68, 8.08],
  DE:  [4.75, 5.05, 14, 22, 28, 35,  99,  113, 4.30, 4.65, 6.98, 7.42],
  DT:  [5.00, 5.28, 18, 28, 23, 30,  95,  108, 4.55, 4.90, 7.22, 7.72],
  NT:  [5.05, 5.32, 20, 30, 21, 29,  91,  105, 4.60, 4.98, 7.32, 7.82],
  MLB: [4.65, 4.92, 16, 24, 29, 36, 103,  117, 4.28, 4.62, 6.92, 7.32],
  OLB: [4.65, 4.92, 14, 23, 29, 37, 103,  117, 4.28, 4.62, 6.92, 7.32],
  ILB: [4.65, 4.95, 14, 23, 28, 36, 102,  116, 4.30, 4.65, 6.95, 7.35],
  CB:  [4.45, 4.70, 10, 16, 32, 40, 108,  122, 4.10, 4.42, 6.68, 7.02],
  SS:  [4.52, 4.78, 12, 20, 29, 37, 106,  120, 4.15, 4.48, 6.75, 7.12],
  FS:  [4.50, 4.75, 11, 18, 30, 38, 106,  120, 4.12, 4.45, 6.72, 7.08],
  QB:  [4.85, 5.12,  8, 16, 27, 34, 105,  116, 4.35, 4.70, 7.02, 7.38],
  RB:  [4.55, 4.82, 12, 20, 33, 40, 112,  123, 4.22, 4.55, 6.88, 7.22],
  WR:  [4.45, 4.72,  7, 14, 30, 39, 108,  122, 4.12, 4.45, 6.70, 7.08],
  TE:  [4.68, 4.92, 12, 20, 29, 37, 104,  116, 4.30, 4.60, 6.90, 7.30],
}

const FIRST_NAMES = ['James', 'Michael', 'Ryan', 'Tyler', 'Marcus', 'Derek', 'Anthony', 'Kevin', 'Brian', 'Chris',
  'David', 'Jason', 'Eric', 'Nathan', 'Alex', 'Jordan', 'Logan', 'Matt', 'Sam', 'Jake',
  'Eli', 'Owen', 'Liam', 'Noah', 'Ben', 'Cole', 'Jack', 'Will', 'Ethan', 'Lucas']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
  'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia', 'Thompson', 'Robinson', 'Clark',
  'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright']
const HOMETOWNS = ['Boston, MA', 'New Haven, CT', 'Philadelphia, PA', 'Princeton, NJ', 'Hanover, NH',
  'Ithaca, NY', 'Providence, RI', 'New York, NY', 'Chicago, IL', 'Los Angeles, CA',
  'Dallas, TX', 'Atlanta, GA', 'Seattle, WA', 'Denver, CO', 'Miami, FL',
  'Charlotte, NC', 'Phoenix, AZ', 'Portland, OR', 'Minneapolis, MN', 'Detroit, MI']

const POSITIONS_BY_GROUP = {
  OL: ['LT', 'LG', 'C', 'RG', 'RT'],
  DL: ['DE', 'DT', 'NT'],
  LB: ['MLB', 'OLB', 'ILB'],
  DB: ['CB', 'SS', 'FS'],
  SKILL: ['QB', 'RB', 'WR', 'TE'],
}

// Map individual positions to finer subgroups used by the Insights Lab.
function getPositionSubgroup(group, position) {
  if (group === 'OL') {
    if (position === 'C') return 'C'
    if (position === 'LT' || position === 'RT') return 'OT'
    return 'OG' // LG, RG
  }
  if (group === 'DL') {
    return position === 'DE' ? 'EDGE' : 'INTERIOR' // DT, NT → INTERIOR
  }
  return null
}

const YEAR_CLASSES = ['FR', 'SO', 'JR', 'SR']

// Position-specific weight and height ranges based on FCS football norms.
// The rosterPlayers loop uses these so subgroup averages computed from player
// biodata will actually differ meaningfully by position.
const WEIGHT_BY_POS = {
  // OL — tackles are the heaviest; centers are the lightest and most athletic
  LT: [302, 332], RT: [299, 328],
  LG: [295, 322], RG: [295, 322],
  C:  [284, 310],
  // DL — edge rushers need speed; nose/3-tech are space-eaters
  DE: [245, 272],
  DT: [278, 312],
  NT: [290, 322],
  // LB
  MLB: [225, 245], OLB: [228, 248], ILB: [224, 244],
  // DB
  CB: [182, 198], SS: [188, 205], FS: [184, 200],
  // Skill
  QB: [210, 232], RB: [195, 220], WR: [170, 205], TE: [230, 258],
}

const HEIGHT_BY_POS = {
  LT: [75, 79], RT: [75, 78],
  LG: [73, 77], RG: [73, 77],
  C:  [72, 76],
  DE: [74, 78], DT: [72, 76], NT: [71, 75],
  MLB: [71, 74], OLB: [72, 75], ILB: [71, 74],
  CB: [69, 73], SS: [70, 74], FS: [70, 74],
  QB: [73, 77], RB: [68, 72], WR: [69, 74], TE: [74, 78],
}

// Group-level fallbacks for any position not listed above.
const WEIGHT_RANGES = { OL: [290, 325], DL: [255, 300], LB: [225, 245], DB: [185, 200], SKILL: [185, 215] }
const HEIGHT_RANGES = { OL: [74, 78], DL: [73, 77], LB: [71, 74], DB: [69, 73], SKILL: [69, 75] }

;[2023, 2024].forEach(year => {
  SCHOOLS.forEach(school => {
    const groups = Object.keys(POSITIONS_BY_GROUP)
    // ~30 players per school per year — ~6 per group
    groups.forEach(grp => {
      const positions = POSITIONS_BY_GROUP[grp]
      const count = grp === 'OL' ? 8 : grp === 'SKILL' ? 8 : 5
      for (let i = 0; i < count; i++) {
        const fname = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]
        const lname = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]
        const pos = positions[Math.floor(rng() * positions.length)]
        // Use position-specific ranges; fall back to group-level ranges if unlisted.
        const [wMin, wMax] = WEIGHT_BY_POS[pos] ?? WEIGHT_RANGES[grp]
        const [hMin, hMax] = HEIGHT_BY_POS[pos] ?? HEIGHT_RANGES[grp]
        const weight = Math.round(wMin + rng() * (wMax - wMin))
        const height = Math.round(hMin + rng() * (hMax - hMin))
        const yearClass = YEAR_CLASSES[Math.floor(rng() * YEAR_CLASSES.length)]
        const hometown = HOMETOWNS[Math.floor(rng() * HOMETOWNS.length)]
        // Athletic metrics — computed after all existing rng() calls so the
        // seeded sequence for name/position/weight/height is unchanged.
        const [fMin,fMax, bMin,bMax, vMin,vMax, brMin,brMax, sMin,sMax, cMin,cMax] =
          ATHLETIC_BY_POS[pos] ?? [5.0,5.3, 16,24, 22,28, 88,100, 4.88,5.20, 7.70,8.10]
        const forty_time    = parseFloat((fMin  + rng() * (fMax  - fMin)).toFixed(2))
        const bench_reps    = Math.round( bMin  + rng() * (bMax  - bMin))
        const vertical_jump = parseFloat((vMin  + rng() * (vMax  - vMin)).toFixed(1))
        const broad_jump    = Math.round( brMin + rng() * (brMax - brMin))
        const shuttle       = parseFloat((sMin  + rng() * (sMax  - sMin)).toFixed(2))
        const three_cone    = parseFloat((cMin  + rng() * (cMax  - cMin)).toFixed(2))
        rosterPlayers.push({
          school,
          year,
          name: `${fname} ${lname}`,
          position: pos,
          position_group: grp,
          position_subgroup: getPositionSubgroup(grp, pos),
          weight_lbs: weight,
          height_in: height,
          year_class: yearClass,
          hometown,
          forty_time,
          bench_reps,
          vertical_jump,
          broad_jump,
          shuttle,
          three_cone,
        })
      }
    })
  })
})

// ---- Patch teamSeasons subgroup weights from actual player biodata ----
// Only years that have rosterPlayers records get real subgroup averages.
// All other years keep null, which the UI handles gracefully.
;[2023, 2024].forEach(patchYear => {
  SCHOOLS.forEach(school => {
    const players = rosterPlayers.filter(p => p.school === school && p.year === patchYear)
    const subgroupAvg = (sg) => {
      const grp = players.filter(p => p.position_subgroup === sg)
      if (!grp.length) return null
      return Math.round(grp.reduce((s, p) => s + p.weight_lbs, 0) / grp.length)
    }
    const ts = teamSeasons.find(s => s.school === school && s.year === patchYear)
    if (!ts) return
    ts.OT_avg_weight       = subgroupAvg('OT')
    ts.OG_avg_weight       = subgroupAvg('OG')
    ts.C_avg_weight        = subgroupAvg('C')
    ts.EDGE_avg_weight     = subgroupAvg('EDGE')
    ts.INTERIOR_avg_weight = subgroupAvg('INTERIOR')
  })
})
