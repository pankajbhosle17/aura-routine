import React from "react";
import ConsistencyGauge from "./ConsistencyGauge.jsx";
import CategoryBreakdown from "./CategoryBreakdown.jsx";

export default function AnalyticsDashboard({ analytics, loading }) {
  if (loading) {
    return (
      <div className="app-main">
        <div className="card"><p className="muted-note">Crunching the numbers…</p></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="app-main">
        <div className="card empty-state">
          <div className="big">No history yet</div>
          <p>Complete some tasks on the Today tab, then come back here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-main analytics-grid">
      <div className="card ring-panel">
        <ConsistencyGauge score={analytics.consistencyScore} />
        <p className="muted-note">
          (Completion rate × 0.7) + (Priority multiplier × 0.3), crunched by the C++ engine.
        </p>
      </div>

      <div className="card">
        <h2>Performance overview</h2>
        <div className="stat-row">
          <div className="stat-box">
            <div className="num">{analytics.currentStreak}</div>
            <div className="label">Current streak</div>
          </div>
          <div className="stat-box">
            <div className="num">{analytics.longestStreak}</div>
            <div className="label">Longest streak</div>
          </div>
          <div className="stat-box">
            <div className="num">{Math.round(analytics.completionRate * 100)}%</div>
            <div className="label">Completion rate</div>
          </div>
          <div className="stat-box">
            <div className="num">{analytics.completedTasks}/{analytics.totalTasks}</div>
            <div className="label">Tasks logged</div>
          </div>
        </div>

        <h2 style={{ marginTop: 28 }}>By category</h2>
        <CategoryBreakdown breakdown={analytics.categoryBreakdown} />
      </div>
    </div>
  );
}
