import React from "react";
import { categoryColorVar } from "../categoryColors.js";

export default function TaskCard({ task, onToggleComplete, onDelete }) {
  return (
    <div className="task-card">
      <button
        className={`task-check ${task.completedToday ? "done" : ""}`}
        onClick={() => onToggleComplete(task.id)}
        aria-label={task.completedToday ? `Mark ${task.name} incomplete` : `Mark ${task.name} complete`}
      >
        {task.completedToday ? "✓" : ""}
      </button>

      <span className="task-time">{task.startTime}</span>

      <div className="task-name-block">
        <span className={`task-name ${task.completedToday ? "done" : ""}`}>{task.name}</span>
        <span className="task-meta">
          <span className="category-dot" style={{ background: categoryColorVar(task.category) }} />
          {task.category} · {task.duration}m
        </span>
      </div>

      <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>

      <button className="task-delete" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.name}`}>
        ×
      </button>
    </div>
  );
}
