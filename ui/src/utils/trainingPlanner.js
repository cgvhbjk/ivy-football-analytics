// Maps gap-analysis results to a structured training plan.

const FOCUS_CONFIGS = [
  {
    id:    'hypertrophy',
    test:  gaps => gaps.some(g => g.key === 'weight' && g.isDeficit),
    area:  'Hypertrophy & Nutrition',
    desc:  'Structured caloric surplus with compound lifts to build lean mass toward the NFL prototype weight.',
    hours: '8–10 hrs/wk',
    weeks: '8–12 weeks',
  },
  {
    id:    'strength',
    test:  gaps => gaps.some(g => g.key === 'bench_reps' && g.isDeficit),
    area:  'Strength Development',
    desc:  'Progressive overload on compound movements (bench, squat, deadlift) to close strength gaps.',
    hours: '6–8 hrs/wk',
    weeks: '6–10 weeks',
  },
  {
    id:    'power',
    test:  gaps => gaps.some(g => ['vertical_jump', 'broad_jump'].includes(g.key) && g.isDeficit),
    area:  'Power & Explosiveness',
    desc:  'Plyometrics, Olympic lifts (cleans, snatches), and jump training to improve vertical and broad jump.',
    hours: '4–6 hrs/wk',
    weeks: '6–8 weeks',
  },
  {
    id:    'speed',
    test:  gaps => gaps.some(g => ['forty_time', 'shuttle', 'three_cone'].includes(g.key) && g.isDeficit),
    area:  'Speed & Agility',
    desc:  'Acceleration mechanics, resisted sprints, and cone/shuttle drill work to improve linear and lateral speed.',
    hours: '5–7 hrs/wk',
    weeks: '8–12 weeks',
  },
]

const WEEKLY_TEMPLATES = {
  hypertrophy: [
    { day: 'Monday',    focus: 'Lower Body — Volume',    details: 'Squat, RDL, leg press, walking lunges' },
    { day: 'Tuesday',   focus: 'Upper Body — Push',      details: 'Bench press, incline DB, shoulder press, triceps' },
    { day: 'Wednesday', focus: 'Recovery & Mobility',    details: 'Active recovery, foam rolling, flexibility' },
    { day: 'Thursday',  focus: 'Lower Body — Strength',  details: 'Deadlift, Bulgarian split squat, glute work' },
    { day: 'Friday',    focus: 'Upper Body — Pull',      details: 'Rows, pull-ups, face pulls, bicep work' },
    { day: 'Saturday',  focus: 'Conditioning',           details: 'Position-specific movement and light skill work' },
  ],
  strength: [
    { day: 'Monday',    focus: 'Max Effort Lower',       details: 'Squat variation to 85–95% 1RM + accessory work' },
    { day: 'Tuesday',   focus: 'Max Effort Upper',       details: 'Bench variation to 85–95% 1RM + rows' },
    { day: 'Wednesday', focus: 'Recovery',               details: 'Mobility, light cardio, soft tissue work' },
    { day: 'Thursday',  focus: 'Dynamic Effort Lower',   details: 'Box squats 8×2 @ 60%, plyometric work' },
    { day: 'Friday',    focus: 'Dynamic Effort Upper',   details: 'Speed bench 8×3 @ 60%, medicine ball work' },
    { day: 'Saturday',  focus: 'Position Drills',        details: 'Technique work at game speed' },
  ],
  power: [
    { day: 'Monday',    focus: 'Olympic Lifting',        details: 'Power clean, hang clean, push press' },
    { day: 'Tuesday',   focus: 'Plyometric Circuit',     details: 'Box jumps, broad jumps, depth drops, med ball' },
    { day: 'Wednesday', focus: 'Recovery',               details: 'Mobility, contrast baths, light movement' },
    { day: 'Thursday',  focus: 'Lower Body Strength',    details: 'Squat, RDL + reactive plyos' },
    { day: 'Friday',    focus: 'Jump Development',       details: 'Vertical jump series, bounding, approach jumps' },
    { day: 'Saturday',  focus: 'Skill Integration',      details: 'Apply explosiveness in position-specific drills' },
  ],
  speed: [
    { day: 'Monday',    focus: 'Linear Speed',           details: 'Wall drills, A-skip/B-skip, resisted sprints' },
    { day: 'Tuesday',   focus: 'Strength Base',          details: 'Lower body compound lifts for force production' },
    { day: 'Wednesday', focus: 'Recovery',               details: 'Mobility, flexibility, soft tissue' },
    { day: 'Thursday',  focus: 'Change of Direction',    details: 'Cone drills, shuttle work, plant-and-drive mechanics' },
    { day: 'Friday',    focus: 'Acceleration Work',      details: 'Short sprints (10–20 yds), sled push/pull' },
    { day: 'Saturday',  focus: 'Game-Speed Application', details: 'Position movement patterns at full speed' },
  ],
  default: [
    { day: 'Monday',    focus: 'Lower Body Strength',    details: 'Compound lifts — squat, RDL, accessory work' },
    { day: 'Tuesday',   focus: 'Upper Body Strength',    details: 'Bench, rows, shoulder press' },
    { day: 'Wednesday', focus: 'Recovery & Mobility',    details: 'Active recovery, foam rolling' },
    { day: 'Thursday',  focus: 'Athletic Development',   details: 'Plyos, power work, agility' },
    { day: 'Friday',    focus: 'Conditioning',           details: 'Position-specific movement and endurance' },
    { day: 'Saturday',  focus: 'Skill Work',             details: 'Technique and film review' },
  ],
}

export function generateTrainingPlan(gaps) {
  const focusAreas = FOCUS_CONFIGS
    .filter(cfg => cfg.test(gaps))
    .map(cfg => ({
      id:    cfg.id,
      area:  cfg.area,
      desc:  cfg.desc,
      hours: cfg.hours,
      weeks: cfg.weeks,
      priority: gaps.find(g => cfg.test([g]))?.priority ?? 'low',
    }))

  if (focusAreas.length === 0) {
    focusAreas.push({
      id: 'maintenance', area: 'Maintenance & Refinement', priority: 'low',
      desc:  'Player is near NFL prototype targets. Maintain current profile and focus on position-specific skill refinement.',
      hours: '4–5 hrs/wk', weeks: 'Ongoing',
    })
  }

  // Use the template of the highest-priority focus area
  const primaryId = focusAreas[0]?.id ?? 'default'
  const weeklyStructure = WEEKLY_TEMPLATES[primaryId] ?? WEEKLY_TEMPLATES.default

  return { focusAreas, weeklyStructure }
}
