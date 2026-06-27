import React, { useState } from "react";
import DayRing from "./DayRing.jsx";
import TaskForm from "./TaskForm.jsx";
import TaskCard from "./TaskCard.jsx";
import { categoryColorVar } from "../categoryColors.js";

export default function TodayView({
  tasks,
  conflicts,
  onCreate,
  onToggleComplete,
  onDelete,
  onOptimize,
  optimizing,
}) {
  const [showForm, setShowForm] = useState(false);
  const categoriesInUse = [...new Set(tasks.map((t) => t.category))];

  return (
    <div className="app-main today-layout">
      <div className="card ring-panel">
        <DayRing tasks={tasks} />
        <div className="ring-legend">
          {categoriesInUse.map((c) => (
            <span className="ring-legend-item" key={c}>
              <span className="ring-legend-dot" style={{ background: categoryColorVar(c) }} />
              {c}
            </span>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close form" : "+ Add task"}
        </button>
        <button className="btn btn-primary" onClick={onOptimize} disabled={optimizing || tasks.length < 2}>
          {optimizing ? "Optimizing…" : "Optimize my day"}
        </button>
      </div>

      <div className="card">
        <div className="task-list-header">
          <h2>Today's tasks</h2>
        </div>

        {showForm && (
          <TaskForm
            onCreate={(task) => {
              onCreate(task);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {conflicts && conflicts.length > 0 && (
          <div className="conflict-banner">
            ⚠ {conflicts.length} scheduling conflict{conflicts.length > 1 ? "s" : ""} found — "Optimize my day"
            will resequence lower-priority tasks around them.
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="big">Nothing on the books yet</div>
            <p>Add your first task to start building today's routine.</p>
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard key={t.id} task={t} onToggleComplete={onToggleComplete} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}
