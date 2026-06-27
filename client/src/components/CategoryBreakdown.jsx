import React from "react";
import { categoryColorVar } from "../categoryColors.js";

export default function CategoryBreakdown({ breakdown }) {
  const entries = Object.entries(breakdown || {});

  if (entries.length === 0) {
    return <p className="muted-note">Complete a few tasks to see your category breakdown here.</p>;
  }

  return (
    <div>
      {entries.map(([category, stats]) => (
        <div className="breakdown-row" key={category}>
          <div className="top-line">
            <span>{category}</span>
            <span style={{ color: "var(--muted)" }}>
              {stats.completed}/{stats.total} · {stats.completionPct}%
            </span>
          </div>
          <div className="breakdown-track">
            <div
              className="breakdown-fill"
              style={{ width: `${stats.completionPct}%`, background: categoryColorVar(category) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
