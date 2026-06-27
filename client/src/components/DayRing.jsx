import React, { useMemo } from "react";
import { categoryColorVar } from "../categoryColors.js";

const SIZE = 260;
const CENTER = SIZE / 2;
const RING_RADIUS = 96;
const TICK_OUTER = 108;
const STROKE_WIDTH = 16;

function timeToMinutes(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pointFor(minutes, radius) {
  const frac = ((minutes % 1440) + 1440) % 1440 / 1440;
  const angleDeg = frac * 360 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

function describeArc(radius, startMinutes, endMinutes) {
  const clampedEnd = Math.min(endMinutes, startMinutes + 1439); // never a full loop
  const start = pointFor(startMinutes, radius);
  const end = pointFor(clampedEnd, radius);
  const largeArc = clampedEnd - startMinutes > 720 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/**
 * DayRing -- the product's signature visual. A 24-hour dial where each task
 * is drawn as a colored arc at the time it's scheduled, with a marker for
 * "now". The same dial shape is reused (filled by score instead of tasks)
 * in ConsistencyGauge, so the metaphor of "your day/your progress is a
 * circle you move around" stays consistent across the app.
 */
export default function DayRing({ tasks }) {
  const now = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  const nowPoint = pointFor(now, RING_RADIUS);
  const nowOuter = pointFor(now, TICK_OUTER + 6);

  const hourTicks = Array.from({ length: 24 }, (_, h) => {
    const minutes = h * 60;
    const inner = pointFor(minutes, RING_RADIUS - STROKE_WIDTH / 2 - 4);
    const outer = pointFor(minutes, h % 6 === 0 ? TICK_OUTER + 2 : RING_RADIUS - STROKE_WIDTH / 2 - 2);
    return { h, inner, outer, major: h % 6 === 0 };
  });

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="auto" role="img"
      aria-label="24-hour view of today's scheduled tasks">
      {/* base track */}
      <circle cx={CENTER} cy={CENTER} r={RING_RADIUS} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE_WIDTH} />

      {/* hour ticks */}
      {hourTicks.map(({ h, inner, outer, major }) => (
        <line
          key={h}
          x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
          stroke={major ? "var(--muted)" : "var(--line)"}
          strokeWidth={major ? 1.5 : 1}
        />
      ))}

      {/* one arc per task */}
      {tasks.map((t) => {
        const start = timeToMinutes(t.startTime);
        const end = start + (t.duration || 15);
        return (
          <path
            key={t.id}
            d={describeArc(RING_RADIUS, start, end)}
            fill="none"
            stroke={categoryColorVar(t.category)}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            opacity={t.completedToday ? 1 : 0.45}
          />
        );
      })}

      {/* "now" marker */}
      <line x1={nowPoint.x} y1={nowPoint.y} x2={nowOuter.x} y2={nowOuter.y} stroke="var(--dawn)" strokeWidth={2} />
      <circle cx={nowOuter.x} cy={nowOuter.y} r={3.5} fill="var(--dawn)" />

      {/* center labels */}
      <text x={CENTER} y={CENTER - 6} textAnchor="middle" fontFamily="var(--font-display)" fontSize="22" fontWeight="600" fill="var(--paper)">
        {tasks.length}
      </text>
      <text x={CENTER} y={CENTER + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="0.05em" fill="var(--muted)">
        TASKS TODAY
      </text>
    </svg>
  );
}
