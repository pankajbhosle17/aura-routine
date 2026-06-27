import React, { useState } from "react";

const CATEGORIES = ["Deep Work", "Fitness", "Mindfulness", "Admin", "Learning", "Personal"];
const PRIORITIES = ["High", "Medium", "Low"];

const initialForm = {
  name: "",
  startTime: "09:00",
  duration: 30,
  category: CATEGORIES[0],
  priority: "Medium",
};

export default function TaskForm({ onCreate, onCancel }) {
  const [form, setForm] = useState(initialForm);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreate({ ...form, duration: Number(form.duration) });
    setForm(initialForm);
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <label className="full">
        Task name
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Morning run"
          autoFocus
        />
      </label>

      <label>
        Start time
        <input type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} />
      </label>

      <label>
        Duration (minutes)
        <input
          type="number"
          min="5"
          step="5"
          value={form.duration}
          onChange={(e) => update("duration", e.target.value)}
        />
      </label>

      <label>
        Category
        <select value={form.category} onChange={(e) => update("category", e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label>
        Priority
        <select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>

      <div className="actions">
        <button type="button" className="btn btn-secondary" style={{ width: "auto" }} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" style={{ width: "auto" }}>
          Add task
        </button>
      </div>
    </form>
  );
}
