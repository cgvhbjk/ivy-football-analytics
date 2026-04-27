// Mock NFL Combine dataset — realistic archetypes by normalized position.
// Positions: QB, RB, WR, TE, OT, OG, C, EDGE, DL, LB, DB
// height: inches | weight: lbs | forty_time: sec | bench_reps: 225-lb reps
// vertical_jump: inches | broad_jump: inches | shuttle: sec | three_cone: sec

export const NFL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'EDGE', 'DL', 'LB', 'DB']

export const nflCombinePlayers = [
  // ── QBs ──────────────────────────────────────────────────────────────────
  { player: 'Marcus Webb',    position: 'QB', school: 'Alabama',    year: 2024, height: 73, weight: 216, forty_time: 4.72, bench_reps: 12, vertical_jump: 33.5, broad_jump: 112, shuttle: 4.32, three_cone: 6.98 },
  { player: 'Devon Carr',     position: 'QB', school: 'Ohio State', year: 2024, height: 76, weight: 228, forty_time: 4.75, bench_reps: 14, vertical_jump: 35.0, broad_jump: 116, shuttle: 4.38, three_cone: 7.05 },
  { player: 'Tyler Marsh',    position: 'QB', school: 'Georgia',    year: 2023, height: 75, weight: 222, forty_time: 4.80, bench_reps: 11, vertical_jump: 32.5, broad_jump: 110, shuttle: 4.35, three_cone: 7.02 },
  { player: 'Jordan Price',   position: 'QB', school: 'LSU',        year: 2023, height: 74, weight: 218, forty_time: 4.76, bench_reps: 13, vertical_jump: 34.0, broad_jump: 114, shuttle: 4.33, three_cone: 7.00 },

  // ── RBs ──────────────────────────────────────────────────────────────────
  { player: 'Chris Banks',    position: 'RB', school: 'Georgia',    year: 2024, height: 71, weight: 221, forty_time: 4.44, bench_reps: 18, vertical_jump: 40.5, broad_jump: 122, shuttle: 4.18, three_cone: 6.80 },
  { player: 'Darius Cole',    position: 'RB', school: 'Alabama',    year: 2024, height: 69, weight: 209, forty_time: 4.50, bench_reps: 15, vertical_jump: 38.0, broad_jump: 118, shuttle: 4.22, three_cone: 6.88 },
  { player: 'Marcus Hill',    position: 'RB', school: 'Texas',      year: 2023, height: 70, weight: 216, forty_time: 4.52, bench_reps: 16, vertical_jump: 37.5, broad_jump: 117, shuttle: 4.25, three_cone: 6.92 },
  { player: 'Keondre Hayes',  position: 'RB', school: 'Penn State', year: 2023, height: 70, weight: 224, forty_time: 4.58, bench_reps: 20, vertical_jump: 36.0, broad_jump: 115, shuttle: 4.28, three_cone: 7.01 },

  // ── WRs ──────────────────────────────────────────────────────────────────
  { player: 'Jaylen Foster',  position: 'WR', school: 'Ohio State', year: 2024, height: 76, weight: 210, forty_time: 4.35, bench_reps:  9, vertical_jump: 36.5, broad_jump: 123, shuttle: 4.08, three_cone: 6.70 },
  { player: 'Tre Williams',   position: 'WR', school: 'LSU',        year: 2024, height: 71, weight: 199, forty_time: 4.38, bench_reps: 10, vertical_jump: 35.5, broad_jump: 120, shuttle: 4.12, three_cone: 6.74 },
  { player: 'Elijah Grant',   position: 'WR', school: 'Alabama',    year: 2023, height: 73, weight: 205, forty_time: 4.40, bench_reps: 10, vertical_jump: 37.0, broad_jump: 122, shuttle: 4.10, three_cone: 6.72 },
  { player: 'DeShawn Brooks', position: 'WR', school: 'Michigan',   year: 2023, height: 70, weight: 188, forty_time: 4.33, bench_reps:  8, vertical_jump: 38.0, broad_jump: 124, shuttle: 4.05, three_cone: 6.65 },

  // ── TEs ──────────────────────────────────────────────────────────────────
  { player: 'Alex Nguyen',    position: 'TE', school: 'Notre Dame', year: 2024, height: 75, weight: 242, forty_time: 4.58, bench_reps: 17, vertical_jump: 36.0, broad_jump: 116, shuttle: 4.28, three_cone: 6.88 },
  { player: 'Ben Kovacs',     position: 'TE', school: 'Iowa',       year: 2024, height: 77, weight: 256, forty_time: 4.72, bench_reps: 18, vertical_jump: 32.5, broad_jump: 110, shuttle: 4.40, three_cone: 6.98 },
  { player: 'Malik Dawson',   position: 'TE', school: 'Florida',    year: 2023, height: 75, weight: 248, forty_time: 4.65, bench_reps: 16, vertical_jump: 34.0, broad_jump: 112, shuttle: 4.32, three_cone: 6.92 },

  // ── OTs ──────────────────────────────────────────────────────────────────
  { player: 'Devon Fletcher', position: 'OT', school: 'Alabama',    year: 2024, height: 77, weight: 318, forty_time: 5.06, bench_reps: 26, vertical_jump: 29.0, broad_jump: 106, shuttle: 4.84, three_cone: 7.65 },
  { player: 'Marcus Otto',    position: 'OT', school: 'Penn State', year: 2024, height: 79, weight: 328, forty_time: 5.12, bench_reps: 24, vertical_jump: 27.5, broad_jump: 103, shuttle: 4.90, three_cone: 7.74 },
  { player: 'Anthony Ross',   position: 'OT', school: 'Georgia',    year: 2023, height: 78, weight: 322, forty_time: 5.08, bench_reps: 28, vertical_jump: 28.0, broad_jump: 104, shuttle: 4.87, three_cone: 7.68 },
  { player: 'Tyler Chance',   position: 'OT', school: 'Iowa',       year: 2023, height: 78, weight: 314, forty_time: 5.15, bench_reps: 22, vertical_jump: 28.5, broad_jump: 105, shuttle: 4.92, three_cone: 7.80 },

  // ── OGs ──────────────────────────────────────────────────────────────────
  { player: 'Sam Powell',     position: 'OG', school: 'Michigan',   year: 2024, height: 76, weight: 316, forty_time: 5.10, bench_reps: 30, vertical_jump: 26.5, broad_jump:  99, shuttle: 4.88, three_cone: 7.72 },
  { player: 'Jordan Keller',  position: 'OG', school: 'Alabama',    year: 2024, height: 75, weight: 310, forty_time: 5.14, bench_reps: 32, vertical_jump: 25.5, broad_jump:  97, shuttle: 4.92, three_cone: 7.80 },
  { player: 'Nate Sullivan',  position: 'OG', school: 'Ohio State', year: 2023, height: 76, weight: 312, forty_time: 5.12, bench_reps: 30, vertical_jump: 26.0, broad_jump:  98, shuttle: 4.90, three_cone: 7.76 },
  { player: 'Frank Torres',   position: 'OG', school: 'Notre Dame', year: 2023, height: 75, weight: 308, forty_time: 5.16, bench_reps: 28, vertical_jump: 25.0, broad_jump:  96, shuttle: 4.94, three_cone: 7.84 },

  // ── Centers ──────────────────────────────────────────────────────────────
  { player: 'Ryan Barker',    position: 'C',  school: 'Wisconsin',  year: 2024, height: 75, weight: 306, forty_time: 5.08, bench_reps: 30, vertical_jump: 26.5, broad_jump: 100, shuttle: 4.86, three_cone: 7.68 },
  { player: 'Luke Steele',    position: 'C',  school: 'Iowa',       year: 2024, height: 76, weight: 310, forty_time: 5.12, bench_reps: 32, vertical_jump: 25.5, broad_jump:  98, shuttle: 4.90, three_cone: 7.75 },
  { player: 'Cody Barnes',    position: 'C',  school: 'Georgia',    year: 2023, height: 75, weight: 302, forty_time: 5.10, bench_reps: 28, vertical_jump: 27.0, broad_jump: 101, shuttle: 4.88, three_cone: 7.70 },

  // ── EDGE Rushers ─────────────────────────────────────────────────────────
  { player: 'Kobi Jones',     position: 'EDGE', school: 'Michigan',   year: 2024, height: 76, weight: 261, forty_time: 4.55, bench_reps: 22, vertical_jump: 34.0, broad_jump: 115, shuttle: 4.25, three_cone: 6.90 },
  { player: 'Darius Monk',    position: 'EDGE', school: 'Alabama',    year: 2024, height: 75, weight: 268, forty_time: 4.62, bench_reps: 24, vertical_jump: 32.5, broad_jump: 112, shuttle: 4.30, three_cone: 6.98 },
  { player: 'Elijah Cross',   position: 'EDGE', school: 'Georgia',    year: 2023, height: 77, weight: 255, forty_time: 4.58, bench_reps: 20, vertical_jump: 35.0, broad_jump: 116, shuttle: 4.22, three_cone: 6.88 },
  { player: 'Marcus Drew',    position: 'EDGE', school: 'Penn State', year: 2023, height: 76, weight: 263, forty_time: 4.66, bench_reps: 23, vertical_jump: 33.0, broad_jump: 113, shuttle: 4.28, three_cone: 6.95 },

  // ── Interior DL ──────────────────────────────────────────────────────────
  { player: 'Trevor Nash',    position: 'DL', school: 'Georgia',    year: 2024, height: 75, weight: 306, forty_time: 4.88, bench_reps: 30, vertical_jump: 28.5, broad_jump: 105, shuttle: 4.58, three_cone: 7.28 },
  { player: 'Cam Okafor',     position: 'DL', school: 'Alabama',    year: 2024, height: 74, weight: 312, forty_time: 4.95, bench_reps: 32, vertical_jump: 27.0, broad_jump: 102, shuttle: 4.65, three_cone: 7.40 },
  { player: 'Brandon Webb',   position: 'DL', school: 'Ohio State', year: 2023, height: 74, weight: 298, forty_time: 4.90, bench_reps: 28, vertical_jump: 29.0, broad_jump: 107, shuttle: 4.55, three_cone: 7.22 },
  { player: 'Antoine Leary',  position: 'DL', school: 'LSU',        year: 2023, height: 73, weight: 318, forty_time: 5.05, bench_reps: 34, vertical_jump: 25.5, broad_jump:  99, shuttle: 4.75, three_cone: 7.55 },

  // ── LBs ──────────────────────────────────────────────────────────────────
  { player: 'Jaylen Scott',   position: 'LB', school: 'Alabama',    year: 2024, height: 74, weight: 245, forty_time: 4.58, bench_reps: 22, vertical_jump: 36.5, broad_jump: 120, shuttle: 4.22, three_cone: 6.88 },
  { player: 'Devon King',     position: 'LB', school: 'Georgia',    year: 2024, height: 73, weight: 240, forty_time: 4.55, bench_reps: 24, vertical_jump: 37.5, broad_jump: 122, shuttle: 4.18, three_cone: 6.80 },
  { player: 'Marcus Pierre',  position: 'LB', school: 'Notre Dame', year: 2023, height: 73, weight: 242, forty_time: 4.62, bench_reps: 20, vertical_jump: 35.0, broad_jump: 118, shuttle: 4.25, three_cone: 6.92 },
  { player: 'Aaron James',    position: 'LB', school: 'Penn State', year: 2023, height: 72, weight: 238, forty_time: 4.65, bench_reps: 21, vertical_jump: 34.5, broad_jump: 116, shuttle: 4.28, three_cone: 6.98 },

  // ── DBs ──────────────────────────────────────────────────────────────────
  { player: 'Xavier Burns',   position: 'DB', school: 'Alabama',    year: 2024, height: 72, weight: 198, forty_time: 4.38, bench_reps: 14, vertical_jump: 38.5, broad_jump: 124, shuttle: 4.08, three_cone: 6.68 },
  { player: 'Malik Grant',    position: 'DB', school: 'Ohio State', year: 2024, height: 71, weight: 192, forty_time: 4.35, bench_reps: 12, vertical_jump: 39.0, broad_jump: 126, shuttle: 4.05, three_cone: 6.62 },
  { player: 'Cam Moore',      position: 'DB', school: 'Georgia',    year: 2023, height: 73, weight: 204, forty_time: 4.42, bench_reps: 16, vertical_jump: 37.0, broad_jump: 121, shuttle: 4.12, three_cone: 6.78 },
  { player: 'Dante Holmes',   position: 'DB', school: 'LSU',        year: 2023, height: 70, weight: 188, forty_time: 4.40, bench_reps: 13, vertical_jump: 38.0, broad_jump: 123, shuttle: 4.10, three_cone: 6.72 },
  { player: 'Trey Mitchell',  position: 'DB', school: 'Michigan',   year: 2024, height: 72, weight: 196, forty_time: 4.44, bench_reps: 15, vertical_jump: 37.5, broad_jump: 122, shuttle: 4.15, three_cone: 6.82 },
]
