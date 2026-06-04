"use client";

import { formatDuration } from "./dashboard-client";

const SIZE = 180;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function PracticeRing({ hours, goalHours }: { hours: number; goalHours: number }) {
  const safeGoal = goalHours > 0 ? goalHours : 1;
  const ratio = hours / safeGoal;
  const pct = Math.min(1, ratio);
  const displayPct = Math.round(ratio * 100);
  const complete = ratio >= 1;

  const dashOffset = CIRC * (1 - pct);
  const color = complete ? "#10b981" : "var(--brand)";

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 300ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl leading-none" style={{ color }}>
          {displayPct}%
        </span>
        <span className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
          {formatDuration(Math.round(hours * 60))} / {formatDuration(Math.round(goalHours * 60))}
        </span>
      </div>
    </div>
  );
}
