import { useRef, useCallback } from 'react'

export default function DualRangeSlider({ min, max, value, onChange }) {
  const [lo, hi] = value
  const containerRef = useRef(null)

  const handleLo = useCallback((e) => {
    const newLo = parseInt(e.target.value, 10)
    if (newLo <= hi) onChange([newLo, hi])
  }, [hi, onChange])

  const handleHi = useCallback((e) => {
    const newHi = parseInt(e.target.value, 10)
    if (newHi >= lo) onChange([lo, newHi])
  }, [lo, onChange])

  const loPercent = ((lo - min) / (max - min)) * 100
  const hiPercent = ((hi - min) / (max - min)) * 100

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>{lo}</span>
        <span className="text-xs" style={{ color: '#5a5a7a' }}>–</span>
        <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>{hi}</span>
      </div>
      <div className="dual-range-container" ref={containerRef}>
        <div className="dual-range-track" />
        <div
          className="dual-range-fill"
          style={{ left: `${loPercent}%`, right: `${100 - hiPercent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={lo}
          onChange={handleLo}
          style={{ zIndex: lo === hi ? 5 : undefined }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={hi}
          onChange={handleHi}
        />
      </div>
    </div>
  )
}
