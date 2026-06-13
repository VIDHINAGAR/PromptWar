/**
 * Animated circular burnout-risk gauge. The ring sweeps from
 * empty to the computed score on mount and recolours by level.
 */
import { useEffect, useState } from 'react'
import { Badge } from './primitives.jsx'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const RING_COLOR = {
  High: '#FB7185',
  Medium: '#FBBF24',
  Low: '#34D399',
}

export function BurnoutMeter({ risk }) {
  const score = Math.max(0, Math.min(100, risk?.score ?? 0))
  const level = risk?.level || 'Low'
  const color = RING_COLOR[level] || RING_COLOR.Low

  // Animate the stroke from empty → target after first paint.
  const [dashOffset, setDashOffset] = useState(CIRCUMFERENCE)
  useEffect(() => {
    const id = requestAnimationFrame(() => setDashOffset(CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE))
    return () => cancelAnimationFrame(id)
  }, [score])

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        className="relative grid place-items-center"
        role="img"
        aria-label={`Burnout risk ${level}, ${score} out of 100`}
      >
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={RADIUS} stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" />
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-3xl font-extrabold text-white">{score}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">/ 100</div>
        </div>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <div className="mb-2 inline-flex items-center gap-2">
          <span className="text-sm text-slate-400">Risk level</span>
          <Badge value={level} />
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{risk?.explanation}</p>
      </div>
    </div>
  )
}
