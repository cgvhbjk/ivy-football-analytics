import { SCHOOL_META, SCHOOL_COLORS } from '../../data/mockData.js'

const SIZE_MAP = {
  sm: { circle: 28, font: 10, textSize: 'text-xs' },
  md: { circle: 40, font: 13, textSize: 'text-sm' },
  lg: { circle: 56, font: 17, textSize: 'text-base' },
}

export default function TeamBadge({ school, size = 'md' }) {
  const meta = SCHOOL_META[school]
  const color = SCHOOL_COLORS[school]
  const { circle, font, textSize } = SIZE_MAP[size]

  if (!meta) return null

  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
        style={{
          width: circle,
          height: circle,
          background: color,
          color: '#ffffff',
          fontSize: font,
          letterSpacing: '0.04em',
        }}
      >
        {meta.abbr}
      </div>
      <span className={`font-medium ${textSize}`} style={{ color: '#e8e8f0' }}>
        {meta.fullName}
      </span>
    </div>
  )
}
