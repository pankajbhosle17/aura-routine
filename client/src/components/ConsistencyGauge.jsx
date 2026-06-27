import React from "react";

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 88;
const STROKE_WIDTH = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * ConsistencyGauge -- the same ring shape as DayRing, but here the arc
 * length represents the consistency score (0-100) instead of scheduled
 * tasks. Reusing the dial ties "today" and "your overall consistency"
 * together visually: both are a circle you're filling in.
 */
export default function ConsistencyGauge({ score }) {
  const pct = Math.max(0, Math.min(1, score || 0));
  const dashOffset = CIRCUMFERENCE * (1 - pct);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="auto" role="img"
      aria-label={`Consistency score: ${Math.round(pct * 100)} percent`}>
      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE_WIDTH} />
      <circle
        cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
        stroke="var(--dawn)"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
      <text x={CENTER} y={CENTER - 4} textAnchor="middle" fontFamily="var(--font-display)" fontSize="34" fontWeight="600" fill="var(--paper)">
        {Math.round(pct * 100)}
      </text>
      <text x={CENTER} y={CENTER + 22} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="0.05em" fill="var(--muted)">
        CONSISTENCY
      </text>
    </svg>
  );
}
